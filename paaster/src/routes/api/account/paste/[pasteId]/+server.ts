import { error, json } from '@sveltejs/kit';
import { z } from 'zod';

const bookmarkPasteSchema = z.object({
  encryptedPasteKey: z.string().trim().max(64),
  encryptedPasteNonce: z.string().trim().max(64),
  encryptedAccessKey: z.string().trim().max(64),
  encryptedAccessNonce: z.string().trim().max(64)
});

export async function POST({ locals, params, request }) {
  if (!locals.userId) {
    throw error(401);
  }

  const formData = bookmarkPasteSchema.safeParse(
    Object.fromEntries(await request.formData())
  );

  if (!formData.success) {
    throw error(400, formData.error);
  }

  await locals.mongoDb.collection('userPastes').insertOne({
    userId: locals.userId,
    paste: {
      id: params.pasteId,
      key: formData.data.encryptedPasteKey,
      nonce: formData.data.encryptedPasteNonce
    },
    accessKey: {
      key: formData.data.encryptedAccessKey,
      nonce: formData.data.encryptedAccessNonce
    },
    created: new Date()
  });

  return json({});
}