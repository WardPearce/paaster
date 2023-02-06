<script lang="ts">
	import sodium from 'libsodium-wrappers';
	import { acts } from '@tadashi/svelte-loading';
	import type { PasteCreatedModel } from '../lib/client/models/PasteCreatedModel';
	import { pasteStore } from '../stores';
	import { goto } from '$app/navigation';
	import { ApiError } from '$lib/client/core/ApiError';
	import toast from 'svelte-french-toast';

	let isLoading = false;

	async function pasteSubmit(event: Event & { data: string }) {
		isLoading = true;
		acts.show(true);

		await sodium.ready;

		let createdPaste: PasteCreatedModel;
		let rawUrlSafeKey: string;

		try {
			const rawKey = sodium.crypto_aead_xchacha20poly1305_ietf_keygen();
			const rawIv = sodium.randombytes_buf(sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);

			const cipherArray = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
				new TextEncoder().encode(event.data),
				null,
				null,
				rawIv,
				rawKey
			);
			rawUrlSafeKey = sodium.to_base64(rawKey, sodium.base64_variants.URLSAFE_NO_PADDING);
			const rawUrlSafeIv = sodium.to_base64(rawIv, sodium.base64_variants.URLSAFE_NO_PADDING);

			// Not supported by OpenAPI.
			let response = await fetch(
				`${import.meta.env.VITE_API_URL}/controller/paste/${rawUrlSafeIv}`,
				{
					method: 'POST',
					body: new Blob([cipherArray.buffer])
				}
			);
			createdPaste = await response.json();
		} catch (error) {
			if (error instanceof ApiError) toast.error(error.body.detail);
			else if (error instanceof Error) toast.error(error.toString());
			return;
		}
		pasteStore.set(event.data);

		isLoading = false;
		acts.show(false);

		goto(`/${createdPaste._id}#${rawUrlSafeKey}`);
	}
</script>

<main>
	<textarea
		on:input={pasteSubmit}
		placeholder="paste or drag & drop your code here"
		name="create-paste"
		disabled={isLoading}
		value=""
	/>

	<section>
		<h3>how we protect your privacy.</h3>
		<p>
			Paaster utilizes end-to-end encryption for storing and sharing pastes, meaning even the server
			can't view what you save here.
		</p>
		<p>
			Our source code is completely open source and can be reviewed on <a
				href="https://github.com/WardPearce/paaster"
				referrerpolicy="no-referrer">Github</a
			>.
		</p>
	</section>
</main>
