<script lang="ts">
	import { tooltip } from '@svelte-plugins/tooltips';
	import Fuse from 'fuse.js';
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
	import Search from 'svelte-search';

	import { paasterClient } from '$lib/client';
	import { relativeDate } from '$lib/date';
	import { deletePaste, listPastes, type SavedPaste } from '$lib/savedPaste';

	let savedPastes: SavedPaste[] = $state([]);
	let showPastes: SavedPaste[] = $state([]);
	let fuse: Fuse<SavedPaste>;

	onMount(async () => {
		await getPastes();
	});

	function renamePaste(pasteId: string) {}

	async function getPastes() {
		savedPastes = (await listPastes()).sort((a, b) => b.created - a.created);
		showPastes = savedPastes;
		fuse = new Fuse(savedPastes, {
			keys: ['name', 'pasteId'],
			useExtendedSearch: true,
			threshold: 0.1
		});
	}

	function onClear() {
		showPastes = savedPastes;
	}

	function onSearch(event: { detail: string }) {
		if (event.detail.length <= 1) showPastes = savedPastes;
		else showPastes = fuse.search(event.detail).map((item) => item.item);
	}

	async function deletePasteCall(pasteId: string, ownerSecret?: string) {
		if (ownerSecret) {
			await paasterClient.default.controllerPastePasteIdOwnerSecretDeletePaste(
				pasteId,
				ownerSecret
			);
		}

		await deletePaste(pasteId);
		savedPastes = savedPastes.filter((paste) => paste.pasteId !== pasteId);
		showPastes = savedPastes;
	}

	async function shareLinkToClipboard(pasteId: string, secretKey: string) {
		await navigator.clipboard.writeText(`${window.location.origin}/${pasteId}#${secretKey}`);
	}
</script>

<main>
	{#if savedPastes.length === 0}
		<h3>{$_('no_saved_pastes')} <i class="las la-heart-broken"></i></h3>
	{:else}
		<section>
			<Search hideLabel placeholder={$_('search')} on:type={onSearch} on:clear={onClear} />
		</section>
		<ul>
			{#each showPastes as paste}
				{#if paste.b64EncodedRawKey}
					<li>
						<a href={`${paste.pasteId}#${paste.b64EncodedRawKey}`}>
							<div>
								<p class="name">
									{paste.name ? paste.name : paste.pasteId}
									{#if !paste.ownerSecret}
										<i class="las la-share-alt" use:tooltip={{ content: $_('shared_with') }}></i>
									{/if}
								</p>
								<p class="info">
									{relativeDate(paste.created * 1000)}
								</p>
							</div>
						</a>
						<div class="actions">
							<button onclick={() => renamePaste(paste.pasteId)}
								><i class="las la-pencil-alt"></i>{$_('paste_actions.rename.button')}</button
							>
							<button
								onclick={async () =>
									await shareLinkToClipboard(paste.pasteId, paste.b64EncodedRawKey)}
								><i class="las la-share"></i>{$_('paste_actions.share.button')}</button
							>
							<button
								class="danger"
								onclick={async () => await deletePasteCall(paste.pasteId, paste.ownerSecret)}
								><i class="las la-trash"></i>{$_('paste_actions.delete.button')}</button
							>
						</div>
					</li>
				{/if}
			{/each}
		</ul>
	{/if}
</main>

<style>
	ul {
		list-style: none;
	}

	ul li {
		margin-top: 1em;
		display: flex;
		align-items: center;
		justify-content: space-between;
		background-color: var(--darkerBg);
		padding: 1.5em 3em;
		border-radius: 3em;
	}

	ul li .actions {
		display: flex;
		justify-content: center;
		column-gap: 0.5em;
	}

	.info {
		color: #51497e;
	}

	.name {
		display: flex;
		align-items: center;
	}

	.name i {
		font-size: 1.5em;
		margin-left: 0.2em;
	}

	@media screen and (max-width: 700px) {
		ul li {
			flex-direction: column;
			row-gap: 1em;
			align-items: center;
			border-radius: 0;
		}
	}
</style>
