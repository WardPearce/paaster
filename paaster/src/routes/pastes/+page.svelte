<script lang="ts">
	import { relativeDate } from '$lib/client/date.js';
	import { localDb, type Paste } from '$lib/client/dexie';
	import { deletePaste } from '$lib/client/paste.js';
	import { secretBoxDecryptFromMaster } from '$lib/client/sodiumWrapped';
	import { authStore } from '$lib/client/stores';
	import sodium from 'libsodium-wrappers-sumo';
	import { get } from 'svelte/store';
	import { _ } from '$lib/i18n';
	import FileTextIcon from 'lucide-svelte/icons/file-text';
	import TrashIcon from 'lucide-svelte/icons/trash';
	import InfiniteLoading from 'svelte-infinite-loading';
	import { SvelteSet } from 'svelte/reactivity';

	let { data } = $props();

	let bookmarkedPastes: Paste[] = $state([]);
	let hasMore = $state(true);
	let offset = $state(12);
	let loadingInitial = $state(true);
	let initialProcessed = $state(false);

	$effect(() => {
		$authStore;
		if (!$authStore || !data.pastes || initialProcessed) return;
		initialProcessed = true;

		sodium.ready.then(async () => {
			const rawEncryptionKey = sodium.from_base64($authStore.encryptionKey);

			const decrypted = data.pastes.map((p) => decryptPaste(p, rawEncryptionKey));
			const all = [...decrypted];

			const localPastes = await localDb.pastes.orderBy('created').reverse().toArray();
			const seen = new SvelteSet(decrypted.map((paste) => paste.id));
			for (const paste of localPastes) {
				if (!seen.has(paste.id)) {
					all.push(paste);
					seen.add(paste.id);
				}
			}

			bookmarkedPastes = all;
			hasMore = data.pastes.length === 12;

			loadingInitial = false;
		});
	});

	function decryptPaste(
		paste: {
			paste: { id: string; key: string; nonce: string };
			accessKey: { key: string; nonce: string };
			name: { value: string; nonce: string; keySalt: string } | null;
			created: string | Date;
		},
		rawEncryptionKey: Uint8Array
	): Paste {
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
					{
						value: sodium.from_base64(paste.name.value),
						nonce: sodium.from_base64(paste.name.nonce)
					},
					{ value: rawPasteKey, salt: sodium.from_base64(paste.name.keySalt) }
				);
				name = new TextDecoder().decode(decrypted.rawData);
			} catch {}
		}

		return {
			id: paste.paste.id,
			accessKey: sodium.to_base64(rawAccessKey),
			masterKey: sodium.to_base64(rawPasteKey),
			created: new Date(paste.created),
			name
		};
	}

	async function loadMore(event: CustomEvent) {
		const stateChanger = event.detail;

		if (!hasMore) {
			stateChanger.complete();
			return;
		}

		const auth = get(authStore);
		if (!auth) {
			hasMore = false;
			stateChanger.complete();
			return;
		}

		try {
			const response = await fetch(`/api/paste?offset=${offset}`);
			const result = await response.json();

			if (!result.pastes || result.pastes.length === 0) {
				hasMore = false;
				stateChanger.complete();
				return;
			}

			const rawEncryptionKey = sodium.from_base64(auth.encryptionKey);

			const decrypted = result.pastes.map((paste) => decryptPaste(paste, rawEncryptionKey));
			const seen = new Set(bookmarkedPastes.map((paste) => paste.id));
			const fresh = decrypted.filter((paste) => !seen.has(paste.id));
			bookmarkedPastes = [...bookmarkedPastes, ...fresh];

			offset += result.pastes.length;
			hasMore = result.hasMore;
			stateChanger.loaded();
		} catch {
			stateChanger.error();
		}
	}

	async function onPasteDelete(pasteId: string, accessKey?: string) {
		await deletePaste(pasteId, accessKey);

		bookmarkedPastes = bookmarkedPastes.filter((value) => {
			return value.id !== pasteId;
		});
	}
</script>

<div class="px-4 py-6 sm:px-6">
	{#if loadingInitial}
		<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
			<div class="bg-base-100 border-base-content/10 animate-pulse rounded-xl border p-5">
				<div class="bg-base-content/10 mb-2 h-5 w-3/4 rounded" />
				<div class="bg-base-content/10 mb-4 h-4 w-1/3 rounded" />
				<div class="flex items-center gap-2">
					<div class="bg-base-content/10 h-9 w-full rounded-lg" />
					<div class="bg-base-content/10 h-9 w-9 rounded-lg" />
				</div>
			</div>
			<div class="bg-base-100 border-base-content/10 animate-pulse rounded-xl border p-5">
				<div class="bg-base-content/10 mb-2 h-5 w-3/4 rounded" />
				<div class="bg-base-content/10 mb-4 h-4 w-1/3 rounded" />
				<div class="flex items-center gap-2">
					<div class="bg-base-content/10 h-9 w-full rounded-lg" />
					<div class="bg-base-content/10 h-9 w-9 rounded-lg" />
				</div>
			</div>
			<div class="bg-base-100 border-base-content/10 animate-pulse rounded-xl border p-5">
				<div class="bg-base-content/10 mb-2 h-5 w-3/4 rounded" />
				<div class="bg-base-content/10 mb-4 h-4 w-1/3 rounded" />
				<div class="flex items-center gap-2">
					<div class="bg-base-content/10 h-9 w-full rounded-lg" />
					<div class="bg-base-content/10 h-9 w-9 rounded-lg" />
				</div>
			</div>
			<div class="bg-base-100 border-base-content/10 animate-pulse rounded-xl border p-5">
				<div class="bg-base-content/10 mb-2 h-5 w-3/4 rounded" />
				<div class="bg-base-content/10 mb-4 h-4 w-1/3 rounded" />
				<div class="flex items-center gap-2">
					<div class="bg-base-content/10 h-9 w-full rounded-lg" />
					<div class="bg-base-content/10 h-9 w-9 rounded-lg" />
				</div>
			</div>
			<div class="bg-base-100 border-base-content/10 animate-pulse rounded-xl border p-5">
				<div class="bg-base-content/10 mb-2 h-5 w-3/4 rounded" />
				<div class="bg-base-content/10 mb-4 h-4 w-1/3 rounded" />
				<div class="flex items-center gap-2">
					<div class="bg-base-content/10 h-9 w-full rounded-lg" />
					<div class="bg-base-content/10 h-9 w-9 rounded-lg" />
				</div>
			</div>
			<div class="bg-base-100 border-base-content/10 animate-pulse rounded-xl border p-5">
				<div class="bg-base-content/10 mb-2 h-5 w-3/4 rounded" />
				<div class="bg-base-content/10 mb-4 h-4 w-1/3 rounded" />
				<div class="flex items-center gap-2">
					<div class="bg-base-content/10 h-9 w-full rounded-lg" />
					<div class="bg-base-content/10 h-9 w-9 rounded-lg" />
				</div>
			</div>
		</div>
	{:else if bookmarkedPastes.length > 0}
		<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
			{#each bookmarkedPastes as paste (paste.id)}
				<div
					class="bg-base-100 border-base-content/10 hover:border-base-content/20 flex flex-col justify-between rounded-xl border p-5 transition-all hover:shadow-sm"
				>
					<div>
						<h3 class="break-text text-base leading-tight font-medium">
							{paste.name || paste.id}
						</h3>
						<p class="text-base-content/50 mt-1.5 text-sm">
							{relativeDate(paste.created)}
						</p>
					</div>
					<div class="mt-4 flex items-center gap-2">
						<a href={`/${paste.id}#${paste.masterKey}`} class="btn btn-primary btn-sm flex-1">
							{$_('paste_actions.open')}
						</a>
						{#if paste.accessKey}
							<button
								onclick={async () => await onPasteDelete(paste.id, paste.accessKey)}
								class="btn btn-soft btn-sm btn-square"
							>
								<TrashIcon size={18} />
							</button>
						{/if}
					</div>
				</div>
			{/each}
		</div>

		<InfiniteLoading on:infinite={loadMore}>
			<div slot="spinner" let:isFirstLoad>
				<div class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
					{#each Array(6) as _, i (i)}
						{#if isFirstLoad || i <= 3}
							<div class="bg-base-100 border-base-content/10 animate-pulse rounded-xl border p-5">
								<div class="bg-base-content/10 mb-2 h-5 w-3/4 rounded" />
								<div class="bg-base-content/10 mb-4 h-4 w-1/3 rounded" />
								<div class="flex items-center gap-2">
									<div class="bg-base-content/10 h-9 w-full rounded-lg" />
									<div class="bg-base-content/10 h-9 w-9 rounded-lg" />
								</div>
							</div>
						{/if}
					{/each}
				</div>
			</div>
			<div slot="noMore">
				<div class="mt-6 flex items-center gap-3 px-1">
					<div class="bg-base-content/10 h-px flex-1" />
					<span class="text-base-content/30 text-xs">{$_('saved_pastes_end')}</span>
					<div class="bg-base-content/10 h-px flex-1" />
				</div>
			</div>
			<div slot="error" let:attemptLoad>
				<div class="mt-6 flex flex-col items-center gap-3">
					<p class="text-base-content/50 text-sm">{$_('saved_pastes_error')}</p>
					<button onclick={attemptLoad} class="btn btn-primary btn-sm"
						>{$_('saved_pastes_retry')}</button
					>
				</div>
			</div>
		</InfiniteLoading>
	{:else}
		<div class="flex flex-col items-center justify-center py-20">
			<FileTextIcon class="text-base-content/20 size-16" />
			<p class="text-base-content/50 mt-4 text-lg">{$_('no_saved_pastes')}</p>
		</div>
	{/if}
</div>
