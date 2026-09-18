import sodium from 'libsodium-wrappers-sumo';
import dayjs from 'dayjs';
import { get } from 'svelte/store';
import { _ } from '$lib/i18n';
import { localDb } from './dexie';
import { solveCaptchaChallenge } from './captcha';

export type PasteShareStatus = 'pending' | 'awaiting' | 'completed';

export const pasteShareTtlMs = 5 * 60 * 1000;

export type PasteSharePayload = {
	pasteId: string;
	masterKey: string;
};

export function normalizePasteShareCode(code: string): string {
	return code
		.toUpperCase()
		.replace(/[^0-9A-Z]/g, '')
		.replace(/[IL]/g, '1')
		.replace(/O/g, '0');
}

export async function createPasteShareSession(): Promise<{ code: string; expires: string } | null> {
	const resp = await fetch('/api/pasteShare', { method: 'POST' });
	if (!resp.ok) return null;

	const data = await resp.json().catch(() => null);
	if (!data?.code) return null;

	return data;
}

export async function getPasteShareStatus(
	code: string
): Promise<{ status: PasteShareStatus; receiverPublicKey?: string | null } | null> {
	const resp = await fetch(`/api/pasteShare/${encodeURIComponent(normalizePasteShareCode(code))}`);
	if (!resp.ok) return null;

	return await resp.json().catch(() => null);
}

export async function cancelPasteShareSession(code: string): Promise<void> {
	await fetch(`/api/pasteShare/${encodeURIComponent(normalizePasteShareCode(code))}`, {
		method: 'DELETE'
	}).catch(() => {
		// Session will expire on its own.
	});
}

export async function sendPasteShareData(
	code: string,
	receiverPublicKey: string,
	payload: PasteSharePayload
): Promise<boolean> {
	await sodium.ready;

	const cipher = sodium.crypto_box_seal(
		new TextEncoder().encode(JSON.stringify(payload)),
		sodium.from_base64(receiverPublicKey)
	);

	const resp = await fetch(
		`/api/pasteShare/${encodeURIComponent(normalizePasteShareCode(code))}/data`,
		{
			method: 'POST',
			body: JSON.stringify({ cipher: sodium.to_base64(cipher) })
		}
	);

	return resp.ok;
}

export type PasteShareRegisterResult =
	| { status: 'ok'; keypair: { publicKey: Uint8Array; privateKey: Uint8Array } }
	| { status: 'not-found' | 'conflict' | 'captcha' | 'error' };

export async function registerPasteShareReceiver(code: string): Promise<PasteShareRegisterResult> {
	await sodium.ready;

	const captchaPayload = await solveCaptchaChallenge();
	if (!captchaPayload) return { status: 'captcha' };

	const keypair = sodium.crypto_box_keypair();

	const resp = await fetch(
		`/api/pasteShare/${encodeURIComponent(normalizePasteShareCode(code))}/receiver`,
		{
			method: 'POST',
			body: JSON.stringify({
				publicKey: sodium.to_base64(keypair.publicKey),
				captchaPayload
			})
		}
	);

	if (!resp.ok) {
		if (resp.status === 404) return { status: 'not-found' };
		if (resp.status === 409) return { status: 'conflict' };
		if (resp.status === 400) return { status: 'captcha' };
		return { status: 'error' };
	}

	return {
		status: 'ok',
		keypair: {
			publicKey: keypair.publicKey,
			privateKey: keypair.privateKey
		}
	};
}

export async function fetchPasteShareData(code: string): Promise<string | null> {
	const resp = await fetch(
		`/api/pasteShare/${encodeURIComponent(normalizePasteShareCode(code))}/data`
	);
	if (!resp.ok) return null;

	const data = await resp.json().catch(() => null);
	return data?.cipher ?? null;
}

export async function openPasteShareData(
	cipher: string,
	publicKey: Uint8Array,
	privateKey: Uint8Array
): Promise<PasteSharePayload | null> {
	await sodium.ready;

	try {
		const decrypted = sodium.crypto_box_seal_open(
			sodium.from_base64(cipher),
			publicKey,
			privateKey
		);

		const payload = JSON.parse(new TextDecoder().decode(decrypted));

		if (typeof payload?.pasteId !== 'string' || typeof payload?.masterKey !== 'string') {
			return null;
		}

		return payload;
	} catch {
		return null;
	}
}

export async function applySharedPaste(pasteId: string, masterKey: string, created?: Date) {
	const shortDate = dayjs().format('MMM D, YYYY');
	const name = get(_)('quickShare.sharedOn', { date: shortDate });

	await localDb.pastes
		.put({
			id: pasteId,
			masterKey: masterKey,
			accessKey: undefined,
			created: created ?? new Date(),
			name
		})
		.catch(() => {
			// Ignore storage failures, the link still works.
		});
}
