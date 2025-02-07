import { json } from '@sveltejs/kit';

export async function DELETE({ cookies }) {
  cookies.delete('userId', { path: '/' });

  return json({});
}