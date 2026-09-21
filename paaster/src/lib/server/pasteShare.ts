import type { Db } from 'mongodb';
import crypto from 'crypto';

// Crockford base32 style alphabet, ambiguity free (no I, L, O, U).
export const pasteShareCodeAlphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
export const pasteShareCodeLength = 8;
export const pasteShareTtlMs = 5 * 60 * 1000;

export interface PasteShareSession {
	codeHash: string;
	receiverPublicKey: string | null;
	cipher: string | null;
	created: Date;
	expiresAt: Date;
}

export function normalizePasteShareCode(code: string): string {
	return code
		.toUpperCase()
		.replace(/[^0-9A-Z]/g, '')
		.replace(/[IL]/g, '1')
		.replace(/O/g, '0');
}

function unbiasedIndex(max: number): number {
	const limit = 256 - (256 % max);
	while (true) {
		const byte = crypto.randomBytes(1)[0];
		if (byte < limit) return byte % max;
	}
}

export function generatePasteShareCode(): string {
	let code = '';
	for (let i = 0; i < pasteShareCodeLength; i++) {
		code += pasteShareCodeAlphabet[unbiasedIndex(pasteShareCodeAlphabet.length)];
	}
	return code;
}

function hashPasteShareCode(code: string): string {
	return crypto.createHash('sha256').update(normalizePasteShareCode(code)).digest('hex');
}

export async function createPasteShareSession(mongoDb: Db): Promise<{
	code: string;
	expires: Date;
}> {
	const expiresAt = new Date(Date.now() + pasteShareTtlMs);

	for (let attempt = 0; attempt < 5; attempt++) {
		const code = generatePasteShareCode();

		try {
			await mongoDb.collection('pasteShare').insertOne({
				codeHash: hashPasteShareCode(code),
				receiverPublicKey: null,
				cipher: null,
				created: new Date(),
				expiresAt
			});

			return { code, expires: expiresAt };
		} catch {
			// Code collision, retry with a fresh code.
		}
	}

	throw new Error('Failed to generate quick share code');
}

export async function getPasteShareSession(
	mongoDb: Db,
	code: string
): Promise<PasteShareSession | null> {
	const session = await mongoDb
		.collection<PasteShareSession>('pasteShare')
		.findOne({ codeHash: hashPasteShareCode(code), expiresAt: { $gt: new Date() } });

	return session ?? null;
}

export type PasteShareRegisterResult = 'ok' | 'not-found' | 'conflict';

export async function registerPasteShareReceiver(
	mongoDb: Db,
	code: string,
	receiverPublicKey: string
): Promise<PasteShareRegisterResult> {
	const claimed = await mongoDb.collection('pasteShare').findOneAndUpdate(
		{
			codeHash: hashPasteShareCode(code),
			expiresAt: { $gt: new Date() },
			receiverPublicKey: null
		},
		{ $set: { receiverPublicKey } }
	);

	if (!claimed) {
		const session = await getPasteShareSession(mongoDb, code);
		return session ? 'conflict' : 'not-found';
	}

	return 'ok';
}

export async function setPasteShareData(
	mongoDb: Db,
	code: string,
	cipher: string
): Promise<boolean> {
	const claimed = await mongoDb.collection('pasteShare').findOneAndUpdate(
		{
			codeHash: hashPasteShareCode(code),
			expiresAt: { $gt: new Date() },
			receiverPublicKey: { $ne: null },
			cipher: null
		},
		{ $set: { cipher } }
	);

	return claimed !== null;
}

export async function deletePasteShareSession(mongoDb: Db, code: string): Promise<void> {
	await mongoDb.collection('pasteShare').deleteOne({ codeHash: hashPasteShareCode(code) });
}
