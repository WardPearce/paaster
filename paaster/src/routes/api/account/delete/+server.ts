import { stringToObjectId } from '$lib/server/objectId.js';
import { error, json } from '@sveltejs/kit';

export async function DELETE({ locals, cookies }) {
  if (!locals.userId) {
    throw error(401);
  }

  await locals.mongoDb.collection('users').deleteOne({ _id: stringToObjectId(locals.userId) });
  await locals.mongoDb.collection('userPastes').deleteMany({ userId: locals.userId });

  cookies.delete('userId', { path: '/' });

  return json({});
}