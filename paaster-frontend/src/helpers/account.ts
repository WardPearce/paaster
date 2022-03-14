import { storedAccount } from './../store'
import type { iAccount } from './interfaces'
import { sha256Hash } from '../helpers/sha256'


export function getAccount(): iAccount | null {
  const account = localStorage.getItem('account')
  return account ? JSON.parse(account) : null
}


export function setAccount(username: string, password: string): void {
  sha256Hash(password).then(hash => {
    const account = {
      username: username,
      plainPassword: password,
      passwordSHA256: hash
    }
    localStorage.setItem('account', JSON.stringify(account))
    storedAccount.set(account)
  })
}


export function removeAccount(): void {
  localStorage.removeItem('account')
  storedAccount.set(null)
}
