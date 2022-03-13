import type { iPasteStorage } from './interfaces'
import { storedPastes } from '../store'

export class LocalPaste {
  key: string

  constructor(key: string) {
    this.key = key
  }

  getPaste(): iPasteStorage | null {
    const pastes = allPastes()
    if (!pastes || !(this.key in pastes))
      return null

    return pastes[this.key]
  }

  setPaste(value: iPasteStorage): void {
    let pastes = allPastes()
    if (!pastes)
      pastes = {}

    pastes[this.key] = value

    localStorage.setItem('pastes', JSON.stringify(pastes))
    storedPastes.set(pastes)
  }

  deletePaste() {
    let pastes = allPastes()
    if (pastes) {
      delete pastes[this.key]

      localStorage.setItem('pastes', JSON.stringify(pastes))
      storedPastes.set(pastes)
    }
  }
}

export function allPastes(): Record<string, iPasteStorage> | null {
  const pastes = JSON.parse(localStorage.getItem('pastes'))
  if (!pastes || Object.keys(pastes).length === 0)
    return null

  return pastes
}
