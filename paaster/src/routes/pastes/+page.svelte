<script lang="ts">
	import { relativeDate } from '$lib/client/date.js';
	import { localDb, type Paste } from '$lib/client/dexie';
	import { deletePaste } from '$lib/client/paste.js';
	import { secretBoxDecryptFromMaster } from '$lib/client/sodiumWrapped';
	import { authStore } from '$lib/client/stores';
	import sodium from 'libsodium-wrappers-sumo';
	import { onMount } from 'svelte';
	import { _ } from '$lib/i18n';
	import FileTextIcon from 'lucide-svelte/icons/file-text';

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

					let name: string | undefined;
					if (paste.name?.value && paste.name?.nonce && paste.name?.keySalt) {
						try {
							const decrypted = secretBoxDecryptFromMaster(
								{ value: sodium.from_base64(paste.name.value), nonce: sodium.from_base64(paste.name.nonce) },
								{ value: rawPasteKey, salt: sodium.from_base64(paste.name.keySalt) }
							);
							name = new TextDecoder().decode(decrypted.rawData);
						} catch {}
					}

					bookmarkedPastes.push({
						id: paste.paste.id,
						accessKey: sodium.to_base64(rawAccessKey),
						masterKey: sodium.to_base64(rawPasteKey),
						created: paste.created,
						name
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

<div class="px-4 py-6 sm:px-6">
	{#if bookmarkedPastes.length > 0}
		<div class="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-base-content/10 bg-base-content/10 sm:grid-cols-2 lg:grid-cols-3">
			{#each bookmarkedPastes as paste (paste.id)}
				<div class="bg-base-100 flex flex-col justify-between p-5 transition-colors hover:bg-base-200/50">
					<div>
						<h3 class="break-text text-base font-medium leading-tight">{paste.name ?? paste.id}</h3>
						<p class="text-base-content/50 mt-1 text-sm">{relativeDate(paste.created)}</p>
					</div>
					<div class="mt-4 flex items-center gap-2">
						<a href={`/${paste.id}#${paste.masterKey}`} class="btn btn-primary btn-sm flex-1">{$_('paste_actions.open')}</a>
						{#if paste.accessKey}
							<button
								onclick={async () => await onPasteDelete(paste.id, paste.accessKey)}
								class="btn btn btn-soft btn-sm btn-square">
								<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
							</button>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<div class="flex flex-col items-center justify-center py-20">
			<FileTextIcon class="text-base-content/20 size-16" />
			<p class="text-base-content/50 mt-4 text-lg">{$_('no_saved_pastes')}</p>
		</div>
	{/if}
</div>
