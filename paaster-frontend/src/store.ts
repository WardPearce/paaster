import { writable } from 'svelte/store'
import { allPastes } from './helpers/localPastes'
import type { iPasteStorage } from './helpers/interfaces'

export let storedPastes = writable([] as iPasteStorage[])
allPastes().then(result => storedPastes.set(result))

export const tempPasteData = writable('')
