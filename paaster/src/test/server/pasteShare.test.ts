import { describe, expect, it } from 'vitest';
import { POST as createSession } from '../../routes/api/pasteShare/+server';
import { DELETE as deleteSession, GET as getSession } from '../../routes/api/pasteShare/[code]/+server';
import { GET as getData, POST as setData } from '../../routes/api/pasteShare/[code]/data/+server';
import { POST as registerReceiver } from '../../routes/api/pasteShare/[code]/receiver/+server';
import { setupTestDb } from '../utils/db';
import { createSolvedCaptcha, getCaptchaSecrets } from '../utils/captcha';
import { expectHttpError, jsonRequest, makeEvent, makeMemoryStorage } from '../utils/event';

const getDb = setupTestDb();

const RECEIVER_KEY = 'R'.repeat(44);

async function events() {
	const secrets = await getCaptchaSecrets();
	const event = <Params extends Record<string, string>>(params: Params, request?: Request) =>
		makeEvent(getDb(), makeMemoryStorage(), {
			params,
			request,
			locals: { captchaKey: secrets.key, captchaSignature: secrets.signature }
		});
	const captcha = (key: string, signature: string) => createSolvedCaptcha(key, signature);
	return { secrets, event, captcha };
}

describe('POST /api/pasteShare', () => {
	it('creates a share session with a code and expiry', async () => {
		const { event } = await events();

		const res = await createSession(event({}));
		const body = await res.json();

		expect(body.code).toMatch(/^[0-9A-HJKMNP-TV-Z]{8}$/);
		expect(typeof body.expires).toBe('string');
		expect(new Date(body.expires).getTime()).toBeGreaterThan(Date.now());

		const stored = (await getDb().collection('pasteShare').findOne({}))!;
		expect(stored).not.toBeNull();
		expect(stored.receiverPublicKey).toBeNull();
		expect(stored.cipher).toBeNull();
	});
});

describe('GET /api/pasteShare/[code]', () => {
	it('returns 404 for an unknown code', async () => {
		const { event } = await events();
		await expectHttpError(getSession(event({ code: 'ABCDEFGH' })), 404);
	});

	it('reports pending, awaiting and completed statuses', async () => {
		const { event, secrets, captcha } = await events();

		const created = await createSession(event({}));
		const { code } = await created.json();

		const pending = await getSession(event({ code }));
		await expect(pending.json()).resolves.toEqual({ status: 'pending', receiverPublicKey: null });

		const payload = await captcha(secrets.key, secrets.signature);
		await registerReceiver(
			event({ code }, jsonRequest({ publicKey: RECEIVER_KEY, captchaPayload: payload }))
		);

		const awaiting = await getSession(event({ code }));
		await expect(awaiting.json()).resolves.toEqual({
			status: 'awaiting',
			receiverPublicKey: RECEIVER_KEY
		});

		await setData(event({ code }, jsonRequest({ cipher: 'cGxlYXNl' })));

		const completed = await getSession(event({ code }));
		const completedBody = await completed.json();
		expect(completedBody).toEqual({ status: 'completed', receiverPublicKey: RECEIVER_KEY });
	});
});

describe('POST /api/pasteShare/[code]/receiver', () => {
	it('returns 400 for an invalid body', async () => {
		const { event } = await events();
		await expectHttpError(registerReceiver(event({ code: 'ABCDEFGH' }, jsonRequest({}))), 400);
	});

	it('returns 400 when the captcha payload is missing', async () => {
		const { event } = await events();
		const request = jsonRequest({ publicKey: RECEIVER_KEY, captchaPayload: null });
		await expectHttpError(registerReceiver(event({ code: 'ABCDEFGH' }, request)), 400);
	});

	it('returns 404 for an unknown code', async () => {
		const { event, secrets, captcha } = await events();
		const payload = await captcha(secrets.key, secrets.signature);
		const request = jsonRequest({ publicKey: RECEIVER_KEY, captchaPayload: payload });

		await expectHttpError(registerReceiver(event({ code: 'ABCDEFGH' }, request)), 404);
	});

	it('registers a receiver and rejects a second registration with 409', async () => {
		const { event, secrets, captcha } = await events();

		const created = await createSession(event({}));
		const { code } = await created.json();

		const first = await captcha(secrets.key, secrets.signature);
		const res = await registerReceiver(
			event({ code }, jsonRequest({ publicKey: RECEIVER_KEY, captchaPayload: first }))
		);
		await expect(res.json()).resolves.toEqual({ success: true });

		const second = await captcha(secrets.key, secrets.signature);
		await expectHttpError(
			registerReceiver(event({ code }, jsonRequest({ publicKey: RECEIVER_KEY, captchaPayload: second }))),
			409
		);
	});
});

describe('POST /api/pasteShare/[code]/data', () => {
	it('returns 400 for an invalid cipher', async () => {
		const { event } = await events();
		await expectHttpError(setData(event({ code: 'ABCDEFGH' }, jsonRequest({ cipher: '' }))), 400);
	});

	it('returns 409 when there is no receiver yet', async () => {
		const { event } = await events();

		const created = await createSession(event({}));
		const { code } = await created.json();

		await expectHttpError(setData(event({ code }, jsonRequest({ cipher: 'cGllY2U=' }))), 409);
	});

	it('stores data once a receiver exists and rejects duplicates with 409', async () => {
		const { event, secrets, captcha } = await events();

		const created = await createSession(event({}));
		const { code } = await created.json();

		const payload = await captcha(secrets.key, secrets.signature);
		await registerReceiver(event({ code }, jsonRequest({ publicKey: RECEIVER_KEY, captchaPayload: payload })));

		const res = await setData(event({ code }, jsonRequest({ cipher: 'cGllY2U=' })));
		await expect(res.json()).resolves.toEqual({ success: true });

		await expectHttpError(setData(event({ code }, jsonRequest({ cipher: 'b3RoZXI=' }))), 409);

		const data = await getData(event({ code }));
		await expect(data.json()).resolves.toEqual({ cipher: 'cGllY2U=' });
	});
});

describe('GET /api/pasteShare/[code]/data', () => {
	it('returns 404 for an unknown code', async () => {
		const { event } = await events();
		await expectHttpError(getData(event({ code: 'ABCDEFGH' })), 404);
	});

	it('returns a null cipher when none has been set', async () => {
		const { event } = await events();

		const created = await createSession(event({}));
		const { code } = await created.json();

		const data = await getData(event({ code }));
		await expect(data.json()).resolves.toEqual({ cipher: null });
	});
});

describe('DELETE /api/pasteShare/[code]', () => {
	it('deletes the session', async () => {
		const { event } = await events();

		const created = await createSession(event({}));
		const { code } = await created.json();

		const res = await deleteSession(event({ code }));
		expect(res.status).toBe(200);

		await expectHttpError(getSession(event({ code })), 404);
		await expect(getDb().collection('pasteShare').countDocuments({})).resolves.toBe(0);
	});
});