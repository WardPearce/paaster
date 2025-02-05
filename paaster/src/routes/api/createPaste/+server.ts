import { env } from '$env/dynamic/private';
import { MAX_UPLOAD_SIZE } from '$lib/consts.js';
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { error, json } from '@sveltejs/kit';
import argon2 from 'argon2';
import sodium from 'libsodium-wrappers-sumo';

export async function POST({ locals, request }) {
  await sodium.ready;

  const formData = await request.formData();

  const codeHeader = formData.get('codeHeader')?.toString();

  if (!codeHeader) {
    throw error(400, 'code & codeHeader must be included');
  }

  const codeName = formData.get('codeName')?.toString();
  const codeNonce = formData.get('codeNonce')?.toString();
  const codeKeySalt = formData.get('codeKeySalt')?.toString();

  const accessKey = sodium.to_base64(sodium.randombytes_buf(32));

  const createdPaste = await locals.mongoDb.collection('pastes').insertOne({
    header: codeHeader,
    name: {
      value: codeName,
      nonce: codeNonce,
      keySalt: codeKeySalt
    },
    accessKey: await argon2.hash(accessKey)
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