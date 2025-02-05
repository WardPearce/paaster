<script lang="ts">
	import { deriveExistingKeyFromMaster } from '$lib/client/sodiumWrapped.js';
	import { error } from '@sveltejs/kit';
	import sodium from 'libsodium-wrappers-sumo';
	import { onMount } from 'svelte';
	import Highlight, { HighlightAuto, LineNumbers } from 'svelte-highlight';
	import typescript from 'svelte-highlight/languages/typescript';
	import rosPine from 'svelte-highlight/styles/ros-pine';
	import { _ } from 'svelte-i18n';
	import { get } from 'svelte/store';

	let { data } = $props();

	let rawMasterKey: Uint8Array;
	let rawPaste: string = $state('');

	onMount(async () => {
		await sodium.ready;

		try {
			rawMasterKey = sodium.from_base64(window.location.hash.replace('#', ''));
		} catch {}
		if (!rawMasterKey) {
			error(400, get(_)('view.invalid_format'));
		}

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
	});
</script>

<svelte:head>
	{@html rosPine}
</svelte:head>

{#if false}
	<Highlight language={typescript} code={rawPaste} let:highlighted>
		<LineNumbers {highlighted} />
	</Highlight>
{:else}
	<HighlightAuto code={rawPaste} let:highlighted>
		<LineNumbers {highlighted} />
	</HighlightAuto>
{/if}
