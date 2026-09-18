import { json } from '@sveltejs/kit';
import { createPasteShareSession } from '$lib/server/pasteShare';

export async function POST({ locals }) {
	return json(await createPasteShareSession(locals.mongoDb));
}
