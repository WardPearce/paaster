<script lang="ts">
	import { goto } from '$app/navigation';
	import { localDb } from '$lib/client/dexie';
	import {
		secretBoxDecryptFromMaster,
		secretBoxEncryptFromMaster
	} from '$lib/client/sodiumWrapped';
	import { authStore } from '$lib/client/stores';
	import Loading from '$lib/components/Loading.svelte';
	import * as comlink from 'comlink';
	import type { Remote } from 'comlink';
	import type { DerivePasswordApi } from '../../workers/derivePassword';
	import sodium from 'libsodium-wrappers-sumo';
	import { onDestroy, onMount } from 'svelte';
	import { _ } from '$lib/i18n';
	import { zxcvbn, zxcvbnOptions } from '@zxcvbn-ts/core';
	import { adjacencyGraphs, dictionary } from '@zxcvbn-ts/language-common';
	import { solveChallenge } from 'altcha-lib';
	import { deriveKey } from 'altcha-lib/algorithms/web/pbkdf2';

	type CaptchaPayload = {
		solution: { counter: number; derivedKey: string; time?: number };
		challenge: Record<string, unknown>;
	};

	let loginMode = $state(true);
	let rememberMe = $state(true);

	let rawUsername: string | undefined = $state();
	let rawPassword: string | undefined = $state();

	let worker: Worker | undefined;
	let derivePassword: DerivePasswordApi['derivePassword'] | undefined;

	let errorMsg: string | undefined = $state();
	let isLoading = $state(false);

	let passwordScore = $state(0);

	let captchaPayload = $state<CaptchaPayload | null>(null);
	let captchaState = $state<'idle' | 'solving' | 'solved' | 'error'>('idle');

	let twoFactorRequired = $state(false);
	let twoFactorToken = $state('');
	let pendingServerSidePw: string | undefined = $state();
	let pendingUsername: string | undefined = $state();
	let pendingMasterPassword: Uint8Array | undefined = $state();

	async function solveCaptchaChallenge() {
		captchaState = 'solving';

		try {
			const resp = await fetch('/api/captcha');
			const challenge = await resp.json();

			const solution = await solveChallenge({ challenge, deriveKey });

			if (!solution) {
				captchaState = 'error';
				return;
			}

			captchaPayload = { solution, challenge };
			captchaState = 'solved';
		} catch {
			captchaState = 'error';
		}
	}

	onMount(() => {
		worker = new Worker(new URL('../../workers/derivePassword.ts', import.meta.url), {
			type: 'module'
		});
		const workerApi: Remote<DerivePasswordApi> = comlink.wrap(worker);
		derivePassword = workerApi.derivePassword;

		zxcvbnOptions.setOptions({ dictionary, graphs: adjacencyGraphs });

		solveCaptchaChallenge();
	});

	onDestroy(() => {
		worker?.terminate();
	});

	function guard(): { password: string; username: string } | undefined {
		if (!derivePassword || !rawPassword || !rawUsername) return;
		return { password: rawPassword, username: rawUsername };
	}

	async function fetchError(response: Response): Promise<string> {
		try {
			return (await response.clone().json()).message;
		} catch {
			return await response.text();
		}
	}

	function serverSidePassword(masterPassword: Uint8Array, salt: Uint8Array): Uint8Array {
		return sodium.crypto_pwhash(
			32,
			masterPassword,
			salt,
			sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
			sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
			sodium.crypto_pwhash_ALG_DEFAULT
		);
	}

	function onPasswordInput() {
		if (rawPassword) {
			passwordScore = zxcvbn(rawPassword).score;
		} else {
			passwordScore = 0;
		}
	}

	const strengthColors = [
		'bg-red-500',
		'bg-orange-500',
		'bg-yellow-500',
		'bg-lime-500',
		'bg-green-500'
	];
	const strengthLabels = [
		'',
		$_('password_weak'),
		$_('password_fair'),
		$_('password_good'),
		$_('password_strong')
	];

	async function createAccount(event: SubmitEvent) {
		event.preventDefault();
		isLoading = true;

		const guardVals = guard();
		if (!guardVals || !captchaPayload) return;

		await localDb.accounts.clear();
		errorMsg = undefined;

		const masterPasswordSalt = sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES);
		const masterPassword = await derivePassword!(guardVals.password, masterPasswordSalt);

		const serverSideSalt = sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES);
		const serverSidePw = serverSidePassword(masterPassword, serverSideSalt);

		const rawEncryptionKey = sodium.randombytes_buf(sodium.crypto_secretbox_KEYBYTES);
		const encryptionKey = secretBoxEncryptFromMaster(rawEncryptionKey, masterPassword);

		const payload = new FormData();
		payload.append('serverSideSalt', sodium.to_base64(serverSideSalt));
		payload.append('serverSidePassword', sodium.to_base64(serverSidePw));
		payload.append('masterPasswordSalt', sodium.to_base64(masterPasswordSalt));
		payload.append('username', guardVals.username);
		payload.append('encryptionKey', sodium.to_base64(encryptionKey.data.value));
		payload.append('encryptionKeyNonce', sodium.to_base64(encryptionKey.data.nonce));
		payload.append('encryptionKeyKeySalt', sodium.to_base64(encryptionKey.key.salt));
		payload.append('captchaPayload', JSON.stringify(captchaPayload));

		const resp = await fetch('/api/account/create', { method: 'POST', body: payload });
		if (resp.ok) {
			const json = await resp.json();
			if (rememberMe)
				await localDb.accounts.add({
					id: json.userId,
					encryptionKey: sodium.to_base64(rawEncryptionKey)
				});
			authStore.set({ id: json.userId, encryptionKey: sodium.to_base64(rawEncryptionKey) });
			goto('/', { replaceState: true });
			return;
		}

		errorMsg = await fetchError(resp);
		isLoading = false;
		captchaPayload = null;
		solveCaptchaChallenge();
	}

	async function logIntoAccount(
		serverSidePwB64: string,
		masterPassword: Uint8Array,
		username: string,
		event: SubmitEvent,
		twoFactorTokenArg?: string
	) {
		isLoading = true;

		if (!captchaPayload) return;

		const loginPayload = new FormData();
		loginPayload.append('serverSidePassword', serverSidePwB64);
		loginPayload.append('captchaPayload', JSON.stringify(captchaPayload));
		if (twoFactorTokenArg) {
			loginPayload.append('twoFactorToken', twoFactorTokenArg);
		}

		const loginResp = await fetch(`/api/account/${username}/login`, {
			method: 'POST',
			body: loginPayload
		});
		if (loginResp.ok) {
			const loginJson = await loginResp.json();
			const encryptionKey = secretBoxDecryptFromMaster(
				{
					value: sodium.from_base64(loginJson.encryptionKey.value),
					nonce: sodium.from_base64(loginJson.encryptionKey.nonce)
				},
				{ value: masterPassword, salt: sodium.from_base64(loginJson.encryptionKey.keySalt) }
			);
			const toStore = {
				id: loginJson.userId,
				encryptionKey: sodium.to_base64(encryptionKey.rawData)
			};
			if (rememberMe) await localDb.accounts.add(toStore);
			authStore.set(toStore);
			goto('/', { replaceState: true });
			return;
		}

		captchaPayload = null;
		solveCaptchaChallenge();
		if (twoFactorTokenArg) {
			twoFactorToken = '';
		}

		errorMsg = await fetchError(loginResp);
		isLoading = false;
	}

	async function check2FA(event: SubmitEvent) {
		event.preventDefault();
		isLoading = true;

		const guardVals = guard();
		if (!guardVals || !captchaPayload) return;

		await localDb.accounts.clear();
		errorMsg = undefined;

		const saltResp = await fetch(`/api/account/${guardVals.username}/public`);
		if (!saltResp.ok) {
			errorMsg = await fetchError(saltResp);
			isLoading = false;
			captchaPayload = null;
			solveCaptchaChallenge();
			return;
		}

		const saltJson = await saltResp.json();
		const masterPassword = await derivePassword!(
			guardVals.password,
			sodium.from_base64(saltJson.masterPasswordSalt)
		);
		const serverSidePw = serverSidePassword(
			masterPassword,
			sodium.from_base64(saltJson.serverSide.salt)
		);
		const serverSidePwB64 = sodium.to_base64(serverSidePw);

		if (saltJson.twoFactor) {
			pendingServerSidePw = serverSidePwB64;
			pendingUsername = guardVals.username;
			pendingMasterPassword = masterPassword;
			twoFactorRequired = true;
			isLoading = false;
		} else {
			await logIntoAccount(serverSidePwB64, masterPassword, guardVals.username, event);
		}
	}

	function handleLogin(event: SubmitEvent) {
		if (twoFactorRequired) {
			if (!pendingServerSidePw || !pendingUsername || !pendingMasterPassword) return;
			logIntoAccount(
				pendingServerSidePw,
				pendingMasterPassword,
				pendingUsername,
				event,
				twoFactorToken
			);
		} else {
			check2FA(event);
		}
	}

	function cancel2FA() {
		twoFactorRequired = false;
		twoFactorToken = '';
		pendingServerSidePw = undefined;
		pendingUsername = undefined;
		pendingMasterPassword = undefined;
		errorMsg = undefined;
	}
</script>

{#if isLoading}
	<Loading />
{:else}
	<div class="flex min-h-[calc(100vh-8rem)] items-center justify-center p-4">
		<div class="card border-base-content/20 w-full max-w-sm rounded-lg border p-6">
			<h1 class="text-base-content mb-6 text-center text-2xl font-bold">
				{loginMode ? $_('account.login') : $_('account.create')}
			</h1>

			<form onsubmit={loginMode ? handleLogin : createAccount} class="flex flex-col gap-4">
				{#if errorMsg}
					<div class="alert alert-warning" role="alert">
						{errorMsg}
					</div>
				{/if}

				<div>
					<label class="label label-text mb-1" for="username">{$_('account.username')}</label>
					<input
						bind:value={rawUsername}
						type="text"
						class="input w-full"
						id="username"
						disabled={twoFactorRequired}
					/>
				</div>

				<div>
					<label class="label label-text mb-1" for="password">{$_('account.password')}</label>
					<input
						bind:value={rawPassword}
						oninput={onPasswordInput}
						type="password"
						class="input w-full"
						id="password"
						disabled={twoFactorRequired}
					/>
					{#if !loginMode && rawPassword}
						<div class="mt-2">
							<div class="flex h-2 w-full gap-1">
								{#each [0, 1, 2, 3, 4] as segment (segment)}
									<div
										class="h-full flex-1 rounded-full transition-colors {segment <= passwordScore
											? strengthColors[passwordScore]
											: 'bg-base-100/10'}"
									></div>
								{/each}
							</div>
							<p class="text-base-content/50 mt-1 text-xs">
								{strengthLabels[passwordScore]}
							</p>
						</div>
					{/if}
				</div>

				<div class="flex items-center gap-2">
					<input
						bind:checked={rememberMe}
						type="checkbox"
						class="checkbox checkbox-primary checkbox-sm"
						id="remember-me"
						disabled={twoFactorRequired}
					/>
					<label class="label label-text cursor-pointer" for="remember-me"
						>{$_('account.remember')}</label
					>
				</div>

				{#if twoFactorRequired}
					<div>
						<label class="label label-text mb-1" for="twofactor-code"
							>{$_('account.twoFactorCode')}</label
						>
						<input
							bind:value={twoFactorToken}
							type="text"
							class="input w-full"
							id="twofactor-code"
							maxlength={6}
							placeholder="000000"
							inputmode="numeric"
							pattern="[0-9]*"
						/>
					</div>
				{/if}

				{#if captchaState === 'solving'}
					<div
						class="bg-primary/20 flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-5 w-5"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg
						>
						<span class="loading loading-spinner loading-xs"></span>
						{$_('account.verifying_captcha', 'Verifying captcha...')}
					</div>
				{:else if captchaState === 'solved'}
					<div
						class="bg-primary/5 text-success flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-5 w-5"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg
						>
						{$_('account.captcha_verified', 'Captcha verified')}
					</div>
				{:else if captchaState === 'error'}
					<div
						class="bg-primary/5 text-error flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-5 w-5"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg
						>
						<span>{$_('account.captcha_failed', 'Captcha verification failed')}</span>
						<button type="button" class="btn btn-ghost btn-xs" onclick={solveCaptchaChallenge}>
							{$_('account.retry', 'Retry')}
						</button>
					</div>
				{/if}

				<div class="flex flex-col gap-2">
					{#if twoFactorRequired}
						<button
							type="submit"
							class="btn btn-primary w-full"
							disabled={twoFactorToken.length !== 6}
						>
							{$_('account.twoFactor.verify')}
						</button>
						<button type="button" class="btn btn-ghost w-full" onclick={cancel2FA}>
							{$_('account.twoFactor.cancelSetup')}
						</button>
					{:else}
						<button type="submit" class="btn btn-primary w-full" disabled={!captchaPayload}>
							{loginMode ? $_('account.login') : $_('account.create')}
						</button>
						<button
							type="button"
							class="btn btn-outline w-full"
							onclick={() => (loginMode = !loginMode)}
						>
							{loginMode ? $_('account.create_new_account') : $_('account.already_have_account')}
						</button>
					{/if}
				</div>
			</form>
		</div>
	</div>
{/if}
