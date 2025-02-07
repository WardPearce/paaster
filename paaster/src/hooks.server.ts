import type { Handle } from '@sveltejs/kit';
import { locale } from 'svelte-i18n';

import { env } from '$env/dynamic/private';
import { S3Client } from '@aws-sdk/client-s3';
import { unsign } from 'cookie-signature';
import { Db, MongoClient } from 'mongodb';


const mongoClient = new MongoClient(env.MONGO_URL ?? 'mongodb://localhost:27017');
let mongoDb: Db | undefined;


const s3Client = new S3Client({
  region: env.S3_REGION as string,
  endpoint: env.S3_ENDPOINT as string,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY_ID as string,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY as string,
  },
});


export const handle: Handle = async ({ event, resolve }) => {
  const lang = event.request.headers.get('accept-language')?.split(',')[0];
  if (lang) {
    locale.set(lang);
  }

  event.locals.s3Client = s3Client;

  if (!mongoDb) {
    await mongoClient.connect();
    mongoDb = mongoClient.db(env.MONGO_DB ?? 'paasterv3');
  }

  event.locals.mongoDb = mongoDb;

  const signedUserId = event.cookies.get('userId');
  if (signedUserId) {
    const unsignedUserId = unsign(signedUserId, env.COOKIE_SECRET ?? '');
    if (unsignedUserId) {
      event.locals.userId = unsignedUserId;
    }
  }

  return resolve(event);
};