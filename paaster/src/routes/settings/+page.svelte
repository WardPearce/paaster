<script lang="ts">
	import { goto } from '$app/navigation';
	import { localDb } from '$lib/client/dexie';
	import { secretBoxEncryptFromMaster } from '$lib/client/sodiumWrapped';
	import { authStore } from '$lib/client/stores';
	import { setTheme } from '$lib/client/theme';
	import Loading from '$lib/components/Loading.svelte';
	import { THEMES } from '$lib/consts';
	import * as comlink from 'comlink';
	import sodium from 'libsodium-wrappers-sumo';
	import { onDestroy, onMount } from 'svelte';
	import { _ } from '$lib/i18n';
	import { get } from 'svelte/store';

	let worker: Worker | undefined;
	let derivePassword:
		| ((rawPassword: string, passwordSalt: Uint8Array) => Promise<Uint8Array>)
		| undefined;

	let errorMsg: string | undefined = $state();
	let isLoading = $state(false);

	let rawPasswordReset: string | undefined = $state();

	let accountDeleteConfirm: string | undefined = $state();
	const accountDeletionConfirmText = get(_)('account.deleteConfirmContent');

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

	async function deleteAccount(event: Event) {
		event.preventDefault();

		if (accountDeleteConfirm !== accountDeletionConfirmText) return;

		isLoading = true;

		const deleteAccountResp = await fetch('/api/account/delete', { method: 'DELETE' });
		if (deleteAccountResp.ok) {
			await localDb.accounts.clear();
			authStore.set(undefined);
			goto('/', { replaceState: true });
		}

		isLoading = false;
	}
</script>

{#if isLoading}
	<Loading />
{:else}
	<div class="p-4 pb-0">
		<h1 class="text-base-content mb-2 text-3xl">{$_('themes')}</h1>
		<div class="flex flex-col flex-wrap gap-4 sm:flex-row">
			{#each THEMES as theme}
				<button
					data-theme={theme}
					onclick={async () => await setTheme(theme)}
					class="btn btn-lg bg-base-100 border-base-300 text-base-content flex w-full items-center justify-between rounded-xl border p-3 shadow transition hover:shadow-md sm:w-auto"
				>
					<span class="text-sm font-semibold capitalize">{theme}</span>
					<div class="ml-4 flex space-x-1">
						<div class="bg-primary h-4 w-2 rounded"></div>
						<div class="bg-secondary h-4 w-2 rounded"></div>
						<div class="bg-accent h-4 w-2 rounded"></div>
					</div>
				</button>
			{/each}
		</div>
	</div>

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

			<h1 class="text-base-content mt-5 text-3xl">{$_('account.deleteAccount')}</h1>
			<form onsubmit={deleteAccount}>
				<div>
					<label class="label label-text" for="username"
						>{$_('account.deleteConfirm', {
							content: accountDeletionConfirmText
						})}</label
					>
					<input
						bind:value={accountDeleteConfirm}
						type="text"
						class="input w-full"
						id="username"
						class:border-warning={accountDeleteConfirm !== accountDeletionConfirmText}
						class:border-success={accountDeleteConfirm === accountDeletionConfirmText}
					/>
				</div>
				<button class="btn btn-warning mt-2">{$_('account.deleteAccount')}</button>
			</form>
		</div>
	</main>
{/if}
