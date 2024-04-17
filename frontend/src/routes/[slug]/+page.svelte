<script lang="ts">
	import Highlight, { HighlightAuto, LineNumbers } from 'svelte-highlight';
	import type { LanguageType } from 'svelte-highlight/languages';
	import rosPine from 'svelte-highlight/styles/ros-pine';

	export let data;

	let selectedLang: { label: string; value: string };
	let supportedLangs: {
		[key: string]: LanguageType<string>;
	} = {};
	let langImport: LanguageType<string> | null = null;
</script>

<svelte:head>
	{@html rosPine}
</svelte:head>

<div class="content">
	{#if langImport}
		<Highlight language={langImport} code={data.rawCode} let:highlighted>
			<LineNumbers {highlighted} />
		</Highlight>
	{:else}
		<HighlightAuto code={data.rawCode} let:highlighted>
			<LineNumbers {highlighted} />
		</HighlightAuto>
	{/if}
</div>

<style>
	.content {
		margin-top: 1em;
		margin-bottom: 20em;
	}

	.owner-panel {
		margin-top: 0.5em;
		display: flex;
		column-gap: 1em;
	}

	@media screen and (max-width: 1200px) {
		.owner-panel {
			flex-direction: column;
			row-gap: 1em;
		}
	}
</style>
