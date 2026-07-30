import { mkdir, readdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { StorageBackend } from './types';

export class FileSystemStorageBackend implements StorageBackend {
	private basePath: string;

	constructor(basePath: string) {
		this.basePath = basePath;
	}

	private pasteDir(pasteId: string): string {
		if (!/^[0-9a-fA-F]{24}$/.test(pasteId)) {
			throw new Error('Invalid pasteId');
		}
		return join(this.basePath, pasteId);
	}

	async saveChunk(pasteId: string, chunkIndex: number, data: Uint8Array, _totalChunks: number): Promise<void> {
		void _totalChunks;
		const dir = this.pasteDir(pasteId);
		await mkdir(dir, { recursive: true });
		await writeFile(join(dir, `${chunkIndex}`), data);
	}

	async getChunk(pasteId: string, chunkIndex: number): Promise<Uint8Array | null> {
		try {
			const buf = await readFile(join(this.pasteDir(pasteId), `${chunkIndex}`));
			return new Uint8Array(buf);
		} catch {
			return null;
		}
	}

	async deletePaste(pasteId: string): Promise<void> {
		const dir = this.pasteDir(pasteId);
		let entries: string[];
		try {
			entries = await readdir(dir);
		} catch {
			return;
		}
		for (const e of entries) {
			await unlink(join(dir, e));
		}
		await unlink(dir).catch(() => {});
	}
}
