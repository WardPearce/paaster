<script lang="ts">
	import { navigating } from '$app/stores';
	import Spinner from '$lib/Spinner.svelte';
	import '$lib/i18n';
	import { _ } from 'svelte-i18n';

	import { Toaster } from 'svelte-french-toast';
	import { Modals, closeModal } from 'svelte-modals';
</script>

<nav>
	<a href="/"
		><h1>
			{import.meta.env.VITE_NAME ? import.meta.env.VITE_NAME : 'paaster'}
		</h1></a
	>
	<ul>
		<li>
			<a href="https://github.com/WardPearce/paaster" target="_blank" rel="noopener noreferrer">
				<i class="lab la-github" /></a
			>
		</li>
		<li>
			<a href="/pastes" class="button"><i class="lab la-buffer" />{$_('saved_pastes')}</a>
		</li>
	</ul>
</nav>

{#if $navigating}
	<Spinner />
{:else}
	<slot />
{/if}

<Toaster toastOptions={{ className: 'toast' }} />

<Modals>
	<div slot="backdrop" class="backdrop" on:click={closeModal} on:keydown={() => {}} />
</Modals>
