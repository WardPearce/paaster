import { S3Client } from '@aws-sdk/client-s3';
import type { IStaticMethods } from 'flyonui/flyonui';
import { Db } from 'mongodb';
import type { StorageBackend } from '$lib/server/storage/types';

declare global {
	interface Window {
		// FlyonUI
		HSStaticMethods: IStaticMethods;
	}

	namespace App {
		// interface Error {}
		interface Locals {
			mongoDb: Db;
			s3Client: S3Client;
			storageBackend: StorageBackend;
			userId: string | undefined;
			sessionId: string | undefined;
			captchaSignature: string;
			captchaKey: string;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
