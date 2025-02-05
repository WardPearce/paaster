import type { Table } from 'dexie';
import Dexie from 'dexie';

export interface Paste {
  id: string;
  accessKey: string | undefined;
  masterKey: string;
}

export class PaasterDb extends Dexie {
  pastes!: Table<Paste>;

  constructor() {
    super('paasterv3');
    this.version(1).stores({
      pastes: 'id, accessKey, masterKey',
    });
  }
}

export const localDb = new PaasterDb();
