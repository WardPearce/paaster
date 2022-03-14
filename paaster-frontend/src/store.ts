import { writable } from 'svelte/store'
import { allPastes } from './helpers/localPastes'
import { getAccount } from './helpers/account'

export const storedPastes = writable(allPastes())

export const storedAccount = writable(getAccount())
