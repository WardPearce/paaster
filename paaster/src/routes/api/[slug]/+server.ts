import { maxLength } from '$lib/server/misc.js';
import { stringToObjectId } from '$lib/server/objectId.js';
import { error, json } from '@sveltejs/kit';
import argon2 from 'argon2';

export async function POST({ locals, request, params }) {
  const authorization = request.headers.get('Authorization');
  if (!authorization) {
    throw error(401, 'Authorization header required');
  }

  const pasteId = stringToObjectId(params.slug);

  const paste = await locals.mongoDb.collection('pastes').findOne({
    _id: pasteId
  });
  if (!paste) {
    throw error(404, 'Paste not found');
  }

  const withoutPrefixAuthorization = authorization.replace('Bearer ', '').replace('bearer ', '');

  if (!await argon2.verify(paste.accessKey, withoutPrefixAuthorization)) {
    throw error(401, 'Authorization invalid');
  }

  let toUpdate: Record<string, string | number | Record<string, string | number>> = {};

  const formData = await request.formData();

  const codeName = maxLength(formData.get('codeName')?.toString());
  const codeNameNonce = maxLength(formData.get('codeNameNonce')?.toString());
  const codeNameKeySalt = maxLength(formData.get('codeNameKeySalt')?.toString());

  if (codeName && codeNameNonce && codeNameKeySalt) {
    toUpdate.name = {
      value: codeName,
      nonce: codeNameNonce,
      keySalt: codeNameKeySalt
    };
  }

  const langName = maxLength(formData.get('langName')?.toString());
  const langNonce = maxLength(formData.get('langNonce')?.toString());
  const langKeySalt = maxLength(formData.get('langKeySalt')?.toString());

  if (langName && langNonce && langKeySalt) {
    toUpdate.language = {
      value: langName,
      nonce: langNonce,
      keySalt: langKeySalt
    };
  }

  const expireAfter = formData.get('expireAfter');

  if (expireAfter) {
    const expireAfterNumber = Number(expireAfter.toString());
    if (expireAfterNumber <= 2192 && expireAfterNumber >= -2) {
      toUpdate.expireAfter = expireAfterNumber;
    }
  }

  const accessCode = maxLength(formData.get('accessCode')?.toString());

  if (accessCode) {
    toUpdate.accessCode = await argon2.hash(accessCode);
  }

  await locals.mongoDb.collection('pastes').updateOne(
    { _id: pasteId },
    { $set: toUpdate }
  );

  return json({});
}