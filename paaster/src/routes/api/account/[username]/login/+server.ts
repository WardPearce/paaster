import { env } from '$env/dynamic/private';
import { error, json } from '@sveltejs/kit';
import argon2 from 'argon2';
import { sign } from 'cookie-signature';

export async function POST({ params, locals, request, cookies }) {
  const user = await locals.mongoDb.collection('users').findOne({
    username: params.username
  });
  if (!user) {
    throw error(404, 'User not found');
  }

  const formData = await request.formData();

  const givenServerSidePassword = formData.get('serverSidePassword')?.toString();
  if (!givenServerSidePassword) {
    throw error(400, 'Password not provided');
  }

  if (!await argon2.verify(user.serverSide.password, givenServerSidePassword)) {
    throw error(401, 'Invalid password');
  }

  // Set signed cookie of userId
  cookies.set('userId', sign(user._id.toString(), env.COOKIE_SECRET ?? ''), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 31
  });

  return json({
    userId: user._id.toString()
  });
}