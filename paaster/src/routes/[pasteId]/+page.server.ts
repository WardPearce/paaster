import { env } from '$env/dynamic/private';
import { stringToObjectId } from '$lib/server/objectId';
import { DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { error } from '@sveltejs/kit';
import argon2 from 'argon2';

export async function load({ params, locals, url, cookies }) {
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
				signedUrl: null,
				account: null
			};
		}
	}

	const s3Location = {
		Bucket: env.S3_BUCKET,
		Key: `${paste._id}.bin`
	};

	let deletePaste = false;

	if (paste.expireAfter !== -2) {
		if (paste.expireAfter === -1) {
			const claimed = await locals.mongoDb
				.collection('pastes')
				.findOneAndUpdate(
					{ _id: pasteId, deleteNextRequest: { $ne: true } },
					{ $set: { deleteNextRequest: true } }
				);
			if (!claimed) {
				deletePaste = true;
			}
		} else {
			const now = new Date();

			const expireTime = paste.created.getTime() + paste.expireAfter * 60 * 60 * 1000;

			if (now > expireTime) {
				deletePaste = true;
			}
		}
	}

	if (deletePaste) {
		await locals.mongoDb.collection('pastes').deleteOne({ _id: pasteId });
		if (locals.userId) {
			await locals.mongoDb.collection('userPastes').deleteOne({
				userId: locals.userId,
				'paste.id': params.pasteId
			});
		}
		await locals.s3Client.send(new DeleteObjectCommand(s3Location));
		throw error(404, 'Unable to find paste');
	}

	const command = new GetObjectCommand(s3Location);

	const signedUrl = await getSignedUrl(locals.s3Client, command, {
		expiresIn: 82800
	});

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
		signedUrl: signedUrl,
		account: account
	};
}
