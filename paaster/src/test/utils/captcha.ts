import { createChallenge, solveChallenge } from 'altcha-lib';
import type { Challenge } from 'altcha-lib';
import { deriveKey } from 'altcha-lib/algorithms/pbkdf2';
import sodium from 'libsodium-wrappers-sumo';

export interface CaptchaSecrets {
	key: string;
	signature: string;
}

let captchaSecrets: CaptchaSecrets | undefined;

export async function getCaptchaSecrets(): Promise<CaptchaSecrets> {
	if (!captchaSecrets) {
		await sodium.ready;
		captchaSecrets = {
			key: sodium.to_base64(sodium.randombytes_buf(32)),
			signature: sodium.to_base64(sodium.randombytes_buf(32))
		};
	}
	return captchaSecrets;
}

export interface SolvedCaptcha {
	solution: { counter: number; derivedKey: string };
	challenge: Challenge;
}

export async function createSolvedCaptcha(key: string, signature: string): Promise<SolvedCaptcha> {
	const challenge = await createChallenge({
		hmacSignatureSecret: signature,
		hmacKeySignatureSecret: key,
		algorithm: 'PBKDF2/SHA-256',
		cost: 1000,
		counter: 0,
		deriveKey,
		expiresAt: new Date(Date.now() + 600_000)
	});

	const solution = await solveChallenge({ challenge, deriveKey });
	if (!solution) {
		throw new Error('Failed to solve captcha challenge');
	}

	return { solution, challenge };
}