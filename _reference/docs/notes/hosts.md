# Host facts (verified)

Format: fact — how verified — date.

## Confluence 8.5.31 (profile `confluence-8.5.31`)

1. Chosen because: 8.5 is a Long Term Support release and is inside the range of Embed Google Maps Pro 8.1.5 (Confluence 7.0.1 – 9.5.4) — user said the OBR supports 7.0.1 – 9.5.4 — 2026-10-27.
2. Archive URL: `https://product-downloads.atlassian.com/software/confluence/downloads/atlassian-confluence-8.5.31.tar.gz` (the `www.atlassian.com/.../binary/` URL from the feed redirects here with HTTP 301) — `curl -sSIL`, HTTP 200, 875180935 bytes — 2026-10-27.
3. MD5: `9f9ab24413d649840f3959be21ebb119`, released 16-Dec-2025 — `https://my.atlassian.com/download/feeds/archived/confluence.json`, and `md5sum` of the downloaded file matches — 2026-10-27.
4. Supported Java: 11 and 17 (Oracle and Eclipse Temurin). Recommendation: Java 11.0.8 or later — https://confluence.atlassian.com/conf85/supported-platforms-1283361429.html — 2026-10-27.
5. Supported PostgreSQL: 12, 13, 14 — same page — 2026-10-27.
6. JVM memory is hard-coded on line 74 of `bin/setenv.sh`: `CATALINA_OPTS="-Xms1024m -Xmx1024m ${CATALINA_OPTS}"`. `configure` rewrites it — read from the extracted archive — 2026-10-27.
7. Extra JVM options must be passed in the `CATALINA_OPTS` environment variable. `bin/start-confluence.sh` line 15 overwrites `START_CONFLUENCE_JAVA_OPTS`, so options put there are lost. Verified by reading `/proc/<pid>/cmdline` in the container — 2026-10-27.
8. Home directory is set in `confluence/WEB-INF/classes/confluence-init.properties` (`confluence.home=`, empty by default) — read from the extracted archive — 2026-10-27.
9. Default context path is empty: `conf/server.xml` has `<Context path="" docBase="../confluence"`. HTTP connector port 8090 — read from the extracted archive — 2026-10-27.
10. `bin/user.sh` has `CONF_USER=""`, so `start-confluence.sh` runs as the current user (root inside the container) without switching user — read from the extracted archive — 2026-10-27.
11. `/status` returns `{"state":"FIRST_RUN"}` before setup and `{"state":"RUNNING"}` after — `curl` — 2026-10-27.
12. Timings on this machine (10 CPUs, 15.5 GB for Docker), measured 2026-10-27:
    - start to FIRST_RUN: 45–75 s
    - restart of a set-up instance to RUNNING: 130–150 s
    - `up` from a clean `reset` (archive already downloaded): 931 s (15.5 min); the setup wizard alone took 6 min
    - `restore`: 327 s (5.5 min)
    - `@smoke` (4 tests + login): 23 s to 60 s
13. App upload through UPM is refused by default: "Plugins cannot be installed via upload". Fixed with JVM option `-Dupm.plugin.upload.enabled=true` (profile `EXTRA_JVM_OPTS`). Atlassian KB: https://confluence.atlassian.com/confkb/after-upgrading-confluence-the-upload-app-option-under-manage-apps-is-not-visible-1388150814.html — verified by upload test — 2026-10-27.
14. Setup wizard screens on 8.5.31, in order (verified by running them):
    1. `/setup/setupstart.action` — "Trial Installation" / "Production Installation" boxes, `#setup-next-button`.
    2. `/setup/setuplicense.action` — `#confLicenseString`.
    3. `/setup/setupcluster-start.action` — radio "Non-clustered (single node)". **Saved only together with the next screen.**
    4. `/setup/setupdbtype-start.action` — `#dbConfigInfo-*` fields, "Test connection" shows text "Success! Database connected successfully." Next shows a progress overlay; schema creation took about 1–2 minutes.
    5. `/setup/setupdata-start.action` — buttons "Example Site" / "Empty Site".
    6. `/setup/setupusermanagementchoice-start.action` — "Manage users and groups within Confluence". **Saved only together with the next screen.**
    7. `/setup/setupadministrator-start.action` — `#username`, `#fullName`, `#email`, `#password`, `#confirm`.
    8. `/setup/finishsetup.action` — "Setup Successful". The browser is now logged in.
15. The server base URL is taken from the address used for the wizard. Changing it later on `/admin/editgeneralconfig.action` (`#editbaseurl`) did not save when automated (the Save click sent no request; reason unknown) — 2026-10-27.
16. Secure administrator sessions: `/admin/editsecurityconfig.action`, checkbox `#webSudoEnabled` (its label covers the input; click `label[for=webSudoEnabled]`), button "Save" — 2026-10-27.
17. Onboarding: a new user is sent to `/welcome.action` ("Create a space to store your work"). Disabled by disabling the optional system plugins `com.atlassian.confluence.plugins.confluence-onboarding` and `com.atlassian.confluence.plugins.whatsnew` via UPM REST — 2026-10-27.
18. Health-check banners shown to the admin on every page: "End of Life" (8.5 reached End of Life on 15 Dec 2025), "License Expiry", "Security Vulnerabilities" — 2026-10-27.
19. Login page: `/login.action`, `#os_username`, `#os_password`, `#loginButton` — 2026-10-27.
20. Editor toolbar ids: `#rte-button-insert` (aria-label "Insert more content"), `#rte-button-publish` (text "Update" for an existing page), `#rte-button-cancel` ("Close"). Editor content is in iframe `#wysiwygTextarea_ifr`. `editpage.action?pageId=` redirects to `resumedraft.action` — 2026-10-27.

## Confluence 9.2.26 (profile `confluence-9.2.26`)

1. Chosen because: 9.2 is the Long Term Support release after 8.5 (https://community.developer.atlassian.com/t/confluence-9-2-long-term-support-release-is-available-now/87063); 9.2.26 is its newest patch in the download feed, and it is inside the app range 7.0.1 – 9.5.4 — 2026-10-27.
2. Archive URL `https://product-downloads.atlassian.com/software/confluence/downloads/atlassian-confluence-9.2.26.tar.gz`, HTTP 200, 1025851496 bytes; MD5 `533126e02b457711cc92d5ad2badba7d`, released 05-Oct-2026 (download feed); downloaded file matches — 2026-10-27.
3. Supported Java: 17 and 21 (Oracle, Temurin). Supported PostgreSQL: 15, 16; 14 deprecated — https://confluence.atlassian.com/conf92/supported-platforms-1477577494.html — 2026-10-27. Profile uses Temurin 17 and PostgreSQL 16.
4. Data Center licences only. The DC host timebomb licence and the DC app timebomb licence were both accepted — 2026-10-27.
5. Startup files have the same structure as 8.5.31: memory line in `bin/setenv.sh` (line 83), `start-confluence.sh` line 15 overwrites `START_CONFLUENCE_JAVA_OPTS`, `<Context path="" docBase="../confluence"` in `conf/server.xml` — read from the extracted archive — 2026-10-27.
6. Setup wizard screens: same as 8.5.31 (the 8 wizard flow passed unchanged) — 2026-10-27.
7. **Login page is redesigned:** `#username-field`, `#password-field`, `#login-button` (the old `#os_username` etc. are gone). Opening `/login.action` while logged in redirects to `/welcome.action` (8.5 instead shows "You are currently logged in as …") — 2026-10-27.
8. Editor, macro browser, macro dialog, rendered macro and UPM screens: same selectors as 8.5.31 (all smoke tests pass with the 8 adapter plus the new login) — 2026-10-27.
9. **Session rotation:** a Basic-auth REST call that also sends the browser's `JSESSIONID` cookie gets a new session id, and the browser's session then fails (302 to `/login.action?...permissionViolation`). REST setup calls must use a request context with no cookies — Playwright trace — 2026-10-27.
10. **Parallel space creation fails:** two `POST /rest/api/space` calls at the same moment on a freshly started instance → HTTP 500, log: `duplicate key value violates unique constraint "bandana_unique_key"`. Seen once in 40 runs. The suite now creates one space per run in the setup project — product log, 2026-10-27. On 8.5.31 the same parallel space creation passed 40 of 40 runs; whether 8.5 has the same race is not known.
11. Timings, measured 2026-10-27: start to FIRST_RUN about 45 s; `up` from a clean `reset` (archive already downloaded): 866 s (14.4 min), of which the setup wizard took 5.0 min. `restore`: 6 min 16 s (startup to RUNNING 175 s).
13. **Licence expiry seen:** about 3 h 40 min after the snapshot, `POST /rest/api/space` returned HTTP 403 `"Cannot create Space"` (`"authorized":false,"allowedInReadOnlyMode":true`), so the test setup failed. After `restore` the smoke tests passed (7 of 7) — 2026-10-27.
12. The first download attempts failed with curl error 23 ("client returned ERROR on write"); a direct `curl -sS` download right afterwards worked. Cause unknown; the script now uses `curl -sS` — 2026-10-27.

## Both hosts (test suite behaviour)

1. Two pages with the same title created at the same moment in one space: the editor then refuses to publish ("A page with the title … already exists in this space"). Page titles now include worker, repeat index and a random part — screenshot, 9.2.26, 2026-10-27.
2. Under load (both instances running, 2 workers) the Manage apps list on 8.5.31 took more than 15 s to appear; the adapter waits up to 60 s — screenshot, 2026-10-27.
3. Waiting for a page `load` event after navigation times out on Confluence pages (for example the dashboard); waits use `waitUntil: 'commit'` — 2026-10-27.
4. Inside Playwright Test, `playwright.request.newContext()` inherits the project's `storageState` (the browser cookies). The REST helper passes an empty `storageState` explicitly — Playwright trace, 2026-10-27.
5. Final check: `--repeat-each=10` on both hosts, 86 of 86 passed in 5.0 min, no artifacts. 86 = 4 tests × 10 repeats × 2 hosts (80) + per host 2 setup tests and 1 teardown test (6) — 2026-10-27.
6. Export to PDF: menu item `#action-export-pdf-link` (inside the "More options" menu `#action-menu-link`). The admin health-check pop-ups ("End of Life", "License Expiry", "Security Vulnerabilities") cover the menu button, so a click on it times out; the adapter follows the item's link instead. 9.2.26 adds `atl_token` to the link. The response is the PDF file itself (Playwright: "Download is starting") — 2026-10-27.
7. Body macros in the legacy editor: `table.wysiwyg-macro[data-macro-name=<key>]`, body cell `td.wysiwyg-macro-body`; `keyboard.insertText` + Enter gives one `<p>` per line — 2026-10-27.

## Windows / Docker Desktop

1. On this machine `localhost:8090` resolves to `::1` first. `::1:8090` is held by `wslrelay` (WSL localhost forwarding) and accepts connections but never answers. `127.0.0.1:8090` (Docker backend) works. Therefore all URLs use `127.0.0.1`, and ports are published on `127.0.0.1` only — `Get-NetTCPConnection -LocalPort 8090`, `curl` — 2026-10-27.
2. `docker.exe` was installed per user at `%LOCALAPPDATA%\Programs\DockerDesktop\resources\bin`. A terminal opened before the install does not have it on PATH; `require_docker` adds it — 2026-10-27.
3. Docker Desktop 29.9.2, WSL2 backend, 15.5 GB memory and 10 CPUs available to Docker — `docker info` — 2026-10-27.
4. Git Bash rewrites arguments that look like Unix paths (`/opt/...`) when calling `docker.exe`; the script sets `MSYS_NO_PATHCONV=1` and converts host paths with `cygpath -m` — 2026-10-27.
5. Container images used: `postgres:14`, `postgres:16`, `eclipse-temurin:17-jdk` (pulled from Docker Hub on first start) — 2026-10-27.

## Licences

1. Timebomb licence page: https://developer.atlassian.com/platform/marketplace/timebomb-licenses-for-testing-server-apps/ — fetched 2026-10-27.
2. Used: "10 user Confluence Data Center license, expires in 3 hours" (host) and "10 user Data Center app license, expires in 3 hours" (app). Keys are stored only in `.env.local` (git-ignored), extracted from the page source by script — user said "use these ones" — 2026-10-27.
3. The page says the Data Center host licences are "entered on the Versions & licenses page for Data Center products run without the SDK".
4. The DC host timebomb licence was accepted by the 8.5.31 and 9.2.26 wizards. Immediately afterwards every page shows: "Your subscription will expire today and your site will become read-only." — 2026-10-27.
5. The DC app timebomb licence was accepted through UPM REST (`"valid":true`) on 8.5.31 and 9.2.26. UPM shows it as "10-user commercial license, Data Center, expires Oct 27, 2026" with the label "LICENSE EXPIRING" — 2026-10-27.
6. `restore` resets the 3 hours (verified on 9.2.26: read-only before, smoke tests pass after, about 4 h after the licence was entered) — 2026-10-27. Not verified: whether a plain restart also resets them (open-questions.md item 1).

## Windows / npm runner

1. In PowerShell, `bash` on PATH is `C:\Users\<user>\AppData\Local\Microsoft\WindowsApps\bash.exe` (WSL), not Git Bash. `scripts/atl.mjs` therefore runs `C:\Program Files\Git\bin\bash.exe` (or `ATL_BASH`) — `Get-Command bash -All`, 2026-10-27.
2. npm 11.8.0: `npm run x --env confluence:8.5.31` sets `npm_config_env=true` and passes `confluence:8.5.31` as a plain argument, with the warning `Unknown cli config "--env". This will stop working in the next major version of npm.` `--env=value` sets `npm_config_env=value` (same warning). `npm run x -- --env value` passes both to the script with no warning. The runner accepts all three — tested, 2026-10-27.
