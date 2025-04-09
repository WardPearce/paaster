import { env } from '$env/dynamic/private';
import { error, json } from '@sveltejs/kit';
import argon2 from 'argon2';
import { sign } from 'cookie-signature';
import sodium from 'libsodium-wrappers-sumo';
import { z } from 'zod';


const createSchema = z.object({
  serverSideSalt: z.string().trim().max(64),
  serverSidePassword: z.string().trim().max(64),
  masterPasswordSalt: z.string().trim().max(64),
  username: z.string().trim().max(16).min(4),
  encryptionKey: z.string().trim().max(64),
  encryptionKeyNonce: z.string().trim().max(64),
  encryptionKeyKeySalt: z.string().trim().max(64),
});

export async function POST({ locals, request, cookies }) {
  const formData = createSchema.safeParse(
    Object.fromEntries(await request.formData())
  );

  if (!formData.success) {
    throw error(400, formData.error);
  }

  if (await locals.mongoDb.collection('users').countDocuments({ username: formData.data.username }) > 0) {
    throw error(400, 'Username taken');
  }

  const createdUser = await locals.mongoDb.collection('users').insertOne({
    serverSide: {
      salt: formData.data.serverSideSalt,
      password: await argon2.hash(formData.data.serverSidePassword)
    },
    encryptionKey: {
      value: formData.data.encryptionKey,
      nonce: formData.data.encryptionKeyNonce,
      keySalt: formData.data.encryptionKeyKeySalt
    },
    masterPasswordSalt: formData.data.masterPasswordSalt,
    username: formData.data.username
  });

  const userId = createdUser.insertedId.toString();

  if (!env.COOKIE_SECRET) {
    await sodium.ready;
    env.COOKIE_SECRET = sodium.to_base64(sodium.randombytes_buf(32));
  }

  // Set signed cookie of userId
  cookies.set('userId', sign(userId, env.COOKIE_SECRET ?? ''), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 31
  });

  return json({
    userId: userId
  });
}
