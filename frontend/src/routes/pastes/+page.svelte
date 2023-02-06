<script lang="ts">
	import { listPastes, deletePaste, type SavedPaste } from '$lib/client/savedPaste';
	import { onMount } from 'svelte';
	import toast from 'svelte-french-toast';

	let savedPastes: SavedPaste[] = [];
	onMount(async () => {
		savedPastes = (await listPastes()).sort((a, b) => b.created - a.created);
	});

	async function deletePasteCall(pasteId: string, ownerSecret?: string) {
		// Add logic to delete paste from server if owner
		await deletePaste(pasteId);
		savedPastes = savedPastes.filter((paste) => paste.pasteId !== pasteId);
	}

	async function shareLinkToClipboard(pasteId: string, secretKey: string) {
		await navigator.clipboard.writeText(`${window.location.origin}/${pasteId}#${secretKey}`);
		toast.success('Share link copied');
	}
</script>

<main>
	<ul>
		{#each savedPastes as paste}
			{#if paste.b64EncodedRawKey}
				<li>
					<a href={`${paste.pasteId}#${paste.b64EncodedRawKey}`}>
						<div>
							<p class="name">
								{paste.name ? paste.name : paste.pasteId}
								{#if !paste.ownerSecret}
									<i class="las la-share-alt" />
								{/if}
							</p>
							<p class="info">
								{new Date(paste.created * 1000).toLocaleDateString('en-US', {
									year: 'numeric',
									month: 'short',
									day: 'numeric'
								})}
							</p>
						</div>
					</a>
					<div class="actions">
						<button><i class="las la-pencil-alt" />rename</button>
						<button
							on:click={async () =>
								await shareLinkToClipboard(paste.pasteId, paste.b64EncodedRawKey)}
							><i class="las la-share" />share</button
						>
						<button
							class="danger"
							on:click={async () => await deletePasteCall(paste.pasteId, paste.ownerSecret)}
							><i class="las la-trash" />delete</button
						>
					</div>
				</li>
			{/if}
		{/each}
	</ul>

	{#if savedPastes.length === 0}
		<h3>no saved pastes <i class="las la-heart-broken" /></h3>
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
