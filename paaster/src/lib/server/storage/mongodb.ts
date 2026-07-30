import type { Db, Binary } from 'mongodb';
import type { StorageBackend } from './types';

export class MongoDBStorageBackend implements StorageBackend {
	private db: Db;

	constructor(db: Db) {
		this.db = db;
	}

	async saveChunk(pasteId: string, chunkIndex: number, data: Uint8Array, totalChunks: number): Promise<void> {
		await this.db.collection('pasteChunks').updateOne(
			{ pasteId, chunkIndex },
			{
				$set: {
					pasteId,
					chunkIndex,
					data: data as unknown as Binary,
					totalChunks
				}
			},
			{ upsert: true }
		);
	}

	async getChunk(pasteId: string, chunkIndex: number): Promise<Uint8Array | null> {
		const doc = await this.db.collection('pasteChunks').findOne({ pasteId, chunkIndex });
		if (!doc) return null;
		return new Uint8Array((doc.data as Binary).buffer);
	}

	async deletePaste(pasteId: string): Promise<void> {
		await this.db.collection('pasteChunks').deleteMany({ pasteId });
	}
}
