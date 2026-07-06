import type { Db, ObjectId } from 'mongodb';
import sodium from 'libsodium-wrappers-sumo';
import type { Cookies } from '@sveltejs/kit';

export interface Session {
	_id: ObjectId;
	sessionId: string;
	userId: ObjectId;
	created: Date;
	lastUsed: Date;
	expiresAt: Date;
}

const SESSION_MAX_AGE_MS = 31 * 24 * 60 * 60 * 1000;
const SESSION_REFRESH_INTERVAL_MS = 60 * 60 * 1000;
const COOKIE_NAME = 'sessionId';

async function generateSessionToken(): Promise<string> {
	await sodium.ready;
	return sodium.to_base64(sodium.randombytes_buf(32));
}

export async function createSession(mongoDb: Db, userId: ObjectId): Promise<string> {
	await sodium.ready;
	const sessionId = await generateSessionToken();
	const now = new Date();

	await mongoDb.collection('sessions').insertOne({
		sessionId,
		userId,
		created: now,
		lastUsed: now,
		expiresAt: new Date(now.getTime() + SESSION_MAX_AGE_MS)
	});

	return sessionId;
}

export async function getSession(
	mongoDb: Db,
	sessionId: string
): Promise<{ userId: ObjectId; sessionId: string } | null> {
	const session = await mongoDb.collection<Session>('sessions').findOne({ sessionId });

	if (!session) {
		return null;
	}

	if (session.expiresAt < new Date()) {
		return null;
	}

	const now = new Date();
	if (now.getTime() - session.lastUsed.getTime() > SESSION_REFRESH_INTERVAL_MS) {
		await mongoDb
			.collection('sessions')
			.updateOne(
				{ _id: session._id },
				{ $set: { lastUsed: now, expiresAt: new Date(now.getTime() + SESSION_MAX_AGE_MS) } }
			);
	}

	return { userId: session.userId, sessionId: session.sessionId };
}

export async function revokeSession(mongoDb: Db, sessionId: string): Promise<void> {
	await mongoDb.collection('sessions').deleteOne({ sessionId });
}

export async function revokeAllUserSessions(mongoDb: Db, userId: ObjectId): Promise<void> {
	await mongoDb.collection('sessions').deleteMany({ userId });
}

export async function revokeAllOtherSessions(
	mongoDb: Db,
	userId: ObjectId,
	sessionId: string
): Promise<void> {
	await mongoDb.collection('sessions').deleteMany({ userId, sessionId: { $ne: sessionId } });
}

export function setSessionCookie(cookies: Cookies, sessionId: string): void {
	cookies.set(COOKIE_NAME, sessionId, {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		path: '/',
		maxAge: SESSION_MAX_AGE_MS / 1000,
		sameSite: 'strict'
	});
}

export function deleteSessionCookie(cookies: Cookies): void {
	cookies.delete(COOKIE_NAME, { path: '/' });
}

export function getSessionIdFromCookie(cookies: Cookies): string | undefined {
	return cookies.get(COOKIE_NAME);
}
