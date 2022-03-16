import CryptoJS from 'crypto-js'

import { Buffer } from 'buffer'

import type { iBackendDetails, iPaste } from '../api/interfaces'

import { storedAccount } from '../store'
import type { iAccount } from '../helpers/interfaces'

let accountDetails: iAccount | null
storedAccount.subscribe(value => accountDetails = value)

const backendUrl: string = import.meta.env.VITE_BACKEND as string

export { backendUrl } 

export async function getBackendSettings(): Promise<iBackendDetails> {
  const resp = await fetch(`${backendUrl}/api/settings`, {
    method: 'GET'
  })
  return resp.json()
}

export async function savePaste(encryptedPaste: string): Promise<iPaste> {
  const resp = await fetch(`${backendUrl}/api/paste/create`, {
    method: 'PUT',
    body: encryptedPaste
  })
  if (resp.status !== 200) {
    const json = await resp.json()
    throw Error(json.error)
  }
  return await resp.json()
}

export async function getPaste(pasteId: string): Promise<string> {
  const resp = await fetch(`${backendUrl}/api/paste/${pasteId}`, {
    method: 'GET'
  })
  if (resp.status !== 200) {
    const json = await resp.json()
    throw Error(json.error)
  }
  return await resp.text()
}

export async function storePasteCredentials(pasteId: string,
                                            clientSecret: string,
                                            serverSecret: string): Promise<string> {
  if (!accountDetails) {
    throw new Error('Not logged in')
  }

  const encryptedClientSecret = CryptoJS.AES.encrypt(
    clientSecret, accountDetails.plainPassword
  ).toString()
  const encryptedServerSecret = CryptoJS.AES.encrypt(
    serverSecret, accountDetails.plainPassword
  ).toString()

  const resp = await fetch(`${backendUrl}/api/paste/${pasteId}`, {
    method: 'POST',
    body: JSON.stringify({
      encryptedClientSecret: encryptedClientSecret,
      encryptedServerSecret: encryptedServerSecret
    }),
    headers: {
      'Authorization': 'Basic ' + Buffer.from(
        `${accountDetails.username}:${accountDetails.passwordSHA256}`
      ).toString('base64'),
      'Content-Type': 'application/json'
    },
  })

  if (resp.status !== 200) {
    const json = await resp.json()
    throw Error(json.error)
  }
  return await resp.text()
}

export async function deletePaste(pasteId: string, serverSecret: string): Promise<void> {
  const resp = await fetch(`${backendUrl}/api/paste/${pasteId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({serverSecret: serverSecret})
  })
  if (resp.status !== 200) {
    const json = await resp.json()
    throw Error(json.error)
  }
}
