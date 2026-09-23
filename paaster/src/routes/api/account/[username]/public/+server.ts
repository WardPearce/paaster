import { json } from '@sveltejs/kit';
import sodium from 'libsodium-wrappers-sumo';
import type { Db } from 'mongodb';

async function getDecoyKey(mongoDb: Db): Promise<Uint8Array> {
	await sodium.ready;
	const doc = await mongoDb.collection<{ _id: string; key: string }>('settings').findOneAndUpdate(
		{ _id: 'decoyKey' },
		{
			$setOnInsert: {
				key: sodium.to_base64(sodium.randombytes_buf(sodium.crypto_generichash_KEYBYTES))
			}
		},
		{ upsert: true, returnDocument: 'after' }
	);
	return sodium.from_base64(doc!.key);
}

async function decoyDigest(mongoDb: Db, username: string): Promise<Uint8Array> {
	const key = await getDecoyKey(mongoDb);
	return sodium.crypto_generichash(sodium.crypto_pwhash_SALTBYTES * 2, `decoy:${username}`, key);
}

export async function GET({ locals, params }) {
	const user = await locals.mongoDb.collection('users').findOne({
		username: params.username
	});

	await sodium.ready;

	if (!user) {
		const digest = await decoyDigest(locals.mongoDb, params.username);

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
