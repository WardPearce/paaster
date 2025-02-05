import type { Table } from 'dexie';
import Dexie from 'dexie';

export interface Paste {
  id: string;
  accessKey: string | undefined;
  masterKey: string;
  date: Date;
}

export class PaasterDb extends Dexie {
  pastes!: Table<Paste>;

  constructor() {
    super('paasterv3');
    this.version(1).stores({
      pastes: 'id, accessKey, masterKey, date',
    });
  }
}

export const localDb = new PaasterDb();
