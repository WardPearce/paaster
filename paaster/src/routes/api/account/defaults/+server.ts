import { stringToObjectId } from '$lib/server/objectId';
import { error, json } from '@sveltejs/kit';
import { z } from 'zod';

const defaultSchema = z.object({
	expireAfter: z
		.string()
		.refine((val) => !isNaN(Number(val)), { message: 'Must be a valid number' })
		.transform((val) => Number(val))
});

export async function GET({ locals }) {
	if (!locals.userId) {
		throw error(401);
	}

	const results = await locals.mongoDb
		.collection('userDefaults')
		.findOne({ _id: stringToObjectId(locals.userId) });
	if (!results) {
		throw error(404);
	}

	return json({
		expireAfter: results.expireAfter
	});
}

export async function POST({ locals, request }) {
	if (!locals.userId) {
		throw error(401);
	}

	const formData = defaultSchema.safeParse(Object.fromEntries(await request.formData()));

	if (!formData.success) {
		throw error(400, formData.error);
	}

	await locals.mongoDb
		.collection('userDefaults')
		.updateOne(
			{ _id: stringToObjectId(locals.userId) },
			{ $set: { expireAfter: formData.data.expireAfter } },
			{ upsert: true }
		);

	return json({});
}
