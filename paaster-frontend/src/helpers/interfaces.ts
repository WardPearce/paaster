import type { iPaste } from '../api/interfaces'

export interface iPasteStorage extends iPaste {
  clientSecret: string
}

export interface iAccount {
  username: string
  plainPassword: string
  passwordSHA256: string
}
