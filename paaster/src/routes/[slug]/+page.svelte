<script lang="ts">
	import { page } from '$app/state';
	import { localDb, type Paste } from '$lib/client/dexie.js';
	import { deriveExistingKeyFromMaster } from '$lib/client/sodiumWrapped.js';
	import Loading from '$lib/components/Loading.svelte';
	import { error } from '@sveltejs/kit';
	import sodium from 'libsodium-wrappers-sumo';
	import QrCodeIcon from 'lucide-svelte/icons/qr-code';
	import TrashIcon from 'lucide-svelte/icons/trash';
	import { onMount } from 'svelte';
	import Highlight, { HighlightAuto, LineNumbers } from 'svelte-highlight';
	import type { LanguageType } from 'svelte-highlight/languages';
	import typescript from 'svelte-highlight/languages/typescript';
	import rosPine from 'svelte-highlight/styles/ros-pine';
	import { _ } from 'svelte-i18n';
	// @ts-ignore
	import QrCode from 'svelte-qrcode';
	import { get } from 'svelte/store';

	let { data } = $props();

	let rawMasterKey: Uint8Array;
	let rawPaste: string = $state('');

	let localStored: Paste | undefined = $state();

	let pasteDownloading = $state(true);

	let selectedLang: { label: string; value: string };
	let supportedLangs: {
		[key: string]: LanguageType<string>;
	} = {};
	let langImport: LanguageType<string> | null = null;

	async function loadSupportedLangs() {
		const rawSupportedLangs: { [key: string]: any } = await import('svelte-highlight/languages');

		supportedLangs = Object.keys(rawSupportedLangs).reduce(
			(result: { [key: string]: any }, key) => {
				if (key !== 'default') {
					result[key] = rawSupportedLangs[key];
				}
				return result;
			},
			{}
		);
	}

	async function deletePaste() {}

	onMount(async () => {
		await sodium.ready;

		try {
			rawMasterKey = sodium.from_base64(window.location.hash.replace('#', ''));
		} catch {}
		if (!rawMasterKey) {
			error(400, get(_)('view.invalid_format'));
		}

		const result = await localDb.pastes.get(page.params.slug);
		if (result) {
			localStored = result;
		} else {
			await localDb.pastes.add({
				id: page.params.slug,
				masterKey: sodium.to_base64(rawMasterKey),
				accessKey: undefined
			});
		}

		await loadSupportedLangs();

		const codeResponse = await fetch(data.signedUrl);
		if (!codeResponse.ok) {
			error(400, get(_)('view.cdn_down'));
		}

		const encryptedCode = new Uint8Array(await codeResponse.arrayBuffer());

		const fileKey = deriveExistingKeyFromMaster(
			sodium.crypto_secretstream_xchacha20poly1305_KEYBYTES,
			rawMasterKey,
			sodium.from_base64(data.keySalt)
		);

		const state = sodium.crypto_secretstream_xchacha20poly1305_init_pull(
			sodium.from_base64(data.header),
			fileKey.rawKey
		);

		let chunkStart = 0;
		while (chunkStart < encryptedCode.byteLength) {
			// Extract the chunk length from the first 4 bytes (the prefix)
			const chunkLength = new DataView(encryptedCode.buffer, chunkStart, 4).getUint32(0, true);
			const chunkEnd = chunkStart + 4 + chunkLength;

			// The actual encrypted chunk (excluding the prefix)
			const chunk = encryptedCode.slice(chunkStart + 4, chunkEnd);

			const decryptedChunk = sodium.crypto_secretstream_xchacha20poly1305_pull(state, chunk);

			if (decryptedChunk) {
				rawPaste += new TextDecoder().decode(decryptedChunk.message);
			} else {
				error(400, get(_)('view.invalid_format'));
			}

			chunkStart = chunkEnd; // Move to the next chunk
		}

		pasteDownloading = false;
	});
</script>

<svelte:head>
	{@html rosPine}
</svelte:head>

<div
	id="qr-code"
	class="overlay modal overlay-open:opacity-100 modal-middle hidden"
	role="dialog"
	tabindex="-1"
>
	<div class="modal-dialog overlay-open:opacity-100">
		<div class="modal-content p-4">
			<div class="modal-header">
				<h1 class="modal-title">{$_('paste_actions.qr_code.model.header')}</h1>
			</div>
			<div class="modal-body">
				<QrCode value={page.url.href} color="#8478c9" background="#191724" size={540} />
			</div>
		</div>
	</div>
</div>

<div class="flex flex-col gap-4 p-4 md:flex-row">
	<div class="w-full rounded-lg p-4 md:w-5/6">
		{#if pasteDownloading}
			<Loading />
		{:else if false}
			<Highlight language={typescript} code={rawPaste} let:highlighted>
				<LineNumbers {highlighted} />
			</Highlight>
		{:else}
			<HighlightAuto code={rawPaste} let:highlighted>
				<LineNumbers {highlighted} />
			</HighlightAuto>
		{/if}
	</div>

	{#if localStored && localStored.accessKey}
		<div
			class="bg-neutral-content order-first flex w-full flex-col space-y-2 rounded-lg p-4 md:order-last md:ml-4 md:w-1/6"
		>
			<h1 class="text-base-content text-2xl">{$_('paste_owner')}</h1>
			<button
				class="btn btn-primary"
				onclick={() => {
					// @ts-ignore
					new HSOverlay(document.querySelector('#qr-code')).open();
				}}
			>
				<QrCodeIcon />
				{$_('paste_actions.qr_code.button')}</button
			>

			<button class="btn btn-outline" onclick={deletePaste}>
				<TrashIcon />
				{$_('paste_actions.delete.button')}
			</button>
		</div>
	{/if}
</div>
