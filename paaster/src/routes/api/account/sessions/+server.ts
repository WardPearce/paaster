import { stringToObjectId } from '$lib/server/objectId';
import { revokeSession } from '$lib/server/session';
import { error, json } from '@sveltejs/kit';
import { z } from 'zod';

export async function GET({ locals }) {
	if (!locals.userId) {
		throw error(401);
	}

	const sessions = await locals.mongoDb
		.collection('sessions')
		.find(
			{ userId: stringToObjectId(locals.userId) },
			{ projection: { sessionId: 1, created: 1, lastUsed: 1, expiresAt: 1 } }
		)
		.sort({ lastUsed: -1 })
		.toArray();

	return json({
		sessions: sessions.map((s) => ({
			sessionId: s.sessionId.slice(0, 6) + '...',
			current: s.sessionId === locals.sessionId,
			created: s.created,
			lastUsed: s.lastUsed,
			expiresAt: s.expiresAt
		}))
	});
}

const revokeSchema = z.object({
	sessionId: z.string().trim().min(1)
});

export async function DELETE({ locals, request }) {
	if (!locals.userId) {
		throw error(401);
	}

	const formData = revokeSchema.safeParse(Object.fromEntries(await request.formData()));
	if (!formData.success) {
		throw error(400, formData.error);
	}

	const { sessionId } = formData.data;

	if (sessionId === locals.sessionId) {
		throw error(400, 'Cannot revoke current session');
	}

	const session = await locals.mongoDb.collection('sessions').findOne({
		sessionId,
		userId: stringToObjectId(locals.userId)
	});
	if (!session) {
		throw error(404, 'Session not found');
	}

	await revokeSession(locals.mongoDb, sessionId);

	return json({});
}
