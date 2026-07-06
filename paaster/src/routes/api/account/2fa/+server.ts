import { stringToObjectId } from '$lib/server/objectId';
import { error, json } from '@sveltejs/kit';
import argon2 from 'argon2';
import type { Db, WithId, Document } from 'mongodb';
import { generateSecret, generateURI } from 'otplib';

function secretURI(secret: string, username: string): string {
	return generateURI({
		secret: secret,
		issuer: 'Paaster' + (process.env.NODE_ENV === 'development' ? ' Dev' : ''),
		label: username
	});
}

async function requirePassword(
	mongoDb: Db,
	userId: string,
	formData: FormData
): Promise<WithId<Document>> {
	const user = await mongoDb.collection('users').findOne({
		_id: stringToObjectId(userId)
	});
	if (!user) {
		throw error(404, 'User not found');
	}

	const serverSidePassword = formData.get('serverSidePassword') as string | null;
	if (!serverSidePassword) {
		throw error(400, 'Current password is required');
	}

	if (!(await argon2.verify(user.serverSide.password, serverSidePassword))) {
		throw error(401, 'Invalid password');
	}

	return user;
}

export async function GET({ locals }) {
	if (!locals.userId) {
		throw error(401);
	}

	const user = await locals.mongoDb.collection('users').findOne({
		_id: stringToObjectId(locals.userId)
	});
	if (!user) {
		throw error(404, 'User not found');
	}

	if (!user.twoFactorSecret) {
		throw error(404, '2FA not configured');
	}

	if (user.twoFactorVerified) {
		return json({ verified: user.twoFactorVerified });
	}

	return json({
		secret: user.twoFactorSecret,
		uri: secretURI(user.twoFactorSecret, user.username),
		verified: user.twoFactorVerified
	});
}

export async function POST({ locals, request }) {
	if (!locals.userId) {
		throw error(401);
	}

	const formData = await request.formData();

	const user = await requirePassword(locals.mongoDb, locals.userId, formData);
	const secret = generateSecret();

	await locals.mongoDb.collection('users').updateOne(
		{
			_id: stringToObjectId(locals.userId)
		},
		{ $set: { twoFactorSecret: secret, twoFactorVerified: false } }
	);

	return json({
		secret,
		uri: secretURI(secret, user.username)
	});
}

export async function DELETE({ locals, request }) {
	if (!locals.userId) {
		throw error(401);
	}

	const formData = await request.formData();
	await requirePassword(locals.mongoDb, locals.userId, formData);

	await locals.mongoDb.collection('users').updateOne(
		{
			_id: stringToObjectId(locals.userId)
		},
		{ $set: { twoFactorSecret: null, twoFactorVerified: null } }
	);

	return new Response('');
}
