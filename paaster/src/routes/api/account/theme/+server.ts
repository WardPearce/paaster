import { error, json } from '@sveltejs/kit';
import { ObjectId } from 'mongodb';

export async function GET({ locals }) {
  if (!locals.userId) {
    throw error(401);
  }

  const result = await locals.mongoDb.collection('userTheme').findOne({
    _id: new ObjectId(locals.userId)
  });

  if (!result) {
    throw error(404);
  }

  return json({
    theme: result.theme
  });
}