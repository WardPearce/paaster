import { revokeSession, getSessionIdFromCookie, deleteSessionCookie } from '$lib/server/session';
import { json } from '@sveltejs/kit';

export async function DELETE({ locals, cookies }) {
	const sessionId = getSessionIdFromCookie(cookies);
	if (sessionId) {
		await revokeSession(locals.mongoDb, sessionId);
	}
	deleteSessionCookie(cookies);

	return json({});
}
