import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { nanoid } from 'nanoid';
import { FileSystemStorageBackend } from '#lib/server/storage/filesystem';
import { S3StorageBackend } from '#lib/server/storage/s3';
import { DeleteObjectCommand, ListObjectsV2Command, type S3Client } from '@aws-sdk/client-s3';

describe('FileSystemStorageBackend', () => {
	const traversalPasteIds = [
		'../../etc/passwd',
		'../outside',
		'..\\outside',
		'../../../../tmp/pwn',
		'foo/../../bar',
		'%2e%2e%2fetc/passwd'
	];

	it('rejects paste ids that attempt path traversal on save', async () => {
		const tmp = await mkdtemp(join(tmpdir(), 'paaster-'));

		try {
			const backend = new FileSystemStorageBackend(tmp);
			for (const pasteId of traversalPasteIds) {
				await expect(backend.saveChunk(pasteId, 0, new Uint8Array([1]), 1)).rejects.toThrow(
					'Invalid pasteId'
				);
			}
		} finally {
			await rm(tmp, { recursive: true, force: true });
		}
	});

	it('never writes chunks outside of the base path', async () => {
		const tmp = await mkdtemp(join(tmpdir(), 'paaster-'));

		try {
			const backend = new FileSystemStorageBackend(tmp);
			const pasteId = nanoid();

			await backend.saveChunk(pasteId, 0, new Uint8Array([1, 2, 3]), 1);

			const chunk = await readFile(join(tmp, pasteId, '0'));
			expect(new Uint8Array(chunk)).toEqual(new Uint8Array([1, 2, 3]));
			await expect(readFile(join(tmp, '0'))).rejects.toThrow();
		} finally {
			await rm(tmp, { recursive: true, force: true });
		}
	});

	it('does not read or delete outside the base path for traversal ids', async () => {
		const tmp = await mkdtemp(join(tmpdir(), 'paaster-'));

		try {
			const backend = new FileSystemStorageBackend(tmp);
			for (const pasteId of traversalPasteIds) {
				await expect(backend.getChunk(pasteId, 0)).resolves.toBeNull();
				await expect(backend.deletePaste(pasteId)).rejects.toThrow('Invalid pasteId');
			}
		} finally {
			await rm(tmp, { recursive: true, force: true });
		}
	});
});

describe('S3StorageBackend', () => {
	it('deletes objects from every listing page', async () => {
		const deleted: string[] = [];
		const send = vi.fn(async (command: ListObjectsV2Command | DeleteObjectCommand) => {
			if (command instanceof ListObjectsV2Command) {
				return command.input.ContinuationToken
					? { Contents: [{ Key: 'paste/chunks/1' }], IsTruncated: false }
					: {
							Contents: [{ Key: 'paste/chunks/0' }],
							IsTruncated: true,
							NextContinuationToken: 'next'
						};
			}
			deleted.push(command.input.Key!);
			return {};
		});
		const backend = new S3StorageBackend({ send } as unknown as S3Client, 'bucket');
		await backend.deletePaste('paste');
		expect(deleted).toEqual(['paste/chunks/0', 'paste/chunks/1']);
	});
});
