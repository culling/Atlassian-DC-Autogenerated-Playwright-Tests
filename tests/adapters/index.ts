import type { HostAdapter } from './HostAdapter.js';
import { Confluence6Adapter } from './Confluence6Adapter.js';
import { Confluence9Adapter } from './Confluence9Adapter.js';
import { JiraAdapter } from './JiraAdapter.js';
import { Jira10Adapter } from './Jira10Adapter.js';

export type AdapterName = 'confluence-6' | 'confluence-9' | 'jira' | 'jira-10';

export function createAdapter(name: AdapterName): HostAdapter {
  switch (name) {
    case 'confluence-6':
      return new Confluence6Adapter();
    case 'confluence-9':
      return new Confluence9Adapter();
    case 'jira':
      return new JiraAdapter();
    case 'jira-10':
      return new Jira10Adapter();
  }
}

export type { HostAdapter };
