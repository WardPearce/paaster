import { THEMES } from '$lib/consts';
import { error, json } from '@sveltejs/kit';
import { ObjectId } from 'mongodb';

export async function POST({ locals, params }) {
  if (!locals.userId) {
    throw error(401);
  }

  const themeName = params.themeName;
  if (!THEMES.includes(themeName)) {
    throw error(400);
  }

  await locals.mongoDb.collection('userTheme').updateOne({
    _id: new ObjectId(locals.userId)
  }, { $set: { theme: themeName } }, { upsert: true });

  return json({});
}
