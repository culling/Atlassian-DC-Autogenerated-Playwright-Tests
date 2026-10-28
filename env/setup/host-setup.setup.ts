// First-time setup of a host instance. Run with: env/atl-env.sh <profile> setup
// Input comes from environment variables set by env/atl-env.sh (profile + .env.local).
import { test } from '@playwright/test';
import { Confluence6Wizard } from './wizards/Confluence6Wizard.js';
import { Confluence9Wizard } from './wizards/Confluence9Wizard.js';
import { JiraWizard } from './wizards/JiraWizard.js';
import { Jira10Wizard } from './wizards/Jira10Wizard.js';
import type { SetupWizard } from './wizards/SetupWizard.js';

const wizards: Record<string, () => SetupWizard> = {
  'confluence-6': () => new Confluence6Wizard(),
  'confluence-9': () => new Confluence9Wizard(),
  jira: () => new JiraWizard(),
  'jira-10': () => new Jira10Wizard(),
};

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set. Run this through env/atl-env.sh <profile> setup.`);
  return v;
}

test('first-time setup', async ({ page, request }) => {
  const wizardName = required('ATL_SETUP_WIZARD');
  const create = wizards[wizardName];
  if (!create) throw new Error(`No setup wizard named "${wizardName}"`);
  const wizard = create();
  const admin = {
    username: required('ATL_ADMIN_USER'),
    password: required('ATL_ADMIN_PASSWORD'),
    fullName: 'Test Administrator',
    email: 'admin@example.com',
  };

  await wizard.runWizard(page, {
    hostLicense: required('ATL_HOST_LICENSE'),
    db: {
      host: required('ATL_DB_HOST'),
      port: '5432',
      name: required('ATL_DB_NAME'),
      user: required('ATL_DB_USER'),
      password: required('ATL_DB_PASSWORD'),
    },
    admin,
  });
  await wizard.login(page, admin.username, admin.password);
  await wizard.disableSecureAdminSessions(page, admin.password);
  await wizard.disableOnboarding(request, admin.username, admin.password);
});
