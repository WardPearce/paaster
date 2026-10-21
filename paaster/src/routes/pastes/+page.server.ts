import { getUserPastes } from '#lib/server/pastes';
import { PASTE_PAGE_SIZE } from '#lib/consts';

export async function load({ locals }) {
	if (!locals.userId) {
		return { pastes: [], hasMore: false };
	}

	const { pastes, hasMore } = await getUserPastes(
		locals.mongoDb,
		locals.userId,
		0,
		PASTE_PAGE_SIZE
	);
	return { pastes, hasMore };
}
