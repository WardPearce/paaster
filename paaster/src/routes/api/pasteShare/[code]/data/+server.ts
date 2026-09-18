import { error, json } from '@sveltejs/kit';
import { getPasteShareSession, setPasteShareData } from '$lib/server/pasteShare';
import { z } from 'zod';

const zCipher = z.object({
	cipher: z.string().min(1).max(5000)
});

export async function GET({ locals, params }) {
	const session = await getPasteShareSession(locals.mongoDb, params.code);
	if (!session) throw error(404);

	return json({ cipher: session.cipher });
}

export async function POST({ request, locals, params }) {
	const body = zCipher.safeParse(await request.json());
	if (!body.success) throw error(400);

	const stored = await setPasteShareData(locals.mongoDb, params.code, body.data.cipher);
	if (!stored) throw error(409);

	return json({ success: true });
}
