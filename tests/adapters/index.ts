import type { HostAdapter } from './HostAdapter.js';
import { Confluence6Adapter } from './Confluence6Adapter.js';
import { Confluence9Adapter } from './Confluence9Adapter.js';

export type AdapterName = 'confluence-6' | 'confluence-9';

export function createAdapter(name: AdapterName): HostAdapter {
  switch (name) {
    case 'confluence-6':
      return new Confluence6Adapter();
    case 'confluence-9':
      return new Confluence9Adapter();
  }
}

export type { HostAdapter };
