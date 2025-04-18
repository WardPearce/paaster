import { env } from '$env/dynamic/private';
import { stringToObjectId } from '$lib/server/objectId';
import { DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { error } from '@sveltejs/kit';

export async function load({ params, locals }) {
  const pasteId = stringToObjectId(params.pasteId);

  const paste = await locals.mongoDb.collection('pastes').findOne({
    _id: pasteId,
  });

  if (!paste) {
    throw error(404, 'Unable to find paste');
  }

  const s3Location = {
    Bucket: env.S3_BUCKET,
    Key: `${paste._id}.bin`,
  };

  let deletePaste = false;

  if (paste.expireAfter !== -2) {
    if (paste.expireAfter === -1) {
      if (paste.deleteNextRequest) {
        deletePaste = true;
      } else {
        await locals.mongoDb.collection('pastes').updateOne(
          { _id: pasteId },
          { $set: { deleteNextRequest: true } }
        );
      }
    } else {
      const now = new Date();

      const expireTime = paste.created.getTime() + (paste.expireAfter * 60 * 60 * 1000);

      if (now > expireTime) {
        deletePaste = true;
      }
    }
  }

  if (deletePaste) {
    await locals.mongoDb.collection('pastes').deleteOne({ _id: pasteId });
    if (locals.userId) {
      await locals.mongoDb.collection('userPastes').deleteOne({
        userId: locals.userId,
        'paste.id': params.pasteId
      });
    }
    await locals.s3Client.send(new DeleteObjectCommand(s3Location));
    throw error(404, 'Unable to find paste');
  }

  const command = new GetObjectCommand(s3Location);

  const signedUrl = await getSignedUrl(locals.s3Client, command, {
    expiresIn: 82800,
  });

  let account;
  if (locals.userId) {
    const userPaste = await locals.mongoDb.collection('userPastes').findOne({
      userId: locals.userId,
      'paste.id': params.pasteId
    });

    if (userPaste) {
      account = {
        paste: userPaste.paste,
        accessKey: userPaste.accessKey,
        created: userPaste.created
      };
    }
  }

  return {
    pasteId: paste._id.toString(),
    header: paste.header,
    keySalt: paste.keySalt,
    name: paste.name,
    language: paste.language,
    expireAfter: paste.expireAfter,
    created: paste.created,
    wrapWords: paste.wrapWords,
    signedUrl: signedUrl,
    account: account
  };
}