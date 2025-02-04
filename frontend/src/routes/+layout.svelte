<script lang="ts">
	import '$lib/i18n';
	import { _ } from 'svelte-i18n';
	import { pwaInfo } from 'virtual:pwa-info';

	interface Props {
		children?: import('svelte').Snippet;
	}

	let { children }: Props = $props();

	let webManifestLink = $derived(pwaInfo ? pwaInfo.webManifest.linkTag : '');
</script>

<svelte:head>
	{@html webManifestLink}
</svelte:head>

<nav>
	<a href="/"
		><h1>
			{import.meta.env.VITE_NAME ? import.meta.env.VITE_NAME : 'paaster'}
		</h1></a
	>
	<ul>
		<li>
			<a href="https://github.com/WardPearce/paaster" target="_blank" rel="noopener noreferrer">
				<i class="lab la-github"></i></a
			>
		</li>
		<li>
			<a href="/pastes" class="button"><i class="lab la-buffer"></i>{$_('saved_pastes')}</a>
		</li>
	</ul>
</nav>

{@render children?.()}
