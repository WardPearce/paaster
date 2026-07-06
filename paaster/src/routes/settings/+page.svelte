<script lang="ts">
	import { goto } from '$app/navigation';
	import { localDb } from '$lib/client/dexie';
	import { secretBoxEncryptFromMaster } from '$lib/client/sodiumWrapped';
	import { authStore, themeStore } from '$lib/client/stores';
	import { setTheme } from '$lib/client/theme';
	import Loading from '$lib/components/Loading.svelte';
	import QrCode from '$lib/components/QrCode.svelte';
	import { THEMES } from '$lib/consts';
	import * as comlink from 'comlink';
	import sodium from 'libsodium-wrappers-sumo';
	import { onDestroy, onMount } from 'svelte';
	import { _ } from '$lib/i18n';
	import { relativeDate } from '$lib/client/date';
	import { get } from 'svelte/store';
	import { pasteDeletionTimes } from '$lib/client/paste';
	import { resolve } from '$app/paths';

	let { data }: { data: { expireAfter: number; username: string } } = $props();

	let worker: Worker | undefined;
	let derivePassword:
		| ((rawPassword: string, passwordSalt: Uint8Array) => Promise<Uint8Array>)
		| undefined;

	let errorMsg: string | undefined = $state();
	let isLoading = $state(false);

	let rawCurrentPassword: string | undefined = $state();
	let rawPasswordReset: string | undefined = $state();

	let deletePassword: string | undefined = $state();
	let accountDeleteConfirm: string | undefined = $state();
	const accountDeletionConfirmText = get(_)('account.deleteConfirmContent');

	async function deriveCurrentServerSidePassword(password: string): Promise<string> {
		const resp = await fetch(`/api/account/${data.username}/public`);
		if (!resp.ok) throw new Error('Failed to fetch account info');
		const saltJson = await resp.json();
		const masterPassword = await derivePassword!(
			password,
			sodium.from_base64(saltJson.masterPasswordSalt)
		);
		const serverSidePw = sodium.crypto_pwhash(
			32,
			masterPassword,
			sodium.from_base64(saltJson.serverSide.salt),
			sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
			sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
			sodium.crypto_pwhash_ALG_DEFAULT
		);
		return sodium.to_base64(serverSidePw);
	}

	let defaultPasteDelectionTime = $state(data.expireAfter);

	let twoFactorSecret: string | undefined = $state();
	let twoFactorURI: string | undefined = $state();
	let twoFactorVerified = $state(false);
	let twoFactorLoading = $state(false);
	let secretCopied = $state(false);
	let twoFactorToken = $state('');
	let twoFactorVerifyError: string | undefined = $state();
	let twoFactorPassword = $state('');
	let showTwoFactorPassword = $state(false);
	let twoFactorAction: 'enable' | 'disable' | null = $state(null);

	let sessions: {
		sessionId: string;
		current: boolean;
		created: string;
		lastUsed: string;
		expiresAt: string;
	}[] = $state([]);
	let revokingSession: string | null = $state(null);

	async function loadSessions() {
		const resp = await fetch('/api/account/sessions');
		if (resp.ok) {
			const data = await resp.json();
			sessions = data.sessions;
		}
	}

	async function revokeSession(sessionId: string) {
		revokingSession = sessionId;
		const payload = new FormData();
		payload.append('sessionId', sessionId);
		const resp = await fetch('/api/account/sessions', { method: 'DELETE', body: payload });
		if (resp.ok) {
			sessions = sessions.filter((s) => s.sessionId !== sessionId);
		}
		revokingSession = null;
	}

	onMount(async () => {
		worker = new Worker(new URL('../../workers/derivePassword.ts', import.meta.url), {
			type: 'module'
		});
		const workerApi = comlink.wrap(worker);

		// @ts-ignore
		derivePassword = workerApi.derivePassword;

		const resp = await fetch('/api/account/2fa');
		if (resp.ok) {
			const { secret, uri, verified } = await resp.json();
			twoFactorSecret = secret;
			twoFactorURI = uri;
			twoFactorVerified = verified;
		}

		await loadSessions();
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

		if (!derivePassword || !rawCurrentPassword || !rawPasswordReset || !auth) return;

		await sodium.ready;

		await localDb.accounts.clear();

		errorMsg = undefined;

		let currentServerSidePassword: string;
		try {
			currentServerSidePassword = await deriveCurrentServerSidePassword(rawCurrentPassword);
		} catch {
			errorMsg = 'Failed to verify current password';
			isLoading = false;
			return;
		}

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
		createAccountPayload.append('currentServerSidePassword', currentServerSidePassword);
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

			goto(resolve('/'), { replaceState: true });
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

		if (accountDeleteConfirm !== accountDeletionConfirmText || !deletePassword) return;

		isLoading = true;

		errorMsg = undefined;

		let currentServerSidePassword: string;
		try {
			currentServerSidePassword = await deriveCurrentServerSidePassword(deletePassword);
		} catch {
			errorMsg = 'Failed to verify password';
			isLoading = false;
			return;
		}

		const payload = new FormData();
		payload.append('serverSidePassword', currentServerSidePassword);

		const deleteAccountResp = await fetch('/api/account/delete', {
			method: 'DELETE',
			body: payload
		});
		if (deleteAccountResp.ok) {
			await localDb.accounts.clear();
			authStore.set(undefined);
			goto(resolve('/'), { replaceState: true });
		} else {
			try {
				errorMsg = (await deleteAccountResp.json()).message;
			} catch {
				errorMsg = await deleteAccountResp.text();
			}
		}

		isLoading = false;
	}

	async function setDefaultPasteExpiry() {
		const payload = new FormData();
		payload.append('expireAfter', defaultPasteDelectionTime.toString());

		await fetch('/api/account/defaults', { method: 'POST', body: payload });
	}

	async function enable2FA() {
		if (!twoFactorPassword) {
			twoFactorAction = 'enable';
			showTwoFactorPassword = true;
			return;
		}

		twoFactorLoading = true;

		let serverSidePassword: string;
		try {
			serverSidePassword = await deriveCurrentServerSidePassword(twoFactorPassword);
		} catch {
			twoFactorLoading = false;
			return;
		}

		const payload = new FormData();
		payload.append('serverSidePassword', serverSidePassword);

		const resp = await fetch('/api/account/2fa', { method: 'POST', body: payload });
		if (resp.ok) {
			const { secret, uri } = await resp.json();
			twoFactorSecret = secret;
			twoFactorURI = uri;
			twoFactorToken = '';
			twoFactorVerifyError = undefined;
			showTwoFactorPassword = false;
			twoFactorPassword = '';
			twoFactorAction = null;
		}
		twoFactorLoading = false;
	}

	async function verify2FA(event: Event) {
		event.preventDefault();
		twoFactorLoading = true;
		twoFactorVerifyError = undefined;

		const payload = new FormData();
		payload.append('token', twoFactorToken);

		const resp = await fetch('/api/account/2fa/verify', { method: 'POST', body: payload });
		if (resp.ok) {
			twoFactorVerified = true;
			twoFactorToken = '';
		} else {
			twoFactorVerifyError = get(_)('account.twoFactor.invalidCode');
		}
		twoFactorLoading = false;
	}

	async function cancel2FASetup() {
		await fetch('/api/account/2fa', { method: 'DELETE' });
		twoFactorSecret = undefined;
		twoFactorURI = undefined;
		twoFactorToken = '';
		twoFactorVerifyError = undefined;
		showTwoFactorPassword = false;
		twoFactorPassword = '';
		twoFactorAction = null;
	}

	async function disable2FA() {
		if (!twoFactorPassword) {
			twoFactorAction = 'disable';
			showTwoFactorPassword = true;
			return;
		}

		twoFactorLoading = true;

		let serverSidePassword: string;
		try {
			serverSidePassword = await deriveCurrentServerSidePassword(twoFactorPassword);
		} catch {
			twoFactorLoading = false;
			return;
		}

		const payload = new FormData();
		payload.append('serverSidePassword', serverSidePassword);

		const resp = await fetch('/api/account/2fa', { method: 'DELETE', body: payload });
		if (resp.ok) {
			twoFactorSecret = undefined;
			twoFactorURI = undefined;
			twoFactorVerified = false;
			showTwoFactorPassword = false;
			twoFactorPassword = '';
			twoFactorAction = null;
		}
		twoFactorLoading = false;
	}

	async function copySecret() {
		if (twoFactorSecret) {
			await navigator.clipboard.writeText(twoFactorSecret);
			secretCopied = true;
			setTimeout(() => {
				secretCopied = false;
			}, 2000);
		}
	}
</script>

{#if isLoading}
	<Loading />
{:else}
	<div class="mx-auto max-w-2xl space-y-8 px-4 py-8 sm:px-6">
		<div class="card border-base-content/20 border">
			<div class="card-body p-6">
				<h2 class="text-base-content text-xl font-semibold">{$_('themes')}</h2>
				<div class="rounded-box mt-4 max-h-32 overflow-y-auto">
					<div class="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
						{#each THEMES as theme (theme)}
							<div class="flex flex-col items-center gap-1">
								<div
									data-theme={theme}
									onclick={async () => await setTheme(theme)}
									role="presentation"
									class={'bg-base-100 text-base-content w-full cursor-pointer rounded-xl border p-3 transition hover:scale-105 ' +
										($themeStore === theme
											? 'border-primary shadow-primary/20 shadow-md'
											: 'border-base-content/20 hover:border-base-content/40')}
								>
									<div class="flex flex-wrap gap-1">
										<div class="bg-primary h-3 w-5 rounded-full"></div>
										<div class="bg-secondary h-3 w-5 rounded-full"></div>
										<div class="bg-accent h-3 w-5 rounded-full"></div>
										<div class="bg-success h-3 w-5 rounded-full"></div>
										<div class="bg-error h-3 w-5 rounded-full"></div>
										<div class="bg-warning h-3 w-5 rounded-full"></div>
										<div class="bg-info h-3 w-5 rounded-full"></div>
									</div>
								</div>
								<span class="text-base-content/70 text-xs font-medium capitalize">{theme}</span>
							</div>
						{/each}
					</div>
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
						<label class="label label-text mb-1" for="current-password"
							>{$_('account.currentPassword')}</label
						>
						<input
							bind:value={rawCurrentPassword}
							type="password"
							class="input w-full"
							id="current-password"
							required
						/>
					</div>
					<div>
						<label class="label label-text mb-1" for="new-password"
							>{$_('account.newPassword')}</label
						>
						<input
							bind:value={rawPasswordReset}
							type="password"
							class="input w-full"
							id="new-password"
							required
						/>
					</div>
					<button class="btn btn-primary">{$_('account.changePassword')}</button>
				</form>
			</div>
		</div>

		<div class="card border-base-content/20 border">
			<div class="card-body p-6">
				<h2 class="text-base-content text-xl font-semibold">{$_('account.twoFactor.title')}</h2>
				{#if showTwoFactorPassword}
					<div class="mt-4 max-w-xs space-y-3">
						<p class="text-base-content/70 text-sm">
							{twoFactorAction === 'enable'
								? $_('account.twoFactor.enterPasswordEnable')
								: $_('account.twoFactor.enterPasswordDisable')}
						</p>
						<label class="label label-text mb-1" for="two-factor-password"
							>{$_('account.password')}</label
						>
						<input
							bind:value={twoFactorPassword}
							type="password"
							class="input w-full"
							id="two-factor-password"
						/>
						<div class="flex gap-2">
							<button
								class="btn btn-primary"
								onclick={twoFactorAction === 'enable' ? enable2FA : disable2FA}
								disabled={twoFactorLoading || !twoFactorPassword}
							>
								{$_('account.confirm')}
							</button>
							<button
								class="btn btn-ghost"
								onclick={() => {
									showTwoFactorPassword = false;
									twoFactorPassword = '';
									twoFactorAction = null;
								}}
							>
								{$_('account.cancel')}
							</button>
						</div>
					</div>
				{:else if twoFactorVerified}
					<p class="text-base-content/70 mt-2 text-sm">{$_('account.twoFactor.enabled')}</p>
					<div class="mt-4">
						<button class="btn btn-warning" onclick={disable2FA} disabled={twoFactorLoading}>
							{$_('account.twoFactor.disable')}
						</button>
					</div>
				{:else if twoFactorSecret && twoFactorURI}
					<p class="text-base-content/70 mt-2 text-sm">{$_('account.twoFactor.description')}</p>
					<div class="mt-4 flex justify-center">
						<QrCode data={twoFactorURI} width={200} height={200} />
					</div>
					<div class="mt-4 flex items-center gap-2">
						<span class="text-base-content/70 text-sm">{$_('account.twoFactor.secret')}:</span>
						<code class="bg-base-200 rounded px-2 py-1 font-mono text-sm">{twoFactorSecret}</code>
						<button class="btn btn-xs" onclick={copySecret}>
							{secretCopied ? $_('account.twoFactor.copied') : $_('account.twoFactor.copy')}
						</button>
					</div>
					<form onsubmit={verify2FA} class="mt-4 max-w-xs space-y-3">
						<p class="text-base-content/70 text-sm">{$_('account.twoFactor.enterCode')}</p>
						<input
							bind:value={twoFactorToken}
							type="text"
							class="input w-full"
							maxlength={6}
							placeholder="000000"
							inputmode="numeric"
							pattern="[0-9]*"
						/>
						{#if twoFactorVerifyError}
							<div class="alert alert-error py-2 text-sm" role="alert">
								{twoFactorVerifyError}
							</div>
						{/if}
						<div class="flex gap-2">
							<button
								class="btn btn-primary"
								type="submit"
								disabled={twoFactorLoading || twoFactorToken.length !== 6}
							>
								{$_('account.twoFactor.verify')}
							</button>
							<button
								class="btn btn-ghost"
								type="button"
								onclick={cancel2FASetup}
								disabled={twoFactorLoading}
							>
								{$_('account.twoFactor.cancelSetup')}
							</button>
						</div>
					</form>
				{:else}
					<p class="text-base-content/70 mt-2 text-sm">{$_('account.twoFactor.notConfigured')}</p>
					<div class="mt-4">
						<button class="btn btn-primary" onclick={enable2FA} disabled={twoFactorLoading}>
							{$_('account.twoFactor.enable')}
						</button>
					</div>
				{/if}
			</div>
		</div>

		<div class="card border-base-content/20 border">
			<div class="card-body p-6">
				<h2 class="text-base-content text-xl font-semibold">{$_('sessions.title')}</h2>
				<div class="mt-4 space-y-3">
					{#each sessions as session (session.sessionId)}
						<div
							class="border-base-content/10 flex items-center justify-between rounded-lg border p-3 {session.current
								? 'border-primary/30'
								: ''}"
						>
							<div class="min-w-0 flex-1">
								<p class="text-base-content font-medium">
									{session.current ? $_('sessions.current') : session.sessionId.slice(0, 8) + '...'}
								</p>
								<div class="text-base-content/50 mt-0.5 space-y-0.5 text-xs">
									<p>{$_('sessions.created', { date: relativeDate(session.created) })}</p>
									<p>{$_('sessions.lastUsed', { date: relativeDate(session.lastUsed) })}</p>
									<p>{$_('sessions.expires', { date: relativeDate(session.expiresAt) })}</p>
								</div>
							</div>
							{#if !session.current}
								<button
									class="btn btn-error btn-xs"
									disabled={revokingSession === session.sessionId}
									onclick={() => revokeSession(session.sessionId)}
								>
									{revokingSession === session.sessionId
										? $_('sessions.revoking')
										: $_('sessions.revoke')}
								</button>
							{/if}
						</div>
					{/each}
					{#if sessions.length === 0}
						<p class="text-base-content/50 text-sm">{$_('sessions.noOtherSessions')}</p>
					{/if}
				</div>
			</div>
		</div>

		<div class="card border-base-content/20 border">
			<div class="card-body p-6">
				<h2 class="text-base-content text-xl font-semibold">{$_('account.deleteAccount')}</h2>
				<form onsubmit={deleteAccount} class="mt-4 max-w-sm space-y-4">
					<div>
						<label class="label label-text mb-1" for="delete-password"
							>{$_('account.password')}</label
						>
						<input
							bind:value={deletePassword}
							type="password"
							class="input w-full"
							id="delete-password"
							required
						/>
					</div>
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
							class:border-warning={accountDeleteConfirm !== accountDeletionConfirmText &&
								accountDeleteConfirm}
							class:border-success={accountDeleteConfirm === accountDeletionConfirmText}
						/>
					</div>
					<button
						class="btn btn-warning"
						disabled={accountDeleteConfirm !== accountDeletionConfirmText || !deletePassword}
					>
						{$_('account.deleteAccount')}
					</button>
				</form>
			</div>
		</div>
	</div>
{/if}
