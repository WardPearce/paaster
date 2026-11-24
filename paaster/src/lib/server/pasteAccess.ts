import { createHash, timingSafeEqual } from 'node:crypto';
import { error, type Cookies } from '@sveltejs/kit';
import argon2 from 'argon2';
import sodium from 'libsodium-wrappers-sumo';
import type { PasteDoc } from './pastes';

const viewCookieName = (pasteId: string) => `paste_view_${pasteId}`;

export function isPasteExpired(paste: PasteDoc): boolean {
	return (
		paste.expireAfter >= 0 &&
		Date.now() > paste.created.getTime() + paste.expireAfter * 60 * 60 * 1000
	);
}

export async function grantOneTimeView(
	cookies: Cookies,
	pasteId: string,
	secure: boolean
): Promise<string> {
	await sodium.ready;
	const token = sodium.to_base64(
		sodium.randombytes_buf(32),
		sodium.base64_variants.URLSAFE_NO_PADDING
	);
	cookies.set(viewCookieName(pasteId), token, {
		httpOnly: true,
		secure,
		sameSite: 'strict',
		path: `/api/paste/${pasteId}/chunks`,
		maxAge: 60 * 60
	});
	return createHash('sha256').update(token).digest('hex');
}

export async function requireChunkAccess(
	paste: PasteDoc,
	pasteId: string,
	cookies: Cookies
): Promise<void> {
	if (isPasteExpired(paste)) throw error(404, 'Paste not found');

	if (paste.passphrase) {
		const passphrase = cookies.get(`passphrase_${pasteId}`);
		if (!passphrase || !(await argon2.verify(paste.passphrase, passphrase))) {
			throw error(401, 'Passphrase required');
		}
	}

	if (paste.expireAfter === -1) {
		const token = cookies.get(viewCookieName(pasteId));
		if (!paste.deleteNextRequest || !paste.viewTokenHash || !token) {
			throw error(401, 'View authorization required');
		}
		const actual = createHash('sha256').update(token).digest();
		const expected = Buffer.from(paste.viewTokenHash, 'hex');
		if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
			throw error(401, 'View authorization required');
		}
	}
}
