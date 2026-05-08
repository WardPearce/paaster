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
	import { pasteDeletionTimes } from '$lib/client/paste';

	let { data }: { data: { expireAfter: number } } = $props();

	let worker: Worker | undefined;
	let derivePassword:
		| ((rawPassword: string, passwordSalt: Uint8Array) => Promise<Uint8Array>)
		| undefined;

	let errorMsg: string | undefined = $state();
	let isLoading = $state(false);

	let rawPasswordReset: string | undefined = $state();

	let accountDeleteConfirm: string | undefined = $state();
	const accountDeletionConfirmText = get(_)('account.deleteConfirmContent');

	let defaultPasteDelectionTime = $state(data.expireAfter);

	onMount(async () => {
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

	async function setDefaultPasteExpiry() {
		const payload = new FormData();
		payload.append('expireAfter', defaultPasteDelectionTime.toString());

		await fetch('/api/account/defaults', { method: 'POST', body: payload });
	}
</script>

{#if isLoading}
	<Loading />
{:else}
	<div class="mx-auto max-w-2xl space-y-8 px-4 py-8 sm:px-6">
		<div class="card border-base-content/20 border">
			<div class="card-body p-6">
				<h2 class="text-base-content text-xl font-semibold">{$_('themes')}</h2>
				<div class="mt-4 flex flex-wrap gap-3">
					{#each THEMES as theme (theme)}
						<button
							data-theme={theme}
							onclick={async () => await setTheme(theme)}
							class="bg-base-100 border-base-300 text-base-content inline-flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium capitalize transition hover:shadow-md"
						>
							{theme}
							<div class="flex gap-0.5">
								<div class="bg-primary h-3 w-2 rounded"></div>
								<div class="bg-secondary h-3 w-2 rounded"></div>
								<div class="bg-accent h-3 w-2 rounded"></div>
							</div>
						</button>
					{/each}
				</div>
			</div>
		</div>

		<div class="card border-base-content/20 border">
			<div class="card-body p-6">
				<h2 class="text-base-content text-xl font-semibold">{$_('defaultPasteExpiry')}</h2>
				<div class="mt-4 max-w-xs">
					<select
						class="select w-full"
						onchange={setDefaultPasteExpiry}
						bind:value={defaultPasteDelectionTime}
					>
						{#each pasteDeletionTimes() as period (period.value)}
							<option value={period.value}>{period.label}</option>
						{/each}
					</select>
				</div>
			</div>
		</div>

		{#if errorMsg}
			<div class="alert alert-warning" role="alert">
				{errorMsg}
			</div>
		{/if}

		<div class="card border-base-content/20 border">
			<div class="card-body p-6">
				<h2 class="text-base-content text-xl font-semibold">{$_('account.passwordReset')}</h2>
				<form onsubmit={changePassword} class="mt-4 max-w-sm space-y-4">
					<div>
						<label class="label label-text mb-1" for="password">{$_('account.newPassword')}</label>
						<input bind:value={rawPasswordReset} type="password" class="input w-full" id="password" />
					</div>
					<button class="btn btn-primary">{$_('account.changePassword')}</button>
				</form>
			</div>
		</div>

		<div class="card border-base-content/20 border">
			<div class="card-body p-6">
				<h2 class="text-base-content text-xl font-semibold">{$_('account.deleteAccount')}</h2>
				<form onsubmit={deleteAccount} class="mt-4 max-w-sm space-y-4">
					<div>
						<label class="label label-text mb-1" for="username"
							>{$_('account.deleteConfirm', {
								content: accountDeletionConfirmText
							})}</label
						>
						<input
							bind:value={accountDeleteConfirm}
							type="text"
							class="input w-full"
							id="username"
							class:border-warning={accountDeleteConfirm !== accountDeletionConfirmText && accountDeleteConfirm}
							class:border-success={accountDeleteConfirm === accountDeletionConfirmText}
						/>
					</div>
					<button class="btn btn-warning" disabled={accountDeleteConfirm !== accountDeletionConfirmText}>
						{$_('account.deleteAccount')}
					</button>
				</form>
			</div>
		</div>
	</div>
{/if}