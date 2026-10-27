# Atlassian DC app UI tests

Playwright end-to-end tests for TechTime apps on Atlassian Data Center hosts.
First app under test: **Embed Google Maps Pro** on Confluence.

The repository has two independent parts:

| Part | Folder | What it does | Needs |
|---|---|---|---|
| Environment | `env/` | Downloads, configures and runs Confluence DC instances in Docker, runs the setup wizard, installs the app | Docker Desktop, Git Bash, Node.js |
| Tests | `tests/` | Playwright tests against any running instance | Node.js, a base URL, admin credentials |

The tests do not call anything in `env/`. You can point them at an instance built another way (for example in Bitbucket Pipelines).

## Host versions

| Profile | Confluence | Java | PostgreSQL | URL | DB port |
|---|---|---|---|---|---|
| `confluence-8.5.31` | 8.5.31 (LTS) | Temurin 17 | 14 | http://127.0.0.1:8090 | 5433 |
| `confluence-9.2.26` | 9.2.26 (LTS) | Temurin 17 | 16 | http://127.0.0.1:8100 | 5434 |

App under test: `apps/confluence.plugins.googlemapsembed-8.1.5.obr` (compatible with Confluence 7.0.1 – 9.5.4).

Login on both: `admin` / `admin` (from `.env.local`).

## One-time preparation

1. Install Docker Desktop and Node.js.
2. Run `npm install` and `npx playwright install chromium`.
3. Copy `.env.local.example` to `.env.local` and fill it in (admin user, timebomb licences). `.env.local` is git-ignored. Never commit licence keys.
4. Put the app file where the profiles' `APP_FILES` points (currently `apps/confluence.plugins.googlemapsembed-8.1.5.obr`).

## npm commands

Run these from the repository root, in any terminal (PowerShell, cmd or Git Bash). `--env` names a host as `<product>:<version>`, for example `confluence:8.5.31` or `confluence:9.2.26`.

```
npm run setup    -- --env confluence:8.5.31   # first time: full build (download, install, start, setup wizard, install app, snapshot)
npm run start    -- --env confluence:8.5.31   # start an instance and wait until it is RUNNING
npm run restore  -- --env confluence:8.5.31   # back to the clean snapshot (also starts it)
npm run status                                # state of every instance (or one with --env)
npm run logs     -- --env confluence:8.5.31   # follow the product log (Ctrl+C to stop)
npm run shutdown -- --env confluence:8.5.31   # stop an instance (without --env: stop all); same as npm run stop

npm run test       -- --env confluence:9.2.26                  # all tests on one host
npm run test:smoke -- --env confluence:9.2.26                  # @smoke tests on one host
npm run test:smoke -- --env confluence:9.2.26 --autoshutdown   # stop the host after the tests (also when tests fail)
npm run test:smoke                                             # every host in tests/targets.ts
npm run check                                                  # selector/API rule check + TypeScript check
npm run report                                                 # HTML report of the last run
```

Rules:

1. **Use `--` before the options** (as above). Without it, npm prints "Unknown cli config" warnings. Writing `npm run start --env confluence:8.5.31` still works, but npm says this form will stop working in its next major version.
2. Several hosts at once: `--env confluence:8.5.31,confluence:9.2.26`.
3. `confluence-8.5.31` (the profile name) is accepted as well as `confluence:8.5.31`.
4. Other options after `--` go to Playwright, for example `npm run test -- --env confluence:9.2.26 --repeat-each=10` or `--headed`.
5. `test` first checks that each selected host reports `RUNNING` on `/status`. If not, it stops and prints the `npm run start` command. Without `--env`, every host in `tests/targets.ts` must be running.
6. `--autoshutdown` stops only hosts that have a profile in `env/profiles/` (not instances built elsewhere). The exit code is the test result.
7. `setup`, `start`, `restore` and `logs` need `--env`. `status`, `shutdown` and `stop` without `--env` act on every profile.

The npm commands call `env/atl-env.sh` through Git Bash (`scripts/atl.mjs`). They look for Git Bash in `C:\Program Files\Git\bin\bash.exe` and `%LOCALAPPDATA%\Programs\Git\bin\bash.exe`. On Windows, the `bash` on PATH can be WSL's bash, so it is not used. Set `ATL_BASH` to the full path of `bash.exe` if Git Bash is installed somewhere else.

Typical session:

1. `npm run restore -- --env confluence:9.2.26` (clean data, fresh licence period; about 6 min).
2. `npm run test:smoke -- --env confluence:9.2.26 --autoshutdown`.

## Environment commands (Git Bash, direct)

The npm commands above cover the usual steps. The script has more commands. Replace `<profile>` with `confluence-8.5.31` or `confluence-9.2.26`.

```
env/atl-env.sh <profile> up            # first time: download, install, start, setup wizard, install app, snapshot
env/atl-env.sh <profile> restore       # back to the clean snapshot
env/atl-env.sh <profile> status        # stopped / starting / FIRST_RUN / RUNNING
env/atl-env.sh <profile> start
env/atl-env.sh <profile> stop
env/atl-env.sh <profile> install-app   # re-install the app after you change the OBR/JAR
env/atl-env.sh <profile> logs          # follow the product log
env/atl-env.sh <profile> reset         # delete all data of this instance (the snapshot is kept)
```

Measured times on this machine (10 CPUs, 15.5 GB for Docker):

| Step | 8.5.31 | 9.2.26 |
|---|---|---|
| `up` (archive already downloaded) | 15.5 min | 14.4 min |
| `restore` | 5.5 min | 6.3 min |
| `start` of a set-up instance | 2–2.5 min | 5.4 min (once, after a restore) |
| `@smoke` × 10 repeats, both hosts together | 5.0 min (86 runs incl. setup/teardown) | |

Both instances can run at the same time. Each uses up to 2 GB of memory for Java, plus its database.

**Licences:** after about 3 hours the timebomb licences make the site read-only. The test setup step then fails with `create space ... failed: HTTP 403`. `npm run restore -- --env <host>` fixes it (verified on 9.2.26, 2026-10-27). Not yet known: whether a plain `start` also resets the 3 hours. Run `restore` before a test session.

## Running the tests

Use the npm commands above. The same runs with Playwright directly:

```
npx playwright test --grep @smoke                    # smoke tests on all hosts
npx playwright test --project confluence-9.2.26      # one host only
```

Without `--project` (or `--env`), the tests run on **every** host in `tests/targets.ts`.

What one run does, per host:

1. `setup-<host>`: logs in once and creates one test space for the run.
2. `<host>`: the tests. Each test gets a new empty page in that space.
3. `teardown-<host>`: deletes the test space.

Current tests (folder `tests/specs/google-maps-pro/`):

`@smoke` (`smoke.spec.ts`, 4 tests):

1. The app is installed and enabled (Manage apps).
2. Insert a Google Maps macro with an address and view the page: the map iframe has the address in its `src`.
3. Edit an existing map and change Map Type to Satellite: the `src` changes to `maptype=satellite`.
4. An invalid Google Map link shows "Error in Macro Parameters: Invalid Google Maps Link".

`@full` (22 tests; `npm run test -- --env <host> --grep @full`):

| File | Tests | What is checked |
|---|---|---|
| `unicode.spec.ts` | 4 | Japanese, Arabic, Cyrillic, accents + emoji locations: correct `q=` encoding and `language=` code |
| `place-links.spec.ts` | 3 | Place links (`/maps/place/...`) by name, unicode name, and with coordinates: place embed, `center=` |
| `list-of-addresses.spec.ts` | 8 | List of Addresses macro: marker count, size/map type/language; unknown addresses and bad strings give the error line "Address N of M - Google Maps cannot find this address" |
| `pdf-export.spec.ts` | 2 | Export to PDF of a page with each macro: the download is a PDF with a 600 × 400 map image |
| `xss.spec.ts` | 5 | Script payloads in Location, Title, Google Map link and the list body do not run and stay visible as text |

The tests need internet access: the app asks Google for place ids and coordinates while the page renders.

Passing runs leave no screenshots, traces or videos. Failing tests attach a screenshot, a trace, the host and app versions, browser console errors, and the last 200 lines of the product log.

### Against another instance

Set these environment variables:

- `ATL_BASE_URL_CONFLUENCE_8_5_31` or `ATL_BASE_URL_CONFLUENCE_9_2_26` (for example `https://host/`)
- `ATL_ADMIN_USER` and `ATL_ADMIN_PASSWORD`
- optional: `ATL_LOG_FILE=<path>` for the product log attached to failures

## Troubleshooting

| Symptom | Cause | What to do |
|---|---|---|
| `http://localhost:8090` does not load | On this machine `localhost` goes to IPv6 `::1`, held by `wslrelay` | Use `http://127.0.0.1:8090` |
| `docker is not on PATH` | Terminal opened before Docker Desktop was installed | Open a new terminal; the script also finds Docker in its default install folders |
| Pages are read-only, or `create space ... failed: HTTP 403` | Timebomb licence expired (about 3 h after setup/restore) | `npm run restore -- --env <host>` |
| `[atl] confluence-… is not reachable` | The host is stopped | `npm run start -- --env <host>` |
| `[atl] Git Bash not found` | Git Bash is not in a default folder | Set `ATL_BASH` to the full path of `bash.exe` |
| npm prints `Unknown cli config "--env"` | Options given without `--` | Put `--` before the options |
| `download failed` with curl error 23 | Seen once; cause unknown | Run `download` again, or place the archive in `env/downloads/` by hand |
| A step fails | The script prints the failed step and a diagnosis command | Run the printed command |

## Adding a host version

1. Copy a profile in `env/profiles/`. Use a unique `HTTP_PORT` and `DB_PORT`.
2. Verify the archive URL with an HTTP HEAD request and take `ARCHIVE_MD5` from Atlassian's download feed.
3. Check the supported Java and PostgreSQL versions on Atlassian's "Supported platforms" page for that version.
4. Run `npm run setup -- --env <product>:<version>`. If a wizard screen differs, add a class in `env/setup/wizards/`.
5. Add the host to `tests/targets.ts`. If a host screen differs, add an adapter in `tests/adapters/`.
6. Run `npm run test -- --env <product>:<version> --repeat-each=10`.
7. Record verified facts in `docs/notes/hosts.md`.

## Where things are

| Path | Content |
|---|---|
| `env/atl-env.sh`, `env/lib/common.sh` | Environment script |
| `env/profiles/` | One file per host version |
| `env/setup/` | Setup wizard automation (own Playwright config); `wizards/` holds one class per wizard flow |
| `env/instances/<profile>/` | Install dir, logs (`home/logs/`), snapshot (git-ignored) |
| `apps/` | App files to install (git-ignored) |
| `tests/targets.ts` | Host instances (one Playwright project each) |
| `tests/setup/` | Login + test space creation, and test space deletion |
| `tests/adapters/` | Everything host-specific (selectors, URLs, editor actions) |
| `tests/pages/` | App screens (macro dialog, rendered macro) |
| `tests/fixtures/` | Fixtures and REST helpers (setup/teardown only) |
| `tests/specs/google-maps-pro/` | The tests and their data |
| `scripts/atl.mjs` | npm command runner (calls `env/atl-env.sh` and Playwright) |
| `scripts/check-test-rules.mjs` | Selector and API rule check |
| `docs/notes/` | Verified facts (`hosts.md`, `google-maps-pro.md`) and `open-questions.md` |
| `CLAUDE.md` | Rules and decisions for AI-assisted work in this repository |
