import { Confluence8Adapter } from './Confluence8Adapter.js';

/**
 * Confluence 9.x. Verified on 9.2.26: same legacy editor, macro browser and UPM screens as 8.5;
 * only the login page is redesigned (docs/notes/hosts.md).
 */
export class Confluence9Adapter extends Confluence8Adapter {
  override readonly name: string = 'confluence-9';
  protected override loginFields = { username: '#username-field', password: '#password-field', submit: '#login-button' };
}
