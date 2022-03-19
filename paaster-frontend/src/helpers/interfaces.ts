import type { iPaste } from '../api/interfaces'

export interface iPasteStorage extends iPaste {
  clientSecret: string
  deleteAfter?: string
}
