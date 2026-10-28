import { JiraAdapter } from './JiraAdapter.js';

/**
 * Jira Software 10.x. Verified on 10.7.4: same header user menu and "Log In" link as 8.22.1;
 * only the login page is redesigned (docs/notes/hosts.md).
 */
export class Jira10Adapter extends JiraAdapter {
  override readonly name: string = 'jira-10';
  protected override loginFields = { username: '#username-field', password: '#password-field', submit: '#login-button' };
}
