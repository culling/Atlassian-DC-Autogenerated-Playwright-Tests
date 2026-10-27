// Enforces the selector and API rules in CLAUDE.md sections 6.3 and 6.4.
// Usage: node scripts/check-test-rules.mjs   (exit code 1 when a rule is broken)
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';

function files(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? files(p) : p.endsWith('.ts') ? [p] : [];
  });
}

const inDir = (f, d) => f.split(sep).includes(d);

/** [rule name, regex, applies to file?] */
const rules = [
  ['fixed sleep (waitForTimeout)', /waitForTimeout\s*\(/, () => true],
  ['absolute XPath', /['"`](xpath=)?\/html/, () => true],
  ['XPath selector', /['"`]xpath=|['"`]\/\/[a-z*]/i, () => true],
  ['nth-child selector', /nth-child|nth-of-type/, () => true],
  ['positional .nth()/.first()/.last() without "// stable-list:" comment', /\.(nth\(|first\(\)|last\(\))(?!.*\/\/ stable-list:)/, () => true],
  ['generated class name (css-xxx, sc-xxx, _a8f2)', /['"`.]((css|sc)-[a-z0-9]{4,}|_[a-z0-9]{4,}\b)/i, () => true],
  ['test.only', /\btest\.only\(|\bdescribe\.only\(/, () => true],
  ['host branching in spec (if host/adapter === ...)', /if\s*\(.*(adapterName|hostVersion|targetName|host)\b.*===?/, (f) => inDir(f, 'specs')],
  ['raw selector in spec (page.locator / $ / $$)', /\.locator\(|\.\$\$?\(/, (f) => inDir(f, 'specs')],
  ['HTTP call outside fixtures/setup', /\brequest\.(get|post|put|delete|patch|fetch)\(|\bfetch\(|\bnew\s+ConfluenceRest\b/, (f) => (inDir(f, 'specs') || inDir(f, 'pages') || inDir(f, 'adapters'))],
  ['rest fixture used in a spec test body', /\brest\.\w+\(/, (f) => inDir(f, 'specs')],
];

let problems = 0;
for (const f of files('tests')) {
  const lines = readFileSync(f, 'utf8').split('\n');
  lines.forEach((line, i) => {
    if (/^\s*(\/\/|\*)/.test(line)) return; // comments
    for (const [name, re, applies] of rules) {
      if (applies(f) && re.test(line)) {
        console.log(`${f}:${i + 1}: ${name}\n    ${line.trim()}`);
        problems++;
      }
    }
  });
}

// Every test must have exactly one of @smoke / @full.
for (const f of files('tests').filter((f) => inDir(f, 'specs'))) {
  const src = readFileSync(f, 'utf8');
  for (const m of src.matchAll(/\btest\(\s*['"`]([^'"`]+)['"`]\s*,\s*(\{[^}]*\})?/g)) {
    const smoke = /@smoke/.test(m[0]), full = /@full/.test(m[0]);
    if (smoke === full) {
      console.log(`${f}: test "${m[1]}" needs exactly one of @smoke / @full`);
      problems++;
    }
  }
}

if (problems) {
  console.log(`\n${problems} rule violation(s).`);
  process.exit(1);
}
console.log('check-test-rules: OK');
