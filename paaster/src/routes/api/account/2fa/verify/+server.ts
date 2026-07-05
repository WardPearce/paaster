import { stringToObjectId } from '$lib/server/objectId';
import { error, json } from '@sveltejs/kit';
import { verifySync } from 'otplib';

export async function POST({ locals, request }) {
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

	if (!user.twoFactorSecret) {
		throw error(400, '2FA not configured');
	}

	if (user.twoFactorVerified) {
		throw error(400, '2FA already verified');
	}

	const formData = await request.formData();
	const token = formData.get('token') as string;

	if (!token || token.length !== 6) {
		throw error(400, 'Invalid token');
	}

	const result = verifySync({ secret: user.twoFactorSecret, token });
	if (!result.valid) {
		throw error(400, 'Invalid token');
	}

	await locals.mongoDb.collection('users').updateOne(
		{ _id: userId },
		{ $set: { twoFactorVerified: true } }
	);

	return json({ success: true });
}
