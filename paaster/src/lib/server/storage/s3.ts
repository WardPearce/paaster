import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import type { StorageBackend } from './types';

export class S3StorageBackend implements StorageBackend {
	private client: S3Client;
	private bucket: string;

	constructor(client: S3Client, bucket: string) {
		this.client = client;
		this.bucket = bucket;
	}

	async saveChunk(pasteId: string, chunkIndex: number, data: Uint8Array, _totalChunks: number): Promise<void> {
		void _totalChunks;
		await this.client.send(
			new PutObjectCommand({
				Bucket: this.bucket,
				Key: `${pasteId}/chunks/${chunkIndex}`,
				Body: data
			})
		);
	}

	async getChunk(pasteId: string, chunkIndex: number): Promise<Uint8Array | null> {
		try {
			const result = await this.client.send(
				new GetObjectCommand({ Bucket: this.bucket, Key: `${pasteId}/chunks/${chunkIndex}` })
			);
			const data = await result.Body?.transformToByteArray();
			return data ?? null;
		} catch {
			return null;
		}
	}

	async deletePaste(pasteId: string): Promise<void> {
		const listed = await this.client.send(
			new ListObjectsV2Command({
				Bucket: this.bucket,
				Prefix: `${pasteId}/`
			})
		);

		if (!listed.Contents) return;

		for (const obj of listed.Contents) {
			if (obj.Key) {
				await this.client.send(
					new DeleteObjectCommand({ Bucket: this.bucket, Key: obj.Key })
				);
			}
		}
	}
}
