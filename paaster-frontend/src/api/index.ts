import { Buffer } from 'buffer'

import type { iBackendDetails, iPaste } from '../api/interfaces'

const backendUrl: string = import.meta.env.VITE_BACKEND as string

export { backendUrl }

function basicAuth(username: string, password: string): string {
  return 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64')
}

export async function getBackendSettings(): Promise<iBackendDetails> {
  const resp = await fetch(`${backendUrl}/api/settings`, {
    method: 'GET'
  })
  return resp.json()
}

export async function savePaste(encryptedPaste: string,
                                iv: string,
                                salt: string): Promise<iPaste> {
  const resp = await fetch(`${backendUrl}/api/paste/create`, {
    method: 'PUT',
    body: iv + ',' + salt + ',' + encryptedPaste
  })
  if (resp.status !== 200) {
    const json = await resp.json()
    throw Error(json.detail)
  }
  return await resp.json()
}

export async function getPaste(pasteId: string): Promise<string> {
  const resp = await fetch(`${backendUrl}/api/paste/${pasteId}`, {
    method: 'GET'
  })
  if (resp.status !== 200) {
    const json = await resp.json()
    throw Error(json.detail)
  }
  return await resp.text()
}

export async function updateDeleteAfter(pasteId: string, hours: number,
                                        serverSecret: string): Promise<void> {
  const resp = await fetch(`${backendUrl}/api/paste/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: basicAuth(pasteId, serverSecret)
    },
    body: JSON.stringify({
      delete_after_hours: hours
    })
  })
  if (resp.status !== 200) {
    const json = await resp.json()
    throw Error(json.detail)
  }
}

export async function deletePaste(pasteId: string, serverSecret: string): Promise<void> {
  const resp = await fetch(`${backendUrl}/api/paste/`, {
    method: 'DELETE',
    headers: {
      Authorization: basicAuth(pasteId, serverSecret)
    }
  })
  if (resp.status !== 200) {
    const json = await resp.json()
    throw Error(json.detail)
  }
}
