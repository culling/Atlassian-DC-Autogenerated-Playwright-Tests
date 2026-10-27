// npm script runner: environment commands (env/atl-env.sh) and test runs (Playwright).
//
//   node scripts/atl.mjs <command> [--env <product>:<version>[,...]] [--autoshutdown] [playwright args]
//
// Commands:
//   setup      full build of an instance (atl-env.sh up)
//   start      start an instance          stop | shutdown   stop an instance
//   restore    back to the clean snapshot status            print state
//   logs       follow the product log
//   test       run Playwright; --env picks the host project(s); --autoshutdown stops them afterwards
//
// `--env confluence:6.6.17` and `--env confluence-6.6.17` both mean profile `confluence-6.6.17`.
// npm may pass the value as a plain argument (`npm run test --env confluence:6.6.17`) or as
// npm_config_env (`--env=...`); both are accepted here. Arguments this script does not know are
// passed to Playwright.
//
// This file only orchestrates. The tests still do not import anything from env/ (CLAUDE.md 2.8).
import { spawn } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROFILES_DIR = path.join(ROOT, 'env', 'profiles');
const ENV_COMMANDS = { setup: 'up', start: 'start', stop: 'stop', shutdown: 'stop', restore: 'restore', status: 'status', logs: 'logs' };
// Commands that act on all profiles when --env is not given. The others need --env.
const ALL_BY_DEFAULT = new Set(['stop', 'shutdown', 'status', 'test']);
const ENV_VALUE = /^[a-z]+[:-]\d+(\.\d+)*$/;

function fail(msg) {
  console.error(`[atl] ${msg}`);
  process.exit(1);
}

function parseArgs(argv) {
  const envs = [];
  const rest = [];
  let autoshutdown = process.env.npm_config_autoshutdown === 'true';
  const fromNpm = process.env.npm_config_env;
  if (fromNpm && fromNpm !== 'true') envs.push(...fromNpm.split(','));
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--env') {
      if (!argv[i + 1]) fail('--env needs a value, for example --env confluence:6.6.17');
      envs.push(...argv[++i].split(','));
    } else if (a.startsWith('--env=')) envs.push(...a.slice(6).split(','));
    else if (a === '--autoshutdown') autoshutdown = true;
    else if (ENV_VALUE.test(a)) envs.push(a); // value npm separated from --env
    else rest.push(a);
  }
  return { envs: [...new Set(envs.map(toProfile))], autoshutdown, rest };
}

/** confluence:6.6.17 -> confluence-6.6.17 */
function toProfile(value) {
  const name = value.trim().replace(':', '-');
  if (!ENV_VALUE.test(name)) fail(`not an environment name: "${value}" (expected for example confluence:6.6.17)`);
  return name;
}

function allProfiles() {
  return readdirSync(PROFILES_DIR).filter((f) => f.endsWith('.env')).map((f) => f.slice(0, -4)).sort();
}

function requireProfile(name) {
  if (!existsSync(path.join(PROFILES_DIR, `${name}.env`))) {
    fail(`no profile "${name}". Available: ${allProfiles().map((p) => p.replace('-', ':')).join(', ')}`);
  }
}

/** Git Bash, not the WSL bash.exe that is first on PATH on Windows. Override with ATL_BASH. */
function bashPath() {
  if (process.env.ATL_BASH) return process.env.ATL_BASH;
  if (process.platform !== 'win32') return 'bash';
  const candidates = [
    path.join(process.env.ProgramFiles ?? 'C:\\Program Files', 'Git', 'bin', 'bash.exe'),
    path.join(process.env.LOCALAPPDATA ?? '', 'Programs', 'Git', 'bin', 'bash.exe'),
  ];
  const found = candidates.find((c) => existsSync(c));
  if (!found) fail(`Git Bash not found (looked in: ${candidates.join('; ')}). Set ATL_BASH to the path of bash.exe.`);
  return found;
}

function run(cmd, args) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd: ROOT, stdio: 'inherit' });
    child.on('error', (e) => {
      console.error(`[atl] could not run ${cmd}: ${e.message}`);
      resolve(1);
    });
    child.on('exit', (code, signal) => resolve(code ?? (signal ? 1 : 0)));
  });
}

async function atlEnv(profile, command) {
  console.error(`[atl] env/atl-env.sh ${profile} ${command}`);
  return run(bashPath(), [path.join(ROOT, 'env', 'atl-env.sh'), profile, command]);
}

/** Stops with a clear message when a host is not reachable, instead of a login timeout later. */
async function requireRunning(target, baseURLOf) {
  const url = `${baseURLOf(target)}status`;
  let state = 'not reachable';
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    state = (await res.json()).state ?? `HTTP ${res.status}`;
  } catch {
    // keep 'not reachable'
  }
  if (state !== 'RUNNING') {
    fail(`${target.name} is ${state} (${url}). Start it with: npm run start -- --env ${target.name.replace('-', ':')}`);
  }
}

async function runTests(envs, autoshutdown, rest) {
  const { targets, baseURLOf } = await import('../tests/targets.ts');
  const names = targets.map((t) => t.name);
  for (const e of envs) {
    if (!names.includes(e)) fail(`"${e}" is not a test target. Targets in tests/targets.ts: ${names.join(', ')}`);
  }
  const selected = envs.length ? targets.filter((t) => envs.includes(t.name)) : targets;
  for (const t of selected) await requireRunning(t, baseURLOf);

  const projects = envs.flatMap((e) => ['--project', e]);
  const cli = path.join(ROOT, 'node_modules', '@playwright', 'test', 'cli.js');
  // Ctrl+C reaches Playwright directly; this process keeps running so --autoshutdown still happens.
  process.on('SIGINT', () => {});
  let code = await run(process.execPath, [cli, 'test', ...projects, ...rest]);

  if (autoshutdown) {
    for (const t of selected) {
      if (!existsSync(path.join(PROFILES_DIR, `${t.name}.env`))) continue; // environment built elsewhere
      const stopCode = await atlEnv(t.name, 'stop');
      if (code === 0) code = stopCode;
    }
  }
  return code;
}

async function main() {
  const [command, ...argv] = process.argv.slice(2);
  if (!command || !(command in ENV_COMMANDS || command === 'test')) {
    fail(`unknown command "${command ?? ''}". Use one of: ${[...Object.keys(ENV_COMMANDS), 'test'].join(', ')}`);
  }
  const { envs, autoshutdown, rest } = parseArgs(argv);
  if (!envs.length && !ALL_BY_DEFAULT.has(command)) {
    fail(`${command} needs --env, for example: npm run ${command} -- --env confluence:6.6.17`);
  }

  if (command === 'test') process.exit(await runTests(envs, autoshutdown, rest));

  if (rest.length) fail(`unknown arguments for ${command}: ${rest.join(' ')}`);
  const profiles = envs.length ? envs : allProfiles();
  profiles.forEach(requireProfile);
  let code = 0;
  for (const p of profiles) {
    const c = await atlEnv(p, ENV_COMMANDS[command]);
    if (c !== 0) {
      code = c;
      if (command !== 'stop' && command !== 'shutdown' && command !== 'status') break;
    }
  }
  process.exit(code);
}

main();
