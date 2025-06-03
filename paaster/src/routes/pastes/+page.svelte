<script lang="ts">
	import { relativeDate } from '$lib/client/date.js';
	import { localDb, type Paste } from '$lib/client/dexie';
	import { deletePaste } from '$lib/client/paste.js';
	import { authStore } from '$lib/client/stores';
	import sodium from 'libsodium-wrappers-sumo';
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';

	let { data } = $props();

	let bookmarkedPastes: Paste[] = $state([]);

	onMount(async () => {
		if (data.pastes) {
			await sodium.ready;
			authStore.subscribe((auth) => {
				if (!auth || !data.pastes) return;

				const rawEncryptionKey = sodium.from_base64(auth.encryptionKey);

				data.pastes.forEach((paste) => {
					const rawPasteKey = sodium.crypto_secretbox_open_easy(
						sodium.from_base64(paste.paste.key),
						sodium.from_base64(paste.paste.nonce),
						rawEncryptionKey
					);
					const rawAccessKey = sodium.crypto_secretbox_open_easy(
						sodium.from_base64(paste.accessKey.key),
						sodium.from_base64(paste.accessKey.nonce),
						rawEncryptionKey
					);

					bookmarkedPastes.push({
						id: paste.paste.id,
						accessKey: sodium.to_base64(rawAccessKey),
						masterKey: sodium.to_base64(rawPasteKey),
						created: paste.created,
						name: undefined
					});
				});
			});
		}

		const results = await localDb.pastes.orderBy('created').reverse().toArray();
		if (results.length > 0) {
			bookmarkedPastes = [...bookmarkedPastes, ...results];
		}
	});

	async function onPasteDelete(pasteId: string, accessKey?: string) {
		await deletePaste(pasteId, accessKey);

		bookmarkedPastes = bookmarkedPastes.filter((value) => {
			return value.id !== pasteId;
		});
	}
</script>

{#if bookmarkedPastes.length > 0}
	<div class="grid grid-cols-1 gap-4 p-5 md:grid-cols-6">
		{#each bookmarkedPastes as paste (paste.id)}
			<div class="card border-base-content/20 border sm:max-w-sm">
				<div class="card-body">
					<h6 class="card-title break-text">{paste.name ?? paste.id}</h6>
					<p class="mb-2 text-sm text-neutral-500">{relativeDate(paste.created)}</p>
					<div class="card-actions">
						<a href={`/${paste.id}#${paste.masterKey}`} class="btn btn-primary">Go to</a>
						{#if paste.accessKey}
							<button
								onclick={async () => await onPasteDelete(paste.id, paste.accessKey)}
								class="btn btn-outline">{$_('paste_actions.delete.button')}</button
							>
						{/if}
					</div>
				</div>
			</div>
		{/each}
	</div>
{:else}
	<p class="p-3 text-xl">{$_('no_saved_pastes')}</p>
{/if}
