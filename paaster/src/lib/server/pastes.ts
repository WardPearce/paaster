import type { Db } from 'mongodb';
import { stringToObjectId } from './objectId';
import { PASTE_PAGE_SIZE } from '$lib/consts';

export interface PasteResult {
	paste: { id: string; key: string; nonce: string };
	accessKey: { key: string; nonce: string };
	name: { value: string; nonce: string; keySalt: string } | null;
	created: Date;
}

export async function getUserPastes(
	mongoDb: Db,
	userId: string,
	offset = 0,
	limit = PASTE_PAGE_SIZE
): Promise<{ pastes: PasteResult[]; hasMore: boolean }> {
	const userPastes = await mongoDb
		.collection('userPastes')
		.find({ userId })
		.sort({ created: -1 })
		.skip(offset)
		.limit(limit + 1)
		.toArray();

	const hasMore = userPastes.length > limit;
	if (hasMore) userPastes.pop();

	if (userPastes.length === 0) {
		return { pastes: [], hasMore: false };
	}

	const pasteIds = userPastes.map((up) => stringToObjectId(up.paste.id));
	const pasteDocs = await mongoDb
		.collection('pastes')
		.find({ _id: { $in: pasteIds } })
		.project({ name: 1 })
		.toArray();

	const nameMap = new Map<string, { value: string; nonce: string; keySalt: string } | null>();
	for (const doc of pasteDocs) {
		if (doc?.name?.value && doc?.name?.nonce && doc?.name?.keySalt) {
			nameMap.set(doc._id.toString(), doc.name);
		}
	}

	return {
		pastes: userPastes.map((up) => ({
			paste: up.paste,
			accessKey: up.accessKey,
			name: nameMap.get(up.paste.id) ?? null,
			created: up.created
		})),
		hasMore
	};
}
