import { JiraWizard } from './JiraWizard.js';

/**
 * Jira Software 10.x setup wizard. Verified on 10.7.4: the same screens as 8.22.1 (the email screen's
 * "Finish" is a <button>, handled in JiraWizard); only the login page is redesigned (docs/notes/hosts.md).
 */
export class Jira10Wizard extends JiraWizard {
  protected override loginFields = { username: '#username-field', password: '#password-field', submit: '#login-button' };

  /**
   * As JiraWizard, plus "Instance Optimizer for Jira", which shows the "Instance Optimizer is available" and
   * "Database integrity checks are enabled by default" flags.
   */
  protected override pluginsToDisable = [
    'com.atlassian.plugins.helptips.jira-help-tips',
    'com.atlassian.troubleshooting.plugin-jira',
    'com.atlassian.jira.plugins.jira-optimizer-plugin',
  ];
}
