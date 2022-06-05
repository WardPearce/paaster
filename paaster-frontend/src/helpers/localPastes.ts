import { get, set, del, values } from 'idb-keyval'

import type { iPasteStorage } from './interfaces'
import { storedPastes } from '../store'

export class LocalPaste {
  key: string

  constructor(key: string) {
    this.key = key
  }

  async getPaste(): Promise<iPasteStorage | null> {
    return get(this.key)
  }

  async setPaste(value: iPasteStorage) {
    set(this.key, value)
    storedPastes.set(await allPastes())
  }

  async deletePaste() {
    del(this.key)
    storedPastes.set(await allPastes())
  }
}

export async function allPastes(): Promise<iPasteStorage[] | null> {
  return await values()
}
