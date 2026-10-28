# Atlassian DC app UI tests

Playwright end-to-end tests for TechTime apps on Atlassian Data Center hosts.
Current app under test: **EasySSO** (TechTime): EasySSO for Confluence on Confluence 6.6.17 and 9.5.4, and EasySSO for Jira on Jira Software 8.22.1 and 10.7.4. The same test runs on all four hosts.

The previous project (Embed Google Maps Pro on Confluence 8.5.31 and 9.2.26) is in `_reference/`, unchanged. It is a complete, separate copy with its own `README.md`, `CLAUDE.md`, `package.json` and environment data.

The repository has two independent parts:

| Part | Folder | What it does | Needs |
|---|---|---|---|
| Environment | `env/` | Downloads, configures and runs Confluence and Jira DC instances in Docker, runs the setup wizard, installs the app | Docker Desktop, Git Bash, Node.js |
| Tests | `tests/` | Playwright tests against any running instance | Node.js, a base URL, admin credentials |

The tests do not call anything in `env/`. You can point them at an instance built another way (for example in Bitbucket Pipelines).

## Host versions

| Profile | Product | Java | PostgreSQL | URL | DB port |
|---|---|---|---|---|---|
| `confluence-6.6.17` | Confluence 6.6.17 (Enterprise release) | Temurin 8 | 9.6 | http://127.0.0.1:8066 | 5436 |
| `confluence-9.5.4` | Confluence 9.5.4 (newest Confluence 9) | Temurin 21 | 16 | http://127.0.0.1:8095 | 5437 |
| `jira-8.22.1` | Jira Software 8.22.1 (lowest you asked for) | Temurin 11 | 13 | http://127.0.0.1:8822 | 5438 |
| `jira-10.7.4` | Jira Software 10.7.4 (highest for EasySSO for Jira 5.2.4) | Temurin 21 | 16 | http://127.0.0.1:8107 | 5439 |

Apps under test (both version 5.2.4, the newest version below Confluence 10 / Jira 11):

| File | App | Supported hosts | Download |
|---|---|---|---|
| `apps/confluence.plugins.easysso-5.2.4.obr` | EasySSO for Confluence | Confluence DC 6.0.1 – 9.5.4 | https://marketplace.atlassian.com/download/apps/1212583/version/5002004000 |
| `apps/jira.plugins.easysso-5.2.4.obr` | EasySSO for Jira | Jira DC 8.22.0 – 10.7.4 | https://marketplace.atlassian.com/download/apps/1212581/version/5002004005 |

The ports differ from the `_reference` hosts (8090, 8100), so both projects can run at the same time.

Why 9.5.4 and not 9.2.26: 9.5.4 is the newest Confluence 9 and the newest host EasySSO 5.2.4 supports. A profile named `confluence-9.2.26` would use the same Docker containers and volumes as the `_reference` 9.2.26 instance (the names come from the profile name).

Login: `admin` / `admin` (from `.env.local`).

**One-node cluster (6.6.17 only):** Confluence 6.6 accepts a Data Center licence only as a cluster. The setup creates a cluster with one node. This does not change how you use it.

## One-time preparation

1. Install Docker Desktop and Node.js.
2. Run `npm install` and `npx playwright install chromium`.
3. Copy `.env.local.example` to `.env.local` and fill it in (admin user, timebomb licences: Confluence DC, Jira Software DC, DC app). `.env.local` is git-ignored. Never commit licence keys.
4. Put both app files in `apps/` (links above).

## npm commands

Run these from the repository root, in any terminal (PowerShell, cmd or Git Bash). `--env` names a host as `<product>:<version>`.

```
npm run setup    -- --env confluence:6.6.17   # first time: full build (download, install, start, setup wizard, install app, snapshot)
npm run start    -- --env confluence:6.6.17   # start the instance and wait until it is RUNNING
npm run restore  -- --env confluence:6.6.17   # back to the clean snapshot (also starts it)
npm run status                                # state of every instance (or one with --env)
npm run logs     -- --env confluence:6.6.17   # follow the product log (Ctrl+C to stop)
npm run shutdown -- --env confluence:6.6.17   # stop the instance (without --env: stop all); same as npm run stop

npm run test       -- --env confluence:6.6.17                  # all tests
npm run test:smoke -- --env confluence:6.6.17                  # @smoke tests
npm run test:smoke -- --env confluence:6.6.17 --autoshutdown   # stop the host after the tests (also when tests fail)
npm run check                                                  # selector/API rule check + TypeScript check
npm run report                                                 # HTML report of the last run
```

Every command takes any host, for example `--env confluence:9.5.4` or `--env jira:10.7.4`. Several hosts: `--env confluence:6.6.17,jira:8.22.1`.

Rules:

1. **Use `--` before the options** (as above). Without it, npm prints "Unknown cli config" warnings. `npm run start --env confluence:6.6.17` still works, but npm says this form will stop working in its next major version.
2. `confluence-6.6.17` (the profile name) is accepted as well as `confluence:6.6.17`.
3. Other options after `--` go to Playwright, for example `npm run test -- --env confluence:6.6.17 --repeat-each=10` or `--headed`.
4. `test` first checks that the host reports `RUNNING` on `/status`. If not, it stops and prints the `npm run start` command.
5. `--autoshutdown` stops only hosts that have a profile in `env/profiles/`. The exit code is the test result.
6. `setup`, `start`, `restore` and `logs` need `--env`. `status`, `shutdown` and `stop` without `--env` act on every profile.

The npm commands call `env/atl-env.sh` through Git Bash (`scripts/atl.mjs`). They look for Git Bash in `C:\Program Files\Git\bin\bash.exe` and `%LOCALAPPDATA%\Programs\Git\bin\bash.exe`. Set `ATL_BASH` to the full path of `bash.exe` if Git Bash is installed somewhere else.

Typical session:

1. `npm run restore -- --env confluence:6.6.17` (clean data, fresh licence period).
2. `npm run test:smoke -- --env confluence:6.6.17 --autoshutdown`.

## Environment commands (Git Bash, direct)

```
env/atl-env.sh confluence-6.6.17 up            # first time: download, install, start, setup wizard, install app, snapshot
env/atl-env.sh confluence-6.6.17 restore       # back to the clean snapshot
env/atl-env.sh confluence-6.6.17 status        # stopped / starting / FIRST_RUN / RUNNING
env/atl-env.sh confluence-6.6.17 start
env/atl-env.sh confluence-6.6.17 stop
env/atl-env.sh confluence-6.6.17 install-app   # re-install the app after you change the OBR/JAR
env/atl-env.sh confluence-6.6.17 logs          # follow the product log
env/atl-env.sh confluence-6.6.17 reset         # delete all data of this instance (the snapshot is kept)
```

Measured times on this machine (10 CPUs, 15.5 GB for Docker):

| Step | Confluence 6.6.17 | Confluence 9.5.4 | Jira 8.22.1 | Jira 10.7.4 |
|---|---|---|---|---|
| `npm run setup` (`up`) from a clean `reset`, archive already downloaded | 19.7 min (setup wizard 8.6 min) | not measured in total (setup wizard 4.6 min) | 19.1 min (setup 3.5 min) | 21.2 min (setup 3.7 min) |
| `restore` | 6.8 min | 5.0 min | 6.6 min | 7.9 min |
| `snapshot` | 7.4 min | not measured | not measured | not measured |
| `start` of a set-up instance | 3.2–3.5 min to RUNNING | 135 s to RUNNING | 5.6 min to RUNNING | 6.7–6.8 min to RUNNING |
| `@smoke` × 10 repeats | 22–45 s (11 runs incl. login) | 24.5 s (11 runs incl. login) | 55.3 s | 58.6 s |

**Licences:** after about 3 hours the timebomb licences make the site read-only. Run `npm run restore -- --env <host>` before a test session. On 9.2.26 (`_reference`) `restore` was verified to reset the 3 hours; on the hosts here this is not verified yet.

## Running the tests

What one run does:

1. `setup-<host>` (for example `setup-confluence-9.5.4`): logs in once as administrator.
2. `<host>` (for example `confluence-9.5.4`): the tests.

Without `--env`, `npm run test` runs every host in `tests/targets.ts`, and first checks that all of them are running.

Current tests (folder `tests/specs/easysso/`):

`@smoke` (`http-headers.spec.ts`, 1 test): a header rule with "Get Username" logs in the user named in the header.

1. Before the test: a new user is created, and all EasySSO header rules are removed (REST).
2. The administrator opens the EasySSO **Headers** screen (`/plugins/servlet/easysso/admin/headers`, the same screen in Confluence and Jira) and adds the rule: type Header, name `X-Atl-Test-User`, "Get Username" on. Save shows "Saved".
3. A new browser with no login cookie sends `X-Atl-Test-User: <the new user>` and opens the dashboard. The header shows that user as logged in; no login form.
4. A new browser without the header opens the dashboard and is not logged in: Confluence shows the login form, Jira shows the header "Log In" link.
5. After the test: the rules are removed and the user is deleted (REST).

The tests run with 1 worker: the header rules are a site-wide setting, so two tests changing them at the same time would break each other.

Passing runs leave no screenshots, traces or videos. Failing tests attach a screenshot, a trace, the host and app versions, browser console errors, and the last 200 lines of the product log.

### Against another instance

Set these environment variables:

- `ATL_BASE_URL_CONFLUENCE_6_6_17`, `ATL_BASE_URL_CONFLUENCE_9_5_4`, `ATL_BASE_URL_JIRA_8_22_1` or `ATL_BASE_URL_JIRA_10_7_4` (for example `https://host/`)
- `ATL_ADMIN_USER` and `ATL_ADMIN_PASSWORD`
- optional: `ATL_LOG_FILE=<path>` for the product log attached to failures

Confluence needs the JSON-RPC remote API (used to create the test user); Jira uses `/rest/api/2/user`.

## Troubleshooting

| Symptom | Cause | What to do |
|---|---|---|
| `http://localhost:8066` does not load | On this machine `localhost` goes to IPv6 `::1`, held by `wslrelay` | Use `http://127.0.0.1:8066` |
| `docker is not on PATH` | Terminal opened before Docker Desktop was installed | Open a new terminal; the script also finds Docker in its default install folders |
| `http://localhost:8822` (or another port) does not load | Same cause | Use `127.0.0.1` |
| Pages are read-only | Timebomb licence expired (about 3 h after setup/restore) | `npm run restore -- --env <host>` |
| Jira answers HTTP 503 or an empty page soon after `start` | Jira reports FIRST_RUN/RUNNING on `/status` before its plugin system has started (about 1 min on 10.7.4) | Wait one minute; the setup waits by itself |
| Jira: a user who logs in by header gets a 500 page ("WelcomeToJIRASoftware") | The onboarding plugin was disabled on Jira 10 | Do not disable `com.atlassian.jira.jira-onboarding-assets-plugin`; both Jira profiles turn onboarding off with a system property |
| `[atl] confluence-… is not reachable` | The host is stopped | `npm run start -- --env confluence:6.6.17` |
| `[atl] Git Bash not found` | Git Bash is not in a default folder | Set `ATL_BASH` to the full path of `bash.exe` |
| npm prints `Unknown cli config "--env"` | Options given without `--` | Put `--` before the options |
| Every page fails with "Container is not setup", or app install fails with "Base URL misconfigured" | A setup wizard screen was submitted twice | `env/atl-env.sh confluence-6.6.17 reset`, then `npm run setup -- --env confluence:6.6.17` |
| A step fails | The script prints the failed step and a diagnosis command | Run the printed command |

## Where things are

| Path | Content |
|---|---|
| `env/atl-env.sh`, `env/lib/common.sh` | Environment script |
| `env/profiles/` | One file per host version |
| `env/setup/` | Setup wizard automation (own Playwright config); `wizards/` holds one class per wizard flow |
| `env/instances/<profile>/` | Install dir, logs (`home/logs/`), snapshot (git-ignored) |
| `apps/` | App files to install (git-ignored) |
| `tests/targets.ts` | Host instances (one Playwright project each) |
| `tests/setup/` | Administrator login before the tests |
| `tests/adapters/` | Everything host-specific (login form, dashboard, user menu): `Confluence6Adapter`, `Confluence9Adapter`, `JiraAdapter`, `Jira10Adapter` |
| `tests/pages/` | App screens (EasySSO Headers screen) |
| `tests/fixtures/` | Fixtures and REST helpers (setup/teardown only) |
| `tests/specs/easysso/` | The tests and their data |
| `scripts/atl.mjs` | npm command runner (calls `env/atl-env.sh` and Playwright) |
| `scripts/check-test-rules.mjs` | Selector and API rule check |
| `docs/notes/` | Verified facts (`hosts.md`, `easysso.md`) and `open-questions.md` |
| `_reference/` | The previous project (Embed Google Maps Pro), unchanged |
| `CLAUDE.md` | Rules and decisions for AI-assisted work in this repository |
