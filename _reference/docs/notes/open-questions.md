# Open questions

Each item: the question — what would resolve it.

1. Timebomb licence: `restore` resets the 3 hours (see Resolved). Still open: does a plain `stop` + `start` (without restore) also reset them, that is, is the time counted from JVM start? — let an instance pass 3 hours, run `npm run shutdown` and `npm run start`, then run the smoke tests.
2. Why did the first two downloads of the 9.2.26 archive fail with curl error 23 ("client returned ERROR on write")? A direct `curl -sS` download worked right afterwards. The script now uses `curl -sS` — run `download` for a new profile and see if it happens again.
3. Does Confluence 8.5.31 have the same parallel space creation failure as 9.2.26 (`bandana_unique_key`)? Not important now: the suite creates one space per run — only relevant if per-worker spaces are needed again.
4. Why did saving the Server Base URL on `/admin/editgeneralconfig.action` send no request? Not needed now (the wizard sets the base URL), but needed if a base URL must ever be changed — inspect the form's submit handler.
5. Can secure administrator sessions be turned off with a system property instead of the UI? — not needed now (the UI step works).
6. WSL `localhostForwarding` (`wslrelay` on `::1`) breaks `localhost`. Leaving it as is and using `127.0.0.1`. Changing `.wslconfig` would affect other tools on this machine — user decision.
7. **List of Addresses with an empty body** (or only blank lines) renders a static map with no markers and no error. Is that intended (like the world map for an empty Location), or should it show an error? — user decision; then a test can be added.
8. List of Addresses: why does a line starting with `">` give "Error in Macro Body: Invalid address or coordinates" while other bad lines give "cannot find this address"? Not needed for the current tests — ask TechTime or read the app's `AddressParser` class.
9. Pasting a Google Maps URL into the editor converts it into a Google Maps macro (`confluence-autoconvert.js`). Not tested yet — needs clipboard paste in the browser; tell me if you want this test.

10. The 10-run check of the 22 `@full` tests (`--repeat-each=10`, both hosts, 2 workers) was stopped because the machine ran low on memory; Playwright workers then exited with code 3221225794 (0xC0000142). Not yet known: whether one host at a time is enough — run `npm run test -- --env confluence:8.5.31 --grep @full --repeat-each=10`, then the same for 9.2.26, with fewer other programs open — 2026-10-27.

## Next work (not started; needs the user's go-ahead)

1. More `@full` tests (CLAUDE.md 5.3): remaining parameters (zoom, width/height of the single map), view as anonymous, Word export, macro inside tables and page layouts, paste-to-convert (item 9).
2. A Confluence 9.5.4 profile (the newest version the app supports) — would test the upper end of the compatibility range.
3. CI: running the tests (not the environment) in Bitbucket Pipelines.
4. A git repository (the user said to wait until things work).

## Resolved

- Does `restore` reset the timebomb licence period? Yes. On 9.2.26 the snapshot (with the licences) was taken at 03:50 UTC. At 07:32 UTC the test setup failed: `POST /rest/api/space` → HTTP 403 "Cannot create Space" (read-only). After `restore` the smoke tests passed at about 07:45 UTC, which is about 4 hours after the licence was entered. So the 3 hours do not run from when the licence was entered — 2026-10-27.
- `restore` time on 9.2.26: 6 min 16 s (RUNNING after 175 s of startup) — `npm run restore`, 2026-10-27.
- npm commands with `--env`: added (`scripts/atl.mjs`) — user asked, 2026-10-27.

- Empty Location renders a world map: intended — user said, 2026-10-27.
- Setup wizard location: `env/setup/`; CLAUDE.md updated — user said, 2026-10-27.
- App file location: moved from `OBRs/` to `apps/` — user said "move the file if that would make things better", 2026-10-27.
- Add a Confluence 9.x profile: yes — user said, 2026-10-27. Profile `confluence-9.2.26`, verified.
- `/status` endpoint format: `{"state":"FIRST_RUN"}` / `{"state":"RUNNING"}` on 8.5.31 and 9.2.26 — `curl`, 2026-10-27.
- Google API key or admin configuration needed: no — app descriptor and running instance, 2026-10-27.
