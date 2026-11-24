import { describe, expect, it } from 'vitest';
import { captchaPayload, verifyCaptcha } from '#lib/server/captcha';
import { setupTestDb } from '../utils/db';
import { createSolvedCaptcha, getCaptchaSecrets } from '../utils/captcha';

const getDb = setupTestDb();

describe('CAPTCHA replay protection', () => {
	it('accepts only one concurrent claim of a solved challenge', async () => {
		const { key, signature } = await getCaptchaSecrets();
		const { solution, challenge } = captchaPayload.parse(await createSolvedCaptcha(key, signature));
		const attempts = await Promise.allSettled(
			Array.from({ length: 4 }, () =>
				verifyCaptcha({ solution, challenge, key, signature, mongoDb: getDb() })
			)
		);
		expect(attempts.filter((attempt) => attempt.status === 'fulfilled')).toHaveLength(1);
		expect(attempts.filter((attempt) => attempt.status === 'rejected')).toHaveLength(3);
	});
});
