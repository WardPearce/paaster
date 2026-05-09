import { getUserPastes } from '$lib/server/pastes';

export async function load({ locals }) {
	if (!locals.userId) {
		return { pastes: [] };
	}

	const { pastes } = await getUserPastes(locals.mongoDb, locals.userId, 0, 12);
	return { pastes };
}
