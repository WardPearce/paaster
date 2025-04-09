import { error, json } from '@sveltejs/kit';
import argon2 from 'argon2';
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

export async function POST({ locals, request }) {
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

  return json({
    userId: createdUser.insertedId.toString()
  });
}
