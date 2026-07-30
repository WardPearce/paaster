import { stringToObjectId } from '$lib/server/objectId';
import { error } from '@sveltejs/kit';
import argon2 from 'argon2';

export async function load({ params, locals, cookies }) {
	const pasteId = stringToObjectId(params.pasteId);

	const paste = await locals.mongoDb.collection('pastes').findOne({
		_id: pasteId
	});

	if (!paste) {
		if (locals.userId) {
			await locals.mongoDb.collection('userPastes').deleteOne({
				userId: locals.userId,
				'paste.id': params.pasteId
			});
		}
		throw error(404, 'Unable to find paste');
	}

	if (paste.passphrase) {
		const passphraseCookie = cookies.get('passphrase_' + params.pasteId);

		if (passphraseCookie) {
			if (!(await argon2.verify(paste.passphrase, passphraseCookie))) {
				cookies.delete('passphrase_' + params.pasteId, { path: '/' });
				throw error(401, 'Invalid passphrase');
			}
		} else {
			return {
				passphraseRequired: true,
				pasteId: paste._id.toString(),
				header: null,
				keySalt: null,
				name: null,
				language: null,
				expireAfter: null,
				created: null,
				wrapWords: null,
				chunksUrlBase: null,
				totalChunks: null,
				account: null
			};
		}
	}

	if (paste.expireAfter !== -2) {
		if (paste.expireAfter === -1) {
			const claimed = await locals.mongoDb
				.collection('pastes')
				.findOneAndUpdate(
					{ _id: pasteId, deleteNextRequest: { $ne: true } },
					{ $set: { deleteNextRequest: true } }
				);
			if (!claimed) {
				await locals.mongoDb.collection('pastes').deleteOne({ _id: pasteId });
				await locals.storageBackend.deletePaste(paste._id.toString());
				if (locals.userId) {
					await locals.mongoDb.collection('userPastes').deleteOne({
						userId: locals.userId,
						'paste.id': params.pasteId
					});
				}
				throw error(404, 'Unable to find paste');
			}
		} else {
			const now = new Date();
			const expireTime = paste.created.getTime() + paste.expireAfter * 60 * 60 * 1000;
			if (now > expireTime) {
				await locals.mongoDb.collection('pastes').deleteOne({ _id: pasteId });
				await locals.storageBackend.deletePaste(paste._id.toString());
				if (locals.userId) {
					await locals.mongoDb.collection('userPastes').deleteOne({
						userId: locals.userId,
						'paste.id': params.pasteId
					});
				}
				throw error(404, 'Unable to find paste');
			}
		}
	}

	let account;
	if (locals.userId) {
		const userPaste = await locals.mongoDb.collection('userPastes').findOne({
			userId: locals.userId,
			'paste.id': params.pasteId
		});

		if (userPaste) {
			account = {
				paste: userPaste.paste,
				accessKey: userPaste.accessKey,
				created: userPaste.created
			};
		}
	}

	return {
		pasteId: paste._id.toString(),
		header: paste.header,
		keySalt: paste.keySalt,
		name: paste.name,
		language: paste.language,
		expireAfter: paste.expireAfter,
		created: paste.created,
		wrapWords: paste.wrapWords,
		chunksUrlBase: `/api/paste/${paste._id.toString()}/chunks`,
		totalChunks: paste.totalChunks ?? null,
		account: account,
		hasPassphrase: !!paste.passphrase
	};
}
