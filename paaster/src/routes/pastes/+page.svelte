<script lang="ts">
	import { localDb, type Paste } from '$lib/client/dexie';
	import { authStore } from '$lib/client/stores';
	import { relativeDate } from '$lib/date';
	import sodium from 'libsodium-wrappers-sumo';
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';

	let { data } = $props();

	let bookmarkedPastes: Paste[] = $state([]);

	onMount(async () => {
		const results = await localDb.pastes.orderBy('created').reverse().toArray();
		if (results) {
			bookmarkedPastes = results;
		}

		if (data.pastes) {
			await sodium.ready;
			authStore.subscribe((auth) => {
				if (!auth || !data.pastes) return;

				const rawAccountMasterKey = sodium.from_base64(auth.masterPassword);

				data.pastes.forEach((paste) => {
					const rawPasteKey = sodium.crypto_secretbox_open_easy(
						sodium.from_base64(paste.paste.key),
						sodium.from_base64(paste.paste.nonce),
						rawAccountMasterKey
					);
					const rawAccessKey = sodium.crypto_secretbox_open_easy(
						sodium.from_base64(paste.accessKey.key),
						sodium.from_base64(paste.accessKey.nonce),
						rawAccountMasterKey
					);

					bookmarkedPastes.unshift({
						id: paste.paste.id,
						accessKey: sodium.to_base64(rawAccessKey),
						masterKey: sodium.to_base64(rawPasteKey),
						created: paste.created,
						name: undefined
					});
				});
			});
		}
	});

	async function deletePaste(pasteId: string, accessKey: string) {
		const deletePasteResponse = await fetch(`/api/paste/${pasteId}`, {
			method: 'DELETE',
			headers: {
				Authorization: `Bearer ${accessKey}`
			}
		});
		if (deletePasteResponse.ok) {
			bookmarkedPastes = bookmarkedPastes.filter((value) => {
				return value.id !== pasteId;
			});
		}
	}
</script>

{#if bookmarkedPastes.length > 0}
	<div class="grid grid-cols-1 gap-4 p-5 md:grid-cols-4">
		{#each bookmarkedPastes as paste}
			<div class="bg-neutral-content rounded-lg p-4">
				<div class="mb-5">
					<h2 class="text-lg font-semibold">{paste.name ?? paste.id}</h2>
					<p class="text-sm text-neutral-500">{relativeDate(paste.created)}</p>
				</div>
				<div class="flex space-x-2 sm:ml-auto sm:mt-0 sm:space-x-4">
					<a href={`/${paste.id}#${paste.masterKey}`} class="btn btn-primary">Go to</a>
					{#if paste.accessKey}
						<button
							onclick={async () => await deletePaste(paste.id, paste.accessKey as string)}
							class="btn btn-outline">{$_('paste_actions.delete.button')}</button
						>
					{/if}
				</div>
			</div>
		{/each}
	</div>
{:else}
	<p class="p-3 text-xl">{$_('no_saved_pastes')}</p>
{/if}
