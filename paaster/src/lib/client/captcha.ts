import { solveChallenge } from 'altcha-lib';
import { deriveKey } from 'altcha-lib/algorithms/web/pbkdf2';

export type CaptchaPayload = {
	solution: { counter: number; derivedKey: string; time?: number };
	challenge: Record<string, unknown>;
};

export async function solveCaptchaChallenge(): Promise<CaptchaPayload | null> {
	try {
		const resp = await fetch('/api/captcha');
		const challenge = await resp.json();

		const solution = await solveChallenge({ challenge, deriveKey });
		if (!solution) return null;

		return { solution, challenge };
	} catch {
		return null;
	}
}
