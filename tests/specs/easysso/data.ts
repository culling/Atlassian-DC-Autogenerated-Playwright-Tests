// Test data for the EasySSO tests.

/**
 * Header that the test rule trusts. In production a reverse proxy sets such a header after it has
 * authenticated the user; here the browser context sends it directly.
 */
export const USERNAME_HEADER = 'X-Atl-Test-User';
