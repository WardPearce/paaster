import { env } from '$env/dynamic/private';
import { stringToObjectId } from '$lib/server/objectId';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { error, json } from '@sveltejs/kit';
import argon2 from 'argon2';
import { z } from 'zod';

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

const updatePasteSchema = z.object({
  codeName: z.string().trim().max(64).optional(),
  codeNameNonce: z.string().trim().max(64).optional(),
  codeNameKeySalt: z.string().trim().max(64).optional(),
  langName: z.string().trim().max(64).optional(),
  langNonce: z.string().trim().max(64).optional(),
  langKeySalt: z.string().trim().max(64).optional(),
  expireAfter: z.string().refine((val) => !isNaN(Number(val)), { message: "Must be a valid number" }).transform((val) => Number(val)).optional(),
  wrapWords: z.string().toLowerCase().refine((val) => val == 'true' || val === 'false', { message: "Must be a boolean" }).transform((val) => val === 'true').optional()
});

export async function POST({ locals, request, params }) {
  const pasteId = stringToObjectId(params.pasteId);

  const paste = await locals.mongoDb.collection('pastes').findOne({
    _id: pasteId
  });
  if (!paste) {
    throw error(404, 'Paste not found');
  }

  await validateAuth(request.headers.get('Authorization'), paste.accessKey);

  let toUpdate: Record<string, string | number | boolean | Record<string, string | number>> = {};

  const formData = updatePasteSchema.safeParse(
    Object.fromEntries(await request.formData())
  );

  if (!formData.success) {
    throw error(400, formData.error);
  }

  if (formData.data.codeName && formData.data.codeNameNonce && formData.data.codeNameKeySalt) {
    toUpdate.name = {
      value: formData.data.codeName,
      nonce: formData.data.codeNameNonce,
      keySalt: formData.data.codeNameKeySalt
    };
  }

  if (formData.data.langName && formData.data.langNonce && formData.data.langKeySalt) {
    toUpdate.language = {
      value: formData.data.langName,
      nonce: formData.data.langNonce,
      keySalt: formData.data.langKeySalt
    };
  }

  if (typeof formData.data.expireAfter !== 'undefined') {
    if (formData.data.expireAfter <= 2192 && formData.data.expireAfter >= -2) {
      toUpdate.expireAfter = formData.data.expireAfter;
    }
  }

  if (formData.data.wrapWords) {
    toUpdate.wrapWords = formData.data.wrapWords;
  }

  await locals.mongoDb.collection('pastes').updateOne(
    { _id: pasteId },
    { $set: toUpdate }
  );

  return json({});
}