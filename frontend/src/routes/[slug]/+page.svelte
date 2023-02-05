<script lang="ts">
	import { HighlightAuto, LineNumbers } from 'svelte-highlight';
	import rosPine from 'svelte-highlight/styles/ros-pine';
	import { get } from 'svelte/store';
	import { onMount } from 'svelte';
	import { pasteStore } from '../../stores';
	import sodium from 'libsodium-wrappers';
	import { page } from '$app/stores';
	import { paasterClient } from '$lib/client';

	let code = '';

	onMount(async () => {
		let storedPaste = get(pasteStore);
		if (storedPaste.rawPaste !== '') {
			code = storedPaste.rawPaste;
			pasteStore.set({ rawPaste: '' });
			return;
		}

		let rawSecretKey = sodium.from_base64(
			location.hash.substring(1),
			sodium.base64_variants.URLSAFE_NO_PADDING
		);

		let paste = await paasterClient.default.controllerPasteGetPaste($page.params.slug);
		let response = await fetch(paste.download_url);

		code = new TextDecoder('utf8').decode(
			sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
				null,
				new Uint8Array(await response.arrayBuffer()),
				null,
				sodium.from_base64(paste.iv, sodium.base64_variants.URLSAFE_NO_PADDING),
				rawSecretKey
			)
		);
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
	<button><i class="las la-download" />Download</button>
	<button><i class="las la-copy" />Copy</button>
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
