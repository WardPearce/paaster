import { maxLength } from '$lib/server/misc.js';
import { error, json } from '@sveltejs/kit';

export async function POST({ locals, params, request }) {
  if (!locals.userId) {
    throw error(401);
  }

  const formData = await request.formData();

  const encryptedPasteKey = maxLength(formData.get('encryptedPasteKey'));
  const encryptedPasteNonce = maxLength(formData.get('encryptedPasteNonce'));

  const encryptedAccessKey = maxLength(formData.get('encryptedAccessKey'));
  const encryptedAccessNonce = maxLength(formData.get('encryptedAccessNonce'));

  if (!encryptedPasteKey || !encryptedPasteNonce || !encryptedAccessKey || !encryptedAccessNonce) {
    throw error(400);
  }

  await locals.mongoDb.collection('userPastes').insertOne({
    userId: locals.userId,
    paste: {
      id: params.pasteId,
      key: encryptedPasteKey,
      nonce: encryptedPasteNonce
    },
    accessKey: {
      key: encryptedAccessKey,
      nonce: encryptedAccessNonce
    },
    created: new Date()
  });

  return json({});
}