import { S3Client } from '@aws-sdk/client-s3';
import type { IStaticMethods } from 'flyonui/flyonui';
import { Db } from 'mongodb';

declare global {
	interface Window {
		// FlyonUI
		HSStaticMethods: IStaticMethods;
	}

	namespace App {
		// interface Error {}
		interface Locals {
			mongoDb: Db,
			s3Client: S3Client;
			userId: string | undefined;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export { };
