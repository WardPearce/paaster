<script lang="ts">
	import { HighlightAuto, LineNumbers } from 'svelte-highlight';
	import rosPine from 'svelte-highlight/styles/ros-pine';
	import { get } from 'svelte/store';
	import { onMount } from 'svelte';
	import { pasteStore } from '../../stores';
	import sodium from 'libsodium-wrappers';
	import { page } from '$app/stores';
	import { paasterClient } from '$lib/client';
	import { acts } from '@tadashi/svelte-loading';
	import toast from 'svelte-french-toast';
	import { showSaveFilePicker } from 'native-file-system-adapter';
	import { goto } from '$app/navigation';
	import type { PasteModel } from '$lib/client/models/PasteModel';
	import { ApiError } from '$lib/client/core/ApiError';

	let code = '';
	acts.show(true);

	async function download() {
		const fileHandler = await showSaveFilePicker();
		const writer = await fileHandler.createWritable();
		await writer.write(new Blob([code]));
		await writer.close();
	}

	async function copyToClipboard() {
		await navigator.clipboard.writeText(code);
		toast.success('Paste copied');
	}

	onMount(async () => {
		// If user just created paste,
		// avoid needing to download & decrypt paste for speed reasons.
		let storedPaste = get(pasteStore);
		if (storedPaste !== '') {
			code = storedPaste;
			pasteStore.set('');
			return;
		}

		await sodium.ready;

		if (location.hash === '') {
			toast.error('Paste secret key not provided');
			acts.show(false);
			goto('/');
			return;
		}

		let rawSecretKey: Uint8Array;
		try {
			rawSecretKey = sodium.from_base64(
				location.hash.substring(1),
				sodium.base64_variants.URLSAFE_NO_PADDING
			);
		} catch {
			toast.error('Invalid Secret key format');
			acts.show(false);
			goto('/');
			return;
		}

		let paste: PasteModel;
		try {
			paste = await paasterClient.default.controllerPasteGetPaste($page.params.slug);
		} catch (error) {
			if (error instanceof ApiError) toast.error(error.body.detail);
			else if (error instanceof Error) toast.error(error.toString());
			return;
		}
		let response: Response;
		try {
			response = await fetch(paste.download_url);
		} catch {
			toast.error('Unable to download paste from CDN, try again later');
			acts.show(false);
			goto('/');
			return;
		}

		try {
			code = new TextDecoder('utf8').decode(
				sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
					null,
					new Uint8Array(await response.arrayBuffer()),
					null,
					sodium.from_base64(paste.iv, sodium.base64_variants.URLSAFE_NO_PADDING),
					rawSecretKey
				)
			);
		} catch (error) {
			if (error instanceof Error) toast.error(error.toString());
			acts.show(false);
			goto('/');
			return;
		}

		acts.show(false);
	});
</script>

<svelte:head>
	{@html rosPine}
</svelte:head>

<main>
	<section>
		<h3>owner panel</h3>
		<div class="owner-panel">
			<button><i class="las la-pencil-alt" />rename</button>
			<button><i class="las la-share" />share</button>
			<button><i class="las la-clone" />clone</button>
			<button class="danger"><i class="las la-trash" />delete</button>
		</div>
	</section>
</main>

<footer>
	<button on:click={download}><i class="las la-download" />Download</button>
	<button on:click={copyToClipboard}><i class="las la-copy" />Copy</button>
	<button><i class="las la-save" />Save</button>
</footer>

<div class="content">
	<HighlightAuto {code} let:highlighted>
		<LineNumbers {highlighted} />
	</HighlightAuto>
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

	@media screen and (max-width: 600px) {
		.owner-panel {
			flex-direction: column;
			row-gap: 1em;
		}
	}
</style>
