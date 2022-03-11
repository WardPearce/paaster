import type { iBackendDetails, iPaste } from 'src/api/interfaces'

const backendUrl: string = import.meta.env.VITE_BACKEND_URL as string

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
