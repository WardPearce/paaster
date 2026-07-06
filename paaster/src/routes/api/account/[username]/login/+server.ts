import { captchaPayload, verifyCaptcha } from '$lib/server/captcha';
import { createSession, setSessionCookie } from '$lib/server/session';
import { error, json } from '@sveltejs/kit';
import argon2 from 'argon2';
import { z } from 'zod';
import { verify } from 'otplib';

const loginSchema = z.object({
	serverSidePassword: z.string().trim().max(64).min(24),
	captchaPayload,
	twoFactorToken: z.string().max(6).min(6).optional()
});

export async function POST({ params, locals, request, cookies }) {
	const user = await locals.mongoDb.collection('users').findOne({
		username: params.username
	});
	if (!user) {
		throw error(404, 'Invalid login');
	}

	const formData = loginSchema.safeParse(Object.fromEntries(await request.formData()));

	if (!formData.success) {
		throw error(400, formData.error);
	}

	await verifyCaptcha({
		solution: formData.data.captchaPayload.solution,
		challenge: formData.data.captchaPayload.challenge,
		key: locals.captchaKey,
		signature: locals.captchaSignature,
		mongoDb: locals.mongoDb
	});

	if (!(await argon2.verify(user.serverSide.password, formData.data.serverSidePassword))) {
		throw error(401, 'Invalid login');
	}

	if (user.twoFactorSecret && user.twoFactorVerified) {
		if (
			!(await verify({ secret: user.twoFactorSecret, token: formData.data.twoFactorToken ?? '' }))
				.valid
		) {
			throw error(401, 'Invalid login');
		}
	}
	const sessionId = await createSession(locals.mongoDb, user._id);
	setSessionCookie(cookies, sessionId);

	return json({
		userId: user._id.toString(),
		encryptionKey: { ...user.encryptionKey }
	});
}
