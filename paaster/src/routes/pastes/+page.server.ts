import { stringToObjectId } from '$lib/server/objectId.js';

export async function load({ locals }): Promise<{
	pastes: {
		paste: { id: string; key: string; nonce: string };
		accessKey: { key: string; nonce: string };
		name: { value: string; nonce: string; keySalt: string } | null;
		created: Date;
	}[];
}> {
	if (!locals.userId) {
		return { pastes: [] };
	}

	const userPastes = await locals.mongoDb
		.collection('userPastes')
		.find({ userId: locals.userId })
		.sort({ created: -1 })
		.toArray();

	if (userPastes.length === 0) {
		return { pastes: [] };
	}

	const pasteIds = userPastes.map((up) => stringToObjectId(up.paste.id));
	const pasteDocs = await locals.mongoDb
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
		}))
	};
}
