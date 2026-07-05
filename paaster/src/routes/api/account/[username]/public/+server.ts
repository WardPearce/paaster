import { json } from '@sveltejs/kit';
import sodium from 'libsodium-wrappers-sumo';

export async function GET({ locals, params }) {
	const user = await locals.mongoDb.collection('users').findOne({
		username: params.username
	});

	await sodium.ready;

	if (!user) {
		const fakeMasterPasswordSalt = sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES);
		const fakeServerSideSalt = sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES);

		return json({
			masterPasswordSalt: sodium.to_base64(fakeMasterPasswordSalt),
			serverSide: {
				salt: sodium.to_base64(fakeServerSideSalt)
			},
			twoFactor: Math.random() < 0.5
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
