import type { iBackendDetails } from 'src/api/interfaces'

const backendUrl: string = import.meta.env.VITE_BACKEND_URL as string

export async function getBackendSettings(): Promise<iBackendDetails> {
    const resp = await fetch(`${backendUrl}/api/settings`, {
        method: 'GET'
    })
    return resp.json()
}
