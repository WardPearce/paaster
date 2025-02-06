import { maxLength } from '$lib/server/misc.js';
import { error, json } from '@sveltejs/kit';
import argon2 from 'argon2';

export async function POST({ locals, request }) {
  const formData = await request.formData();

  const serverSideSalt = maxLength(formData.get('serverSideSalt')?.toString());
  const serverSidePassword = maxLength(formData.get('serverSidePassword')?.toString());
  const masterPasswordSalt = maxLength(formData.get('masterPasswordSalt')?.toString());
  const username = maxLength(formData.get('username')?.toString());

  if (username.length < 5) {
    throw error(400, 'Username must be more then 5 characters');
  }

  if (await locals.mongoDb.collection('users').countDocuments({ username: username }) > 0) {
    throw error(400, 'Username taken');
  }

  const createdUser = await locals.mongoDb.collection('users').insertOne({
    serverSide: {
      salt: serverSideSalt,
      password: await argon2.hash(serverSidePassword)
    },
    masterPasswordSalt: masterPasswordSalt,
    username: username
  });

  return json({
    userId: createdUser.insertedId.toString()
  });
}
