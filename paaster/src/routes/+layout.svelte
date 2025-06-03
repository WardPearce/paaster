<script lang="ts">
	import BookMarkedIcon from 'lucide-svelte/icons/book-marked';
	import LoginIcon from 'lucide-svelte/icons/log-in';
	import LogoutIcon from 'lucide-svelte/icons/log-out';
	import MenuIcon from 'lucide-svelte/icons/menu';
	import SettingsIcon from 'lucide-svelte/icons/settings';
	import XIcon from 'lucide-svelte/icons/x';
	import { _ } from 'svelte-i18n';

	import { afterNavigate, goto } from '$app/navigation';
	import { localDb } from '$lib/client/dexie';
	import { authStore, themeStore } from '$lib/client/stores';
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

<nav class="navbar bg-base-100 border-base-content/10 stickytop-0 z-50 w-full border-b">
	<div class="w-full md:flex md:items-center md:gap-2">
		<div class="flex items-center justify-between">
			<div class="navbar-start items-center justify-between max-md:w-full">
				<a class="link text-base-content text-xl font-semibold no-underline" href="/">paaster.io</a>
				<div class="md:hidden">
					<button
						type="button"
						class="collapse-toggle btn btn-outline btn-primary btn-sm btn-square"
						data-collapse="#default-navbar-collapse"
						aria-controls="default-navbar-collapse"
						aria-label="Toggle navigation"
					>
						<span class="collapse-open:hidden size-6"><MenuIcon /></span>
						<span class="collapse-open:block hidden size-6"><XIcon /></span>
					</button>
				</div>
			</div>
		</div>
		<div
			id="default-navbar-collapse"
			class="md:navbar-end collapse hidden grow basis-full overflow-hidden transition-[height] duration-300 max-md:w-full"
		>
			<ul class="menu md:menu-horizontal gap-2 p-0 text-base max-md:mt-2">
				{#if $authStore}
					<li>
						<a href="/settings" class="btn btn-text h-full p-3"
							><SettingsIcon /> {$_('account.settings')}</a
						>
					</li>
				{/if}
				<li>
					<a href="/pastes" class="btn btn-text h-full p-3"
						><BookMarkedIcon /> {$_('saved_pastes')}</a
					>
				</li>
				<li>
					{#if $authStore}
						<button onclick={logout} class="btn btn-primary h-full p-3"
							><LogoutIcon />{$_('account.logout')}</button
						>
					{:else}
						<a href="/login" class="btn btn-primary h-full p-3"
							><LoginIcon />{$_('account.login')}</a
						>
					{/if}
				</li>
			</ul>
		</div>
	</div>
</nav>

<div class="flex min-h-screen flex-col">
	<div class="flex-grow">
		{@render children?.()}
	</div>

	<footer class="footer mt-auto items-center px-6 py-4">
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
