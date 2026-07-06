import { stringToObjectId } from '$lib/server/objectId';
import { revokeAllOtherSessions } from '$lib/server/session';
import { error, json } from '@sveltejs/kit';
import argon2 from 'argon2';
import { ObjectId } from 'mongodb';
import { z } from 'zod';

const passwordResetSchema = z.object({
	currentServerSidePassword: z.string().trim().max(64),
	serverSideSalt: z.string().trim().max(64),
	serverSidePassword: z.string().trim().max(64),
	masterPasswordSalt: z.string().trim().max(64),
	encryptionKey: z.string().trim().max(64),
	encryptionKeyNonce: z.string().trim().max(64),
	encryptionKeyKeySalt: z.string().trim().max(64)
});

export async function POST({ locals, request }) {
	if (!locals.userId) {
		throw error(401);
	}

	const formData = passwordResetSchema.safeParse(Object.fromEntries(await request.formData()));

	if (!formData.success) {
		throw error(400, formData.error);
	}

	const user = await locals.mongoDb.collection('users').findOne({
		_id: stringToObjectId(locals.userId)
	});
	if (!user) {
		throw error(404, 'User not found');
	}

	if (!(await argon2.verify(user.serverSide.password, formData.data.currentServerSidePassword))) {
		throw error(401, 'Invalid current password');
	}

	await locals.mongoDb.collection('users').updateOne(
		{
			_id: stringToObjectId(locals.userId)
		},
		{
			$set: {
				serverSide: {
					salt: formData.data.serverSideSalt,
					password: await argon2.hash(formData.data.serverSidePassword)
				},
				encryptionKey: {
					value: formData.data.encryptionKey,
					nonce: formData.data.encryptionKeyNonce,
					keySalt: formData.data.encryptionKeyKeySalt
				},
				masterPasswordSalt: formData.data.masterPasswordSalt
			}
		}
	);

	if (locals.sessionId) {
		await revokeAllOtherSessions(locals.mongoDb, new ObjectId(locals.userId), locals.sessionId);
	}

	return json({});
}
