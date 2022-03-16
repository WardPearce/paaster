export interface iBackendDetails {
  maxPasteSizeMb: number
}

export interface iPaste {
  pasteId: string
  serverSecret: string
  created?: number
}


export interface iEncryptedPaste {
  pasteId: string
  encryptedClientSecret: string
  encryptedServerSecret: string
}
