<script lang="ts">
	import { localDb } from '$lib/client/dexie';
	import sodium from 'libsodium-wrappers-sumo';
	import { _ } from 'svelte-i18n';

	let loginMode = $state(true);

	let rawUsername: string | undefined = $state();
	let rawPassword: string | undefined = $state();

	let errorMsg: string | undefined = $state();

	async function createAccount(event: SubmitEvent) {
		event.preventDefault();

		await sodium.ready;

		if (!rawPassword || !rawUsername) return;

		errorMsg = undefined;

		const masterPasswordSalt = sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES);

		const masterPassword = sodium.crypto_pwhash(
			32,
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

		const createAccountResp = await fetch('/login/create', {
			method: 'POST',
			body: createAccountPayload
		});
		if (createAccountResp.ok) {
			const createAccountJson = await createAccountResp.json();

			await localDb.accounts.add({
				id: createAccountJson.userId,
				masterPassword: sodium.to_base64(masterPassword)
			});
		} else {
			errorMsg = await createAccountResp.text();
		}
	}

	async function logIntoAccount(event: SubmitEvent) {
		event.preventDefault();

		if (!rawPassword || !rawUsername) return;

		errorMsg = undefined;
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
		<div class="pt-5">
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
