import { stringToObjectId } from '$lib/server/objectId';
import { error, json } from '@sveltejs/kit';
import { generateSecret, generateURI } from 'otplib';

function secretURI(secret: string, username: string): string {
	return generateURI({
		secret: secret,
		issuer: 'Paaster',
		label: username
	});
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

	return json({
		secret: user.twoFactorSecret,
		uri: secretURI(user.twoFactorSecret, user.username),
		verified: user.twoFactorVerified === true
	});
}

export async function POST({ locals }) {
	if (!locals.userId) {
		throw error(401);
	}

	const userId = stringToObjectId(locals.userId);

	const user = await locals.mongoDb.collection('users').findOne({
		_id: userId
	});
	if (!user) {
		throw error(404, 'User not found');
	}

	const secret = generateSecret();

	await locals.mongoDb.collection('users').updateOne(
		{
			_id: userId
		},
		{ $set: { twoFactorSecret: secret, twoFactorVerified: false } }
	);

	return json({
		secret,
		uri: secretURI(secret, user.username)
	});
}

export async function DELETE({ locals }) {
	if (!locals.userId) {
		throw error(401);
	}

	await locals.mongoDb.collection('users').updateOne(
		{
			_id: stringToObjectId(locals.userId)
		},
		{ $set: { twoFactorSecret: null, twoFactorVerified: null } }
	);

	return new Response('');
}
