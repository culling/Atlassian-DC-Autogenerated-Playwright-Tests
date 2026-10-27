import { Confluence8Wizard } from './Confluence8Wizard.js';

/**
 * Confluence 9.x setup wizard. Verified on 9.2.26: the wizard screens are the same as 8.5;
 * only the login page is redesigned (docs/notes/hosts.md).
 */
export class Confluence9Wizard extends Confluence8Wizard {
  protected override loginFields = { username: '#username-field', password: '#password-field', submit: '#login-button' };
}
