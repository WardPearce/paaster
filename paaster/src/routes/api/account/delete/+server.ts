import { stringToObjectId } from '$lib/server/objectId.js';
import { revokeAllUserSessions, deleteSessionCookie } from '$lib/server/session';
import { error, json } from '@sveltejs/kit';
import argon2 from 'argon2';
import { ObjectId } from 'mongodb';

export async function DELETE({ locals, request, cookies }) {
	if (!locals.userId) {
		throw error(401);
	}

	const formData = await request.formData();
	const serverSidePassword = formData.get('serverSidePassword') as string;
	if (!serverSidePassword) {
		throw error(400, 'Current password is required');
	}

	const user = await locals.mongoDb.collection('users').findOne({
		_id: stringToObjectId(locals.userId)
	});
	if (!user) {
		throw error(404, 'User not found');
	}

	if (!(await argon2.verify(user.serverSide.password, serverSidePassword))) {
		throw error(401, 'Invalid password');
	}

	await locals.mongoDb.collection('users').deleteOne({ _id: stringToObjectId(locals.userId) });
	await locals.mongoDb.collection('userPastes').deleteMany({ userId: locals.userId });

	await revokeAllUserSessions(locals.mongoDb, new ObjectId(locals.userId));
	deleteSessionCookie(cookies);

	return json({});
}
