import { env } from '$env/dynamic/private';
import { MAX_UPLOAD_SIZE } from '$lib/consts.js';
import { maxLength } from '$lib/server/misc.js';
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { error, json } from '@sveltejs/kit';
import argon2 from 'argon2';
import sodium from 'libsodium-wrappers-sumo';

export async function POST({ locals, request }) {
  await sodium.ready;

  const formData = await request.formData();

  const codeHeader = maxLength(formData.get('codeHeader')?.toString(), 128);
  const codeKeySalt = maxLength(formData.get('codeKeySalt')?.toString());

  if (!codeHeader) {
    throw error(400, 'codeKeySalt & codeHeader must be included');
  }

  const codeName = maxLength(formData.get('codeName')?.toString());
  const codeNameNonce = maxLength(formData.get('codeNameNonce')?.toString());
  const codeNameKeySalt = maxLength(formData.get('codeNameKeySalt')?.toString());

  const accessKey = sodium.to_base64(sodium.randombytes_buf(32));

  const createdPaste = await locals.mongoDb.collection('pastes').insertOne({
    header: codeHeader,
    keySalt: codeKeySalt,
    name: {
      value: codeName,
      nonce: codeNameNonce,
      keySalt: codeNameKeySalt
    },
    language: null,
    expireAfter: -2,
    accessCode: null,
    accessKey: await argon2.hash(accessKey),
    created: new Date(),
    deleteNextRequest: false
  });

  const signedUrl = await createPresignedPost(locals.s3Client, {
    Bucket: env.S3_BUCKET,
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