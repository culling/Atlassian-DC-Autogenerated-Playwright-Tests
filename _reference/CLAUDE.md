# CLAUDE.md — Atlassian App UI Test Automation

This repository holds two things:

1. **Environment scripts** that download, configure and run Atlassian Data Center (DC) host products (Confluence first, Jira later) from the official `.tar.gz` archives.
2. **Playwright end-to-end (E2E) tests** for TechTime apps running on those hosts. The first app under test is **Embed Google Maps Pro for Confluence** (TechTime).

Read this whole file before doing any task. Follow the rules exactly. If a rule blocks a task, stop and ask the user instead of working around it.

**Current status (2026-10-27):**

1. Host profiles working end to end (`up`, `restore`, tests): `confluence-8.5.31` and `confluence-9.2.26`.
2. App under test: Embed Google Maps Pro 8.1.5 (`apps/confluence.plugins.googlemapsembed-8.1.5.obr`).
3. Tests: 4 `@smoke` tests, passing 10 consecutive runs on both hosts. 22 `@full` tests (section 5.3), passed 1 run on both hosts; the 10-run check (section 8.3) is not done yet: the first attempt was stopped because the machine ran out of memory.
4. Not built yet: a 6.6.17 profile, `tests-forge/`, CI (Bitbucket Pipelines), a git repository (the user will decide when to commit).
5. Open questions: `docs/notes/open-questions.md`. User commands: `README.md`.

---

## 1. Working style for this user

The user is autistic and processes information best with clear structure.

1. Be direct and literal.
2. Use numbered lists and bullet points.
3. Define technical terms the first time you use them.
4. No metaphors.
5. Show logical steps explicitly.
6. Say when you are uncertain, and say what would resolve the uncertainty.
7. No motivational language.

When a fact is not known (a URL, a setting name, a version range), do not guess. Either verify it (run a command, fetch the page) or ask the user. Record verified facts in `docs/notes/` (see section 9).

---

## 2. Decisions already made (do not re-open without asking)

1. **Framework:** Playwright with TypeScript. Do not write new Cypress tests.
2. **One shared DC suite:** a test scenario is written once and runs on every DC host version. Host differences live only in **platform adapters**.
3. **Forge (Cloud) tests are a separate suite** in `tests-forge/`. Do not mix with DC tests.
4. **Test creation:** AI-drafted (Playwright test agents or you), always human-reviewed before merge.
5. **Artifacts on failure only:** `screenshot: 'only-on-failure'`, `trace: 'retain-on-failure'`, `video: 'off'`.
6. **UI for actions and assertions; REST API only for setup and teardown.**
7. **Pinned environments:** every host version is defined by a version profile file and starts from a known state.
8. **Environment and tests are separate.** `env/` builds and runs instances (including the setup wizard and app install). `tests/` only needs a base URL and admin credentials, and never imports or calls anything in `env/`. Reason: the tests may later run in Bitbucket Pipelines against an environment configured separately, and the app code and tests must be changeable without breaking environment configuration (user decision, 2026-10-27).

---

## 3. Repository layout

```
.
├── CLAUDE.md
├── README.md                      # commands for the user
├── .env.local.example             # template for .env.local (git-ignored: credentials, licences)
├── env/                           # ENVIRONMENT (see section 4)
│   ├── atl-env.sh                 # single entry point script
│   ├── lib/common.sh              # helper shell functions sourced by atl-env.sh
│   ├── profiles/
│   │   ├── confluence-8.5.31.env  # one file per host version
│   │   └── confluence-9.2.26.env
│   ├── setup/                     # setup wizard automation (own Playwright config)
│   │   ├── playwright.config.ts
│   │   ├── confluence-setup.setup.ts
│   │   └── wizards/               # SetupWizard interface; Confluence8Wizard, Confluence9Wizard (extends 8)
│   ├── downloads/                 # cached archives (git-ignored)
│   └── instances/                 # install dir, logs, snapshot per profile (git-ignored)
├── apps/                          # app .jar/.obr files to install (git-ignored)
├── tests/                         # TESTS (see section 6)
│   ├── targets.ts                 # host instances: one Playwright project each, base URL overridable
│   ├── setup/
│   │   ├── login.setup.ts         # per target, before tests: log in (.auth/<target>.json), create test space
│   │   └── cleanup.teardown.ts    # per target, after tests: delete the test space
│   ├── adapters/                  # HostAdapter interface; Confluence8Adapter, Confluence9Adapter (extends 8)
│   ├── pages/                     # page objects for app screens (host-independent); also ExportedPdf, XssProbe
│   ├── fixtures/                  # fixtures; REST helpers for setup/teardown ONLY
│   └── specs/
│       └── google-maps-pro/       # test files for one app (+ data.ts)
├── scripts/
│   ├── atl.mjs                    # npm command runner: setup/start/restore/status/logs/stop/shutdown/test with --env
│   └── check-test-rules.mjs       # selector and API rule check (npm run check)
├── tests-forge/                   # separate Cloud suite (later; does not exist yet)
├── docs/
│   └── notes/                     # verified facts, discoveries, open questions
├── playwright.config.ts           # test suite config
├── package.json, tsconfig.json
└── .gitignore
```

`.auth/` holds the saved login state and the run's test space key (git-ignored; created by the setup project).

Git-ignore: `node_modules/`, `env/downloads/`, `env/instances/`, `env/setup/test-results/`, `env/setup/playwright-report/`, `apps/*.jar`, `apps/*.obr`, `test-results/`, `playwright-report/`, `.auth/`, `.env.local`.

---

## 4. Environment script: `env/atl-env.sh`

### 4.1 Purpose

One script that works for every Confluence version (and later Jira) without code changes. All version differences come from the profile file.

Current profiles (verified, both run at the same time): `confluence-8.5.31` (port 8090) and `confluence-9.2.26` (port 8100). A `confluence-6.6.17` profile is possible later; it would need Java 8 and app build 6.0.x (see 5.1).

The script is written for Git Bash on Windows with Docker Desktop. It also sets `MSYS_NO_PATHCONV=1` so Git Bash does not rewrite container paths.

### 4.2 Commands

```
env/atl-env.sh <profile> <command>

commands:
  download    fetch the .tar.gz into env/downloads/ (skip if already present, verify checksum if available)
  install     extract into env/instances/<profile>/install
  configure   write home dir config, memory settings, port, context path, DB connection
  start       start the database (if needed) and the product; wait until healthy
  stop        stop the product and its database
  status      print state (stopped / starting / FIRST_RUN / RUNNING)
  logs        tail the product log
  reset       stop, delete home dir + DB data, re-configure (clean starting state)
  setup       run the first-time setup wizard (Playwright, env/setup/)
  install-app install APP_FILES through UPM REST and apply the app licence
  snapshot    save home dir + DB dump after first-time setup is complete
  restore     restore the saved snapshot (fast clean state for each test run)
  up          download, install, start, setup, install-app, snapshot (full build)
```

Example: `env/atl-env.sh confluence-8.5.31 start`

**npm commands** (`scripts/atl.mjs`, documented in `README.md`): `npm run setup|start|restore|status|logs|stop|shutdown -- --env confluence:8.5.31` call `atl-env.sh` (`setup` = `up`). `npm run test|test:smoke -- --env <host> [--autoshutdown] [playwright args]` runs Playwright with `--project <profile>`, checks `/status` first, and with `--autoshutdown` stops the host afterwards. `--env` is `<product>:<version>` or the profile name; a comma separates several hosts. The runner uses Git Bash explicitly (`C:\Program Files\Git\bin\bash.exe` or `ATL_BASH`), because `bash` on the Windows PATH is WSL's bash. Keep the runner as the only place that joins `env/` and `tests/`; the tests still never import `env/` (decision 2.8).

### 4.3 Profile file format

Each profile is a plain `KEY=value` file sourced by the script. Example fields:

```
PRODUCT=confluence
VERSION=8.5.31
ARCHIVE_URL=<verified; see 4.6>
ARCHIVE_MD5=<from https://my.atlassian.com/download/feeds/archived/confluence.json>
JAVA_MAJOR=17
JAVA_IMAGE=eclipse-temurin:17-jdk
DB_TYPE=postgres
DB_IMAGE=postgres:14                    # a version supported by this product version
DB_PORT=5433                            # unique per profile
DB_NAME=confluence
DB_USER=confluence
DB_PASSWORD=confluence                  # local test DB only, not a secret
HTTP_PORT=8090                          # unique per profile, so instances can run together
CONTEXT_PATH=
JVM_MIN_MEM=1024m
JVM_MAX_MEM=2048m
EXTRA_JVM_OPTS="-Dupm.plugin.upload.enabled=true"
LICENSE_ENV_VAR=ATL_LICENSE_CONFLUENCE_DC   # name of the .env.local variable holding the host licence
APP_LICENSE_ENV_VAR=ATL_LICENSE_APP_DC      # name of the .env.local variable holding the app licence
SETUP_WIZARD=confluence-8                   # wizard class in env/setup/wizards/
APP_KEY=org.techtime.confluence.plugins.googlemapsembed
APP_FILES="apps/confluence.plugins.googlemapsembed-8.1.5.obr"
```

### 4.4 Required behaviour

1. **Idempotent.** Running any command twice must not break anything. Example: `download` skips an existing valid archive.
2. **Fail loudly.** `set -euo pipefail`. Every failure prints which step failed and the next command to run for diagnosis.
3. **Java per profile.** The product must run on the Java major version in `JAVA_MAJOR`.
    - Implemented: the extracted product runs inside a Docker container from `JAVA_IMAGE` (`eclipse-temurin:<JAVA_MAJOR>-jdk`), with the install dir, home dir and logs mounted. This gives the same Java on every machine.
    - Not implemented: a local-JDK fallback (for example `JAVA17_HOME`). The script requires Docker and stops if Docker is missing. Ask the user before adding the fallback.
    - Verified: Confluence 8.5 supports Java 11 and 17; Confluence 9.2 supports Java 17 and 21. Confluence 6.6 requires Java 8 (not verified here). For a new profile, check Atlassian's "Supported platforms" page for that version and record the result in `docs/notes/hosts.md`.
4. **Database.** PostgreSQL in Docker, one container per profile, on the profile's `DB_PORT` (published on `127.0.0.1` only). Verified: 8.5 supports PostgreSQL 12–14 (profile uses 14); 9.2 supports 15–16 (profile uses 16). Do not use the embedded evaluation database unless the user approves it.
5. **Health check.** After `start`, poll `http://127.0.0.1:<HTTP_PORT><CONTEXT_PATH>/status` until it reports `{"state":"RUNNING"}` or `{"state":"FIRST_RUN"}`, with a timeout (15 minutes). Verified on 8.5.31 and 9.2.26.
6. **No secrets in the repo.** Licence keys are read from environment variables or `.env.local` (git-ignored). Never write a licence key into a committed file.
7. **Reset must be complete.** After `reset` + first-time setup, every run starts from the same data.
8. **Use `127.0.0.1`, never `localhost`.** On this Windows machine `localhost` resolves to `::1`, which is held by `wslrelay` and never answers. Ports are published on `127.0.0.1` only. The server base URL is taken from the address used for the setup wizard, so the wizard must also use `127.0.0.1`.
9. **JVM options go in `CATALINA_OPTS`.** `bin/start-confluence.sh` overwrites `START_CONFLUENCE_JAVA_OPTS`. Profile-specific options go in `EXTRA_JVM_OPTS`.
10. **The product container holds no state.** Install dir (bind mount), home dir (Docker volume) and logs (bind mount to `env/instances/<profile>/home/logs/`) are mounted, so `start` re-creates a stopped container to apply profile changes.

### 4.5 Licences

1. Use Atlassian **timebomb licences** from https://developer.atlassian.com/platform/marketplace/timebomb-licenses-for-testing-server-apps/
2. In use (user said, 2026-10-27): "10 user Confluence Data Center license, expires in 3 hours" (host, `.env.local` variable `ATL_LICENSE_CONFLUENCE_DC`) and "10 user Data Center app license, expires in 3 hours" (app, `ATL_LICENSE_APP_DC`). Both were accepted on 8.5.31 and 9.2.26.
3. Known limits:
    - The licences expire after about 3 hours; the site then becomes read-only (space creation returns HTTP 403). `restore` resets this (verified on 9.2.26, 2026-10-27). Not verified: whether a plain restart also resets it (`docs/notes/open-questions.md`). Plan for `restore` before each run, not long-lived instances.
    - Community reports say **Server** timebomb licences stopped working on Confluence 7.17 and later. Confluence 9.x accepts Data Center licences only. Use the **Data Center** timebomb licences.
    - Community reports say some timebomb licences are rejected on very new versions (for example Jira 11). If rejected, stop and tell the user; do not search for other licence keys.
4. App licences are applied through the Universal Plugin Manager (UPM) REST API by `install-app`.

### 4.6 Download URLs

Do not hard-code a guessed URL. Steps:

1. Find the archive URL and MD5 for the exact version in Atlassian's download feeds: `https://my.atlassian.com/download/feeds/current/confluence.json` and `.../archived/confluence.json`. The feed's `www.atlassian.com/.../binary/` URL redirects (HTTP 301) to `https://product-downloads.atlassian.com/software/confluence/downloads/atlassian-confluence-<version>.tar.gz`; put the final URL in the profile.
2. Confirm it with an HTTP HEAD request before writing it into the profile.
3. If the URL cannot be confirmed, ask the user to download the archive manually into `env/downloads/`. `download` accepts a pre-placed file when its MD5 matches `ARCHIVE_MD5`.

### 4.7 First-time setup (setup wizard)

The `.tar.gz` install starts in the setup wizard (state FIRST_RUN). The wizard is automated with Playwright in `env/setup/confluence-setup.setup.ts` (own config: `env/setup/playwright.config.ts`), not with shell scraping. It is part of the environment, not of the test suite (decision 2.8). `env/atl-env.sh <profile> up` runs all steps:

1. Choose production installation (not evaluation).
2. Enter the host licence from the env var.
3. Connect to the PostgreSQL database.
4. Create an empty site, create the admin user (credentials from `.env.local`).
5. Disable secure administrator sessions (websudo) in **Administration > Security configuration** (test instances only).
6. Disable onboarding / "what's new" (UPM REST: disable the system plugins `confluence-onboarding` and `whatsnew`).
7. Install apps from `APP_FILES` via UPM REST (`install-app` command; REST is allowed here because this is setup).
8. Apply app timebomb licences (same command).
9. Run `env/atl-env.sh <profile> snapshot`.

Wizard screens differ between host versions. Put the differences in a `SetupWizard` class in `env/setup/wizards/` (selected by the profile's `SETUP_WIZARD`), not in `if` branches inside the setup file. The wizard is driven by the current URL in a loop, because some screens are only saved together with the next one. Verified screens: `docs/notes/hosts.md`.

Current classes: `Confluence8Wizard` (8.5.31) and `Confluence9Wizard` (9.2.26). The wizard screens are the same on both; `Confluence9Wizard` only changes the login form ids, because 9.2 has a redesigned login page.

---

## 5. App under test: Embed Google Maps Pro (TechTime)

### 5.1 Known facts

- Marketplace page: https://marketplace.atlassian.com/apps/16985/embed-google-maps-pro-for-confluence
- App key: `org.techtime.confluence.plugins.googlemapsembed`
- Host product: **Confluence only** (no Jira version). The Jira adapter is not needed for this app.
- It is a **Confluence macro** that embeds Google Maps content in a page.
- App file under test: `apps/confluence.plugins.googlemapsembed-8.1.5.obr`, compatible with Confluence 7.0.1 – 9.5.4 (user said, 2026-10-27).
- Older builds (Marketplace version history): app 6.0.4 for Confluence 6.0.1 – 7.15.3 (needed for a 6.6.17 profile); app 7.1.4 for 7.0.1 – 8.7.2.
- A Cloud (Forge) version exists → belongs in `tests-forge/` later.
- Macro title "Google Maps" (key `googlemaps-embed`), parameters, rendered DOM and error messages: verified and recorded in `docs/notes/google-maps-pro.md`. No Google API key or admin configuration is needed.
- Second macro "Google Maps for a List of Addresses" (key `googlemaps-list-of-addresses`): a body macro, one address per line, rendered as a Google static map `<img>` or an error list. Place links, unicode, PDF export and XSS behaviour: same notes file.

### 5.2 Discovering new facts

Record every new fact in `docs/notes/google-maps-pro.md`. How to discover: read the plugin descriptor and `.properties` files inside the OBR/JAR, explore the running instance with a browser, read the app's documentation linked from the Marketplace page, and ask the user. Do not invent parameter names.

### 5.3 Test scenarios to cover first (`@smoke`)

1. App is installed and enabled (check in UPM UI).
2. Insert the macro through the editor's macro browser with a valid address, save the page, view the page: the map element is present.
3. Edit an existing map macro, change one parameter, save: the rendered map reflects the change.
4. Invalid parameter: the user sees an error message (not a blank page or a stack trace). Implemented with an invalid "Google Map link". Note: an empty Location renders a world map, not an error; this is intended (user confirmed 2026-10-27).

Status: all 4 are implemented in `tests/specs/google-maps-pro/smoke.spec.ts` and pass 10 consecutive runs on 8.5.31 and 9.2.26 (2026-10-27).

Then `@full`: each documented parameter, admin configuration (if any), page export/view-as-anonymous (if supported), and macro inside other content (tables, page layouts).

`@full` status (user asked, 2026-10-27), all in `tests/specs/google-maps-pro/`:

1. `unicode.spec.ts`: locations in Japanese, Arabic, Cyrillic, accents + emoji, with a language each.
2. `place-links.spec.ts`: Google Maps place links (by name, unicode name, with coordinates).
3. `list-of-addresses.spec.ts`: the List of Addresses macro, valid input and bad input (unknown addresses, SQL text, out-of-range coordinates, 3000 characters).
4. `pdf-export.spec.ts`: Export to PDF of a page with each macro.
5. `xss.spec.ts`: basic XSS payloads in Location, Title, Google Map link and the List of Addresses body.

Not covered yet: `docs/notes/open-questions.md` ("Next work" and items 7–9).

### 5.4 Rules specific to this app

1. **Do not assert on Google map tiles or map pixels.** Google content loads from an external, cross-origin service and changes without notice. Assert on things the app controls: the presence of the map container/iframe, its attributes (for example the `src` contains the expected query), and visible app error messages.
2. **Test data via REST:** create the test space and an empty page with REST in a fixture. Inserting and configuring the macro must be done through the editor UI.
3. Use the same test addresses everywhere, stored in `tests/specs/google-maps-pro/data.ts`.
4. If tests need to run without internet access, ask the user first before adding any network blocking or mocking of Google requests.

---

## 6. Test architecture

### 6.1 Layers

1. **Specs** (`tests/specs/`): scenario steps and assertions. No host-specific code. No raw selectors.
2. **Page objects** (`tests/pages/`): one class per app screen or dialog (for example `GoogleMapsMacroDialog`). Use `data-testid` where the app markup has it; otherwise role + accessible name.
3. **Adapters** (`tests/adapters/`): everything that differs between host products or versions:
    - login form, admin URLs, menu paths
    - how to open the editor, open the macro browser, insert a macro, save and publish a page
    - the container element of a rendered macro, the app management (UPM) screen
    - typing into a body macro, exporting a page to PDF
    - Every adapter implements the same TypeScript interface (`HostAdapter`).
    - Current adapters: `Confluence8Adapter` (8.5.31) and `Confluence9Adapter` (9.2.26; extends the 8 adapter and only changes the login form ids). Selected by `adapter` in `tests/targets.ts`.
    - Setup wizard differences are NOT here; they live in `env/setup/wizards/` (decision 2.8).
4. **Fixtures** (`tests/fixtures/`): REST helpers for setup/teardown, the run's test space key, an empty page per test (unique title), failure evidence, and creation of the adapter from the Playwright project config.

### 6.2 Playwright config

1. One Playwright **project per host version**, listed in `tests/targets.ts` and named after the profile (for example `confluence-8.5.31`). Each sets `baseURL`, `hostBaseURL` and an `adapterName` option. The base URL can be overridden with the environment variable named in the target (for example `ATL_BASE_URL_CONFLUENCE_8_5_31`).
2. A setup project per host (`tests/setup/login.setup.ts`) logs in once, saves `storageState` to `.auth/<target>.json`, and creates one test space for the run (key in `.auth/<target>.space.json`). Test projects depend on it. Its teardown project (`tests/setup/cleanup.teardown.ts`) deletes the space. Spaces are never created in parallel: Confluence 9.2 fails with HTTP 500 (duplicate key `bandana_unique_key`) when two spaces are created at the same moment.
3. `use: { screenshot: 'only-on-failure', trace: 'retain-on-failure', video: 'off', actionTimeout: 20_000, navigationTimeout: 60_000, locale: 'en-US' }`. `workers: 2`, test timeout 90 s. Wait for URL changes with `waitUntil: 'commit'`: Confluence pages keep loading in the background, so waiting for the `load` event times out.
4. Reporters: `html` (open: 'never'), `junit`, `list`.
5. `forbidOnly: !!process.env.CI`. Retries: 0 locally, at most 1 in CI. A test that only passes on retry is reported as flaky and must be fixed.
6. Tests that apply to one host only: tag (for example `@confluence-8-only`) and filter with `grep` / `grepInvert` per project. Never `if (host === ...)` inside a spec.

### 6.3 Selector rules (enforced)

Priority, highest first:

1. `getByTestId(...)` — only for markup the team controls.
2. `getByRole(role, { name })`, `getByLabel(...)`.
3. Stable, human-written ids or AUI classes from the host (for example a form field id) — **only inside adapters**.

Banned everywhere:

- Generated or hashed class names (for example `css-1x2y3z`, `_a8f2`, `sc-…`).
- Minified or numeric auto-generated ids.
- `nth-child`, `nth()` used to pick an element by position (except inside a verified, stable list with a comment explaining why).
- Absolute XPath.
- `page.waitForTimeout(...)` and any fixed sleep.

Run all tests with the UI language set to English.

How `npm run check` (`scripts/check-test-rules.mjs`) applies these rules:

- `.nth()`, `.first()` and `.last()` are rejected unless the same line has a `// stable-list: <reason>` comment.
- `page.locator(...)` is rejected in specs; adapters and page objects may use it within the priority above.
- Documented exception: `GoogleMapsMacroView` selects the rendered map by element type (`iframe`), because the app's iframe has no test id, role or accessible name. If the app adds a `data-testid`, switch to it.

### 6.4 API vs UI rules (enforced)

1. Allowed in fixtures and setup files only: `request.*`, `fetch(`, any REST client.
2. Not allowed inside `test(...)` bodies or page objects: direct HTTP calls.
3. The action being tested and every assertion must go through the browser page.
4. Documented exception, PDF export: the test triggers the export in the browser and then reads the file the browser downloaded (`tests/pages/ExportedPdf.ts`: PDF header and embedded image sizes). This is not an HTTP call; it is the only way to check what the user receives.
5. XSS checks: `tests/pages/XssProbe.ts` records every `alert`/`confirm`/`prompt` dialog of the page (all frames). Payloads call `alert('<marker>')`; a test passes only if no dialog opened.
6. REST setup calls use their own request context with an empty `storageState` (helper `restContext` in `tests/fixtures/index.ts`), never the built-in `request` fixture. Reason: Playwright gives `request` the browser's session cookie, and on Confluence 9.2 a Basic-auth call with that cookie ends the browser session (verified 2026-10-27).

### 6.5 Step naming

Wrap every page-object and adapter method body in `test.step('<user-level action>', ...)`, for example `test.step('Insert Google Maps macro', ...)`. Failure reports must name the user action, not only a line number.

### 6.6 Failure evidence

On failure, attach to the test result (implemented by the automatic `failureEvidence` fixture in `tests/fixtures/index.ts`):

1. Host target name and version, and the app version (read from UPM REST when the test fails).
2. Browser console errors (collected during the test).
3. The last 200 lines of the product log: `env/instances/<profile>/home/logs/atlassian-confluence.log`, or the file in `ATL_LOG_FILE` when the environment is elsewhere.

---

## 7. Suite size limits

1. Every test has exactly one of the tags `@smoke` or `@full`.
2. `@smoke` across one host must finish in under 10 minutes. If it does not, move tests to `@full` or push checks down to lower-level tests; tell the user.
3. Maximum 5 `@smoke` tests per app feature. Ask before exceeding.
4. Before writing a new E2E test, state in one line why it cannot be a unit or integration test.

---

## 8. Definition of done for a new test

1. Uses page objects and adapters; no raw selectors in the spec.
2. Passes the selector and API rules and the TypeScript check: `npm run check`.
3. Passes **10 consecutive runs** on every host project it applies to: `npx playwright test <file> --repeat-each=10` (all hosts must be running).
4. Has a `@smoke` or `@full` tag.
5. Produces no artifacts when passing.
6. Any newly discovered host or app fact is written to `docs/notes/`.

---

## 9. Notes and uncertainty log

- `docs/notes/hosts.md`: verified facts per host version (Java, DB versions, download URL, status endpoint, websudo setting, wizard differences).
- `docs/notes/google-maps-pro.md`: verified facts about the app (macro name, parameters, DOM output, config pages).
- `docs/notes/open-questions.md`: anything unverified, with what would resolve it, and resolved items.
- `README.md`: commands and troubleshooting for the user. Update it when commands, profiles, ports or tests change.

Each entry: the fact, how it was verified (command, URL, or "user said"), and the date.

---

## 10. Things you must ask before doing

1. Committing or changing any licence-related value.
2. Using an embedded/evaluation database instead of PostgreSQL.
3. Adding visual regression (screenshot comparison) tests.
4. Mocking or blocking network requests to Google.
5. Letting the healer agent change a test's assertions (it may change locators; assertion changes need approval).
6. Deleting anything outside `env/instances/`, `test-results/` and `playwright-report/`.
