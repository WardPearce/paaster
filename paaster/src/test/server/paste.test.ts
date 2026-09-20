import { describe, beforeEach, expect, it } from 'vitest';
import { ObjectId } from 'mongodb';
import { GET as listPastes, POST as createPaste } from '../../routes/api/paste/+server';
import { DELETE as deletePaste, POST as updatePaste } from '../../routes/api/paste/[pasteId]/+server';
import { POST as uploadChunk } from '../../routes/api/paste/[pasteId]/chunks/+server';
import { GET as getChunk } from '../../routes/api/paste/[pasteId]/chunks/[chunkIndex]/+server';
import { CHUNK_SIZE } from '$lib/consts';
import { getMaxUploadBytes } from '$lib/server/storage';
import { setupTestDb } from '../utils/db';
import { TEST_ACCESS_KEY, insertPaste, insertUserPaste } from '../utils/factories';
import { expectHttpError, formRequest, makeCookies, makeEvent, makeMemoryStorage } from '../utils/event';

const getDb = setupTestDb();

function authHeaders(accessKey = TEST_ACCESS_KEY): Record<string, string> {
	return { Authorization: `Bearer ${accessKey}` };
}

async function createPasteDoc(overrides: Record<string, unknown> = {}) {
	return insertPaste(getDb(), overrides);
}

describe('POST /api/paste', () => {
	beforeEach(() => {
		process.env.MAX_UPLOAD_SIZE = '';
	});

	it('rejects an invalid body with 400', async () => {
		const req = formRequest({ codeKeySalt: 'a2V5c2FsdA==' });

		await expectHttpError(createPaste(makeEvent(getDb(), makeMemoryStorage(), { request: req })), 400);
	});

	it('creates a paste and returns pasteId, accessKey and maxUploadSize', async () => {
		const req = formRequest({
			codeHeader: 'aGVhZGVy',
			codeKeySalt: 'a2V5c2FsdA==',
			codeName: 'bmFtZQ==',
			codeNameNonce: 'bm9uY2U=',
			codeNameKeySalt: 'a2V5c2FsdA=='
		});

		const res = await createPaste(makeEvent(getDb(), makeMemoryStorage(), { request: req }));
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(typeof body.pasteId).toBe('string');
		expect(body.accessKey).toBeTruthy();
		expect(body.maxUploadSize).toBe(getMaxUploadBytes());

		const paste = (await getDb().collection('pastes').findOne({ _id: new ObjectId(body.pasteId) }))!;
		expect(paste).not.toBeNull();
		expect(paste.header).toBe('aGVhZGVy');
		expect(paste.expireAfter).toBe(-2);
	});

	it('uses the default expireAfter from userDefaults when authenticated', async () => {
		const userId = new ObjectId();
		await getDb()
			.collection('userDefaults')
			.insertOne({ _id: userId, expireAfter: 14 });

		const req = formRequest({ codeHeader: 'aGVhZGVy', codeKeySalt: 'a2V5c2FsdA==' });
		const res = await createPaste(
			makeEvent(getDb(), makeMemoryStorage(), { request: req, locals: { userId: userId.toHexString() } })
		);

		const body = await res.json();
		const paste = (await getDb().collection('pastes').findOne({ _id: new ObjectId(body.pasteId) }))!;
		expect(paste.expireAfter).toBe(14);
	});
});

describe('GET /api/paste', () => {
	it('returns an empty list for anonymous users', async () => {
		const res = await listPastes(makeEvent(getDb(), makeMemoryStorage()));
		await expect(res.json()).resolves.toEqual({ pastes: [], hasMore: false });
	});

	it('returns paged pastes for an authenticated user', async () => {
		const userId = new ObjectId().toHexString();
		for (let i = 0; i < 13; i++) {
			const paste = await createPasteDoc();
			await insertUserPaste(getDb(), { userId, pasteId: paste._id.toHexString() });
		}

		const event = makeEvent(getDb(), makeMemoryStorage(), { locals: { userId } });

		const pageOne = await listPastes(event);
		const first = await pageOne.json();
		expect(first.pastes).toHaveLength(12);
		expect(first.hasMore).toBe(true);
		expect(first.pastes[0].name).toMatchObject({ value: 'bmFtZQ==' });

		const pageTwo = await listPastes(makeEvent(getDb(), makeMemoryStorage(), { locals: { userId }, url: new URL('http://localhost?offset=12') }));
		const secondResult = await pageTwo.json();
		expect(secondResult.pastes).toHaveLength(1);
		expect(secondResult.hasMore).toBe(false);
	});
});

describe('POST /api/paste/[pasteId]', () => {
	it('returns 404 for an unknown paste', async () => {
		const req = formRequest({ codeName: 'bmFtZQ==' });
		await expectHttpError(
			updatePaste(makeEvent(getDb(), makeMemoryStorage(), { params: { pasteId: new ObjectId().toHexString() }, request: req })),
			404
		);
	});

	it('returns 401 for an invalid access key', async () => {
		const paste = await createPasteDoc();
		const req = formRequest({ codeName: 'bmFtZQ==' }, { headers: { Authorization: 'Bearer wrong' } });

		await expectHttpError(
			updatePaste(makeEvent(getDb(), makeMemoryStorage(), { params: { pasteId: paste._id.toHexString() }, request: req })),
			401
		);
	});

	it('updates name, language, expireAfter and wrapWords', async () => {
		const paste = await createPasteDoc();
		const req = formRequest(
			{
				codeName: 'bmV3TmFtZQ==',
				codeNameNonce: 'bm9uY2Uy',
				codeNameKeySalt: 'c2FsdDI=',
				langName: 'cHl0aG9u',
				langNonce: 'bm9uY2Uz',
				langKeySalt: 'c2FsdDM=',
				expireAfter: '10',
				wrapWords: 'true'
			},
			{ headers: authHeaders() }
		);

		const res = await updatePaste(
			makeEvent(getDb(), makeMemoryStorage(), { params: { pasteId: paste._id.toHexString() }, request: req })
		);
		expect(res.status).toBe(200);

		const updated = (await getDb().collection('pastes').findOne({ _id: paste._id }))!;
		expect(updated.name).toEqual({ value: 'bmV3TmFtZQ==', nonce: 'bm9uY2Uy', keySalt: 'c2FsdDI=' });
		expect(updated.language).toEqual({ value: 'cHl0aG9u', nonce: 'bm9uY2Uz', keySalt: 'c2FsdDM=' });
		expect(updated.expireAfter).toBe(10);
		expect(updated.wrapWords).toBe(true);
	});

	it('ignores an out of range expireAfter', async () => {
		const paste = await createPasteDoc();
		const req = formRequest({ expireAfter: '5000' }, { headers: authHeaders() });

		await updatePaste(
			makeEvent(getDb(), makeMemoryStorage(), { params: { pasteId: paste._id.toHexString() }, request: req })
		);

		const updated = (await getDb().collection('pastes').findOne({ _id: paste._id }))!;
		expect(updated.expireAfter).toBe(-2);
	});

	it('sets a passphrase when at least 8 characters', async () => {
		const paste = await createPasteDoc();
		const req = formRequest({ passphrase: 'supersecret' }, { headers: authHeaders() });

		await updatePaste(
			makeEvent(getDb(), makeMemoryStorage(), { params: { pasteId: paste._id.toHexString() }, request: req })
		);

		const updated = (await getDb().collection('pastes').findOne({ _id: paste._id }))!;
		expect(updated.passphrase).toBeTruthy();
		expect(updated.passphrase.startsWith('$argon2')).toBe(true);
	});

	it('rejects a passphrase shorter than 8 characters', async () => {
		const paste = await createPasteDoc();
		const req = formRequest({ passphrase: 'short' }, { headers: authHeaders() });

		await expectHttpError(
			updatePaste(makeEvent(getDb(), makeMemoryStorage(), { params: { pasteId: paste._id.toHexString() }, request: req })),
			400
		);
	});

	it('unsets the passphrase and deletes the cookie when cleared', async () => {
		const paste = await createPasteDoc();
		const cookies = makeCookies();
		cookies.set('passphrase_' + paste._id.toHexString(), 'something');
		const req = formRequest({ passphrase: '' }, { headers: authHeaders() });

		const res = await updatePaste(
			makeEvent(getDb(), makeMemoryStorage(), { params: { pasteId: paste._id.toHexString() }, request: req, cookies })
		);
		expect(res.status).toBe(200);

		const updated = (await getDb().collection('pastes').findOne({ _id: paste._id }))!;
		expect(updated.passphrase).toBeUndefined();
		expect(cookies.get('passphrase_' + paste._id.toHexString())).toBeUndefined();
	});
});

describe('DELETE /api/paste/[pasteId]', () => {
	it('returns 404 for an unknown paste', async () => {
		const req = new Request('http://localhost', { method: 'DELETE' });
		await expectHttpError(
			deletePaste(makeEvent(getDb(), makeMemoryStorage(), { params: { pasteId: new ObjectId().toHexString() }, request: req })),
			404
		);
	});

	it('returns 401 for an invalid access key', async () => {
		const paste = await createPasteDoc();
		const req = new Request('http://localhost', {
			method: 'DELETE',
			headers: { Authorization: 'Bearer wrong' }
		});

		await expectHttpError(
			deletePaste(makeEvent(getDb(), makeMemoryStorage(), { params: { pasteId: paste._id.toHexString() }, request: req })),
			401
		);
	});

	it('deletes the paste, user paste and uploaded chunks', async () => {
		const paste = await createPasteDoc();
		const userId = new ObjectId().toHexString();
		const pasteId = paste._id.toHexString();
		await insertUserPaste(getDb(), { userId, pasteId });

		const storage = makeMemoryStorage();
		await storage.saveChunk(pasteId, 0, new Uint8Array([1, 2, 3]), 1);

		const req = new Request('http://localhost', { method: 'DELETE', headers: authHeaders() });
		const res = await deletePaste(
			makeEvent(getDb(), storage, { params: { pasteId }, request: req, locals: { userId } })
		);
		expect(res.status).toBe(200);

		await expect(getDb().collection('pastes').findOne({ _id: paste._id })).resolves.toBeNull();
		await expect(getDb().collection('userPastes').findOne({ userId, 'paste.id': pasteId })).resolves.toBeNull();
		expect(storage.chunks.size).toBe(0);
	});
});

describe('POST /api/paste/[pasteId]/chunks', () => {
	it('returns 404 for an unknown paste', async () => {
		const req = formRequest(
			{ chunkIndex: '0', totalChunks: '1', data: new File([new Uint8Array(4)], 'chunk.bin') },
			{ headers: authHeaders() }
		);
		await expectHttpError(
			uploadChunk(makeEvent(getDb(), makeMemoryStorage(), { params: { pasteId: new ObjectId().toHexString() }, request: req })),
			404
		);
	});

	it('returns 401 for an invalid access key', async () => {
		const paste = await createPasteDoc();
		const req = formRequest(
			{ chunkIndex: '0', totalChunks: '1', data: new File([new Uint8Array(4)], 'chunk.bin') },
			{ headers: { Authorization: 'Bearer wrong' } }
		);
		await expectHttpError(
			uploadChunk(makeEvent(getDb(), makeMemoryStorage(), { params: { pasteId: paste._id.toHexString() }, request: req })),
			401
		);
	});

	it('rejects a chunkIndex equal to totalChunks', async () => {
		const paste = await createPasteDoc();
		const req = formRequest(
			{ chunkIndex: '2', totalChunks: '2', data: new File([new Uint8Array(4)], 'chunk.bin') },
			{ headers: authHeaders() }
		);
		await expectHttpError(
			uploadChunk(makeEvent(getDb(), makeMemoryStorage(), { params: { pasteId: paste._id.toHexString() }, request: req })),
			400
		);
	});

	it('rejects a chunk larger than CHUNK_SIZE', async () => {
		const paste = await createPasteDoc();
		const req = formRequest(
			{
				chunkIndex: '0',
				totalChunks: '1',
				data: new File([new Uint8Array(CHUNK_SIZE + 1)], 'chunk.bin')
			},
			{ headers: authHeaders() }
		);

		await expectHttpError(
			uploadChunk(makeEvent(getDb(), makeMemoryStorage(), { params: { pasteId: paste._id.toHexString() }, request: req })),
			413
		);
	});

	it('rejects uploads exceeding the maximum total size', async () => {
		const paste = await createPasteDoc();
		process.env.MAX_UPLOAD_SIZE = '1';
		const storage = makeMemoryStorage();

		const first = formRequest(
			{ chunkIndex: '0', totalChunks: '2', data: new File([new Uint8Array(CHUNK_SIZE)], 'chunk.bin') },
			{ headers: authHeaders() }
		);
		const res = await uploadChunk(
			makeEvent(getDb(), storage, { params: { pasteId: paste._id.toHexString() }, request: first })
		);
		expect(res.status).toBe(200);

		const second = formRequest(
			{ chunkIndex: '1', totalChunks: '2', data: new File([new Uint8Array(CHUNK_SIZE)], 'chunk.bin') },
			{ headers: authHeaders() }
		);
		await expectHttpError(
			uploadChunk(makeEvent(getDb(), storage, { params: { pasteId: paste._id.toHexString() }, request: second })),
			413
		);
	});

	it('stores chunks and records totalChunks on the final chunk', async () => {
		const paste = await createPasteDoc();
		const pasteId = paste._id.toHexString();
		const storage = makeMemoryStorage();

		for (let i = 0; i < 2; i++) {
			const req = formRequest(
				{
					chunkIndex: String(i),
					totalChunks: '2',
					data: new File([new Uint8Array([i + 1])], `chunk-${i}.bin`)
				},
				{ headers: authHeaders() }
			);
			const res = await uploadChunk(
				makeEvent(getDb(), storage, { params: { pasteId }, request: req })
			);
			expect(res.status).toBe(200);
		}

		const updated = (await getDb().collection('pastes').findOne({ _id: paste._id }))!;
		expect(updated.totalChunks).toBe(2);
		expect(storage.chunks.get(`${pasteId}:0`)).toEqual(new Uint8Array([1]));
		expect(storage.chunks.get(`${pasteId}:1`)).toEqual(new Uint8Array([2]));
	});
});

describe('GET /api/paste/[pasteId]/chunks/[chunkIndex]', () => {
	it('returns 404 for an unknown paste', async () => {
		await expectHttpError(
			getChunk(makeEvent(getDb(), makeMemoryStorage(), {
				params: { pasteId: new ObjectId().toHexString(), chunkIndex: '0' }
			})),
			404
		);
	});

	it('returns 400 for an invalid chunk index', async () => {
		const paste = await createPasteDoc();
		await expectHttpError(
			getChunk(makeEvent(getDb(), makeMemoryStorage(), {
				params: { pasteId: paste._id.toHexString(), chunkIndex: 'not-a-number' }
			})),
			400
		);
	});

	it('returns 404 when the chunk is not stored', async () => {
		const paste = await createPasteDoc();
		await expectHttpError(
			getChunk(makeEvent(getDb(), makeMemoryStorage(), {
				params: { pasteId: paste._id.toHexString(), chunkIndex: '0' }
			})),
			404
		);
	});

	it('returns the stored chunk bytes', async () => {
		const paste = await createPasteDoc();
		const pasteId = paste._id.toHexString();
		const storage = makeMemoryStorage();
		const bytes = new Uint8Array([9, 8, 7, 6]);
		await storage.saveChunk(pasteId, 0, bytes, 1);

		const res = await getChunk(
			makeEvent(getDb(), storage, { params: { pasteId, chunkIndex: '0' } })
		);
		expect(res.status).toBe(200);
		expect(res.headers.get('Content-Type')).toBe('application/octet-stream');
		expect(new Uint8Array(await res.arrayBuffer())).toEqual(bytes);
	});
});