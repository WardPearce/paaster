import { json } from '@sveltejs/kit';

export async function GET({ locals }) {
  return json({
    loggedIn: locals.userId !== undefined
  });
}
