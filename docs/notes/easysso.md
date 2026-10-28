# EasySSO for Confluence and Jira — app facts

Format: fact — how verified — date.

## Version choice

1. Marketplace app id 1212583, key `org.techtime.confluence.plugins.easysso`, name "EasySSO for Confluence (Kerberos/NTLM/HTTP headers/SAML SSO)" — Marketplace REST `https://marketplace.atlassian.com/rest/2/addons?text=easysso` — 2026-10-27.
2. Newest version compatible with Confluence below 10: **5.2.4** (released 2026-09-29), Data Center, Confluence **6.0.1 – 9.5.4**. Newer versions (5.3.x, 5.5.0) need Confluence 10.0.1 or later. 5.2.3 and older 5.x: 5.10.0 – 9.5.4 — Marketplace REST `/rest/2/addons/org.techtime.confluence.plugins.easysso/versions` — 2026-10-27. The user expected 5.2.4 — user said, 2026-10-27.
3. Download: `https://marketplace.atlassian.com/download/apps/1212583/version/5002004000` (redirects to an artifact URL), HTTP 200, 29096271 bytes, MD5 `c1efdde391cebcf6b31cb474fc73058a`. Saved as `apps/confluence.plugins.easysso-5.2.4.obr` (git-ignored) — 2026-10-27.

## From the app package

Source: the OBR contains `confluence.plugins.easysso-5.2.4.jar` and `dependencies/plugins.techtimecore-3.0.0.jar`. Read from the JAR's `atlassian-plugin.xml`, `org-techtime-easysso.properties` and `headers/customauth-admin.vm|.js` — 2026-10-27.

1. Licensing enabled (`atlassian-licensing-enabled=true`). Configure URL `/plugins/servlet/easysso/admin`. Admin menu entry in section `system.admin/techtime_addons_menu`.
2. Five authenticators: NTLM/Kerberos, SAML, X.509, Headers (custom authentication), plus IP/user-agent filters. Header and attribute checks run in the servlet filter `PrincipalFilter` (location `before-login`).
3. Headers screen: `/plugins/servlet/easysso/admin/headers`, page title and heading "Custom Authentication".
4. The rules are read and saved through `rest/easysso/1.0/headers`: `GET` returns a JSON array; `PUT` with the full array replaces all rules. Rule fields: `type` (`header` | `attribute`), `name`, `getUsername`, `disableNTLM`, `ipFilter` (comma-separated IPs, ranges or CIDR).
5. Rule table columns: Type, Name (required), Get Username, Disable NTLM/Kerberos, IP Filter. Inputs have `data-id` attributes `type`, `name`, `getUsername`, `disableNTLM`, `ipFilter`, no test ids, and every text input has the title "Text input". Rows: `#custom-auth-tbody .custom-auth-rule`; a hidden template row is in `#custom-auth-template-table`.
6. Buttons: two with the label `"Add a new Custom Authentication Rule"` (the quotation marks are part of the label), and "Save" (`input[type=submit]`). After Save: message "Saved" in `#ajax-result` (fades out after 3 s). A rule without a name: "Each custom authentication rule requires a name".
7. The page script loads the saved rules with an AJAX `GET` after the page loads. A click on "Add …" before that had no effect (1 of 10 runs) — test run, 2026-10-27.
8. The screen warns: header values must come from a trusted reverse proxy that removes headers set by clients.

Documentation: https://www.techtime-initiative.com/space/EasySSO/4980915/EasySSO+with+Headers+and+Attributes and https://techtime-website.atlassian.net/wiki/spaces/EasySSO/pages/4948283 ("EasySSO with Headers - Configuration") — fetched 2026-10-27.

## Observed on Confluence 6.6.17

1. Installed through UPM REST, enabled, DC app timebomb licence valid — `install-app`, 2026-10-27.
2. With the rule Header `X-Atl-Test-User`, Get Username on (everything else empty): a browser without cookies that sends `X-Atl-Test-User: <username>` gets the dashboard logged in as that user (`#user-menu-link[data-username=<username>]`, a `JSESSIONID` cookie is set). Without the header the same request is redirected to the login page — exploration script and the test, 2026-10-27.
3. The same rule with Get Username **off**: the header does not log anyone in (the test fails at "user menu visible") — temporary copy of the test, 2026-10-27.
4. This works for a non-admin user created with JSON-RPC `addUser` — the test, 2026-10-27.
5. IP Filter empty: the header is accepted from any address (the request reaches the container through Docker's port forward) — 2026-10-27.
6. Header rules are a site-wide setting, so tests that change them cannot run in parallel; the suite uses 1 worker — 2026-10-27.

## Observed on Confluence 9.5.4

1. Installed through UPM REST, enabled, DC app timebomb licence valid — `install-app`, 2026-10-28.
2. Same Headers screen and REST endpoint as on 6.6.17; the page object works unchanged — the test, 2026-10-28.
3. Header login with "Get Username" on works; with it off, the header does not log anyone in (temporary copy of the test fails at "user menu visible") — 2026-10-28.

## EasySSO for Jira

1. Marketplace app id 1212581, key `org.techtime.jira.plugins.easysso`, name "EasySSO for Jira (Kerberos/NTLM/HTTP headers/SAML SSO)" — Marketplace REST — 2026-10-28.
2. Version **5.2.4** (released 2026-09-29): Jira Data Center **8.22.0 – 10.7.4**. The 5.3.x versions need Jira 11.0.0 – 11.3.12 — Marketplace REST `/rest/2/addons/org.techtime.jira.plugins.easysso/versions` — 2026-10-28. The user expected 5.2.4 — user said, 2026-10-28.
3. Download: `https://marketplace.atlassian.com/download/apps/1212581/version/5002004005`, 29078012 bytes, MD5 `481bd97f9a90d29db5eb3ff4b2d9392e`. Saved as `apps/jira.plugins.easysso-5.2.4.obr` (git-ignored) — 2026-10-28.
4. Same servlets as the Confluence app (admin `/plugins/servlet/easysso/admin*`), same REST path (`<rest path="/easysso" version="1.0">`, `rest/easysso/1.0/headers`). `headers/customauth-admin.js` and `customauth-admin.vm` are byte-for-byte identical to the Confluence 5.2.4 files (`cmp`), so the page object `EasySsoHeadersConfig` is shared — 2026-10-28.
5. On Jira 8.22.1: installed through UPM REST, enabled, DC app timebomb licence valid. Headers screen title "Custom Authentication - Jira", in the Jira admin layout (sidebar "TECHTIME APPS > EasySSO") — 2026-10-28.
6. On Jira 8.22.1: header login with "Get Username" on logs the header's user in (`#header-details-user-fullname[data-username]`); with it off, it does not (temporary copy of the test fails at "user menu visible"); without the header, the dashboard shows the login gadget — 2026-10-28.
7. On Jira 10.7.4: the same results as item 6 (installed and licensed through UPM; header login works; the negative copy fails at "user menu visible"). Without the header the dashboard has no login gadget, only the header "Log In" link — 2026-10-28.
8. A new user who logs in by header is treated like any first login: Jira's onboarding redirect applies to them (10.7.4: `/secure/WelcomeToJIRASoftware.jspa`). The environment turns onboarding off (hosts.md, Jira 10.7.4 item 11) — 2026-10-28.

## How the test uses these facts

| Test | Checks |
|---|---|
| `http-headers.spec.ts` › a header rule with "Get Username" logs in the user named in the header (`@smoke`) | items 3–6 of the package facts (add a rule in the UI, "Saved"); observed items 2 and 4 (user menu of the header's user, no login form); then a browser without the header sees the login form |
