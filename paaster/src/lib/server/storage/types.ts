export interface StorageBackend {
	saveChunk(pasteId: string, chunkIndex: number, data: Uint8Array, totalChunks: number): Promise<void>;
	getChunk(pasteId: string, chunkIndex: number): Promise<Uint8Array | null>;
	deletePaste(pasteId: string): Promise<void>;
}
