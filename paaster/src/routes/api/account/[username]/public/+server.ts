import { cacheGet, cacheSet } from '$lib/server/cache';
import { json } from '@sveltejs/kit';
import sodium from 'libsodium-wrappers-sumo';

export async function GET({ locals, params }) {
	const cacheKey = `public:${params.username}`;
	const cached = cacheGet<object>(cacheKey);
	if (cached) return json(cached);

	const user = await locals.mongoDb.collection('users').findOne({
		username: params.username
	});

	await sodium.ready;

	let body: object;

	if (!user) {
		const fakeMasterPasswordSalt = sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES);
		const fakeServerSideSalt = sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES);

		body = {
			masterPasswordSalt: sodium.to_base64(fakeMasterPasswordSalt),
			serverSide: {
				salt: sodium.to_base64(fakeServerSideSalt)
			}
		};
	} else {
		body = {
			masterPasswordSalt: user.masterPasswordSalt,
			serverSide: {
				salt: user.serverSide.salt
			}
		};
	}

	cacheSet(cacheKey, body, 600_000);
	return json(body);
}
