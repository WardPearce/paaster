import { describe, expect, it } from 'vitest';
import { ObjectId } from 'mongodb';
import { nanoid } from 'nanoid';
import { generateSync } from 'otplib';
import sodium from 'libsodium-wrappers-sumo';
import type { RequestEvent } from '@sveltejs/kit';
import { GET as get2fa, POST as enable2fa, DELETE as disable2fa } from '../../routes/api/account/2fa/+server';
import { POST as verify2fa } from '../../routes/api/account/2fa/verify/+server';
import { GET as getAlive } from '../../routes/api/account/alive/+server';
import { POST as createAccount } from '../../routes/api/account/create/+server';
import { GET as getDefaults, POST as setDefaults } from '../../routes/api/account/defaults/+server';
import { DELETE as deleteAccount } from '../../routes/api/account/delete/+server';
import { DELETE as logout } from '../../routes/api/account/logout/+server';
import { POST as resetPassword } from '../../routes/api/account/passwordReset/+server';
import { GET as listSessions, DELETE as revokeSession } from '../../routes/api/account/sessions/+server';
import { GET as getTheme } from '../../routes/api/account/theme/+server';
import { POST as setTheme } from '../../routes/api/account/theme/[themeName]/+server';
import { POST as bookmarkPaste } from '../../routes/api/account/paste/[pasteId]/+server';
import { POST as login } from '../../routes/api/account/[username]/login/+server';
import { GET as getPublicUser } from '../../routes/api/account/[username]/public/+server';
import { setupTestDb } from '../utils/db';
import { createSolvedCaptcha, getCaptchaSecrets, type SolvedCaptcha } from '../utils/captcha';
import { expectHttpError, formRequest, makeCookies, makeEvent, makeMemoryStorage } from '../utils/event';
import {
	insertPaste,
	insertSession,
	insertUser,
	insertUserPaste,
	TEST_SERVER_PASSWORD,
	twoFactorSecret
} from '../utils/factories';

const getDb = setupTestDb();

const WRONG_PASSWORD = 'X'.repeat(24);

interface AuthFixture {
	anon<Params extends Record<string, string> = Record<string, string>>(
		request?: Request,
		params?: Params,
		cookies?: ReturnType<typeof makeCookies>
	): RequestEvent<Params, never>;
	authed<Params extends Record<string, string> = Record<string, string>>(
		userId: string,
		sessionId?: string,
		request?: Request,
		params?: Params,
		cookies?: ReturnType<typeof makeCookies>
	): RequestEvent<Params, never>;
	captcha(): Promise<SolvedCaptcha>;
	captchaLocals(): Record<string, string>;
}

async function authFixture(): Promise<AuthFixture> {
	const secrets = await getCaptchaSecrets();
	return {
		anon(request, params, cookies) {
			return makeEvent(getDb(), makeMemoryStorage(), { request, params, cookies });
		},
		authed(userId, sessionId, request, params, cookies) {
			return makeEvent(getDb(), makeMemoryStorage(), {
				locals: { userId, sessionId },
				request,
				params,
				cookies
			});
		},
		captcha() {
			return createSolvedCaptcha(secrets.key, secrets.signature);
		},
		captchaLocals() {
			return { captchaKey: secrets.key, captchaSignature: secrets.signature };
		}
	};
}

function withCaptcha(entries: Record<string, string>, payload: unknown): Record<string, string> {
	return { ...entries, captchaPayload: JSON.stringify(payload) };
}

describe('POST /api/account/create', () => {
	it('returns 400 for an invalid body', async () => {
		const { anon } = await authFixture();
		const request = formRequest({ username: 'bob1' });

		await expectHttpError(createAccount(anon(request)), 400);
	});

	it('returns 400 when the username is taken', async () => {
		const { captcha, captchaLocals } = await authFixture();
		await insertUser(getDb(), { username: 'alice' });
		const payload = await captcha();
		const request = formRequest(withCaptcha(createFields('alice'), payload));

		await expectHttpError(
			createAccount(makeEvent(getDb(), makeMemoryStorage(), { request, locals: captchaLocals() })),
			400
		);
	});

	it('rejects reuse of a captcha solution', async () => {
		const { captcha, captchaLocals } = await authFixture();
		const payload = await captcha();

		const first = formRequest(withCaptcha(createFields('bob1'), payload));
		const res = await createAccount(makeEvent(getDb(), makeMemoryStorage(), { request: first, locals: captchaLocals() }));
		expect(res.status).toBe(200);

		const second = formRequest(withCaptcha(createFields('carol'), payload));
		await expectHttpError(
			createAccount(makeEvent(getDb(), makeMemoryStorage(), { request: second, locals: captchaLocals() })),
			400
		);
	});

	it('creates a user, sets a session cookie and returns the userId', async () => {
		const { captcha, captchaLocals } = await authFixture();
		const payload = await captcha();
		const cookies = makeCookies();
		const request = formRequest(withCaptcha(createFields('bob1'), payload));

		const res = await createAccount(
			makeEvent(getDb(), makeMemoryStorage(), { request, cookies, locals: captchaLocals() })
		);
		const body = await res.json();

		expect(typeof body.userId).toBe('string');
		expect(cookies.get('sessionId')).toBeTruthy();

		const user = (await getDb().collection('users').findOne({ username: 'bob1' }))!;
		expect(user).not.toBeNull();
		expect(user.serverSide.password.startsWith('$argon2')).toBe(true);
		expect(user.encryptionKey).toEqual({
			value: 'ZW5jcnlwdGlvbktleQ==',
			nonce: 'ZW5jcnlwdGlvbk5vbmNl',
			keySalt: 'ZW5jcnlwdGlvbktleVNhbHQ='
		});
	});
});

describe('GET /api/account/[username]/public', () => {
	it('returns the stored salts for an existing user', async () => {
		const user = await insertUser(getDb(), { username: 'alice' });

		const res = await getPublicUser(
			makeEvent(getDb(), makeMemoryStorage(), { params: { username: 'alice' } })
		);
		const body = await res.json();

		expect(body.masterPasswordSalt).toBe(user.masterPasswordSalt);
		expect(body.serverSide.salt).toBe(user.serverSide.salt);
		expect(body.twoFactor).toBe(false);
	});

	it('reports twoFactor for a verified 2FA user', async () => {
		await insertUser(getDb(), { username: 'alice', twoFactorSecret: twoFactorSecret(), twoFactorVerified: true });

		const res = await getPublicUser(
			makeEvent(getDb(), makeMemoryStorage(), { params: { username: 'alice' } })
		);
		await expect(res.json()).resolves.toMatchObject({ twoFactor: true });
	});

	it('returns plausible fake salts for a missing user', async () => {
		await sodium.ready;
		const res = await getPublicUser(
			makeEvent(getDb(), makeMemoryStorage(), { params: { username: 'ghost' } })
		);
		const body = await res.json();

		expect(typeof body.twoFactor).toBe('boolean');
		expect(Buffer.from(body.masterPasswordSalt, 'base64')).toHaveLength(sodium.crypto_pwhash_SALTBYTES);
		expect(Buffer.from(body.serverSide.salt, 'base64')).toHaveLength(sodium.crypto_pwhash_SALTBYTES);
	});

	it('returns a stable decoy across requests for a missing user', async () => {
		await sodium.ready;
		const first = await getPublicUser(
			makeEvent(getDb(), makeMemoryStorage(), { params: { username: 'ghost' } })
		).then((r) => r.json());
		const second = await getPublicUser(
			makeEvent(getDb(), makeMemoryStorage(), { params: { username: 'ghost' } })
		).then((r) => r.json());

		expect(second).toEqual(first);
	});
});

describe('POST /api/account/[username]/login', () => {
	it('requires a captcha before revealing whether a user exists', async () => {
		const request = formRequest({ serverSidePassword: TEST_SERVER_PASSWORD });

		await expectHttpError(
			login(makeEvent(getDb(), makeMemoryStorage(), { params: { username: 'ghost' }, request })),
			400
		);
	});

	it('returns 401 for an unknown user', async () => {
		const { captcha, captchaLocals } = await authFixture();
		const payload = await captcha();
		const request = formRequest(withCaptcha({ serverSidePassword: TEST_SERVER_PASSWORD }, payload));

		await expectHttpError(
			login(makeEvent(getDb(), makeMemoryStorage(), { params: { username: 'ghost' }, request, locals: captchaLocals() })),
			401
		);
	});

	it('returns 400 for an invalid body', async () => {
		await insertUser(getDb(), { username: 'alice' });
		const request = formRequest({ captchaPayload: '{}' });

		await expectHttpError(
			login(makeEvent(getDb(), makeMemoryStorage(), { params: { username: 'alice' }, request })),
			400
		);
	});

	it('returns 401 for a wrong password', async () => {
		const { captcha, captchaLocals } = await authFixture();
		await insertUser(getDb(), { username: 'alice' });
		const payload = await captcha();
		const request = formRequest(withCaptcha({ serverSidePassword: WRONG_PASSWORD }, payload));

		await expectHttpError(
			login(makeEvent(getDb(), makeMemoryStorage(), { params: { username: 'alice' }, request, locals: captchaLocals() })),
			401
		);
	});

	it('returns 401 for an invalid 2FA token', async () => {
		const { captcha, captchaLocals } = await authFixture();
		await insertUser(getDb(), { username: 'alice', twoFactorSecret: twoFactorSecret(), twoFactorVerified: true });
		const payload = await captcha();
		const request = formRequest(
			withCaptcha({ serverSidePassword: TEST_SERVER_PASSWORD, twoFactorToken: '000000' }, payload)
		);

		await expectHttpError(
			login(makeEvent(getDb(), makeMemoryStorage(), { params: { username: 'alice' }, request, locals: captchaLocals() })),
			401
		);
	});

	it('logs in, sets a session cookie and returns the encryption key', async () => {
		const { captcha, captchaLocals } = await authFixture();
		const user = await insertUser(getDb(), { username: 'alice' });
		const payload = await captcha();
		const cookies = makeCookies();
		const request = formRequest(withCaptcha({ serverSidePassword: TEST_SERVER_PASSWORD }, payload));

		const res = await login(
			makeEvent(getDb(), makeMemoryStorage(), { params: { username: 'alice' }, request, cookies, locals: captchaLocals() })
		);
		const body = await res.json();

		expect(body.userId).toBe(user._id.toHexString());
		expect(body.encryptionKey).toEqual(user.encryptionKey);
		expect(cookies.get('sessionId')).toBeTruthy();
	});

	it('logs in with a valid 2FA token', async () => {
		const { captcha, captchaLocals } = await authFixture();
		const secret = twoFactorSecret();
		const user = await insertUser(getDb(), { username: 'alice', twoFactorSecret: secret, twoFactorVerified: true });
		const payload = await captcha();
		const request = formRequest(
			withCaptcha({ serverSidePassword: TEST_SERVER_PASSWORD, twoFactorToken: generateSync({ secret }) }, payload)
		);

		const res = await login(
			makeEvent(getDb(), makeMemoryStorage(), { params: { username: 'alice' }, request, locals: captchaLocals() })
		);
		const body = await res.json();
		expect(body.userId).toBe(user._id.toHexString());
	});
});

describe('GET /api/account/alive', () => {
	it('reports the anonymous and authenticated state', async () => {
		const { anon, authed } = await authFixture();
		const userId = new ObjectId().toHexString();

		await expect(getAlive(anon()).then((r) => r.json())).resolves.toEqual({ loggedIn: false });
		await expect(getAlive(authed(userId)).then((r) => r.json())).resolves.toEqual({ loggedIn: true });
	});
});

describe('GET /api/account/2fa', () => {
	it('returns 401 when unauthenticated', async () => {
		const { anon } = await authFixture();
		await expectHttpError(get2fa(anon()), 401);
	});

	it('returns 404 when not configured', async () => {
		const { authed } = await authFixture();
		const user = await insertUser(getDb(), {});

		await expectHttpError(get2fa(authed(user._id.toHexString())), 404);
	});

	it('returns the secret and URI while unverified', async () => {
		const { authed } = await authFixture();
		const secret = twoFactorSecret();
		const user = await insertUser(getDb(), { twoFactorSecret: secret, twoFactorVerified: false });

		const res = await get2fa(authed(user._id.toHexString()));
		const body = await res.json();

		expect(body.secret).toBe(secret);
		expect(body.uri).toContain('issuer=Paaster');
		expect(body.uri).toContain('alice');
		expect(body.verified).toBe(false);
	});

	it('only reports the verified flag once verified', async () => {
		const { authed } = await authFixture();
		const user = await insertUser(getDb(), { twoFactorSecret: twoFactorSecret(), twoFactorVerified: true });

		const res = await get2fa(authed(user._id.toHexString()));
		await expect(res.json()).resolves.toEqual({ verified: true });
	});
});

describe('POST /api/account/2fa', () => {
	it('returns 401 when unauthenticated', async () => {
		const { anon } = await authFixture();
		await expectHttpError(enable2fa(anon()), 401);
	});

	it('returns 400 when the current password is missing', async () => {
		const { authed } = await authFixture();
		const user = await insertUser(getDb(), {});
		const request = formRequest({});

		await expectHttpError(enable2fa(authed(user._id.toHexString(), undefined, request)), 400);
	});

	it('returns 401 for a wrong current password', async () => {
		const { authed } = await authFixture();
		const user = await insertUser(getDb(), {});
		const request = formRequest({ serverSidePassword: WRONG_PASSWORD });

		await expectHttpError(enable2fa(authed(user._id.toHexString(), undefined, request)), 401);
	});

	it('enables 2FA and returns a secret and URI', async () => {
		const { authed } = await authFixture();
		const user = await insertUser(getDb(), {});
		const request = formRequest({ serverSidePassword: TEST_SERVER_PASSWORD });

		const res = await enable2fa(authed(user._id.toHexString(), undefined, request));
		const body = await res.json();

		expect(body.secret).toBeTruthy();
		expect(body.uri).toContain('otpauth://totp/');

		const updated = (await getDb().collection('users').findOne({ _id: user._id }))!;
		expect(updated.twoFactorSecret).toBe(body.secret);
		expect(updated.twoFactorVerified).toBe(false);
	});
});

describe('POST /api/account/2fa/verify', () => {
	it('returns 401 when unauthenticated', async () => {
		const { anon } = await authFixture();
		await expectHttpError(verify2fa(anon()), 401);
	});

	it('returns 400 when 2FA is not configured', async () => {
		const { authed } = await authFixture();
		const user = await insertUser(getDb(), {});
		const request = formRequest({ token: '000000' });

		await expectHttpError(verify2fa(authed(user._id.toHexString(), undefined, request)), 400);
	});

	it('returns 400 when already verified', async () => {
		const { authed } = await authFixture();
		const user = await insertUser(getDb(), { twoFactorSecret: twoFactorSecret(), twoFactorVerified: true });
		const request = formRequest({ token: '000000' });

		await expectHttpError(verify2fa(authed(user._id.toHexString(), undefined, request)), 400);
	});

	it('rejects an invalid token', async () => {
		const { authed } = await authFixture();
		const user = await insertUser(getDb(), { twoFactorSecret: twoFactorSecret(), twoFactorVerified: false });
		const request = formRequest({ token: '000000' });

		await expectHttpError(verify2fa(authed(user._id.toHexString(), undefined, request)), 400);
	});

	it('marks 2FA as verified with a valid token', async () => {
		const { authed } = await authFixture();
		const secret = twoFactorSecret();
		const user = await insertUser(getDb(), { twoFactorSecret: secret, twoFactorVerified: false });
		const request = formRequest({ token: generateSync({ secret }) });

		const res = await verify2fa(authed(user._id.toHexString(), undefined, request));
		await expect(res.json()).resolves.toEqual({ success: true });

		const updated = (await getDb().collection('users').findOne({ _id: user._id }))!;
		expect(updated.twoFactorVerified).toBe(true);
	});
});

describe('DELETE /api/account/2fa', () => {
	it('returns 401 when unauthenticated', async () => {
		const { anon } = await authFixture();
		await expectHttpError(disable2fa(anon()), 401);
	});

	it('disables 2FA with the current password', async () => {
		const { authed } = await authFixture();
		const user = await insertUser(getDb(), { twoFactorSecret: twoFactorSecret(), twoFactorVerified: true });
		const request = formRequest({ serverSidePassword: TEST_SERVER_PASSWORD }, { method: 'DELETE' });

		const res = await disable2fa(authed(user._id.toHexString(), undefined, request));
		expect(res.status).toBe(200);

		const updated = (await getDb().collection('users').findOne({ _id: user._id }))!;
		expect(updated.twoFactorSecret).toBeNull();
		expect(updated.twoFactorVerified).toBeNull();
	});
});

describe('GET /api/account/sessions', () => {
	it('returns 401 when unauthenticated', async () => {
		const { anon } = await authFixture();
		await expectHttpError(listSessions(anon()), 401);
	});

	it('lists masked sessions and flags the current one', async () => {
		const { authed } = await authFixture();
		const user = await insertUser(getDb(), {});
		const current = await insertSession(getDb(), user._id);
		const other = await insertSession(getDb(), user._id);

		const res = await listSessions(authed(user._id.toHexString(), current));
		const body = await res.json();

		expect(body.sessions).toHaveLength(2);
		expect(body.sessions[0].sessionId).toBe(other.slice(0, 6) + '...');
		const currentSession = body.sessions.find((s: { current: boolean }) => s.current);
		expect(currentSession.sessionId).toBe(current.slice(0, 6) + '...');
	});
});

describe('DELETE /api/account/sessions', () => {
	it('returns 401 when unauthenticated', async () => {
		const { anon } = await authFixture();
		const request = formRequest({ sessionId: 'abc' }, { method: 'DELETE' });
		await expectHttpError(revokeSession(anon(request)), 401);
	});

	it('rejects revoking the current session', async () => {
		const { authed } = await authFixture();
		const user = await insertUser(getDb(), {});
		const request = formRequest({ sessionId: 'current-session' }, { method: 'DELETE' });

		await expectHttpError(revokeSession(authed(user._id.toHexString(), 'current-session', request)), 400);
	});

	it('returns 404 for an unknown session', async () => {
		const { authed } = await authFixture();
		const user = await insertUser(getDb(), {});
		const request = formRequest({ sessionId: 'missing-session' }, { method: 'DELETE' });

		await expectHttpError(revokeSession(authed(user._id.toHexString(), 'current-session', request)), 404);
	});

	it('revokes another session owned by the user', async () => {
		const { authed } = await authFixture();
		const user = await insertUser(getDb(), {});
		const current = await insertSession(getDb(), user._id);
		const other = await insertSession(getDb(), user._id);
		const request = formRequest({ sessionId: other }, { method: 'DELETE' });

		const res = await revokeSession(authed(user._id.toHexString(), current, request));
		expect(res.status).toBe(200);

		await expect(getDb().collection('sessions').findOne({ sessionId: other })).resolves.toBeNull();
		await expect(getDb().collection('sessions').findOne({ sessionId: current })).resolves.not.toBeNull();
	});
});

describe('GET /api/account/defaults', () => {
	it('returns 401 when unauthenticated', async () => {
		const { anon } = await authFixture();
		await expectHttpError(getDefaults(anon()), 401);
	});

	it('returns 404 when no defaults exist', async () => {
		const { authed } = await authFixture();
		const user = await insertUser(getDb(), {});

		await expectHttpError(getDefaults(authed(user._id.toHexString())), 404);
	});

	it('returns the stored expireAfter', async () => {
		const { authed } = await authFixture();
		const user = await insertUser(getDb(), {});
		await getDb().collection('userDefaults').insertOne({ _id: user._id, expireAfter: 30 });

		const res = await getDefaults(authed(user._id.toHexString()));
		await expect(res.json()).resolves.toEqual({ expireAfter: 30 });
	});
});

describe('POST /api/account/defaults', () => {
	it('returns 401 when unauthenticated', async () => {
		const { anon } = await authFixture();
		const request = formRequest({ expireAfter: '10' });
		await expectHttpError(setDefaults(anon(request)), 401);
	});

	it('returns 400 for a non-numeric value', async () => {
		const { authed } = await authFixture();
		const user = await insertUser(getDb(), {});
		const request = formRequest({ expireAfter: 'abc' });

		await expectHttpError(setDefaults(authed(user._id.toHexString(), undefined, request)), 400);
	});

	it('upserts the defaults', async () => {
		const { authed } = await authFixture();
		const user = await insertUser(getDb(), {});
		const request = formRequest({ expireAfter: '7' });

		const res = await setDefaults(authed(user._id.toHexString(), undefined, request));
		expect(res.status).toBe(200);

		const updated = (await getDb().collection('userDefaults').findOne({ _id: user._id }))!;
		expect(updated.expireAfter).toBe(7);
	});
});

describe('GET /api/account/theme', () => {
	it('returns 401 when unauthenticated', async () => {
		const { anon } = await authFixture();
		await expectHttpError(getTheme(anon()), 401);
	});

	it('returns 404 when no theme is set', async () => {
		const { authed } = await authFixture();
		const user = await insertUser(getDb(), {});

		await expectHttpError(getTheme(authed(user._id.toHexString())), 404);
	});

	it('returns the stored theme', async () => {
		const { authed } = await authFixture();
		const user = await insertUser(getDb(), {});
		await getDb().collection('userTheme').insertOne({ _id: user._id, theme: 'dark' });

		const res = await getTheme(authed(user._id.toHexString()));
		await expect(res.json()).resolves.toEqual({ theme: 'dark' });
	});
});

describe('POST /api/account/theme/[themeName]', () => {
	it('returns 401 when unauthenticated', async () => {
		const { anon } = await authFixture();
		await expectHttpError(setTheme(anon()), 401);
	});

	it('returns 400 for an unknown theme', async () => {
		const { authed } = await authFixture();
		const user = await insertUser(getDb(), {});

		await expectHttpError(setTheme(authed(user._id.toHexString(), undefined, undefined, { themeName: 'no-such-theme' })), 400);
	});

	it('upserts the theme', async () => {
		const { authed } = await authFixture();
		const user = await insertUser(getDb(), {});

		const res = await setTheme(authed(user._id.toHexString(), undefined, undefined, { themeName: 'dark' }));
		expect(res.status).toBe(200);

		const stored = await getDb().collection('userTheme').findOne({ _id: user._id });
		const current = await getTheme(authed(user._id.toHexString()));
		await expect(current.json()).resolves.toEqual({ theme: stored?.theme });
	});
});

describe('POST /api/account/paste/[pasteId]', () => {
	it('returns 401 when unauthenticated', async () => {
		const { anon } = await authFixture();
		const request = formRequest(bookmarkFields());

		await expectHttpError(
			bookmarkPaste(anon(request, { pasteId: nanoid() })),
			401
		);
	});

	it('returns 400 for an invalid body', async () => {
		const { authed } = await authFixture();
		const user = await insertUser(getDb(), {});
		const request = formRequest({});

		await expectHttpError(bookmarkPaste(authed(user._id.toHexString(), undefined, request)), 400);
	});

	it('bookmarks a paste for the user', async () => {
		const { authed } = await authFixture();
		const user = await insertUser(getDb(), {});
		const paste = await insertPaste(getDb(), {});
		const request = formRequest(bookmarkFields());

		const res = await bookmarkPaste(
			authed(user._id.toHexString(), undefined, request, { pasteId: paste._id })
		);
		expect(res.status).toBe(200);

		const stored = (await getDb().collection('userPastes').findOne({ userId: user._id.toHexString() }))!;
		expect(stored.paste.id).toBe(paste._id);
	});
});

describe('DELETE /api/account/logout', () => {
	it('revokes the session and clears the cookie', async () => {
		const { authed } = await authFixture();
		const user = await insertUser(getDb(), {});
		const sessionId = await insertSession(getDb(), user._id);
		const cookies = makeCookies();
		cookies.set('sessionId', sessionId);

		const res = await logout(authed(user._id.toHexString(), sessionId, undefined, undefined, cookies));
		expect(res.status).toBe(200);

		await expect(getDb().collection('sessions').findOne({ sessionId })).resolves.toBeNull();
		expect(cookies.get('sessionId')).toBeUndefined();
	});

	it('succeeds without a session cookie', async () => {
		const { anon } = await authFixture();
		const res = await logout(anon());
		expect(res.status).toBe(200);
	});
});

describe('POST /api/account/passwordReset', () => {
	it('returns 401 when unauthenticated', async () => {
		const { anon } = await authFixture();
		const request = formRequest(resetFields());
		await expectHttpError(resetPassword(anon(request)), 401);
	});

	it('returns 400 for an invalid body', async () => {
		const { authed } = await authFixture();
		const user = await insertUser(getDb(), {});
		const request = formRequest({});

		await expectHttpError(resetPassword(authed(user._id.toHexString(), undefined, request)), 400);
	});

	it('returns 404 when the user is missing', async () => {
		const { authed } = await authFixture();
		const request = formRequest(resetFields());

		await expectHttpError(resetPassword(authed(new ObjectId().toHexString(), undefined, request)), 404);
	});

	it('returns 401 for a wrong current password', async () => {
		const { authed } = await authFixture();
		const user = await insertUser(getDb(), {});
		const request = formRequest(resetFields(WRONG_PASSWORD));

		await expectHttpError(resetPassword(authed(user._id.toHexString(), undefined, request)), 401);
	});

	it('resets credentials and revokes other sessions', async () => {
		const { authed } = await authFixture();
		const user = await insertUser(getDb(), {});
		const current = await insertSession(getDb(), user._id);
		const other = await insertSession(getDb(), user._id);
		const request = formRequest(resetFields());

		const res = await resetPassword(authed(user._id.toHexString(), current, request));
		expect(res.status).toBe(200);

		const updated = (await getDb().collection('users').findOne({ _id: user._id }))!;
		expect(updated.serverSide.password.startsWith('$argon2')).toBe(true);
		expect(updated.masterPasswordSalt).toBe('bmV3TWFzdGVyUGFzc3dvcmQ=');

		await expect(getDb().collection('sessions').findOne({ sessionId: other })).resolves.toBeNull();
		await expect(getDb().collection('sessions').findOne({ sessionId: current })).resolves.not.toBeNull();
	});
});

describe('DELETE /api/account/delete', () => {
	it('returns 401 when unauthenticated', async () => {
		const { anon } = await authFixture();
		const request = formRequest({ serverSidePassword: TEST_SERVER_PASSWORD }, { method: 'DELETE' });
		await expectHttpError(deleteAccount(anon(request)), 401);
	});

	it('returns 400 when the password is missing', async () => {
		const { authed } = await authFixture();
		const user = await insertUser(getDb(), {});
		const request = formRequest({});

		await expectHttpError(deleteAccount(authed(user._id.toHexString(), undefined, request)), 400);
	});

	it('returns 404 when the user is missing', async () => {
		const { authed } = await authFixture();
		const request = formRequest({ serverSidePassword: TEST_SERVER_PASSWORD }, { method: 'DELETE' });

		await expectHttpError(deleteAccount(authed(new ObjectId().toHexString(), undefined, request)), 404);
	});

	it('returns 401 for a wrong password', async () => {
		const { authed } = await authFixture();
		const user = await insertUser(getDb(), {});
		const request = formRequest({ serverSidePassword: WRONG_PASSWORD }, { method: 'DELETE' });

		await expectHttpError(deleteAccount(authed(user._id.toHexString(), undefined, request)), 401);
	});

	it('deletes the user, their pastes and all sessions', async () => {
		const { authed } = await authFixture();
		const user = await insertUser(getDb(), {});
		const sessionId = await insertSession(getDb(), user._id);
		const paste = await insertPaste(getDb(), {});
		await insertUserPaste(getDb(), { userId: user._id.toHexString(), pasteId: paste._id });
		const cookies = makeCookies();
		cookies.set('sessionId', sessionId);
		const request = formRequest({ serverSidePassword: TEST_SERVER_PASSWORD }, { method: 'DELETE' });

		const res = await deleteAccount(authed(user._id.toHexString(), sessionId, request, undefined, cookies));
		expect(res.status).toBe(200);

		await expect(getDb().collection('users').findOne({ _id: user._id })).resolves.toBeNull();
		await expect(getDb().collection('userPastes').findOne({ userId: user._id.toHexString() })).resolves.toBeNull();
		await expect(getDb().collection('sessions').findOne({ userId: user._id })).resolves.toBeNull();
		expect(cookies.get('sessionId')).toBeUndefined();
	});
});

function createFields(username: string): Record<string, string> {
	return {
		serverSideSalt: 'c2VydmVyU2lkZVNhbHQ=',
		serverSidePassword: TEST_SERVER_PASSWORD,
		masterPasswordSalt: 'bWFzdGVyUGFzc3dvcmRTYWx0',
		username,
		encryptionKey: 'ZW5jcnlwdGlvbktleQ==',
		encryptionKeyNonce: 'ZW5jcnlwdGlvbk5vbmNl',
		encryptionKeyKeySalt: 'ZW5jcnlwdGlvbktleVNhbHQ='
	};
}

function bookmarkFields(): Record<string, string> {
	return {
		encryptedPasteKey: 'a2V5',
		encryptedPasteNonce: 'bm9uY2U=',
		encryptedAccessKey: 'YWNjZXNza2V5',
		encryptedAccessNonce: 'YWNjZXNzbm9uY2U='
	};
}

function resetFields(currentPassword = TEST_SERVER_PASSWORD): Record<string, string> {
	return {
		currentServerSidePassword: currentPassword,
		serverSideSalt: 'bmV3U2FsdA==',
		serverSidePassword: TEST_SERVER_PASSWORD,
		masterPasswordSalt: 'bmV3TWFzdGVyUGFzc3dvcmQ=',
		encryptionKey: 'bmV3RW5jcnlwdGlvbktleQ==',
		encryptionKeyNonce: 'bmV3Tm9uY2U=',
		encryptionKeyKeySalt: 'bmV3S2V5U2FsdA=='
	};
}