import { env } from '$env/dynamic/private';
import { captchaPayload, verifyCaptcha } from '$lib/server/captcha';
import { error, json } from '@sveltejs/kit';
import argon2 from 'argon2';
import { sign } from 'cookie-signature';
import sodium from 'libsodium-wrappers-sumo';
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
		throw error(404, 'User not found');
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
		throw error(401, 'Invalid password');
	}

	if (user.twoFactorSecret && user.twoFactorVerified) {
		if (
			!(await verify({ secret: user.twoFactorSecret, token: formData.data.twoFactorToken ?? '' }))
				.valid
		) {
			throw error(401, 'Invalid password');
		}
	}

	if (!env.COOKIE_SECRET) {
		await sodium.ready;
		env.COOKIE_SECRET = sodium.to_base64(sodium.randombytes_buf(32));
	}

	// Set signed cookie of userId
	cookies.set('userId', sign(user._id.toString(), env.COOKIE_SECRET ?? ''), {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		path: '/',
		maxAge: 60 * 60 * 24 * 31,
		sameSite: 'strict'
	});

	return json({
		userId: user._id.toString(),
		encryptionKey: { ...user.encryptionKey }
	});
}
