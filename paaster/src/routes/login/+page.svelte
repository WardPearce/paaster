<script lang="ts">
	import { goto } from '$app/navigation';
	import { localDb } from '$lib/client/dexie';
	import { authStore } from '$lib/client/stores';
	import sodium from 'libsodium-wrappers-sumo';
	import { _ } from 'svelte-i18n';

	let loginMode = $state(true);
	let rememberMe = $state(true);

	let rawUsername: string | undefined = $state();
	let rawPassword: string | undefined = $state();

	let errorMsg: string | undefined = $state();

	async function createAccount(event: SubmitEvent) {
		event.preventDefault();

		await sodium.ready;

		await localDb.accounts.clear();

		if (!rawPassword || !rawUsername) return;

		errorMsg = undefined;

		const masterPasswordSalt = sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES);

		const masterPassword = sodium.crypto_pwhash(
			sodium.crypto_secretbox_KEYBYTES,
			rawPassword,
			masterPasswordSalt,
			sodium.crypto_pwhash_OPSLIMIT_SENSITIVE,
			sodium.crypto_pwhash_MEMLIMIT_SENSITIVE,
			sodium.crypto_pwhash_ALG_DEFAULT
		);

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

		createAccountPayload.append('username', rawUsername);

		const createAccountResp = await fetch('/api/account/create', {
			method: 'POST',
			body: createAccountPayload
		});
		if (createAccountResp.ok) {
			const createAccountJson = await createAccountResp.json();

			const toStore = {
				id: createAccountJson.userId,
				masterPassword: sodium.to_base64(masterPassword)
			};

			if (rememberMe) await localDb.accounts.add(toStore);

			authStore.set(toStore);

			goto('/', { replaceState: true });
		} else {
			try {
				errorMsg = (await createAccountResp.json()).message;
			} catch {
				errorMsg = await createAccountResp.text();
			}
		}
	}

	async function logIntoAccount(event: SubmitEvent) {
		event.preventDefault();

		await localDb.accounts.clear();

		if (!rawPassword || !rawUsername) return;

		errorMsg = undefined;

		const getSaltResponse = await fetch(`/api/account/${rawUsername}/public`);
		if (getSaltResponse.ok) {
			const getSaltJson = await getSaltResponse.json();

			const masterPassword = sodium.crypto_pwhash(
				sodium.crypto_secretbox_KEYBYTES,
				rawPassword,
				sodium.from_base64(getSaltJson.masterPasswordSalt),
				sodium.crypto_pwhash_OPSLIMIT_SENSITIVE,
				sodium.crypto_pwhash_MEMLIMIT_SENSITIVE,
				sodium.crypto_pwhash_ALG_DEFAULT
			);

			const serverSidePassword = sodium.crypto_pwhash(
				32,
				masterPassword,
				sodium.from_base64(getSaltJson.serverSide.salt),
				sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
				sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
				sodium.crypto_pwhash_ALG_DEFAULT
			);

			const loginPayload = new FormData();
			loginPayload.append('serverSidePassword', sodium.to_base64(serverSidePassword));

			const loginResponse = await fetch(`/api/account/${rawUsername}/login`, {
				method: 'POST',
				body: loginPayload
			});
			if (loginResponse.ok) {
				const loginResponseJson = await loginResponse.json();

				const toStore = {
					id: loginResponseJson.userId,
					masterPassword: sodium.to_base64(masterPassword)
				};

				if (rememberMe) await localDb.accounts.add(toStore);

				authStore.set(toStore);

				goto('/', { replaceState: true });
			} else {
				try {
					errorMsg = (await loginResponse.json()).message;
				} catch {
					errorMsg = await loginResponse.text();
				}
			}
		} else {
			try {
				errorMsg = (await getSaltResponse.json()).message;
			} catch {
				errorMsg = await getSaltResponse.text();
			}
		}
	}
</script>

<div class="flex items-center justify-center pt-5">
	<form onsubmit={loginMode ? logIntoAccount : createAccount}>
		{#if errorMsg}
			<div class="alert alert-warning mb-4" role="alert">
				{errorMsg}
			</div>
		{/if}
		<div class="w-full">
			<label class="label label-text" for="username">{$_('account.username')}</label>
			<input bind:value={rawUsername} type="text" class="input" id="username" />
		</div>
		<div class="w-full">
			<label class="label label-text" for="password">{$_('account.password')}</label>
			<input bind:value={rawPassword} type="password" class="input" id="password" />
		</div>
		<div class="pb-2 pt-2">
			<div class="flex items-center gap-1">
				<input
					bind:checked={rememberMe}
					type="checkbox"
					class="switch switch-primary"
					id="remember-me"
				/>
				<label class="label label-text text-base" for="remember-me">{$_('account.remember')}</label>
			</div>
		</div>
		<div>
			<button class="btn btn-primary">
				{#if loginMode}
					{$_('account.login')}
				{:else}
					{$_('account.create')}
				{/if}
			</button>
			<button class="btn btn-outline" onclick={() => (loginMode = !loginMode)}>
				{#if !loginMode}
					{$_('account.already_have_account')}
				{:else}
					{$_('account.create_new_account')}
				{/if}
			</button>
		</div>
	</form>
</div>
