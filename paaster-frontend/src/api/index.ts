import type { iBackendDetails, iPaste } from '../api/interfaces'

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

export async function updateDeleteAfter(pasteId: string, hours: number,
                                        serverSecret: string): Promise<void> {
  const resp = await fetch(`${backendUrl}/api/paste/${pasteId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      serverSecret: serverSecret,
      deleteAfterHours: hours
    })
  })
  if (resp.status !== 200) {
    const json = await resp.json()
    throw Error(json.error)
  }
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
