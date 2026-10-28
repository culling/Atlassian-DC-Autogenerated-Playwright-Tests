# Open questions

Each item: the question — what would resolve it.

1. Timebomb licence: does `restore` reset the 3 hours on 6.6.17, as on 9.2.26 (see `_reference`)? — wait 3 hours after `restore`, check the site is read-only, run `restore`, then the test.
2. Why did normal Playwright clicks on the 6.6.17 wizard buttons never pass the "stable" check, while the form was submitted? Not needed now (one forced click works) — inspect the page in a trace.
3. Is the "Base URL `<null>`" state only a result of the repeated form submits (as it seems), or can it also happen on a clean setup? Two clean `reset` + `up` runs both gave the correct base URL and a working app install — more runs would add evidence.
4. EasySSO with a non-empty "IP Filter": which client address does EasySSO see behind Docker's port forward (the Docker gateway address or 127.0.0.1)? Needed before testing IP filters — read the address from EasySSO's troubleshooting page.
5. Should the header test also cover: a user that does not exist, "Disable NTLM/Kerberos", the "Attribute" type, the IP filter? — user decision (the user said only the HTTP headers test for now).
6. `_reference`: the curl error 23 fix (hosts.md, "Windows / Docker Desktop" item 2) is applied only in this project, not in `_reference/env/atl-env.sh` — user decision whether to change the reference copy.
7. Confluence 9: the user said "confluence 9" without a version. 9.5.4 was chosen (newest 9.x, newest host for EasySSO 5.2.4; `confluence-9.2.26` would share Docker objects with `_reference`). Should 9.2 (the Long Term Support release) be tested as well? — user decision. It needs a profile name that differs from `_reference`'s, or a change to how Docker names are built.
8. Total time of `up` on 9.5.4 — the first run's npm process was stopped by Claude Code because of low memory (hosts.md 9.5.4 item 10); measure with `reset` + `up`.

## Resolved

- Which EasySSO version: 5.2.4, the newest for Confluence below 10 (6.0.1 – 9.5.4) — Marketplace REST, and the user expected 5.2.4, 2026-10-27.
- curl error 23 on `download`: caused by `MSYS_NO_PATHCONV=1` with Git's Windows `curl.exe`; fixed with `hostpath` — 2026-10-27.
- Does the DC timebomb licence work on 6.6.17? Yes, with a one-node cluster — 2026-10-27.
- Which EasySSO for Jira version and hosts: 5.2.4 (Jira DC 8.22.0 – 10.7.4); hosts 8.22.1 (user's choice) and 10.7.4 (highest) — Marketplace REST and user, 2026-10-28.
- Jira 10.7.4 "Try dark theme" tip: probably from the Atlassian platform; ignore it, or close it and ignore it — user said, 2026-10-28.
- Onboarding on Jira 8.22.1 with the system property: works (a new user lands on the dashboard; without the property, on `/secure/WelcomeToJIRA.jspa`). Both Jira profiles now use the property, and the onboarding plugin stays enabled on both — the user asked for it if it works, 2026-10-28.
- Jira versions between 8.22.1 and 10.7.4: not for now. The user may review this later, probably together with automating configuration (likely as troubleshooting) — user said, 2026-10-28.
- Jira host licence: `ATL_LICENSE_JIRA_DC` ("10 user Jira Software Data Center license"), added to `.env.local` on the user's request; accepted on 8.22.1 and 10.7.4 — 2026-10-28.
