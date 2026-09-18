import { error, json } from '@sveltejs/kit';
import { getPasteShareData, setPasteShareData } from '$lib/server/pasteShare';
import { z } from 'zod';

const zCipher = z.object({
	cipher: z.string().min(1).max(5000)
});

export async function GET({ locals, params }) {
	const cipher = await getPasteShareData(locals.mongoDb, params.code);
	if (!cipher) throw error(404);

	return json({ cipher });
}

export async function POST({ request, locals, params }) {
	const body = zCipher.safeParse(await request.json());
	if (!body.success) throw error(400);

	const stored = await setPasteShareData(locals.mongoDb, params.code, body.data.cipher);
	if (!stored) throw error(409);

	return json({ success: true });
}
