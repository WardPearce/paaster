import { env } from '$env/dynamic/private';
import { MAX_UPLOAD_SIZE } from '$lib/consts.js';
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { error, json } from '@sveltejs/kit';
import argon2 from 'argon2';
import sodium from 'libsodium-wrappers-sumo';
import { z } from 'zod';

const createPasteSchema = z.object({
  codeHeader: z.string().trim().max(128),
  codeKeySalt: z.string().trim().max(64),
  codeName: z.string().trim().max(32).optional(),
  codeNameNonce: z.string().trim().max(32).optional(),
  codeNameKeySalt: z.string().trim().max(32).optional()
});

export async function POST({ locals, request }) {
  await sodium.ready;

  const formData = createPasteSchema.safeParse(
    Object.fromEntries(await request.formData())
  );

  if (!formData.success) {
    throw error(400, formData.error);
  }

  const accessKey = sodium.to_base64(sodium.randombytes_buf(32));

  const createdPaste = await locals.mongoDb.collection('pastes').insertOne({
    header: formData.data.codeHeader,
    keySalt: formData.data.codeKeySalt,
    name: {
      value: formData.data.codeName,
      nonce: formData.data.codeNameNonce,
      keySalt: formData.data.codeNameKeySalt
    },
    language: null,
    expireAfter: -2,
    accessKey: await argon2.hash(accessKey),
    created: new Date(),
    deleteNextRequest: false,
    wrapWords: false
  });

  const signedUrl = await createPresignedPost(locals.s3Client, {
    Bucket: env.S3_BUCKET ?? '',
    Key: `${createdPaste.insertedId}.bin`,
    Conditions: [
      ['content-length-range', 0, MAX_UPLOAD_SIZE],
    ],
    Expires: 82800,
  });

  return json({
    pasteId: createdPaste.insertedId.toString(),
    accessKey: accessKey,
    signedUrl: signedUrl
  });
}