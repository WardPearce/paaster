export interface iBackendDetails {
  maxPasteSizeMb: number
}

export interface iPaste {
  pasteId: string
  serverSecret: string
  created?: number
}
