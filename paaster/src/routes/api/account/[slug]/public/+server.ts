import { error, json } from '@sveltejs/kit';

export async function GET({ locals, params }) {
  const user = await locals.mongoDb.collection('users').findOne({
    username: params.slug
  });

  if (!user) {
    throw error(404, 'User not found');
  }

  return json({
    masterPasswordSalt: user.masterPasswordSalt,
    serverSide: {
      salt: user.serverSide.salt
    }
  });
}