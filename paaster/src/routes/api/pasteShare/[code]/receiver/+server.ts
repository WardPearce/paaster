import { error, json } from '@sveltejs/kit';
import { registerPasteShareReceiver } from '$lib/server/pasteShare';
import { captchaPayload, verifyCaptcha } from '$lib/server/captcha';
import { z } from 'zod';

const zReceiver = z.object({
	publicKey: z.string().min(40).max(64),
	captchaPayload: captchaPayload.nullable()
});

export async function POST({ request, locals, params }) {
	const body = zReceiver.safeParse(await request.json());
	if (!body.success) throw error(400);

	if (!body.data.captchaPayload) throw error(400);

	await verifyCaptcha({
		solution: body.data.captchaPayload.solution,
		challenge: body.data.captchaPayload.challenge,
		key: locals.captchaKey,
		signature: locals.captchaSignature,
		mongoDb: locals.mongoDb
	});

	const result = await registerPasteShareReceiver(locals.mongoDb, params.code, body.data.publicKey);
	if (result === 'conflict') throw error(409);
	if (result !== 'ok') throw error(404);

	return json({ success: true });
}
