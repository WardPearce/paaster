import { error } from '@sveltejs/kit';
import argon2 from 'argon2';

export async function validateAuth(bearer: string | null, hash: string) {
	if (!bearer) {
		throw error(401, 'Authorization invalid');
	}
	const withoutPrefixAuthorization = bearer.replace('Bearer ', '').replace('bearer ', '');

	if (!(await argon2.verify(hash, withoutPrefixAuthorization))) {
		throw error(401, 'Authorization invalid');
	}
}
