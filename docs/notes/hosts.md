# Host facts (verified)

Format: fact — how verified — date.

Facts about Confluence 8.5.31 and 9.2.26 are in `_reference/docs/notes/hosts.md`.

## Confluence 6.6.17 (profile `confluence-6.6.17`)

1. Chosen because: the user asked for Confluence 6.6.17 with EasySSO — user said, 2026-10-27.
2. Archive URL: `https://product-downloads.atlassian.com/software/confluence/downloads/atlassian-confluence-6.6.17.tar.gz` (the feed URL `www.atlassian.com/software/confluence/downloads/binary/atlassian-confluence-6.6.17.tar.gz` redirects here with HTTP 301) — `curl -sSI`, HTTP 200, 538111530 bytes — 2026-10-27.
3. MD5 `61381a93de0e341f1fc08fd9b9b40bae`, released 06-Nov-2019, edition "Enterprise" — `https://my.atlassian.com/download/feeds/archived/confluence.json`; the downloaded file matches — 2026-10-27.
4. Supported Java: Oracle JRE/JDK 1.8; AdoptOpenJDK 8 from 6.6.12 (jdk8u192 or later recommended). Supported PostgreSQL: 9.2, 9.3, 9.4, 9.5, 9.6 — https://confluence.atlassian.com/display/CONF66/Supported+Platforms — 2026-10-27. Profile uses `eclipse-temurin:8-jdk` (Temurin is the successor of AdoptOpenJDK) and `postgres:9.6`.
5. Startup files have the same structure as 8.5: memory line `CATALINA_OPTS="-Xms1024m -Xmx1024m -XX:+UseG1GC ${CATALINA_OPTS}"` in `bin/setenv.sh` (line 69); `confluence.home=` commented out in `confluence-init.properties`; `<Context path="" docBase="../confluence"` and connector port 8090 in `conf/server.xml`; `start-confluence.sh -fg` runs in the foreground. `configure` works unchanged — read from the extracted archive — 2026-10-27.
6. `/status` exists: `{"state":"FIRST_RUN"}` 40 s after the first start, `{"state":"RUNNING"}` after setup — `curl` — 2026-10-27.
7. **A Data Center licence needs a cluster.** After the DC timebomb licence, the wizard shows "Configure cluster node" (`/setup/setupcluster-start.action`) with no "non-clustered" choice. A one-node cluster is used: cluster name `atl-test`, shared home `/var/atlassian/application-data/confluence/shared-home` (inside the home volume, so the snapshot contains it), interface `eth0`, join "Use multicast" with an automatically generated address. Log: `Configuring Hazelcast ... join configuration Multicast (address|port|TTL): (237.150.175.1|54327|1)` — 2026-10-27.
8. The one-node cluster starts again after a restart and after the snapshot's restart (RUNNING after 190–205 s) — `env/atl-env.sh ... start`, `snapshot` — 2026-10-27.
9. Setup wizard screens on 6.6.17, in order (verified by running them):
    1. `/setup/setupstart.action` — "Trial Installation" / "Production Installation", `#setup-next-button`.
    2. `/setup/selectbundle.action` — "Get add-ons" (new compared with 8.5): Next without a selection.
    3. `/setup/setuplicense.action` — `#confLicenseString`, button `#setupTypeCustom` ("Next"); also shows the Server ID.
    4. `/setup/setupcluster-start.action` — "Configure cluster node": `#clusterName`, `#clusterHome`, radio `networkInterface`, `#useMulticast` / `#useTcpIp` / `#useAws`, button "Create new cluster" (`input[name=newCluster]`; a second, hidden input with that name exists).
    5. `/setup/setupdbtype-start.action?thisNodeClustered=true` — same `#dbConfigInfo-*` ids as 8.5, `#testConnection`; schema creation took about 5 minutes.
    6. `/setup/setupdata-start.action` — "Example Site" / "Empty Site" / "Restore From Backup" (submit inputs).
    7. `/setup/setupusermanagementchoice-start.action` — `#internal` ("Manage users and groups within Confluence").
    8. `/setup/setupadministrator-start.action` — `#username`, `#fullName`, `#email`, `#password`, `#confirm`.
    9. `/setup/finishsetup.action` — "Setup Successful".
10. **Form buttons and Playwright clicks:** a normal `click()` on the wizard's submit buttons timed out ("waiting for element to be visible, enabled and stable"), but the form had been submitted anyway. Submitting the cluster form 3 times and the database form twice left a broken instance: every request failed with `IllegalStateException: Container is not setup`; after a restart, the base URL was `<null>` and UPM installs failed (`Base URL misconfigured: <null>`). `Confluence6Wizard` therefore clicks each submit button once with `force: true` and waits for the URL to change. After a clean `reset`, the wizard ran in 9.6 min and the base URL was `http://127.0.0.1:8066` — 2026-10-27.
11. Secure administrator sessions: same page and ids as 8.5 (`/admin/editsecurityconfig.action`, `#webSudoEnabled`). The save worked, but a normal click on "Save" waited for "scheduled navigations" until its 60 s timeout; the wizard clicks without waiting — 2026-10-27.
12. Onboarding plugins `com.atlassian.confluence.plugins.confluence-onboarding` and `com.atlassian.confluence.plugins.whatsnew` exist on 6.6.17 (UPM REST HTTP 200) and are disabled by the setup — 2026-10-27.
13. Login page: `/login.action`, `#os_username`, `#os_password`, `#loginButton` (same as 8.5). Anonymous access to `/` redirects to `/login.action?os_destination=%2Findex.action&permissionViolation=true` — 2026-10-27.
14. Logged-in header: `#user-menu-link` with `data-username="<username>"` and `title="<full name>"`; `<meta name="ajs-remote-user" content="<username>">` — 2026-10-27.
15. Users: no REST endpoint for creating users on 6.6. The JSON-RPC remote API works with Basic auth: `POST /rpc/json-rpc/confluenceservice-v2/addUser` with `[{"name","fullname","email"}, "<password>"]` and `.../removeUser` with `["<username>"]`, both HTTP 200 — 2026-10-27.
16. Licence banner on every page: "Your license subscription will expire today and Confluence will become read-only." — 2026-10-27.
17. Timings on this machine, measured 2026-10-27: first start to FIRST_RUN 40 s (plus image pull); setup wizard 8.6–9.6 min; restart of a set-up instance to RUNNING 190–205 s; `snapshot` 7.4 min; `install-app` (EasySSO) about 1 min; `npm run setup` (`up`) from a clean `reset` with the archive downloaded: 19.7 min (exit code 0, 1 of 1 runs); `restore` 6.8 min, after which the smoke test passed.

## Confluence 9.5.4 (profile `confluence-9.5.4`)

1. Chosen because: the user asked to test on Confluence 9 as well — user said, 2026-10-28. 9.5.4 is the newest Confluence 9 release in the download feed (later 9.x: none) and the upper end of EasySSO 5.2.4's range (6.0.1 – 9.5.4). A profile named `confluence-9.2.26` was not used: Docker object names contain the profile name, so it would share containers and volumes with `_reference`'s 9.2.26 instance, and `reset` here would delete that instance's data — `env/lib/common.sh`, `docker volume ls` — 2026-10-28.
2. Archive URL: `https://product-downloads.atlassian.com/software/confluence/downloads/atlassian-confluence-9.5.4.tar.gz` — `curl -sSI`, HTTP 200, 931625288 bytes — 2026-10-28.
3. MD5 `42f01c1fc1eca5c5f585bc8a3a4eefa4`, released 03-Sep-2025, edition "Standard" — `https://my.atlassian.com/download/feeds/archived/confluence.json` (newest 9.x entries: 9.5.1–9.5.4); the downloaded file matches — 2026-10-28.
4. Supported Java: Oracle and Temurin 21 (17 deprecated). Supported PostgreSQL: 16 (15 deprecated) — https://confluence.atlassian.com/spaces/CONF95/pages/1573751925/Supported+Platforms — 2026-10-28. Profile uses `eclipse-temurin:21-jdk` and `postgres:16`.
5. Setup wizard: `Confluence9Wizard` (copied from `_reference`, verified there on 9.2.26: 8.5 screens, redesigned login page) ran unchanged on 9.5.4 in 4.6 min. A DC licence does not need a cluster on 9.5 (no cluster screen) — `up`, 2026-10-28.
6. `/status`: `{"state":"FIRST_RUN"}` 55 s after the first start; `RUNNING` 135 s after the restart that follows the snapshot — 2026-10-28.
7. Login page: `#username-field`, `#password-field`, `#login-button` (same as 9.2.26). Header user menu: `#user-menu-link[data-username=<username>]`, as on 6.6.17 — the smoke test passes with `Confluence9Adapter` — 2026-10-28.
8. The JSON-RPC remote API still exists: `POST /rpc/json-rpc/confluenceservice-v2/getServerInfo` HTTP 200 (`majorVersion 9, minorVersion 5, patchLevel 4`, base URL `http://127.0.0.1:8095`); `addUser` / `removeUser` work (the test's user is created and removed) — 2026-10-28.
9. EasySSO 5.2.4 installs through UPM REST, and the DC app timebomb licence is valid — `install-app`, 2026-10-28.
10. During the first `up`, Claude Code stopped the npm process because the machine was low on memory (while 9.5.4 restarted after the snapshot). The `atl-env.sh` steps had all finished except the wait for RUNNING, which was then reached (RUNNING after 135 s). So the total `up` time was not measured; the steps measured: wizard 4.6 min — 2026-10-28.
11. `restore` took 5.0 min (exit code 0, RUNNING 135 s after the restart); the smoke test then passed, and `--autoshutdown` stopped the host — 2026-10-28.

## Jira Software 8.22.1 (profile `jira-8.22.1`)

1. Chosen because: the user asked for Jira 8.22.1 as the earliest host for EasySSO for Jira 5.2.4 (Jira DC 8.22.0 – 10.7.4) — user said, 2026-10-28.
2. Archive URL: `https://product-downloads.atlassian.com/software/jira/downloads/atlassian-jira-software-8.22.1.tar.gz` (the feed URL `www.atlassian.com/software/jira/downloads/binary/...` redirects here with HTTP 301) — `curl -sSI`, HTTP 200, 431088580 bytes — 2026-10-28.
3. MD5 `cd0c05ae7e6fe6b9390b82e132de7e06`, released 16-Mar-2022 — `https://my.atlassian.com/download/feeds/archived/jira-software.json`; the downloaded file matches — 2026-10-28.
4. Supported Java: Oracle and Temurin 8 and 11. Supported PostgreSQL: 10, 11, 12, 13 — https://confluence.atlassian.com/display/ADMINJIRASERVER0822/Supported+platforms ("This page is for Jira 8.22") — 2026-10-28. Profile uses `eclipse-temurin:11-jdk` and `postgres:13` (log: `PostgreSQL - 13.23`, JDBC driver 42.2.23).
5. Archive structure (differences from Confluence, handled in `env/lib/common.sh` and `env/atl-env.sh` by `PRODUCT`): start script `bin/start-jira.sh -fg`; Tomcat port 8080; memory in `bin/setenv.sh` as `JVM_MINIMUM_MEMORY="384m"` / `JVM_MAXIMUM_MEMORY="2048m"`; home dir from the `JIRA_HOME` environment variable (the line in `setenv.sh` is commented out); context `<Context path="" docBase="${catalina.home}/atlassian-jira"`; `JIRA_USER=""` in `bin/user.sh`, so Jira runs as the container user; product log `<home>/log/atlassian-jira.log` (directory `log`, not `logs`) — read from the archive and the running container — 2026-10-28.
6. **Database without the wizard:** `configure` writes `dbconfig.xml` (type `postgres72`) and `jira-config.properties` into the home volume if they are missing. With `dbconfig.xml` present, the wizard skips the database screen and starts at "Set up application properties" — 2026-10-28.
7. **Websudo:** `jira-config.properties` with `jira.websudo.is.disabled = true` (Jira has no UI setting). The admin opens the EasySSO screen without a password prompt — 2026-10-28.
8. `/status`: during startup Jira rejects the request ("Rejecting security-sensitive request that bypassed Johnson filter: /status") and returns no state; then `{"state":"FIRST_RUN"}` (first start: 375–405 s; the very first start after extraction about 12 min), and `{"state":"RUNNING"}` after setup — `env/atl-env.sh`, Jira log — 2026-10-28.
9. The first request to the wizard can answer HTTP 503 while Jira copies templates into the home dir; a second request works — 2026-10-28.
10. Setup wizard screens on 8.22.1, in order (verified by running them):
    1. "Set up application properties" (`/secure/SetupApplicationProperties!default.jspa`): `input[name=title]`, radio `#jira-setupwizard-mode-private`, `input[name=baseURL]` (pre-filled `http://127.0.0.1:8822`), submit `#jira-setupwizard-submit`.
    2. Licence (`/secure/SetupLicense!default.jspa`): textarea `#licenseKey`, submit "Next".
    3. "Set up administrator account" (`/secure/SetupAdminAccount!default.jspa`): `fullname`, `email`, `username`, `password`, `confirm`, submit `#jira-setupwizard-submit`.
    4. "Set up email notifications": shown as the answer to the admin form POST, so **the URL still ends in `SetupAdminAccount.jspa`**. Radio "Later" (pre-selected), submit "Finish".
    `JiraWizard` therefore identifies screens by URL and heading — 2026-10-28.
11. Login page: `/login.jsp`, `#login-form-username`, `#login-form-password`, `#login-form-submit`. Anonymous access to `/` shows the System Dashboard with a login gadget that uses the same field ids and a header "Log In" link `a.login-link`; the adapters use the link (it exists on 10.7.4 too), verified by 10 consecutive passing runs — 2026-10-28.
12. Logged-in header: `#header-details-user-fullname` with `data-username="<username>"` and `data-displayname`; `<meta name="ajs-remote-user">` — 2026-10-28.
13. **Things that covered the UI on a new instance**, and how the setup removes them (`JiraWizard.disableOnboarding`):
    1. "Welcome to Jira" (`/secure/WelcomeToJIRA.jspa`) after the first login → system property `-Datlassian.darkfeature.jira.onboarding.feature.disabled=true` (profile `EXTRA_JVM_OPTS`), the same method as 10.7.4 (item 11 there); the onboarding plugin stays enabled. Verified with the plugin enabled and a new user logging in: without the property the user is sent to `/secure/WelcomeToJIRA.jspa` ("Welcome to Jira, probe-2!"); with it, to `/secure/Dashboard.jspa`. (Before 2026-10-28 the setup disabled the plugin `com.atlassian.jira.jira-onboarding-assets-plugin` instead; that also worked on 8.22.1.)
    2. Health check flags ("Gadget feed URL", "Connection settings") → plugin `com.atlassian.troubleshooting.plugin-jira` disabled.
    3. Help tips ("Find your work faster") → plugin `com.atlassian.plugins.helptips.jira-help-tips` disabled.
    4. "We recommend that you perform a re-index" → `POST /rest/api/2/reindex?type=BACKGROUND_PREFERRED` (HTTP 202). While it runs, `GET /rest/api/2/reindex` answers 303 to `/rest/api/2/reindex/` again and again (Playwright: "Max redirect count exceeded"); when finished, HTTP 200 with `"success":true`. The setup polls without following redirects.
    5. "Your computer's time zone does not appear to match your Jira time zone preference of (GMT+00:00) UTC" → the browser uses `timezoneId: 'UTC'` (`playwright.config.ts`).
    The flags covered the top "Add a new Custom Authentication Rule" button of the EasySSO Headers screen. After these steps, no flag is shown on that screen (screenshot) — 2026-10-28.
14. Users: `POST /rest/api/2/user` with `name`, `password`, `emailAddress`, `displayName`, `applicationKeys: ["jira-software"]`; `DELETE /rest/api/2/user?username=<name>` — the test's user is created and removed — 2026-10-28.
15. Banner on every page: "Your Jira Software license expires in less than 24 hours." — 2026-10-28.
16. Timings on this machine, 2026-10-28: `reset` + `npm run setup` (archive extracted already): 1145 s = 19.1 min (exit 0): first start to FIRST_RUN 375 s, wizard + plugin step + re-index 3.5 min, restart after the snapshot 335 s to RUNNING. `restore` 379–398 s. `@smoke` × 10: 55–57 s (11 runs including login). With the onboarding property instead of disabling the plugin (2026-10-28): `reset` + `npm run setup` 1109 s = 18.5 min (exit 0), onboarding plugin enabled afterwards, `@smoke` × 10 passed (11 passed, 1.1 min).

## Jira Software 10.7.4 (profile `jira-10.7.4`)

1. Chosen because: the user asked for the highest Jira version supported by EasySSO for Jira 5.2.4 (8.22.0 – **10.7.4**, Marketplace REST) — user said, 2026-10-28.
2. Archive URL: `https://product-downloads.atlassian.com/software/jira/downloads/atlassian-jira-software-10.7.4.tar.gz` (feed URL redirects here with HTTP 301) — `curl -sSI`, HTTP 200, 639298189 bytes — 2026-10-28.
3. MD5 `92cc9140f934b75fef9d0768e6a3b66d`, released 14-Aug-2025 — `jira-software.json` archived feed; the downloaded file matches — 2026-10-28.
4. Supported Java: Oracle and Temurin 21 (JDK 17 deprecated). Supported PostgreSQL: 16 (12–15 deprecated) — https://confluence.atlassian.com/spaces/ADMINJIRASERVER107/pages/1595114190/Supported+platforms — 2026-10-28. Profile uses `eclipse-temurin:21-jdk` and `postgres:16`.
5. Archive structure: the same as 8.22.1 (`start-jira.sh`, `JVM_MINIMUM_MEMORY`/`JVM_MAXIMUM_MEMORY`, commented `JIRA_HOME`, `docBase="${catalina.home}/atlassian-jira"`, port 8080, empty `JIRA_USER`) — read from the archive — 2026-10-28.
6. **`/status` reports FIRST_RUN before Jira is ready:** for about 1 minute after FIRST_RUN the plugin system is still starting ("Plugins that have yet to be enabled: (87)"); pages answer HTTP 503, and `/login.jsp` fails with "Unable to resolve component". The first setup run failed for this reason. `JiraWizard` now waits until `/` answers below 500 with a heading — 2026-10-28.
7. Setup wizard: the same 4 screens as 8.22.1, with one difference: on the email screen "Finish" is a `<button>` (8.22.1: `<input type=submit>`); `getByRole('button', { name: 'Finish' })` matches both. After "Finish", the administrator is **already logged in** and sees "Welcome to Jira, Test Administrator!" (language choice), so `login.jsp` shows no form; `JiraWizard.login` clears the cookies first — 2026-10-28.
8. Login page redesigned: `/login.jsp`, title "Log into Atlassian - Jira", `#username-field`, `#password-field`, submit `#login-button` (the same ids as Confluence 9) — `Jira10Wizard`, `Jira10Adapter` — 2026-10-28.
9. Anonymous `/` → `/secure/Dashboard.jspa` with **no login gadget** ("Introduction" gadget only). The header has a "Log In" link: `a.login-link` (`href=/login.jsp?os_destination=%2Fdefault.jsp`). The adapters use this link as the "not logged in" check (`loginPrompt`) — 2026-10-28.
10. Logged-in header: `#header-details-user-fullname[data-username=<username>]`, the same as 8.22.1 — the test passes — 2026-10-28.
11. **Onboarding on 10.7.4:** with the onboarding plugin (`com.atlassian.jira.jira-onboarding-assets-plugin`) disabled as on 8.22.1, a new user who logs in by header is sent to `/secure/WelcomeToJIRASoftware.jspa`, which answers **HTTP 500** ("Must have non-zero number of input Soy files"; log: "Some module descriptors are either missing or disabled"). Fix: keep the plugin enabled and start Jira with `-Datlassian.darkfeature.jira.onboarding.feature.disabled=true` (profile `EXTRA_JVM_OPTS`). Then a new user lands on `/secure/Dashboard.jspa`, logged in (browser check with a temporary user and rule, both removed) — 2026-10-28.
12. Flags on the admin screens after the 8.22.1 steps: "Instance Optimizer is available for your application" and "Database integrity checks are enabled by default". Both disappear when the plugin `com.atlassian.jira.plugins.jira-optimizer-plugin` ("Instance Optimizer for Jira") is disabled; disabling the Atlassian Notifications (whisper) plugins and "Post setup announcements" did not remove them, so those stay enabled — checked one plugin at a time — 2026-10-28.
13. Seen once, not reproduced: a "Try dark theme" tip with "Got it" (top right, admin screen, first visit after setup). It did not cover the EasySSO buttons. The user said it probably comes from the Atlassian platform and can be ignored, or closed and ignored (2026-10-28). Nothing is done about it; if it ever covers a button, close it with "Got it".
14. Users: same REST calls as 8.22.1 (`POST /rest/api/2/user` HTTP 201, `DELETE` HTTP 204) — 2026-10-28.
15. Timings on this machine, 2026-10-28: `reset` + `npm run setup`: 1270 s = 21.2 min (exit 0): first start to FIRST_RUN 415–435 s, wizard + plugin step + re-index 3.7–4.0 min, restart after the snapshot 400–410 s. `restore` 473 s = 7.9 min. `@smoke` × 10: 58.6 s (11 runs including login).

## Windows / Docker Desktop

1. `localhost` resolves to `::1`, which is held by `wslrelay` and never answers; all URLs use `127.0.0.1` (see `_reference/docs/notes/hosts.md`) — 2026-10-27.
2. **curl error 23 explained:** `download` failed at once with `curl: (23) client returned ERROR on write of 16384 bytes`. Cause: the script sets `MSYS_NO_PATHCONV=1`, and Git's `curl.exe` is a Windows program, so it got the path `/c/Users/...` unchanged and could not write to it. The same command without `MSYS_NO_PATHCONV` worked. Fix: `curl -o "$(hostpath ...)"` (C:/ path). After the fix the download worked and the MD5 matched. This is probably also the cause of open question 2 in `_reference` (not re-tested there) — 2026-10-27.
3. Container images used: `postgres:9.6`, `eclipse-temurin:8-jdk` (6.6.17, 2026-10-27); `postgres:16`, `eclipse-temurin:21-jdk` (9.5.4, 2026-10-28).

## Windows / npm runner

Same as `_reference/docs/notes/hosts.md` ("Windows / npm runner"): the runner uses Git Bash explicitly, and `-- --env <host>` is the form without npm warnings.

## Licences

1. The "10 user Confluence Data Center license, expires in 3 hours" timebomb licence was accepted by the 6.6.17 wizard (it then asks for the cluster, item 7 above) — 2026-10-27.
2. The "10 user Data Center app license, expires in 3 hours" was accepted for EasySSO 5.2.4 through UPM REST (`"valid":true`) — 2026-10-27. The same key was accepted for EasySSO for Jira 5.2.4 on Jira 8.22.1 — 2026-10-28.
3. Jira: "10 user Jira Software Data Center license, expires in 3 hours" (`.env.local` variable `ATL_LICENSE_JIRA_DC`). The user asked Claude to take it from the timebomb page and add it to `.env.local` (2026-10-28). It was taken with the same method that reproduces the existing Confluence and app keys exactly (text after the heading, line breaks removed), and was accepted by the 8.22.1 wizard — 2026-10-28.
