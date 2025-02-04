<script lang="ts">
	import { preventDefault } from 'svelte/legacy';

	import toast from 'svelte-french-toast';
	import { _ } from 'svelte-i18n';
	import { closeModal } from 'svelte-modals';

	import { onMount } from 'svelte';
	import { getPaste, updatePaste } from '../lib/savedPaste';

	interface Props {
		isOpen: boolean;
		pasteId: string;
		completedEvent?: Function | null;
	}

	let { isOpen, pasteId, completedEvent = null }: Props = $props();

	let newName: string = $state('');

	onMount(async () => {
		const paste = await getPaste(pasteId);
		if (paste.name) newName = paste.name;
	});

	async function nameUpdated() {
		await updatePaste(pasteId, { name: newName });
		if (completedEvent) completedEvent(pasteId);
		toast.success($_('paste_actions.rename.success'));
		closeModal();
	}
</script>

{#if isOpen}
	<div role="dialog" class="modal">
		<div class="contents">
			<div class="header">
				<h2>{$_('paste_actions.rename.model.header')}</h2>
			</div>
			<form onsubmit={preventDefault(nameUpdated)} class="inline-form">
				<input bind:value={newName} type="text" placeholder="..." autofocus={true} />
				<button>{$_('paste_actions.rename.button')}</button>
			</form>
		</div>
	</div>
{/if}
