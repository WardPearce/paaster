import { json } from '@sveltejs/kit';
import sodium from 'libsodium-wrappers-sumo';

let decoyKey: Uint8Array | undefined;

async function decoyDigest(username: string): Promise<Uint8Array> {
	if (!decoyKey) decoyKey = sodium.randombytes_buf(sodium.crypto_generichash_KEYBYTES);
	return sodium.crypto_generichash(
		sodium.crypto_pwhash_SALTBYTES * 2,
		`decoy:${username}`,
		decoyKey
	);
}

export async function GET({ locals, params }) {
	const user = await locals.mongoDb.collection('users').findOne({
		username: params.username
	});

	await sodium.ready;

	if (!user) {
		const digest = await decoyDigest(params.username);

		return json({
			masterPasswordSalt: sodium.to_base64(digest.slice(0, sodium.crypto_pwhash_SALTBYTES)),
			serverSide: {
				salt: sodium.to_base64(digest.slice(sodium.crypto_pwhash_SALTBYTES))
			},
			twoFactor: (digest[digest.length - 1] & 1) === 1
		});
	}

	return json({
		masterPasswordSalt: user.masterPasswordSalt,
		serverSide: {
			salt: user.serverSide.salt
		},
		twoFactor: typeof user.twoFactorSecret === 'string' && user.twoFactorVerified === true
	});
}
