import { env } from '$env/dynamic/private';
import { S3Client } from '@aws-sdk/client-s3';
import { MAX_UPLOAD_SIZE } from '$lib/consts.js';
import type { Db } from 'mongodb';
import type { StorageBackend } from './types';
import { S3StorageBackend } from './s3';
import { MongoDBStorageBackend } from './mongodb';
import { FileSystemStorageBackend } from './filesystem';

export type { StorageBackend };

export function getMaxUploadBytes(): number {
	const raw = env.MAX_UPLOAD_SIZE;
	if (!raw) return MAX_UPLOAD_SIZE;
	const mb = parseInt(raw, 10);
	return (isNaN(mb) || mb < 1 ? 10 : mb) * 1024 * 1024;
}

function createS3Client(): S3Client {
	return new S3Client({
		region: env.S3_REGION as string,
		endpoint: env.S3_ENDPOINT as string,
		credentials: {
			accessKeyId: env.S3_ACCESS_KEY_ID as string,
			secretAccessKey: env.S3_SECRET_ACCESS_KEY as string
		},
		forcePathStyle: (env.s3_FORCE_PATH_STYLE ?? 'false') === 'true'
	});
}

export function createStorageBackend(mongoDb: Db): StorageBackend {
	const backend = env.STORAGE_BACKEND ?? 's3';

	switch (backend) {
		case 's3': {
			const bucket = env.S3_BUCKET;
			if (!bucket) throw new Error('S3_BUCKET required for s3 storage backend');
			return new S3StorageBackend(createS3Client(), bucket);
		}
		case 'mongodb':
			return new MongoDBStorageBackend(mongoDb);
		case 'filesystem': {
			const basePath = env.FS_STORAGE_PATH ?? '/data/paaster';
			return new FileSystemStorageBackend(basePath);
		}
		default:
			throw new Error(`Unknown storage backend: ${backend}. Use s3, mongodb, or filesystem.`);
	}
}
