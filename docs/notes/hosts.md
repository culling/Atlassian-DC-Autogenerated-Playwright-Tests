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

## Windows / Docker Desktop

1. `localhost` resolves to `::1`, which is held by `wslrelay` and never answers; all URLs use `127.0.0.1` (see `_reference/docs/notes/hosts.md`) — 2026-10-27.
2. **curl error 23 explained:** `download` failed at once with `curl: (23) client returned ERROR on write of 16384 bytes`. Cause: the script sets `MSYS_NO_PATHCONV=1`, and Git's `curl.exe` is a Windows program, so it got the path `/c/Users/...` unchanged and could not write to it. The same command without `MSYS_NO_PATHCONV` worked. Fix: `curl -o "$(hostpath ...)"` (C:/ path). After the fix the download worked and the MD5 matched. This is probably also the cause of open question 2 in `_reference` (not re-tested there) — 2026-10-27.
3. Container images used: `postgres:9.6`, `eclipse-temurin:8-jdk` (6.6.17, 2026-10-27); `postgres:16`, `eclipse-temurin:21-jdk` (9.5.4, 2026-10-28).

## Windows / npm runner

Same as `_reference/docs/notes/hosts.md` ("Windows / npm runner"): the runner uses Git Bash explicitly, and `-- --env <host>` is the form without npm warnings.

## Licences

1. The "10 user Confluence Data Center license, expires in 3 hours" timebomb licence was accepted by the 6.6.17 wizard (it then asks for the cluster, item 7 above) — 2026-10-27.
2. The "10 user Data Center app license, expires in 3 hours" was accepted for EasySSO 5.2.4 through UPM REST (`"valid":true`) — 2026-10-27.
