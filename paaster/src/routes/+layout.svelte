<script lang="ts">
	import BookMarkedIcon from 'lucide-svelte/icons/book-marked';
	import FileTextIcon from 'lucide-svelte/icons/file-text';
	import HomeIcon from 'lucide-svelte/icons/home';
	import LoginIcon from 'lucide-svelte/icons/log-in';
	import LogoutIcon from 'lucide-svelte/icons/log-out';
	import SettingsIcon from 'lucide-svelte/icons/settings';
	import { _ } from '$lib/i18n';
	import { page } from '$app/state';

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
			<a class="link flex flex-col leading-tight no-underline" href="/">
				<span class="text-base-content text-xl font-semibold">paaster.io</span>
				<span class="text-base-content/30 -mt-0.5 text-[10px] font-medium tracking-widest"
					>e2ee pastebin</span
				>
			</a>

			<div class="hidden items-center gap-1 md:flex">
				{#if $authStore}
					<a
						href="/settings"
						class="btn btn-sm {page.url.pathname === '/settings' ? 'btn-soft' : 'btn-text'}"
					>
						<SettingsIcon size={18} />
						{$_('account.settings')}
					</a>
				{/if}
				<a
					href="/pastes"
					class="btn btn-sm {page.url.pathname === '/pastes' ? 'btn-soft' : 'btn-text'}"
				>
					<BookMarkedIcon size={18} />
					{$_('saved_pastes')}
				</a>
				{#if $authStore}
					<button onclick={logout} class="btn btn-primary btn-sm"
						><LogoutIcon size={18} />{$_('account.logout')}</button
					>
				{:else}
					<a
						href="/login"
						class="btn btn-sm {page.url.pathname === '/login' ? 'btn-soft' : 'btn-primary'}"
					>
						<LoginIcon size={18} />{$_('account.login')}
					</a>
				{/if}
			</div>
		</div>
	</nav>
{/if}

<!-- mobile bottom nav -->
<nav
	class="border-base-content/10 bg-base-100 fixed right-0 bottom-0 left-0 z-50 flex items-center border-t md:hidden {$rawModeStore
		? 'hidden'
		: ''}"
>
	<a
		href="/"
		class="flex flex-1 flex-col items-center gap-0.5 py-3 text-xs {page.url.pathname === '/'
			? 'text-primary'
			: 'text-base-content/70'} transition-colors"
	>
		<HomeIcon size={22} />
		Home
	</a>
	<a
		href="/pastes"
		class="flex flex-1 flex-col items-center gap-0.5 py-3 text-xs {page.url.pathname === '/pastes'
			? 'text-primary'
			: 'text-base-content/70'} transition-colors"
	>
		<BookMarkedIcon size={22} />
		{$_('saved_pastes')}
	</a>
	{#if $authStore}
		<a
			href="/settings"
			class="flex flex-1 flex-col items-center gap-0.5 py-3 text-xs {page.url.pathname ===
			'/settings'
				? 'text-primary'
				: 'text-base-content/70'} transition-colors"
		>
			<SettingsIcon size={22} />
			{$_('account.settings')}
		</a>
		<button
			onclick={logout}
			class="text-base-content/70 hover:text-primary active:text-primary flex flex-1 flex-col items-center gap-0.5 py-3 text-xs transition-colors"
		>
			<LogoutIcon size={22} />
			{$_('account.logout')}
		</button>
	{:else}
		<a
			href="/login"
			class="flex flex-1 flex-col items-center gap-0.5 py-3 text-xs {page.url.pathname === '/login'
				? 'text-primary'
				: 'text-base-content/70'} transition-colors"
		>
			<LoginIcon size={22} />
			{$_('account.login')}
		</a>
	{/if}
</nav>

<div class="flex min-h-screen flex-col">
	<div class="flex-grow">
		{@render children?.()}
	</div>

	{#if !$rawModeStore}
		<footer class="border-base-content/10 mt-auto border-t">
			<div
				class="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8 pb-24 sm:flex-row sm:items-center sm:justify-between sm:pb-8"
			>
				<div class="flex flex-col gap-1">
					<a href="/" class="text-base-content text-lg font-semibold no-underline">paaster.io</a>
					<p class="text-base-content/50 text-sm">End-to-end encrypted pastebin</p>
				</div>
				<nav class="flex flex-wrap items-center gap-x-5 gap-y-2">
					<a
						class="link link-hover text-base-content/70 hover:text-base-content text-sm"
						target="_blank"
						href="https://github.com/WardPearce/paaster">GitHub</a
					>
					<a
						class="link link-hover text-base-content/70 hover:text-base-content text-sm"
						href="/terms-of-service">Terms of service</a
					>
					<a
						class="link link-hover text-base-content/70 hover:text-base-content text-sm"
						href="/privacy-policy">Privacy policy</a
					>
					<a
						class="link link-hover text-base-content/70 hover:text-base-content text-sm"
						target="_blank"
						href="https://matrix.to/#/#ward:matrix.org">Matrix</a
					>
				</nav>
			</div>
		</footer>
	{/if}
</div>
