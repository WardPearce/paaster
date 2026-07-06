import { stringToObjectId } from '$lib/server/objectId';
import { redirect } from '@sveltejs/kit';

export async function load({ locals }) {
	if (!locals.userId) throw redirect(307, '/');

	let expireAfter = -2;

	const results = await locals.mongoDb
		.collection('userDefaults')
		.findOne({ _id: stringToObjectId(locals.userId) });

	if (results) {
		expireAfter = results.expireAfter;
	}

	return {
		expireAfter: expireAfter
	};
}
