import { S3Client } from '@aws-sdk/client-s3';
import { Db } from 'mongodb';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			mongoDb: Db,
			s3Client: S3Client;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export { };
