import { env } from '$env/dynamic/private';
import { maxLength } from '$lib/server/misc';
import { stringToObjectId } from '$lib/server/objectId';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { error, json } from '@sveltejs/kit';
import argon2 from 'argon2';

async function validateAuth(bearer: string | null, hash: string) {
  if (!bearer) {
    throw error(401, 'Authorization invalid');
  }
  const withoutPrefixAuthorization = bearer.replace('Bearer ', '').replace('bearer ', '');

  if (!await argon2.verify(hash, withoutPrefixAuthorization)) {
    throw error(401, 'Authorization invalid');
  }
}

export async function DELETE({ locals, request, params }) {
  const pasteId = stringToObjectId(params.pasteId);

  const paste = await locals.mongoDb.collection('pastes').findOne({
    _id: pasteId
  });
  if (!paste) {
    throw error(404, 'Paste not found');
  }

  await validateAuth(request.headers.get('Authorization'), paste.accessKey);

  await locals.mongoDb.collection('pastes').deleteOne({ _id: paste._id });
  if (locals.userId) {
    await locals.mongoDb.collection('userPastes').deleteOne({
      userId: locals.userId,
      'paste.id': params.pasteId
    });
  }
  await locals.s3Client.send(new DeleteObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: `${paste._id}.bin`
  }));

  return json({});
}

export async function POST({ locals, request, params }) {
  const pasteId = stringToObjectId(params.pasteId);

  const paste = await locals.mongoDb.collection('pastes').findOne({
    _id: pasteId
  });
  if (!paste) {
    throw error(404, 'Paste not found');
  }

  await validateAuth(request.headers.get('Authorization'), paste.accessKey);

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

  await locals.mongoDb.collection('pastes').updateOne(
    { _id: pasteId },
    { $set: toUpdate }
  );

  return json({});
}