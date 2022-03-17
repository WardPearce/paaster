import { writable } from 'svelte/store'
import { allPastes } from './helpers/localPastes'

export const storedPastes = writable(allPastes())
