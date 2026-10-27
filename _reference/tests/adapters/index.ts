import type { HostAdapter } from './HostAdapter.js';
import { Confluence8Adapter } from './Confluence8Adapter.js';
import { Confluence9Adapter } from './Confluence9Adapter.js';

export type AdapterName = 'confluence-8' | 'confluence-9';

export function createAdapter(name: AdapterName): HostAdapter {
  switch (name) {
    case 'confluence-8':
      return new Confluence8Adapter();
    case 'confluence-9':
      return new Confluence9Adapter();
  }
}

export type { HostAdapter };
