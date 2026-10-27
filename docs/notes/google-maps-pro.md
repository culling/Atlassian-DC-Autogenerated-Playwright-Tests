# Embed Google Maps Pro — app facts

Format: fact — how verified — date.

## From the app package

Source: `atlassian-plugin.xml` and `.properties` files inside
`apps/confluence.plugins.googlemapsembed-8.1.5.obr` (unzipped and read; the file was in `OBRs/` at the time and has since moved) — 2026-10-27.

Compatibility: Confluence 7.0.1 – 9.5.4 — user said, 2026-10-27.

1. App key `org.techtime.confluence.plugins.googlemapsembed`, version 8.1.5, name "Embed Google Maps Pro". The OBR also contains the dependency `plugins.techtimecore-2.30.6.jar`.
2. Licensing enabled (`atlassian-licensing-enabled=true`). Without a valid licence the macro shows: "Embed Google Maps Pro app is not licensed or the license is invalid" (title "Invalid License").
3. Macros:
   | Macro key | Title in macro browser | Notes |
   |---|---|---|
   | `googlemaps-embed` | Google Maps | Main macro. Category "external-content". No body. |
   | `googlemaps-list-of-addresses` | Google Maps for a List of Addresses | Body = list of addresses. |
   | `google-map` | — | Hidden. Migration macro for the old "Nordic" Google Map app. |
4. `googlemaps-embed` parameters (name → English label):
   - `search` → "Location" (address or coordinates; not required)
   - `href` → "Google Map link" (not required)
   - `language` → "Choose a language" (enum, e.g. "English")
   - `maptype` → "Map Type" (enum: "Road map", "Satellite")
   - `zoom` → "Zoom" (enum "0%" … "100%" in steps of 5)
   - `width` → "Width" (default 600), `height` → "Height" (default 400)
   - Also: `id`, `class`, `style`, `title`, `frameborder`, `longdesc`, `marginheight`, `marginwidth`, `name`, `scrolling` (copied onto the iframe).
5. Error template (`html/googlemapsembed-error.vm`): `<div class="techtime-error-container"><div class="aui-message aui-message-error">$errorMessage</div></div>`.
6. Error messages:
   - "Error in Macro Parameters: Invalid address or coordinates"
   - "Error in Macro Parameters: Invalid Google Maps Link"
   - `We are getting an error from Google trying to geocode "{0}" please try changing the search terms`
7. No admin configuration page in the descriptor (no `web-item`, `servlet` or admin `web-section` modules).

## Observed on Confluence 8.5.31 (and 9.2.26 where stated)

Verified by running the macro in the editor and in view mode on 8.5.31 — 2026-10-27.
Items 2, 3, 4, 5, the Map Type part of 6, 9 and 10 were also confirmed on 9.2.26, by the smoke tests passing there with the same selectors and assertions. Items 7, 8 and the Zoom part of 6 were checked on 8.5.31 only.

1. No Google API key setup is needed. The app puts its own built-in key into the iframe `src` (`key=...`). The key value is not copied into this repository.
2. Macro browser: searching "Google Maps" lists item `#macro-googlemaps-embed` ("Google Maps — Shows a Google Map") and `#macro-googlemaps-list-of-addresses`.
3. Parameter dialog heading: "Insert ‘Google Maps’ Macro" (new) / "Edit ‘Google Maps’ Macro" (existing). Fields are `#macro-param-<name>` with `<label for>` = the labels in item 4 above. Button "Insert" (new) or "Save" (existing).
4. Editor placeholder: `<img class="editor-inline-macro" data-macro-name="googlemaps-embed" role="button" aria-label="googlemaps-embed macro" data-macro-parameters="search=...">`. Clicking it shows a property panel with "Edit" and "Remove".
5. Rendered output for a Location: `<iframe src="https://www.google.com/maps/embed/v1/search?q=<form-encoded address>&key=...&maptype=roadmap&language=en" width="600" height="400" data-macro-name="googlemaps-embed" ...>`.
6. Map Type "Satellite" → `maptype=satellite`. Zoom "50%" → `zoom=10`.
7. Empty Location and empty link → **no error**; renders a world map: `.../embed/v1/view?center=0%2C60&key=...&zoom=1`. This is intended behaviour — user said, 2026-10-27.
8. A meaningless Location (`zzqx-not-a-place-1234`) → **no error**; renders a normal search iframe (Google decides what to show).
9. Google Map link `https://example.com/not-a-map` → error box "Error in Macro Parameters: Invalid Google Maps Link", no iframe.
10. Manage apps (`/plugins/servlet/upm/manage/user-installed`): entry `.upm-plugin[data-key="org.techtime.confluence.plugins.googlemapsembed"]`, name "Embed Google Maps Pro", label "LICENSE EXPIRING" (timebomb licence). Expanded details show "Version: 8.1.5", "License status: Valid", a "Disable" button and "13 of 13 modules enabled".

## Observed on 8.5.31 and 9.2.26 (second round)

Verified 2026-10-27. Method: pages created with each case in storage format (exploration script, not the tests), then viewed in a browser; the rendered HTML was identical on both hosts. Then confirmed through the editor UI by the `@full` tests.

### Unicode

1. Location in Japanese, Arabic, Cyrillic, and with accents and emoji: the iframe `src` has the text UTF-8 form-encoded in `q=` (for example `東京タワー` → `q=%E6%9D%B1%E4%BA%AC%E3%82%BF%E3%83%AF%E3%83%BC`). No error.
2. "Choose a language" option → `language=` code: Japanese `ja`, Arabic `ar`, Russian `ru`, German `de`. Default `en`.

### Place links ("Google Map link" field)

3. `https://www.google.com/maps/place/Ruchi+Indian+Cuisine` → `src="https://www.google.com/maps/embed/v1/place?q=place_id:<id>&maptype=roadmap&key=..."`. The app asks Google for the place id when rendering; the id value comes from Google.
4. A place link with `@-33.8567844,151.213108,17z` → the same plus `&zoom=16.0z&center=-33.8567844,151.213108` (centre written unencoded; the zoom value is changed from 17z to 16.0z — reason unknown, not asserted).
5. A place link with a unicode name (`/maps/place/東京タワー`) → place embed with a place id.
6. The editor also converts a pasted Google Maps URL into a Google Maps macro (`js/confluence-autoconvert.js`, sets `href=`). Not tested yet.

### List of Addresses macro (`googlemaps-list-of-addresses`)

7. Macro browser title "Google Maps for a List of Addresses", item `#macro-googlemaps-list-of-addresses`. The dialog labels are the raw parameter names `width`, `height`, `language`, `maptype`, `zoom` (no i18n labels); the dialog also shows "No macro metadata".
8. Body macro: in the editor it is `<table class="wysiwyg-macro" data-macro-name="googlemaps-list-of-addresses" data-macro-body-type="RICH_TEXT">` with the body in `td.wysiwyg-macro-body`. After Insert the cursor is inside the body. One address per paragraph; addresses separated by `<br/>` in one paragraph also work.
9. Rendered: `<img src="https://maps.googleapis.com/maps/api/staticmap?key=...&size=600x400&markers=color%3Ared%7C<lat>%2C<lng>%7C<lat>%2C<lng>&maptype=roadmap&language=en" data-macro-name="googlemaps-list-of-addresses">` — one marker per address, coordinates from Google. The image has no `alt`.
10. width 500, height 300, maptype Satellite, language Japanese → `size=500x300`, `maptype=satellite`, `language=ja`.
11. Unknown address → no image; error box: "Error processing addresses:" followed by one `<li>` per bad line: `Address 2 of 2 - Google Maps cannot find this address: "zzqx-not-a-place-1234". Make sure your search is spelled correctly, ...`. Valid lines are not listed. Example: lines 1 and 3 of 3 bad → two items "Address 1 of 3", "Address 3 of 3".
12. Bad strings that get the "cannot find" error: `'; DROP TABLE users; --`, `999, 999`, 3000 × "A", `<script>...</script>` (shown escaped as text), `<img src=x onerror=...>` (shown as text).
13. The line `"><img src=x onerror="...">` (starting with `">`) gets a different error: "Error in Macro Body: Invalid address or coordinates" (i18n key `listofaddresses.query.not.valid`). Reason unknown; not tested.
14. **Empty body, or only blank lines → no error**; a static map image with no markers (`markers=color%3Ared%7C`). Whether this is intended: open question.

### XSS (cross-site scripting) attempts

15. No payload ran (no dialog, no marker variable set) on either host. The values are escaped:
    - `title`, `style`, `id` parameters: copied into the iframe attribute with `"` → `&quot;` and `<` → `&lt;` (for example `title="x&quot; onload=&quot;..."`).
    - Location with `"><img onerror>`: only appears URL-encoded inside `q=`.
    - Non-numeric `width`/`height` (map and list, also in the error box style): ignored, the defaults 600/400 are used.
    - Google Map link `javascript:...` and a Google link with `"><script>`: "Error in Macro Parameters: Invalid Google Maps Link".
    - List body markup: shown escaped inside the error text.

### PDF export

16. The page menu item `#action-export-pdf-link` ("Export to PDF") links to `/spaces/flyingpdf/pdfpageexport.action?pageId=<id>`; on 9.2.26 the link also has `&atl_token=<XSRF token>`. Opening it downloads the PDF directly (no progress page), in 0.2–11 s.
17. The app has PDF templates (`staticRenderTemplates/mapPDF.vm`, `iframe-list-of-addresses-pdf.vm`). In the exported PDF each map is one image (`/Subtype /Image`) of the macro size, 600 × 400 by default, for both macros. A page without a macro has no image. The PDF object dictionaries are uncompressed, so image sizes can be read from the bytes.

## How the smoke tests use these facts

| Test | Checks |
|---|---|
| app is installed and enabled | item 10: entry contains "Embed Google Maps Pro"; "N of N modules enabled" is visible |
| insert map with an address | item 5: iframe `src` starts with `https://www.google.com/maps/embed/v1/search?` and contains `q=<address>` |
| edit an existing map | item 6: `maptype=roadmap` before, `maptype=satellite` after, address unchanged |
| invalid Google Map link | item 9: the error text is visible and no iframe is rendered |

`@full` tests (second round facts above):

| Spec | Tests | Checks |
|---|---|---|
| `unicode.spec.ts` | 4 (Japanese, Arabic, Cyrillic, accents + emoji) | items 1–2: `q=` encoding and `language=` code |
| `place-links.spec.ts` | 3 (name, unicode name, coordinates) | items 3–5: place embed src; `center=` for coordinates |
| `list-of-addresses.spec.ts` | 3 valid + 5 bad input | items 8–12: marker count, size/maptype/language, error lines by position |
| `pdf-export.spec.ts` | 2 (one per macro) | items 16–17: download is a PDF with a 600 × 400 image |
| `xss.spec.ts` | 5 | item 15: no dialog; payload stays text (title attribute, error text); bad links rejected |

Test data (addresses, invalid link, error texts): `tests/specs/google-maps-pro/data.ts`.
