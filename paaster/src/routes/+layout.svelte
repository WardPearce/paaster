<script lang="ts">
	import BookMarkedIcon from 'lucide-svelte/icons/book-marked';
	import LoginIcon from 'lucide-svelte/icons/log-in';
	import LogoutIcon from 'lucide-svelte/icons/log-out';
	import SettingsIcon from 'lucide-svelte/icons/settings';
	import { _ } from '$lib/i18n';

	import { afterNavigate, goto } from '$app/navigation';
	import { localDb } from '$lib/client/dexie';
	import { authStore, rawModeStore } from '$lib/client/stores';
	import { setTheme } from '$lib/client/theme';
	import 'notyf/notyf.min.css';
	import { onMount } from 'svelte';
	import '../app.css';

	let { children } = $props();

	async function logout() {
		await fetch('/api/account/logout', { method: 'DELETE' });
		await localDb.accounts.clear();
		authStore.set(undefined);
		goto('/');
	}

	onMount(async () => {
		try {
			// @ts-ignore
			HSStaticMethods.autoInit();
		} catch (error) {}

		const account = await localDb.accounts.toArray();
		if (account.length > 0) {
			authStore.set({
				id: account[0].id,
				encryptionKey: account[0].encryptionKey
			});

			// Check account auth hasn't expired
			fetch('/api/account/alive').then(async (response) => {
				const responseJson = await response.json();

				if (!responseJson.loggedIn) {
					authStore.set(undefined);
					await localDb.accounts.clear();
				}
			});

			fetch('/api/account/theme').then(async (response) => {
				if (!response.ok) return;
				const responseJson = await response.json();
				setTheme(responseJson.theme, false);
			});
		}
	});

	afterNavigate(() => {
		try {
			// @ts-ignore
			HSStaticMethods.autoInit();
		} catch (error) {}
	});
</script>

{#if !$rawModeStore}
<nav class="navbar bg-base-100 border-base-content/10 sticky top-0 z-50 w-full border-b">
	<div class="mx-auto flex w-full max-w-7xl items-center justify-between px-4 sm:px-6">
		<a class="link text-base-content text-xl font-semibold no-underline" href="/">paaster.io</a>

		<div class="hidden items-center gap-1 md:flex">
			{#if $authStore}
				<a href="/settings" class="btn btn-text btn-sm"
					><SettingsIcon size={18} /> {$_('account.settings')}</a
				>
			{/if}
			<a href="/pastes" class="btn btn-text btn-sm"
				><BookMarkedIcon size={18} /> {$_('saved_pastes')}</a
			>
			{#if $authStore}
				<button onclick={logout} class="btn btn-primary btn-sm"
					><LogoutIcon size={18} />{$_('account.logout')}</button
				>
			{:else}
				<a href="/login" class="btn btn-primary btn-sm"
					><LoginIcon size={18} />{$_('account.login')}</a
				>
			{/if}
		</div>
	</div>
</nav>
{/if}

<!-- mobile bottom nav -->
<nav class="border-base-content/10 bg-base-100 fixed bottom-0 left-0 right-0 z-50 flex items-center border-t md:hidden {$rawModeStore ? 'hidden' : ''}">
	<a href="/pastes" class="flex flex-1 flex-col items-center gap-0.5 py-3 text-xs text-base-content/70 hover:text-primary active:text-primary">
		<BookMarkedIcon size={22} />
		{$_('saved_pastes')}
	</a>
	{#if $authStore}
		<a href="/settings" class="flex flex-1 flex-col items-center gap-0.5 py-3 text-xs text-base-content/70 hover:text-primary active:text-primary">
			<SettingsIcon size={22} />
			{$_('account.settings')}
		</a>
		<button onclick={logout} class="flex flex-1 flex-col items-center gap-0.5 py-3 text-xs text-base-content/70 hover:text-primary active:text-primary">
			<LogoutIcon size={22} />
			{$_('account.logout')}
		</button>
	{:else}
		<a href="/login" class="flex flex-1 flex-col items-center gap-0.5 py-3 text-xs text-base-content/70 hover:text-primary active:text-primary">
			<LoginIcon size={22} />
			{$_('account.login')}
		</a>
	{/if}
</nav>

<div class="flex min-h-screen flex-col">
	<div class="flex-grow">
		{@render children?.()}
	</div>

	<footer class="footer mt-auto items-center px-6 py-4 pb-20 md:pb-4">
		<aside class="grid-flow-col items-center">
			<p>
				<a
					class="link link-hover font-medium"
					target="_blank"
					href="https://github.com/WardPearce/paaster">Github</a
				>
			</p>
		</aside>
		<nav class="text-base-content grid-flow-col gap-4 md:place-self-center md:justify-self-end">
			<a class="link link-hover" href="/terms-of-service">Terms of service</a>
			<a class="link link-hover" href="/privacy-policy">Privacy Policy</a>
		</nav>
	</footer>
</div>
