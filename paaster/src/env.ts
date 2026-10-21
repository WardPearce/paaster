import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	MONGO_URL: { schema: (input) => input },
	MONGO_DB: { schema: (input) => input },
	MAX_UPLOAD_SIZE: { schema: (input) => input },
	S3_REGION: { schema: (input) => input },
	S3_ENDPOINT: { schema: (input) => input },
	S3_ACCESS_KEY_ID: { schema: (input) => input },
	S3_SECRET_ACCESS_KEY: { schema: (input) => input },
	s3_FORCE_PATH_STYLE: { schema: (input) => input },
	STORAGE_BACKEND: { schema: (input) => input },
	S3_BUCKET: { schema: (input) => input },
	FS_STORAGE_PATH: { schema: (input) => input }
});
