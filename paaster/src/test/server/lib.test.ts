import { describe, expect, it } from 'vitest';
import { ObjectId } from 'mongodb';
import { stringToObjectId } from '$lib/server/objectId';
import {
	generatePasteShareCode,
	getPasteShareSession,
	normalizePasteShareCode,
	pasteShareCodeAlphabet,
	pasteShareCodeLength,
	createPasteShareSession,
	pasteShareTtlMs
} from '$lib/server/pasteShare';
import { getUserPastes } from '$lib/server/pastes';
import { setupTestDb } from '../utils/db';
import { expectHttpError } from '../utils/event';
import { insertPaste, insertUserPaste } from '../utils/factories';

const getDb = setupTestDb();

describe('stringToObjectId', () => {
	it('parses a valid ObjectId hex string', () => {
		const id = new ObjectId();
		expect(stringToObjectId(id.toHexString())).toBeInstanceOf(ObjectId);
	});

	it('throws a 400 for an invalid id', async () => {
		await expectHttpError(
			Promise.resolve().then(() => stringToObjectId('not-an-id')),
			400
		);
	});
});

describe('normalizePasteShareCode', () => {
	it('upper-cases and strips invalid characters', () => {
		expect(normalizePasteShareCode('abcd-ef!02')).toBe('ABCDEF02');
	});

	it('maps ambiguous characters', () => {
		expect(normalizePasteShareCode('ilOu')).toBe('110U');
	});
});

describe('generatePasteShareCode', () => {
	it('produces 8 characters from the Crockford alphabet', () => {
		const code = generatePasteShareCode();
		expect(code).toHaveLength(pasteShareCodeLength);
		for (const char of code) {
			expect(pasteShareCodeAlphabet).toContain(char);
		}
	});
});

describe('createPasteShareSession', () => {
	it('stores a hashed code and expiry', async () => {
		const { code, expires } = await createPasteShareSession(getDb());

		expect(code).toHaveLength(pasteShareCodeLength);
		expect(expires.getTime() - Date.now()).toBeGreaterThan(0);
		expect(expires.getTime() - Date.now()).toBeLessThanOrEqual(pasteShareTtlMs);

		const stored = (await getDb().collection('pasteShare').findOne({}))!;
		expect(stored.codeHash).not.toBe(code);
	});
});

describe('getPasteShareSession', () => {
	it('looks up a session regardless of code casing', async () => {
		const { code } = await createPasteShareSession(getDb());
		const session = (await getPasteShareSession(getDb(), code.toLowerCase()))!;

		expect(session).not.toBeNull();
		expect(session.expiresAt).toBeInstanceOf(Date);
	});

	it('returns null for an expired session', async () => {
		const { code } = await createPasteShareSession(getDb());
		await getDb()
			.collection('pasteShare')
			.updateOne({}, { $set: { expiresAt: new Date(Date.now() - 1000) } });

		await expect(getPasteShareSession(getDb(), code)).resolves.toBeNull();
	});

	it('returns null for an unknown code', async () => {
		await expect(getPasteShareSession(getDb(), 'ABCDEFGH')).resolves.toBeNull();
	});
});

describe('getUserPastes', () => {
	it('honours a custom limit and reports hasMore', async () => {
		const userId = new ObjectId().toHexString();
		const start = Date.now();
		const pastes = await Promise.all(
			Array.from({ length: 5 }, () => insertPaste(getDb(), {}))
		);
		await Promise.all(
			pastes.map((paste, i) =>
				insertUserPaste(getDb(), {
					userId,
					pasteId: paste._id.toHexString(),
					created: new Date(start + i)
				})
			)
		);

		const result = await getUserPastes(getDb(), userId, 0, 3);

		expect(result.pastes).toHaveLength(3);
		expect(result.hasMore).toBe(true);
		expect(result.pastes[0].paste.id).toBe(pastes[4]._id.toHexString());
	});
});