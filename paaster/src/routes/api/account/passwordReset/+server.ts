import { stringToObjectId } from '$lib/server/objectId';
import { error, json } from '@sveltejs/kit';
import argon2 from 'argon2';
import { z } from 'zod';

const passwordResetSchema = z.object({
  serverSideSalt: z.string().trim().max(64),
  serverSidePassword: z.string().trim().max(64),
  masterPasswordSalt: z.string().trim().max(64),
  encryptionKey: z.string().trim().max(64),
  encryptionKeyNonce: z.string().trim().max(64),
  encryptionKeyKeySalt: z.string().trim().max(64),
});

export async function POST({ locals, request }) {
  if (!locals.userId) {
    throw error(401);
  }

  const formData = passwordResetSchema.safeParse(
    Object.fromEntries(await request.formData())
  );

  if (!formData.success) {
    throw error(400, formData.error);
  }

  await locals.mongoDb.collection('users').updateOne(
    {
      _id: stringToObjectId(locals.userId)
    },
    {
      $set: {
        serverSide: {
          salt: formData.data.serverSideSalt,
          password: await argon2.hash(formData.data.serverSidePassword)
        },
        encryptionKey: {
          value: formData.data.encryptionKey,
          nonce: formData.data.encryptionKeyNonce,
          keySalt: formData.data.encryptionKeyKeySalt
        },
        masterPasswordSalt: formData.data.masterPasswordSalt
      }
    });

  return json({});
}