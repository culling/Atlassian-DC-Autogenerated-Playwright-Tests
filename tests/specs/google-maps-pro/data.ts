// Shared test data for Embed Google Maps Pro specs (CLAUDE.md section 5.4.3).

export const APP = {
  key: 'org.techtime.confluence.plugins.googlemapsembed',
  /** Name shown in Manage apps. */
  name: 'Embed Google Maps Pro',
  /** Title of the macro in the macro browser (i18n key ...googlemaps-embed-xhtml.label). */
  macroTitle: 'Google Maps',
  macroKey: 'googlemaps-embed',
};

export const ADDRESSES = {
  primary: '1600 Amphitheatre Parkway, Mountain View, CA',
  secondary: 'Sydney Opera House, Sydney NSW',
};

/** Not a Google Maps link; the app rejects it before contacting Google. */
export const INVALID_MAP_LINK = 'https://example.com/not-a-map';

/** The second macro of the app. Title from i18n key ...googlemaps-list-of-addresses-xhtml.label. */
export const LIST_MACRO = {
  title: 'Google Maps for a List of Addresses',
  key: 'googlemaps-list-of-addresses',
};

/**
 * Locations in non-Latin scripts and with non-ASCII characters, with the language option chosen
 * for each and the code the app writes into the iframe src (verified on 8.5.31 and 9.2.26).
 */
export const UNICODE_LOCATIONS = [
  { name: 'Japanese', address: '東京タワー', language: 'Japanese', code: 'ja' },
  { name: 'Arabic (right-to-left)', address: 'برج خليفة، دبي', language: 'Arabic', code: 'ar' },
  { name: 'Cyrillic', address: 'Красная площадь, Москва', language: 'Russian', code: 'ru' },
  { name: 'accents and emoji', address: 'Zürich Hauptbahnhof 🚉', language: 'German', code: 'de' },
];

/** Unicode lines for the List of Addresses macro; Google finds both. */
export const UNICODE_ADDRESS_LIST = ['東京タワー', 'Красная площадь, Москва'];

/**
 * Google Maps "place" links. The app asks Google for the place id and renders
 * https://www.google.com/maps/embed/v1/place?q=place_id:<id>. The id value comes from Google and is not asserted.
 */
export const PLACE_LINKS = {
  byName: 'https://www.google.com/maps/place/Ruchi+Indian+Cuisine',
  /** With "@lat,lng,zoom": the app adds center=<lat>,<lng> to the src. */
  withCoordinates: 'https://www.google.com/maps/place/Sydney+Opera+House/@-33.8567844,151.213108,17z',
  center: '-33.8567844,151.213108',
  unicode: 'https://www.google.com/maps/place/東京タワー',
};

/** Addresses Google cannot find (checked on 8.5.31 and 9.2.26). */
export const UNKNOWN_ADDRESSES = ['zzqx-not-a-place-1234', 'qqzz-nowhere-9876'];

/** Bad strings for the List of Addresses body. Each one gets the "cannot find this address" error. */
export const BAD_ADDRESS_STRINGS = [
  { name: 'SQL injection text', value: "'; DROP TABLE users; --" },
  { name: 'out-of-range coordinates', value: '999, 999' },
  { name: '3000 characters', value: 'A'.repeat(3000) },
];

/**
 * Basic XSS (cross-site scripting) payloads. Each one calls alert('<marker>') if it runs;
 * XssProbe records any dialog. The marker says which input it came from.
 */
export const XSS = {
  location: `"><img src=x onerror="alert('xss-location')">`,
  title: `x" onload="alert('xss-title')`,
  mapLink: `javascript:alert('xss-map-link')`,
  googleMapLink: `https://www.google.com/maps/place/x"><script>alert('xss-google-link')</script>`,
  listScript: `<script>alert('xss-list-script')</script>`,
  listImg: `<img src=x onerror=alert('xss-list-img')>`,
};

/** Messages from the app's .properties files. */
export const ERRORS = {
  invalidAddress: 'Error in Macro Parameters: Invalid address or coordinates',
  invalidMapLink: 'Error in Macro Parameters: Invalid Google Maps Link',
  listHeading: 'Error processing addresses:',
  /** List of Addresses: one line per address Google cannot find. */
  addressNotFound: (index: number, count: number, address: string) =>
    `Address ${index} of ${count} - Google Maps cannot find this address: "${address}".`,
};
