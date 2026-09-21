import { ObjectId, type Db, type WithId, type Document } from 'mongodb';
import argon2 from 'argon2';
import { nanoid } from 'nanoid';
import { generateSecret } from 'otplib';
import type { PasteDoc } from '$lib/server/pastes';
import { createSession } from '$lib/server/session';

export const TEST_ACCESS_KEY = 'A'.repeat(44);
export const TEST_SERVER_PASSWORD = 'sup3r-secret-server-side-passw0rd';

export interface TestUserOverrides {
	username?: string;
	serverSidePassword?: string;
	twoFactorSecret?: string | null;
	twoFactorVerified?: boolean | null;
	[key: string]: unknown;
}

export async function hashAsync(value: string): Promise<string> {
	return argon2.hash(value);
}

let userPasswordHashes = new Map<string, string>();
let cachedAccessKeyHash: string | undefined;

async function userPasswordHash(password: string): Promise<string> {
	let hash = userPasswordHashes.get(password);
	if (!hash) {
		hash = await hashAsync(password);
		userPasswordHashes.set(password, hash);
	}
	return hash;
}

async function accessKeyHash(): Promise<string> {
	if (!cachedAccessKeyHash) {
		cachedAccessKeyHash = await hashAsync(TEST_ACCESS_KEY);
	}
	return cachedAccessKeyHash;
}

export async function insertUser(
	db: Db,
	overrides: TestUserOverrides = {}
): Promise<WithId<Document>> {
	const doc = {
		serverSide: {
			salt: 'c29tZXNhbHRzdHJpbmc=',
			password: await userPasswordHash(overrides.serverSidePassword ?? TEST_SERVER_PASSWORD)
		},
		encryptionKey: {
			value: 'ZW5jcnlwdGlvbmtleQ==',
			nonce: 'bm9uY2U=',
			keySalt: 'a2V5c2FsdA=='
		},
		masterPasswordSalt: 'bWFzdGVycGFzc3dvcmRzYWx0',
		username: overrides.username ?? 'alice',
		twoFactorSecret: overrides.twoFactorSecret ?? undefined,
		twoFactorVerified: overrides.twoFactorVerified ?? undefined
	};

	if (typeof overrides.twoFactorSecret === 'undefined') delete doc.twoFactorSecret;
	if (typeof overrides.twoFactorVerified === 'undefined') delete doc.twoFactorVerified;

	const result = await db.collection('users').insertOne(doc);
	return { _id: result.insertedId, ...doc } as WithId<Document>;
}

export async function insertPaste(
	db: Db,
	overrides: Record<string, unknown> = {}
): Promise<PasteDoc> {
	const doc = {
		_id: nanoid(),
		header: 'aGVhZGVy',
		keySalt: 'a2V5c2FsdA==',
		name: { value: 'bmFtZQ==', nonce: 'bm9uY2U=', keySalt: 'a2V5c2FsdA==' },
		language: null,
		expireAfter: -2,
		accessKey: await accessKeyHash(),
		created: new Date(),
		deleteNextRequest: false,
		wrapWords: false,
		...overrides
	};

	const result = await db.collection<PasteDoc>('pastes').insertOne(doc);
	return { ...doc, _id: result.insertedId };
}

export async function insertUserPaste(
	db: Db,
	overrides: { userId?: string; pasteId?: string; created?: Date } = {}
): Promise<string> {
	const userId = overrides.userId ?? new ObjectId().toHexString();
	const pasteId = overrides.pasteId ?? nanoid();

	await db.collection('userPastes').insertOne({
		userId,
		paste: { id: pasteId, key: 'a2V5', nonce: 'bm9uY2U=' },
		accessKey: { key: 'a2V5', nonce: 'bm9uY2U=' },
		created: overrides.created ?? new Date()
	});

	return pasteId;
}

export async function insertSession(db: Db, userId: ObjectId): Promise<string> {
	return createSession(db, userId);
}

export function twoFactorSecret(): string {
	return generateSecret();
}