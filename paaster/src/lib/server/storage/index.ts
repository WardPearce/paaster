import {
	MAX_UPLOAD_SIZE,
	S3_REGION,
	S3_ENDPOINT,
	S3_ACCESS_KEY_ID,
	S3_SECRET_ACCESS_KEY,
	s3_FORCE_PATH_STYLE,
	STORAGE_BACKEND,
	S3_BUCKET,
	FS_STORAGE_PATH
} from '$app/env/private';

import { S3Client } from '@aws-sdk/client-s3';
import { MAX_UPLOAD_SIZE as DEFAULT_MAX_UPLOAD_SIZE } from '#lib/consts';
import type { Db } from 'mongodb';
import type { StorageBackend } from './types';
import { S3StorageBackend } from './s3';
import { MongoDBStorageBackend } from './mongodb';
import { FileSystemStorageBackend } from './filesystem';

export type { StorageBackend };

export function getMaxUploadBytes(): number {
	const raw = MAX_UPLOAD_SIZE;
	if (!raw) return DEFAULT_MAX_UPLOAD_SIZE;
	const mb = parseInt(raw, 10);
	return (isNaN(mb) || mb < 1 ? 10 : mb) * 1024 * 1024;
}

function createS3Client(): S3Client {
	return new S3Client({
		region: S3_REGION as string,
		endpoint: S3_ENDPOINT as string,
		credentials: {
			accessKeyId: S3_ACCESS_KEY_ID as string,
			secretAccessKey: S3_SECRET_ACCESS_KEY as string
		},
		forcePathStyle: (s3_FORCE_PATH_STYLE ?? 'false') === 'true'
	});
}

export function createStorageBackend(mongoDb: Db): StorageBackend {
	const backend = STORAGE_BACKEND ?? 's3';

	switch (backend) {
		case 's3': {
			const bucket = S3_BUCKET;

			if (!bucket) throw new Error('S3_BUCKET required for s3 storage backend');
			return new S3StorageBackend(createS3Client(), bucket);
		}
		case 'mongodb':
			return new MongoDBStorageBackend(mongoDb);

		case 'filesystem': {
			const basePath = FS_STORAGE_PATH ?? '/data/paaster';

			return new FileSystemStorageBackend(basePath);
		}
		default:
			throw new Error(`Unknown storage backend: ${backend}. Use s3, mongodb, or filesystem.`);
	}
}
