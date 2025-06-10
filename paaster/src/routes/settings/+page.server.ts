import { stringToObjectId } from '$lib/server/objectId';

export async function load({ locals }) {
	let expireAfter = -2;
	if (locals.userId) {
		const results = await locals.mongoDb
			.collection('userDefaults')
			.findOne({ _id: stringToObjectId(locals.userId) });

		if (results) {
			expireAfter = results.expireAfter;
		}
	}

	return {
		expireAfter: expireAfter
	};
}
