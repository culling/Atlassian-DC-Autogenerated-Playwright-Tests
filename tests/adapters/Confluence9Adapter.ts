import { Confluence6Adapter } from './Confluence6Adapter.js';

/**
 * Confluence 9.x. Verified on 9.5.4: same header user menu as 6.6; only the login page is redesigned
 * (docs/notes/hosts.md).
 */
export class Confluence9Adapter extends Confluence6Adapter {
  override readonly name: string = 'confluence-9';
  protected override loginFields = { username: '#username-field', password: '#password-field', submit: '#login-button' };
}
