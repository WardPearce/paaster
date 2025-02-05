import { env } from '$env/dynamic/private';
import { stringToObjectId } from '$lib/server/objectId';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { error } from '@sveltejs/kit';

export async function load({ params, locals }) {
  const paste = await locals.mongoDb.collection('pastes').findOne({
    _id: stringToObjectId(params.slug),
  });

  if (!paste) {
    throw error(404, 'Unable to find paste');
  }

  const command = new GetObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: `${paste._id}.bin`,
  });

  const signedUrl = await getSignedUrl(locals.s3Client, command, {
    expiresIn: 82800,
  });

  return {
    pasteId: paste._id.toString(),
    header: paste.header,
    keySalt: paste.keySalt,
    name: paste.name,
    signedUrl: signedUrl
  };
}