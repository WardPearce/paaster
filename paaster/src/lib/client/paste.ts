import sodium from 'libsodium-wrappers-sumo';
import { localDb } from './dexie';
import { authStore } from './stores';
import { get } from 'svelte/store';
import { _ } from '$lib/i18n';

export async function deletePaste(pasteId: string, accessKey?: string) {
	if (accessKey) {
		await fetch(`/api/paste/${pasteId}`, {
			method: 'DELETE',
			headers: {
				Authorization: `Bearer ${accessKey}`
			}
		});
	}
	await localDb.pastes.delete(pasteId);
}

export async function savePaste(
	pasteId: string,
	accessKey: string,
	masterKey: string,
	created?: Date,
	name?: string
) {
	const auth = get(authStore);

	if (!auth) {
		await localDb.pastes.add({
			id: pasteId,
			accessKey: accessKey,
			masterKey: masterKey,
			created: created ?? new Date(),
			name: name ?? 'Unknown'
		});
	} else {
		await sodium.ready;

		const rawEncryptionKey = sodium.from_base64(auth.encryptionKey);

		const encryptedPasteNonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
		const encryptedPaste = sodium.crypto_secretbox_easy(
			sodium.from_base64(masterKey),
			encryptedPasteNonce,
			rawEncryptionKey
		);

		const encryptedAccessNonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
		const encryptedAccessKey = sodium.crypto_secretbox_easy(
			sodium.from_base64(accessKey),
			encryptedAccessNonce,
			rawEncryptionKey
		);

		const savePastePayload = new FormData();
		savePastePayload.append('encryptedPasteNonce', sodium.to_base64(encryptedPasteNonce));
		savePastePayload.append('encryptedPasteKey', sodium.to_base64(encryptedPaste));

		savePastePayload.append('encryptedAccessNonce', sodium.to_base64(encryptedAccessNonce));
		savePastePayload.append('encryptedAccessKey', sodium.to_base64(encryptedAccessKey));

		await fetch(`/api/account/paste/${pasteId}`, { method: 'POST', body: savePastePayload });
	}
}

export function pasteDeletionTimes() {
	// Must be used in func due to how states work
	return [
		{ value: -2, label: get(_)('paste_actions.expire.periods.never') },
		{ value: -1, label: get(_)('paste_actions.expire.periods.being_viewed') },
		{
			value: 0.08333,
			label: `5 ${get(_)('paste_actions.expire.periods.minutes')}`
		},
		{ value: 0.25, label: `15 ${get(_)('paste_actions.expire.periods.minutes')}` },
		{ value: 0.5, label: `30 ${get(_)('paste_actions.expire.periods.minutes')}` },
		{ value: 1, label: `1 ${get(_)('paste_actions.expire.periods.hour')}` },
		{ value: 2, label: `2 ${get(_)('paste_actions.expire.periods.hours')}` },
		{ value: 3, label: `3 ${get(_)('paste_actions.expire.periods.hours')}` },
		{ value: 4, label: `4 ${get(_)('paste_actions.expire.periods.hours')}` },
		{ value: 5, label: `5 ${get(_)('paste_actions.expire.periods.hours')}` },
		{ value: 6, label: `6 ${get(_)('paste_actions.expire.periods.hours')}` },
		{ value: 7, label: `7 ${get(_)('paste_actions.expire.periods.hours')}` },
		{ value: 8, label: `8 ${get(_)('paste_actions.expire.periods.hours')}` },
		{ value: 9, label: `9 ${get(_)('paste_actions.expire.periods.hours')}` },
		{ value: 10, label: `10 ${get(_)('paste_actions.expire.periods.hours')}` },
		{ value: 11, label: `11 ${get(_)('paste_actions.expire.periods.hours')}` },
		{ value: 12, label: `12 ${get(_)('paste_actions.expire.periods.hours')}` },
		{ value: 24, label: `1 ${get(_)('paste_actions.expire.periods.day')}` },
		{ value: 48, label: `2 ${get(_)('paste_actions.expire.periods.days')}` },
		{ value: 72, label: `3 ${get(_)('paste_actions.expire.periods.days')}` },
		{ value: 96, label: `4 ${get(_)('paste_actions.expire.periods.days')}` },
		{ value: 120, label: `5 ${get(_)('paste_actions.expire.periods.days')}` },
		{ value: 144, label: `6 ${get(_)('paste_actions.expire.periods.days')}` },
		{ value: 168, label: `1 ${get(_)('paste_actions.expire.periods.week')}` },
		{ value: 336, label: `2 ${get(_)('paste_actions.expire.periods.weeks')}` },
		{ value: 504, label: `3 ${get(_)('paste_actions.expire.periods.weeks')}` },
		{ value: 730, label: `1 ${get(_)('paste_actions.expire.periods.month')}` },
		{ value: 1461, label: `2 ${get(_)('paste_actions.expire.periods.months')}` },
		{ value: 2192, label: `3 ${get(_)('paste_actions.expire.periods.months')}` }
	];
}
