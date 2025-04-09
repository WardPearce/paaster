import type { Table } from 'dexie';
import Dexie from 'dexie';

export interface Paste {
  id: string;
  accessKey: string | undefined;
  masterKey: string;
  created: Date;
  name: string | undefined;
}

export interface Account {
  id: string;
  encryptionKey: string;
}

export class PaasterDb extends Dexie {
  pastes!: Table<Paste>;
  accounts!: Table<Account>;

  constructor() {
    super('paasterv3.1');
    this.version(1).stores({
      pastes: 'id, accessKey, masterKey, created, name',
      accounts: 'id, encryptionKey'
    });
  }
}

export const localDb = new PaasterDb();
