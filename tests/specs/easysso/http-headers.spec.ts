// Why E2E: header login is a servlet filter in the running host. Only a real request from a browser that
// has no session shows whether the host logs that browser in as the user named in the header.
import { test, expect } from '../../fixtures/index.js';
import { EasySsoHeadersConfig } from '../../pages/EasySsoHeadersConfig.js';
import { USERNAME_HEADER } from './data.js';

test('a header rule with "Get Username" logs in the user named in the header @smoke',
  async ({ page, adapter, testUser, cleanEasySsoHeaderRules, newAnonymousPage }) => {
    void cleanEasySsoHeaderRules;

    await test.step('Administrator adds a header rule', async () => {
      const config = new EasySsoHeadersConfig(page);
      await config.open();
      await config.addRule({ name: USERNAME_HEADER, getUsername: true });
      await config.save();
    });

    await test.step('A browser that sends the header is logged in as that user', async () => {
      const withHeader = await newAnonymousPage({ [USERNAME_HEADER]: testUser.username });
      await adapter.openDashboard(withHeader);
      await expect(adapter.userMenu(withHeader, testUser.username)).toBeVisible();
      await expect(adapter.loginForm(withHeader)).toBeHidden();
    });

    await test.step('A browser without the header gets the login page', async () => {
      const withoutHeader = await newAnonymousPage();
      await adapter.openDashboard(withoutHeader);
      await expect(adapter.loginForm(withoutHeader)).toBeVisible();
      await expect(adapter.userMenu(withoutHeader, testUser.username)).toBeHidden();
    });
  });
