import type { Handle } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { Db, MongoClient } from 'mongodb';
import sodium from 'libsodium-wrappers-sumo';
import { getSession, getSessionIdFromCookie } from '$lib/server/session';
import { createStorageBackend } from '$lib/server/storage';
import { getLimiter } from '$lib/server/rateLimit';
import type { StorageBackend } from '$lib/server/storage/types';

const mongoClient = new MongoClient(env.MONGO_URL ?? 'mongodb://localhost:27017');
let mongoDb: Db | undefined;

let captchaKey = '';
let captchaSignature = '';
sodium.ready.then(() => {
	captchaKey = sodium.to_base64(sodium.randombytes_buf(32));
	captchaSignature = sodium.to_base64(sodium.randombytes_buf(32));
});

let storageBackend: StorageBackend | undefined;

export const handle: Handle = async ({ event, resolve }) => {
	if (!mongoDb) {
		await mongoClient.connect();
		mongoDb = mongoClient.db(env.MONGO_DB ?? 'paasterv3');
		mongoDb
			.collection('captcha')
			.createIndex({ created: 1 }, { expireAfterSeconds: 7200 })
			.catch(() => {});
		mongoDb
			.collection('sessions')
			.createIndex({ sessionId: 1 }, { unique: true })
			.catch(() => {});
		mongoDb
			.collection('sessions')
			.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
			.catch(() => {});
		mongoDb
			.collection('pasteChunks')
			.createIndex({ pasteId: 1, chunkIndex: 1 })
			.catch(() => {});
		mongoDb
			.collection('pasteShare')
			.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
			.catch(() => {});
	}

	if (!storageBackend) {
		storageBackend = createStorageBackend(mongoDb);
	}

	event.locals.storageBackend = storageBackend;
	event.locals.captchaKey = captchaKey;
	event.locals.captchaSignature = captchaSignature;

	event.locals.mongoDb = mongoDb;

	const sessionId = getSessionIdFromCookie(event.cookies);
	if (sessionId) {
		event.locals.sessionId = sessionId;
		const session = await getSession(mongoDb, sessionId);
		if (session) {
			event.locals.userId = session.userId.toString();
		}
	}

	if (event.url.pathname.startsWith('/api/')) {
		const limiter = getLimiter(event.url.pathname, event.request.method);
		if (await limiter.isLimited(event)) {
			return new Response(JSON.stringify({ message: 'Too Many Requests' }), {
				status: 429,
				headers: { 'Content-Type': 'application/json' }
			});
		}
	}

	return resolve(event);
};
