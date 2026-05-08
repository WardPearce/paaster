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

	let loginMode = $state(true);
	let rememberMe = $state(true);

	let rawUsername: string | undefined = $state();
	let rawPassword: string | undefined = $state();

	let worker: Worker | undefined;
	let derivePassword: DerivePasswordApi['derivePassword'] | undefined;

	let errorMsg: string | undefined = $state();
	let isLoading = $state(false);

	let passwordScore = $state(0);

	onMount(() => {
		worker = new Worker(new URL('../../workers/derivePassword.ts', import.meta.url), {
			type: 'module'
	});
		const workerApi: Remote<DerivePasswordApi> = comlink.wrap(worker);
		derivePassword = workerApi.derivePassword;

		zxcvbnOptions.setOptions({ dictionary, graphs: adjacencyGraphs });
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

	const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-lime-500', 'bg-green-500'];
	const strengthLabels = ['', $_('password_weak'), $_('password_fair'), $_('password_good'), $_('password_strong')];

	async function createAccount(event: SubmitEvent) {
		event.preventDefault();
		isLoading = true;

		const guardVals = guard();
		if (!guardVals) return;

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

		const resp = await fetch('/api/account/create', { method: 'POST', body: payload });
		if (resp.ok) {
			const json = await resp.json();
			if (rememberMe) await localDb.accounts.add({ id: json.userId, encryptionKey: sodium.to_base64(rawEncryptionKey) });
			authStore.set({ id: json.userId, encryptionKey: sodium.to_base64(rawEncryptionKey) });
			goto('/', { replaceState: true });
			return;
		}

		errorMsg = await fetchError(resp);
		isLoading = false;
	}

	async function logIntoAccount(event: SubmitEvent) {
		event.preventDefault();
		isLoading = true;

		const guardVals = guard();
		if (!guardVals) return;

		await localDb.accounts.clear();
		errorMsg = undefined;

		const saltResp = await fetch(`/api/account/${guardVals.username}/public`);
		if (!saltResp.ok) {
			errorMsg = await fetchError(saltResp);
			isLoading = false;
			return;
		}

		const saltJson = await saltResp.json();
		const masterPassword = await derivePassword!(
			guardVals.password,
			sodium.from_base64(saltJson.masterPasswordSalt)
		);
		const serverSidePw = serverSidePassword(masterPassword, sodium.from_base64(saltJson.serverSide.salt));

		const loginPayload = new FormData();
		loginPayload.append('serverSidePassword', sodium.to_base64(serverSidePw));

		const loginResp = await fetch(`/api/account/${guardVals.username}/login`, {
			method: 'POST',
			body: loginPayload
		});
		if (loginResp.ok) {
			const loginJson = await loginResp.json();
			const encryptionKey = secretBoxDecryptFromMaster(
				{ value: sodium.from_base64(loginJson.encryptionKey.value), nonce: sodium.from_base64(loginJson.encryptionKey.nonce) },
				{ value: masterPassword, salt: sodium.from_base64(loginJson.encryptionKey.keySalt) }
			);
			const toStore = { id: loginJson.userId, encryptionKey: sodium.to_base64(encryptionKey.rawData) };
			if (rememberMe) await localDb.accounts.add(toStore);
			authStore.set(toStore);
			goto('/', { replaceState: true });
			return;
		}

		errorMsg = await fetchError(loginResp);
		isLoading = false;
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

			<form onsubmit={loginMode ? logIntoAccount : createAccount} class="flex flex-col gap-4">
				{#if errorMsg}
					<div class="alert alert-warning" role="alert">
						{errorMsg}
					</div>
				{/if}

				<div>
					<label class="label label-text mb-1" for="username">{$_('account.username')}</label>
					<input bind:value={rawUsername} type="text" class="input w-full" id="username" />
				</div>

				<div>
					<label class="label label-text mb-1" for="password">{$_('account.password')}</label>
					<input
						bind:value={rawPassword}
						oninput={onPasswordInput}
						type="password"
						class="input w-full"
						id="password"
					/>
					{#if !loginMode && rawPassword}
						<div class="mt-2">
							<div class="flex h-2 w-full gap-1">
								{#each [0, 1, 2, 3, 4] as segment}
									<div
										class="h-full flex-1 rounded-full transition-colors {segment <= passwordScore ? strengthColors[passwordScore] : 'bg-base-300'}"
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
					/>
					<label class="label label-text cursor-pointer" for="remember-me"
						>{$_('account.remember')}</label
					>
				</div>

				<div class="flex flex-col gap-2">
					<button type="submit" class="btn btn-primary w-full">
						{loginMode ? $_('account.login') : $_('account.create')}
					</button>
					<button type="button" class="btn btn-outline w-full" onclick={() => (loginMode = !loginMode)}>
						{loginMode ? $_('account.create_new_account') : $_('account.already_have_account')}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}