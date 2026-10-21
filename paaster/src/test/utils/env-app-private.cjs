const names = [
	'MONGO_URL',
	'MONGO_DB',
	'MAX_UPLOAD_SIZE',
	'S3_REGION',
	'S3_ENDPOINT',
	'S3_ACCESS_KEY_ID',
	'S3_SECRET_ACCESS_KEY',
	's3_FORCE_PATH_STYLE',
	'STORAGE_BACKEND',
	'S3_BUCKET',
	'FS_STORAGE_PATH'
];

for (const name of names) {
	Object.defineProperty(module.exports, name, {
		enumerable: true,
		get: () => process.env[name]
	});
}
