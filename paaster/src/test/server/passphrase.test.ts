import { describe, beforeEach, expect, it } from 'vitest';
import argon2 from 'argon2';
import type { RequestEvent } from '@sveltejs/kit';
import { load } from '../../routes/[pasteId]/+page.server';
import { actions } from '../../routes/[pasteId]/passphrase/+page.server';
import { insertPaste } from '../utils/factories';
import { setupTestDb } from '../utils/db';
import {
	makeEvent,
	makeCookies,
	makeMemoryStorage,
	formRequest,
	expectHttpError,
	type MakeEventInit
} from '../utils/event';
import { getCaptchaSecrets, createSolvedCaptcha } from '../utils/captcha';
import { passphraseLimiter } from '$lib/server/rateLimit';

const getDb = setupTestDb();

type LoadEvent = Parameters<typeof load>[0];
type ActionEvent = Parameters<typeof actions.default>[0];
type ActionResultData = {
	type?: string;
	status?: number;
	success?: boolean;
	data?: Record<string, unknown>;
};

function eventWithIp(init: MakeEventInit<Record<string, string>>): RequestEvent {
	const event = makeEvent(getDb(), makeMemoryStorage(), init);
	return { ...event, getClientAddress: () => '127.0.0.1' } as unknown as RequestEvent;
}

async function submit(init: MakeEventInit<Record<string, string>>): Promise<ActionResultData> {
	const result = await actions.default(eventWithIp(init) as unknown as ActionEvent);
	return result as unknown as ActionResultData;
}

async function passphrasePaste(passphrase: string): Promise<string> {
	const paste = await insertPaste(getDb(), { passphrase: await argon2.hash(passphrase) });
	return paste._id as unknown as string;
}

describe('passphrase submission action', () => {
	beforeEach(async () => {
		await passphraseLimiter.clear();
	});

	it('rejects an empty passphrase with 400', async () => {
		const pasteId = await passphrasePaste('correct-horse');
		const result = await submit({ params: { pasteId }, request: formRequest({ passphrase: '' }) });
		expect(result.status).toBe(400);
	});

	it('rejects a submission without a captcha payload with 400', async () => {
		const pasteId = await passphrasePaste('correct-horse');
		const result = await submit({
			params: { pasteId },
			request: formRequest({ passphrase: 'guess' })
		});
		expect(result.status).toBe(400);
	});

	it('sets the passphrase cookie on a valid submission', async () => {
		const pasteId = await passphrasePaste('correct-horse');
		const secrets = await getCaptchaSecrets();
		const solved = await createSolvedCaptcha(secrets.key, secrets.signature);
		const cookies = makeCookies();
		const result = await submit({
			params: { pasteId },
			cookies,
			locals: { captchaKey: secrets.key, captchaSignature: secrets.signature },
			request: formRequest({
				passphrase: 'correct-horse',
				captchaPayload: JSON.stringify(solved)
			})
		});

		expect(result).toHaveProperty('success', true);
		expect(cookies.get('passphrase_' + pasteId)).toBe('correct-horse');
	});

	it('rejects a replayed captcha payload with 400', async () => {
		const pasteId = await passphrasePaste('correct-horse');
		const secrets = await getCaptchaSecrets();
		const solved = await createSolvedCaptcha(secrets.key, secrets.signature);
		const cookies = makeCookies();

		const first = await submit({
			params: { pasteId },
			cookies,
			locals: { captchaKey: secrets.key, captchaSignature: secrets.signature },
			request: formRequest({
				passphrase: 'correct-horse',
				captchaPayload: JSON.stringify(solved)
			})
		});
		expect(first).toHaveProperty('success', true);

		await expectHttpError(
			submit({
				params: { pasteId },
				cookies,
				locals: { captchaKey: secrets.key, captchaSignature: secrets.signature },
				request: formRequest({
					passphrase: 'correct-horse',
					captchaPayload: JSON.stringify(solved)
				})
			}) as unknown as Promise<unknown>,
			400
		);
	});

	it('rejects submissions above the IP rate limit with 429', async () => {
		const pasteId = await passphrasePaste('correct-horse');

		for (let i = 0; i < 10; i++) {
			const result = await submit({
				params: { pasteId },
				request: formRequest({ passphrase: 'guess' })
			});
			expect(result.status).toBe(400);
		}

		const limited = await submit({
			params: { pasteId },
			request: formRequest({ passphrase: 'guess' })
		});
		expect(limited.status).toBe(429);
	});
});

describe('passphrase verification load', () => {
	beforeEach(async () => {
		await passphraseLimiter.clear();
	});

	it('returns paste data for a valid passphrase cookie', async () => {
		const pasteId = await passphrasePaste('correct-horse');
		const cookies = makeCookies();
		cookies.set('passphrase_' + pasteId, 'correct-horse');

		const data = await load(eventWithIp({ params: { pasteId }, cookies }) as unknown as LoadEvent);
		expect(data).not.toHaveProperty('passphraseRequired');
		expect(data).toHaveProperty('header', 'aGVhZGVy');
	});

	it('rejects an invalid passphrase cookie with 401 and clears the cookie', async () => {
		const pasteId = await passphrasePaste('correct-horse');
		const cookies = makeCookies();
		cookies.set('passphrase_' + pasteId, 'wrong-password');

		await expectHttpError(
			load(
				eventWithIp({ params: { pasteId }, cookies }) as unknown as LoadEvent
			) as unknown as Promise<unknown>,
			401
		);
		expect(cookies.get('passphrase_' + pasteId)).toBeUndefined();
	});

	it('rejects verifications above the IP rate limit with 429', async () => {
		const pasteId = await passphrasePaste('correct-horse');

		for (let i = 0; i < 10; i++) {
			const cookies = makeCookies();
			cookies.set('passphrase_' + pasteId, 'wrong-password');
			await expectHttpError(
				load(
					eventWithIp({ params: { pasteId }, cookies }) as unknown as LoadEvent
				) as unknown as Promise<unknown>,
				401
			);
		}

		const cookies = makeCookies();
		cookies.set('passphrase_' + pasteId, 'wrong-password');
		await expectHttpError(
			load(
				eventWithIp({ params: { pasteId }, cookies }) as unknown as LoadEvent
			) as unknown as Promise<unknown>,
			429
		);
	});
});
