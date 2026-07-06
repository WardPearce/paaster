import { stringToObjectId } from '$lib/server/objectId';
import { error, redirect } from '@sveltejs/kit';

export async function load({ locals }) {
	if (!locals.userId) throw redirect(307, '/');

	const user = await locals.mongoDb
		.collection('users')
		.findOne({ _id: stringToObjectId(locals.userId) });

	if (!user) throw error(404, 'User not found');

	let expireAfter = -2;

	const results = await locals.mongoDb
		.collection('userDefaults')
		.findOne({ _id: stringToObjectId(locals.userId) });

	if (results) {
		expireAfter = results.expireAfter;
	}

	return {
		expireAfter: expireAfter,
		username: user.username
	};
}
