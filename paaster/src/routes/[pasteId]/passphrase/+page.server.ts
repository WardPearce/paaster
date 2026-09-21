import { error, fail } from '@sveltejs/kit';
import type { PasteDoc } from '$lib/server/pastes';
import { captchaPayload, verifyCaptcha } from '$lib/server/captcha';
import { passphraseLimiter } from '$lib/server/rateLimit';

export async function load({ params, locals }) {
	const paste = await locals.mongoDb
		.collection<PasteDoc>('pastes')
		.findOne({ _id: params.pasteId });
	if (!paste) throw error(404, 'Paste not found');
	return { pasteId: params.pasteId };
}

export const actions = {
	default: async (event) => {
		const { request, params, cookies, url, locals } = event;

		if (await passphraseLimiter.isLimited(event)) {
			return fail(429, { error: 'Too many attempts. Try again later.' });
		}

		const formData = await request.formData();
		const passphrase = formData.get('passphrase') as string;

		if (!passphrase) {
			return fail(400, { error: 'Passphrase is required', missing: true });
		}

		const captcha = captchaPayload.safeParse(formData.get('captchaPayload'));
		if (!captcha.success) {
			return fail(400, { error: 'Captcha is required' });
		}

		await verifyCaptcha({
			solution: captcha.data.solution,
			challenge: captcha.data.challenge,
			key: locals.captchaKey,
			signature: locals.captchaSignature,
			mongoDb: locals.mongoDb
		});

		cookies.set('passphrase_' + params.pasteId, passphrase, {
			httpOnly: true,
			sameSite: 'lax',
			path: '/',
			maxAge: 82800,
			secure: url.protocol === 'https:'
		});

		return { success: true };
	}
};
