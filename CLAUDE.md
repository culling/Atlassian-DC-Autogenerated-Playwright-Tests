# CLAUDE.md — Atlassian App UI Test Automation

This repository holds two things:

1. **Environment scripts** that download, configure and run Atlassian Data Center (DC) host products (Confluence and Jira Software) from the official `.tar.gz` archives.
2. **Playwright end-to-end (E2E) tests** for TechTime apps running on those hosts. The app under test is **EasySSO** (TechTime): EasySSO for Confluence and EasySSO for Jira.

`_reference/` holds the previous project (Embed Google Maps Pro on Confluence 8.5.31 and 9.2.26), moved there unchanged on the user's request (2026-10-27). It has its own `CLAUDE.md`. It is a reference: copy patterns from it, but do not change it unless the user asks.

Read this whole file before doing any task. Follow the rules exactly. If a rule blocks a task, stop and ask the user instead of working around it.

**Current status (2026-10-28):**

1. Host profiles working end to end (`up`, tests): `confluence-6.6.17`, `confluence-9.5.4` (user, 2026-10-28: "please also get it to test on confluence 9"), `jira-8.22.1` and `jira-10.7.4` (user, 2026-10-28: the same EasySSO tests with EasySSO for Jira on Jira 8.22.1, then on the highest Jira version supported by that release).
2. Apps under test: EasySSO for Confluence 5.2.4 (`apps/confluence.plugins.easysso-5.2.4.obr`, Confluence 6.0.1 – 9.5.4) and EasySSO for Jira 5.2.4 (`apps/jira.plugins.easysso-5.2.4.obr`, Jira 8.22.0 – 10.7.4).
3. Tests: 1 `@smoke` test (HTTP header login). On 6.6.17: 10 consecutive runs passed three times (the third on a fresh `reset` + `up`), and after `restore`. On 9.5.4, Jira 8.22.1 and Jira 10.7.4: 10 consecutive runs passed, the negative copy failed as expected, and it passed after `restore`; both Jira hosts were built from a clean `reset` + `up`. The user said: only the HTTP headers test for now.
4. Not built yet: other hosts for EasySSO (Confluence 8.x and 9.2), `tests-forge/`, CI (Bitbucket Pipelines). Jira versions between 8.22.1 and 10.7.4: not for now (user, 2026-10-28; may be reviewed later together with automating configuration).
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
9. **Git:** the repository was created and the Google Maps project committed on the user's request (2026-10-27). Commit only when the user asks.

---

## 3. Repository layout

```
.
├── CLAUDE.md
├── README.md                      # commands for the user
├── .env.local.example             # template for .env.local (git-ignored: credentials, licences)
├── .gitattributes                 # LF line endings (core.autocrlf=true on this machine would break bash scripts)
├── env/                           # ENVIRONMENT (see section 4)
│   ├── atl-env.sh                 # single entry point script
│   ├── lib/common.sh              # helper shell functions sourced by atl-env.sh
│   ├── profiles/
│   │   ├── confluence-6.6.17.env  # one file per host version
│   │   ├── confluence-9.5.4.env
│   │   ├── jira-8.22.1.env
│   │   └── jira-10.7.4.env
│   ├── setup/                     # setup wizard automation (own Playwright config)
│   │   ├── playwright.config.ts
│   │   ├── host-setup.setup.ts
│   │   └── wizards/               # SetupWizard interface; Confluence8Wizard (base), Confluence6Wizard, Confluence9Wizard (extend 8); JiraWizard, Jira10Wizard (extends JiraWizard)
│   ├── downloads/                 # cached archives (git-ignored)
│   └── instances/                 # install dir, logs, snapshot per profile (git-ignored)
├── apps/                          # app .jar/.obr files to install (git-ignored)
├── tests/                         # TESTS (see section 6)
│   ├── targets.ts                 # host instances: one Playwright project each, base URL overridable
│   ├── setup/
│   │   └── login.setup.ts         # per target, before tests: log in as admin (.auth/<target>.json)
│   ├── adapters/                  # HostAdapter interface; Confluence6Adapter, Confluence9Adapter (extends 6); JiraAdapter, Jira10Adapter (extends JiraAdapter)
│   ├── pages/                     # page objects for app screens (host-independent)
│   ├── fixtures/                  # fixtures; REST helpers for setup/teardown ONLY
│   └── specs/
│       └── easysso/               # test files for one app (+ data.ts)
├── scripts/
│   ├── atl.mjs                    # npm command runner: setup/start/restore/status/logs/stop/shutdown/test with --env
│   └── check-test-rules.mjs       # selector and API rule check (npm run check)
├── tests-forge/                   # separate Cloud suite (later; does not exist yet)
├── docs/
│   └── notes/                     # verified facts, discoveries, open questions
├── _reference/                    # previous project (Embed Google Maps Pro), unchanged
├── playwright.config.ts           # test suite config
├── package.json, tsconfig.json
└── .gitignore
```

`.auth/` holds the saved login state (git-ignored; created by the setup project).

Git-ignore: `node_modules/`, `env/downloads/`, `env/instances/`, `env/setup/test-results/`, `env/setup/playwright-report/`, `apps/*.jar`, `apps/*.obr`, `test-results/`, `playwright-report/`, `.auth/`, `.env.local`. `_reference/.gitignore` applies the same rules inside `_reference/`.

---

## 4. Environment script: `env/atl-env.sh`

### 4.1 Purpose

One script that works for every Confluence version (and later Jira) without code changes. All version differences come from the profile file.

Current profiles (verified): `confluence-6.6.17` (port 8066, DB port 5436), `confluence-9.5.4` (8095, 5437), `jira-8.22.1` (8822, 5438) and `jira-10.7.4` (8107, 5439). The `_reference` profiles use ports 8090/8100 and 5433/5434, so both projects can run at the same time.

**Docker object names come from the profile name** (`atl-<profile>-app`, `-db`, `-home`, `-pgdata`). Never create a profile here with the same name as a `_reference` profile (`confluence-8.5.31`, `confluence-9.2.26`): both projects would use the same containers and volumes, and `reset` here would delete the `_reference` instance's data. This is why Confluence 9 is tested with 9.5.4 (verified 2026-10-28).

The script is written for Git Bash on Windows with Docker Desktop. It sets `MSYS_NO_PATHCONV=1` so Git Bash does not rewrite container paths. Consequence: a host path given to a Windows program (`docker.exe`, `curl.exe`) must be converted with `hostpath` (C:/ form). Without it, `curl` fails with error 23 (verified 2026-10-27).

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

Example: `env/atl-env.sh confluence-6.6.17 start`

**npm commands** (`scripts/atl.mjs`, documented in `README.md`): `npm run setup|start|restore|status|logs|stop|shutdown -- --env confluence:6.6.17` call `atl-env.sh` (`setup` = `up`). `npm run test|test:smoke -- --env <host> [--autoshutdown] [playwright args]` runs Playwright with `--project <profile>`, checks `/status` first, and with `--autoshutdown` stops the host afterwards. `--env` is `<product>:<version>` or the profile name; a comma separates several hosts. The runner uses Git Bash explicitly (`C:\Program Files\Git\bin\bash.exe` or `ATL_BASH`), because `bash` on the Windows PATH is WSL's bash. Keep the runner as the only place that joins `env/` and `tests/`; the tests still never import `env/` (decision 2.8).

### 4.3 Profile file format

Each profile is a plain `KEY=value` file sourced by the script. See `env/profiles/confluence-6.6.17.env`. Fields: `PRODUCT`, `VERSION`, `ARCHIVE_URL`, `ARCHIVE_MD5`, `JAVA_MAJOR`, `JAVA_IMAGE`, `DB_TYPE`, `DB_IMAGE`, `DB_PORT` (unique per profile), `DB_NAME`, `DB_USER`, `DB_PASSWORD` (local test DB only, not a secret), `HTTP_PORT` (unique per profile), `CONTEXT_PATH`, `JVM_MIN_MEM`, `JVM_MAX_MEM`, `EXTRA_JVM_OPTS`, `LICENSE_ENV_VAR` and `APP_LICENSE_ENV_VAR` (names of the `.env.local` variables, never the keys), `SETUP_WIZARD` (wizard class in `env/setup/wizards/`), `APP_KEY`, `APP_FILES`.

### 4.4 Required behaviour

1. **Idempotent.** Running any command twice must not break anything. Example: `download` skips an existing valid archive.
2. **Fail loudly.** `set -euo pipefail`. Every failure prints which step failed and the next command to run for diagnosis.
3. **Java per profile.** The product runs inside a Docker container from `JAVA_IMAGE` (`eclipse-temurin:<JAVA_MAJOR>-jdk`), with the install dir, home dir and logs mounted. No local-JDK fallback; ask the user before adding one. Verified: Confluence 6.6 supports Java 1.8 (AdoptOpenJDK 8 from 6.6.12); profile uses Temurin 8. Confluence 9.5 supports Java 21 (17 deprecated); profile uses Temurin 21. Jira 8.22 supports Java 8 and 11; profile uses Temurin 11. Jira 10.7 supports Java 21 (17 deprecated); profile uses Temurin 21. For a new profile, check Atlassian's "Supported platforms" page for that version and record the result in `docs/notes/hosts.md`.
4. **Database.** PostgreSQL in Docker, one container per profile, on the profile's `DB_PORT` (published on `127.0.0.1` only). Verified: 6.6 supports PostgreSQL 9.2–9.6 (profile uses 9.6); 9.5 supports PostgreSQL 16 (15 deprecated; profile uses 16). Jira 8.22 supports PostgreSQL 10–13 (profile uses 13); Jira 10.7 supports 16 (12–15 deprecated; profile uses 16). Do not use the embedded evaluation database unless the user approves it.
5. **Health check.** After `start`, poll `http://127.0.0.1:<HTTP_PORT><CONTEXT_PATH>/status` until it reports `{"state":"RUNNING"}` or `{"state":"FIRST_RUN"}`, with a timeout (15 minutes). Verified on all four profiles. **Jira reports FIRST_RUN before its plugin system has started** (10.7.4: pages answer HTTP 503 for about 1 minute after FIRST_RUN), so `JiraWizard` waits for a real wizard page before its first step.
6. **No secrets in the repo.** Licence keys are read from environment variables or `.env.local` (git-ignored). Never write a licence key into a committed file.
7. **Reset must be complete.** After `reset` + first-time setup, every run starts from the same data.
8. **Use `127.0.0.1`, never `localhost`.** On this Windows machine `localhost` resolves to `::1`, which is held by `wslrelay` and never answers. Ports are published on `127.0.0.1` only. The server base URL is taken from the address used for the setup wizard, so the wizard must also use `127.0.0.1`.
9. **JVM options go in `CATALINA_OPTS`.** Profile-specific options go in `EXTRA_JVM_OPTS`.
10. **The product container holds no state.** Install dir (bind mount), home dir (Docker volume) and logs (bind mount to `env/instances/<profile>/home/logs/`, Jira: `home/log/`) are mounted, so `start` re-creates a stopped container to apply profile changes.
11. **Product differences in one place.** `PRODUCT` (`confluence` | `jira`) in the profile selects the start script, Tomcat port, log directory and the `configure_<product>_files` function (`env/lib/common.sh`, `env/atl-env.sh`). Version differences stay in the profile. Jira specifics: home from the `JIRA_HOME` environment variable; `configure` writes `dbconfig.xml` (database connection, so the wizard has no database screen) and `jira-config.properties` (`jira.websudo.is.disabled = true`) into the home volume if they are missing; the product log is `<home>/log/atlassian-jira.log`.

### 4.5 Licences

1. Use Atlassian **timebomb licences** from https://developer.atlassian.com/platform/marketplace/timebomb-licenses-for-testing-server-apps/
2. In use (user said, 2026-10-27): "10 user Confluence Data Center license, expires in 3 hours" (host, `.env.local` variable `ATL_LICENSE_CONFLUENCE_DC`) and "10 user Data Center app license, expires in 3 hours" (app, `ATL_LICENSE_APP_DC`). Both were accepted on 6.6.17 and 9.5.4 (app: EasySSO 5.2.4). Jira: "10 user Jira Software Data Center license, expires in 3 hours" (`ATL_LICENSE_JIRA_DC`); the user asked Claude to take it from the timebomb page and add it to `.env.local` (2026-10-28). Accepted on 8.22.1 and 10.7.4; the app licence key is accepted by EasySSO for Jira too.
3. Known limits:
    - **On Confluence 6.6 a Data Center licence requires a cluster** (not on 9.5). The setup creates a one-node cluster (section 4.7). Do not switch to a Server licence without asking (EasySSO 5.2.4 is listed for Data Center only).
    - The licences expire after about 3 hours; the site then becomes read-only. On 9.2.26 `restore` reset this; on 6.6.17 not verified yet. Plan for `restore` before each run, not long-lived instances.
    - If a licence is rejected, stop and tell the user; do not search for other licence keys.
4. App licences are applied through the Universal Plugin Manager (UPM) REST API by `install-app`.

### 4.6 Download URLs

Do not hard-code a guessed URL. Steps:

1. Find the archive URL and MD5 for the exact version in Atlassian's download feeds: `https://my.atlassian.com/download/feeds/current/confluence.json` and `.../archived/confluence.json`. The feed's `www.atlassian.com/.../binary/` URL redirects (HTTP 301) to `https://product-downloads.atlassian.com/software/confluence/downloads/atlassian-confluence-<version>.tar.gz`; put the final URL in the profile.
2. Confirm it with an HTTP HEAD request before writing it into the profile.
3. If the URL cannot be confirmed, ask the user to download the archive manually into `env/downloads/`. `download` accepts a pre-placed file when its MD5 matches `ARCHIVE_MD5`.

App files: find the version and its compatibility range with the Marketplace REST API (`https://marketplace.atlassian.com/rest/2/addons/<app key>/versions`); the download link is in each version's `_embedded.artifact._links.binary`.

### 4.7 First-time setup (setup wizard)

The `.tar.gz` install starts in the setup wizard (state FIRST_RUN). The wizard is automated with Playwright in `env/setup/host-setup.setup.ts` (one file for every product; own config: `env/setup/playwright.config.ts`), not with shell scraping. It is part of the environment, not of the test suite (decision 2.8). `env/atl-env.sh <profile> up` runs all steps:

1. Choose production installation (not evaluation). On 6.6: skip "Get add-ons".
2. Enter the host licence from the env var.
3. On 6.6 with a DC licence: create a one-node cluster (shared home inside the home volume, multicast join).
4. Connect to the PostgreSQL database.
5. Create an empty site, create the admin user (credentials from `.env.local`).
6. Disable secure administrator sessions (websudo) in **Administration > Security configuration** (test instances only).
7. Disable onboarding / "what's new" (UPM REST: disable the system plugins `confluence-onboarding` and `whatsnew`).
8. Install apps from `APP_FILES` via UPM REST (`install-app` command; REST is allowed here because this is setup).
9. Apply app timebomb licences (same command).
10. Run `env/atl-env.sh <profile> snapshot`.

Wizard screens differ between host versions. Put the differences in a `SetupWizard` class in `env/setup/wizards/` (selected by the profile's `SETUP_WIZARD`), not in `if` branches inside the setup file. The wizard is driven by the current URL in a loop, because some screens are only saved together with the next one. Verified screens: `docs/notes/hosts.md`.

Current classes: `Confluence8Wizard` (the 8.5 flow, kept as the base class for login, websudo and onboarding), `Confluence6Wizard` (6.6.17), `Confluence9Wizard` (9.x: 8.5 screens, new login page; verified on 9.2.26 in `_reference` and on 9.5.4), `JiraWizard` (8.22.1) and `Jira10Wizard` (10.7.4: new login page, a different set of plugins to disable).

Jira wizard rules (verified, `docs/notes/hosts.md`):

1. Jira answers a form POST with the next screen, so the URL can still name the previous screen. `JiraWizard` identifies screens by URL **and heading**, and after a submit waits until one of them changes.
2. "Onboarding" for Jira means everything that covers the UI on a new instance: the welcome flow, help tips, health check flags, the "perform a re-index" flag, and on 10.x the Instance Optimizer flags. The setup disables the plugins in `pluginsToDisable` and runs a re-index. The onboarding plugin stays enabled (on Jira 10, disabling it makes the welcome page for a new header-login user answer HTTP 500); both Jira profiles turn the welcome flow off with `-Datlassian.darkfeature.jira.onboarding.feature.disabled=true` (verified on 8.22.1 and 10.7.4; user, 2026-10-28: turn off onboarding if that works). The 10.7.4 "Try dark theme" tip is ignored (user, 2026-10-28).
3. The browser uses `timezoneId: 'UTC'`, the same as the hosts; otherwise Jira shows a "time zone does not match" flag over the page.

**Submit each wizard form exactly once.** On 6.6.17 a normal Playwright click timed out although the form had been submitted, and submitting a screen twice left a broken instance ("Container is not setup", then base URL `<null>`). `Confluence6Wizard` uses one forced click per screen and then waits for the URL. If a setup run fails in the middle, use `reset` and run `up` again instead of resuming by hand.

---

## 5. App under test: EasySSO for Confluence and EasySSO for Jira (TechTime)

### 5.1 Known facts

- Marketplace: https://marketplace.atlassian.com/apps/1212583 (app id 1212583).
- App keys: `org.techtime.confluence.plugins.easysso` (Marketplace app 1212583) and `org.techtime.jira.plugins.easysso` (app 1212581). The key per host is `appKey` in `tests/targets.ts`.
- App files under test: `apps/confluence.plugins.easysso-5.2.4.obr` (Confluence DC 6.0.1 – 9.5.4; 5.3.x and later need Confluence 10) and `apps/jira.plugins.easysso-5.2.4.obr` (Jira DC 8.22.0 – 10.7.4; 5.3.x need Jira 11). Marketplace REST, 2026-10-27/28.
- The Headers screen files (`headers/customauth-admin.js`, `.vm`) are byte-for-byte identical in both apps, so the page object `EasySsoHeadersConfig` and the spec are shared.
- Single sign-on (SSO) app with authenticators for NTLM/Kerberos, SAML, X.509 and **HTTP headers** ("Custom Authentication").
- Admin: `/plugins/servlet/easysso/admin`; Headers screen `/plugins/servlet/easysso/admin/headers`; rules REST `rest/easysso/1.0/headers` (used only for teardown).
- **HTTP header login** (term): a reverse proxy authenticates the user and passes the username in an HTTP header; EasySSO logs the request in as that user when a rule with "Get Username" matches the header name.
- All verified details: `docs/notes/easysso.md`.

### 5.2 Discovering new facts

Record every new fact in `docs/notes/easysso.md`. How to discover: read the plugin descriptor, `.vm` templates, `.js` files and `.properties` files inside the OBR/JAR, explore the running instance with a browser, read the app's documentation (techtime-initiative.com), and ask the user. Do not invent setting names.

### 5.3 Test scenarios

`@smoke` (user said: only the HTTP headers test for now, 2026-10-27):

1. `tests/specs/easysso/http-headers.spec.ts`: the admin adds a header rule with "Get Username" in the UI; a browser that sends the header is logged in as the user named in it; a browser without the header is not logged in (`adapter.loginPrompt`: the Confluence login form, the Jira header "Log In" link). Passes 10 consecutive runs on all four hosts (2026-10-28).

Not covered yet (ask the user first): `docs/notes/open-questions.md` item 5.

### 5.4 Rules specific to this app

1. **Header rules and other EasySSO settings are site-wide.** Every test that changes them must restore the empty state in setup and teardown (fixture `cleanEasySsoHeaderRules`). The suite runs with `workers: 1`.
2. A request "from behind the proxy" is simulated by a new browser context with no cookies and `extraHTTPHeaders` (fixture `newAnonymousPage`). Do not reuse the admin's logged-in context for it.
3. Test users are created per test (fixture `testUser`, removed afterwards), with unique names. Confluence: JSON-RPC `addUser` (`ConfluenceRest`); Jira: `POST /rest/api/2/user` with `applicationKeys: ["jira-software"]` (`JiraRest`). `createRest(product, ...)` picks the class from the target's `product`.
4. Do not test SAML, NTLM/Kerberos or X.509 without asking: they need external systems (an identity provider, a domain controller, client certificates).

---

## 6. Test architecture

### 6.1 Layers

1. **Specs** (`tests/specs/`): scenario steps and assertions. No host-specific code. No raw selectors.
2. **Page objects** (`tests/pages/`): one class per app screen or dialog (for example `EasySsoHeadersConfig`). Use `data-testid` where the app markup has it; otherwise role + accessible name.
3. **Adapters** (`tests/adapters/`): everything that differs between host products or versions:
    - login form, dashboard, the logged-in user menu, the "not logged in" prompt
    - Every adapter implements the same TypeScript interface (`HostAdapter`). Add methods only when a test needs them, and verify their selectors on the host first.
    - Current adapters: `Confluence6Adapter` (6.6.17), `Confluence9Adapter` (9.5.4; only the login form differs), `JiraAdapter` (8.22.1) and `Jira10Adapter` (10.7.4; only the login form differs). Selected by `adapter` in `tests/targets.ts`. The 8.5/9.2 adapters (editor, macros, UPM, PDF) are in `_reference/tests/adapters/`.
    - Setup wizard differences are NOT here; they live in `env/setup/wizards/` (decision 2.8).
4. **Fixtures** (`tests/fixtures/`): REST helpers for setup/teardown (one class per product, chosen by the target's `product`), a test user per test, header rule cleanup, new anonymous pages with extra headers, failure evidence, and creation of the adapter from the Playwright project config.

### 6.2 Playwright config

1. One Playwright **project per host version**, listed in `tests/targets.ts` and named after the profile (`confluence-6.6.17`, `confluence-9.5.4`, `jira-8.22.1`, `jira-10.7.4`). Each sets `baseURL`, `hostBaseURL`, `adapterName`, `product` and `appKey`. The base URL can be overridden with the environment variable named in the target (`ATL_BASE_URL_CONFLUENCE_6_6_17`, `ATL_BASE_URL_CONFLUENCE_9_5_4`, `ATL_BASE_URL_JIRA_8_22_1`, `ATL_BASE_URL_JIRA_10_7_4`).
2. A setup project per host (`tests/setup/login.setup.ts`) logs in once and saves `storageState` to `.auth/<target>.json`. Test projects depend on it.
3. `use: { screenshot: 'only-on-failure', trace: 'retain-on-failure', video: 'off', actionTimeout: 20_000, navigationTimeout: 60_000, locale: 'en-US', timezoneId: 'UTC' }`. **`workers: 1`** (section 5.4), test timeout 90 s. Wait for URL changes with `waitUntil: 'commit'`.
4. Reporters: `html` (open: 'never'), `junit`, `list`.
5. `forbidOnly: !!process.env.CI`. Retries: 0 locally, at most 1 in CI. A test that only passes on retry is reported as flaky and must be fixed.
6. Tests that apply to one host only: tag (for example `@confluence-6-only`) and filter with `grep` / `grepInvert` per project. Never `if (host === ...)` inside a spec.

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
- Documented exception: `EasySsoHeadersConfig` selects the rule table rows and fields by the app's own ids, classes and `data-id` attributes (`#custom-auth-tbody .custom-auth-rule`, `[data-id="name"]`, …), because the inputs have no test id and no accessible name (every text input has the title "Text input"). If the app adds `data-testid` or labels, switch to them.

### 6.4 API vs UI rules (enforced)

1. Allowed in fixtures and setup files only: `request.*`, `fetch(`, any REST or JSON-RPC client.
2. Not allowed inside `test(...)` bodies or page objects: direct HTTP calls. Specs may not call the `rest` fixture at all; setup and teardown work goes into fixtures.
3. The action being tested and every assertion must go through the browser page.
4. Extra request headers on a browser context (`extraHTTPHeaders`) are not an HTTP call: the browser sends them with its normal page requests. This is how the header login is tested.
5. Waiting for the browser's own request to finish (`page.waitForResponse`) is allowed in page objects; it does not send a request.
6. REST setup calls use their own request context with an empty `storageState` (helper `restContext` in `tests/fixtures/index.ts`), never the built-in `request` fixture. Reason: Playwright gives `request` the browser's session cookie, and on Confluence 9.2 a Basic-auth call with that cookie ends the browser session (verified 2026-10-27 in `_reference`).

### 6.5 Step naming

Wrap every page-object and adapter method body in `test.step('<user-level action>', ...)`, for example `test.step('Add header rule "X-Atl-Test-User"', ...)`. Failure reports must name the user action, not only a line number.

### 6.6 Failure evidence

On failure, attach to the test result (implemented by the automatic `failureEvidence` fixture in `tests/fixtures/index.ts`):

1. Host target name and version, and the app version (read from UPM REST when the test fails).
2. Browser console errors (collected during the test, main page only).
3. The last 200 lines of the product log: `env/instances/<profile>/home/logs/atlassian-confluence.log` (Confluence) or `env/instances/<profile>/home/log/atlassian-jira.log` (Jira), or the file in `ATL_LOG_FILE` when the environment is elsewhere.

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
3. Passes **10 consecutive runs** on every host project it applies to: `npm run test -- --env <host> --repeat-each=10` (the host must be running).
4. Has a `@smoke` or `@full` tag.
5. Produces no artifacts when passing.
6. Any newly discovered host or app fact is written to `docs/notes/`.
7. It is shown to fail when the behaviour under test is broken (for example a temporary copy with one setting changed).

---

## 9. Notes and uncertainty log

- `docs/notes/hosts.md`: verified facts per host version (Java, DB versions, download URL, status endpoint, websudo setting, wizard differences).
- `docs/notes/easysso.md`: verified facts about the app (version choice, admin screens, REST endpoints, observed behaviour).
- `docs/notes/open-questions.md`: anything unverified, with what would resolve it, and resolved items.
- `README.md`: commands and troubleshooting for the user. Update it when commands, profiles, ports or tests change.

Each entry: the fact, how it was verified (command, URL, or "user said"), and the date.

---

## 10. Things you must ask before doing

1. Committing or changing any licence-related value.
2. Using an embedded/evaluation database instead of PostgreSQL.
3. Adding visual regression (screenshot comparison) tests.
4. Mocking or blocking network requests to external services.
5. Letting the healer agent change a test's assertions (it may change locators; assertion changes need approval).
6. Deleting anything outside `env/instances/`, `test-results/` and `playwright-report/`.
7. Changing anything inside `_reference/`.
