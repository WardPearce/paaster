<script lang="ts">
	import { goto } from '$app/navigation';
	import { localDb } from '$lib/client/dexie';
	import { secretBoxEncryptFromMaster } from '$lib/client/sodiumWrapped';
	import { authStore } from '$lib/client/stores';
	import Loading from '$lib/components/Loading.svelte';
	import * as comlink from 'comlink';
	import sodium from 'libsodium-wrappers-sumo';
	import { onDestroy, onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { get } from 'svelte/store';

	let worker: Worker | undefined;
	let derivePassword:
		| ((rawPassword: string, passwordSalt: Uint8Array) => Promise<Uint8Array>)
		| undefined;

	let errorMsg: string | undefined = $state();
	let isLoading = $state(false);

	let rawPasswordReset: string | undefined = $state();

	onMount(() => {
		worker = new Worker(new URL('../../workers/derivePassword.ts', import.meta.url), {
			type: 'module'
		});
		const workerApi = comlink.wrap(worker);

		// @ts-ignore
		derivePassword = workerApi.derivePassword;
	});

	onDestroy(() => {
		if (worker) {
			worker.terminate();
		}
	});

	async function changePassword(event: Event) {
		event.preventDefault();

		isLoading = true;

		const auth = get(authStore);

		if (!derivePassword || !rawPasswordReset || !auth) return;

		await sodium.ready;

		await localDb.accounts.clear();

		errorMsg = undefined;

		const masterPasswordSalt = sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES);

		const masterPassword = await derivePassword(rawPasswordReset, masterPasswordSalt);

		const serverSideSalt = sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES);

		const serverSidePassword = sodium.crypto_pwhash(
			32,
			masterPassword,
			serverSideSalt,
			sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
			sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
			sodium.crypto_pwhash_ALG_DEFAULT
		);

		const createAccountPayload = new FormData();
		createAccountPayload.append('serverSideSalt', sodium.to_base64(serverSideSalt));
		createAccountPayload.append('serverSidePassword', sodium.to_base64(serverSidePassword));

		createAccountPayload.append('masterPasswordSalt', sodium.to_base64(masterPasswordSalt));

		const rawEncryptionKey = sodium.from_base64(auth.encryptionKey);
		const encryptionKey = secretBoxEncryptFromMaster(rawEncryptionKey, masterPassword);

		createAccountPayload.append('encryptionKey', sodium.to_base64(encryptionKey.data.value));
		createAccountPayload.append('encryptionKeyNonce', sodium.to_base64(encryptionKey.data.nonce));
		createAccountPayload.append('encryptionKeyKeySalt', sodium.to_base64(encryptionKey.key.salt));

		const passwordResetResp = await fetch('/api/account/passwordReset', {
			method: 'POST',
			body: createAccountPayload
		});
		if (passwordResetResp.ok) {
			const createAccountJson = await passwordResetResp.json();

			const toStore = {
				id: createAccountJson.userId,
				encryptionKey: sodium.to_base64(rawEncryptionKey)
			};

			if ((await localDb.accounts.count()) > 0) await localDb.accounts.add(toStore);

			authStore.set(toStore);

			goto('/', { replaceState: true });
		} else {
			try {
				errorMsg = (await passwordResetResp.json()).message;
			} catch {
				errorMsg = await passwordResetResp.text();
			}
		}

		isLoading = false;
	}
</script>

{#if isLoading}
	<Loading />
{:else}
	<main class="flex p-5">
		<div class="w-full max-w-md">
			{#if errorMsg}
				<div class="alert alert-warning mb-4" role="alert">
					{errorMsg}
				</div>
			{/if}

			<h1 class="text-base-content text-3xl">{$_('account.passwordReset')}</h1>
			<form onsubmit={changePassword}>
				<div>
					<label class="label label-text" for="password">{$_('account.newPassword')}</label>
					<input bind:value={rawPasswordReset} type="password" class="input w-full" id="password" />
				</div>
				<button class="btn btn-primary mt-2">{$_('account.changePassword')}</button>
			</form>
		</div>
	</main>
{/if}
