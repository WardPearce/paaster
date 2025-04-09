import { env } from '$env/dynamic/private';
import { error, json } from '@sveltejs/kit';
import argon2 from 'argon2';
import { sign } from 'cookie-signature';
import sodium from 'libsodium-wrappers-sumo';
import { z } from 'zod';

const loginSchema = z.object({
  serverSidePassword: z.string().trim().max(64).min(24)
});

export async function POST({ params, locals, request, cookies }) {
  const user = await locals.mongoDb.collection('users').findOne({
    username: params.username
  });
  if (!user) {
    throw error(404, 'User not found');
  }

  const formData = loginSchema.safeParse(
    Object.fromEntries(await request.formData())
  );

  if (!formData.success) {
    throw error(400, formData.error);
  }

  if (!await argon2.verify(user.serverSide.password, formData.data.serverSidePassword)) {
    throw error(401, 'Invalid password');
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
    maxAge: 60 * 60 * 24 * 31
  });

  return json({
    userId: user._id.toString(),
    encryptionKey: { ...user.encryptionKey }
  });
}