<script lang="ts">
	import { acts } from '@tadashi/svelte-loading';
	import type { FileDropSelectEvent } from 'filedrop-svelte';
	import FileDrop from 'filedrop-svelte';
	import { _ } from 'svelte-i18n';

	import sodium from 'libsodium-wrappers-sumo';
	import toast from 'svelte-french-toast';

	import { goto } from '$app/navigation';
	import { ApiError } from '$lib/client/core/ApiError';
	import type { PasteCreatedModel } from '$lib/client/models/PasteCreatedModel';
	import { savePaste } from '$lib/savedPaste';
	import { pasteCache } from '$lib/stores';

	let pastedCode: string = '';
	let isLoading = false;

	async function onFileDrop(event: CustomEvent<FileDropSelectEvent>) {
		pastedCode = await event.detail.files.accepted[0].text();
		await pasteSubmit(true);
	}

	async function pasteSubmit(pastePrefilled = false) {
		acts.show(true, 'main');

		if (pastedCode === '') {
			// Adds support for Chrome and Webkit
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-ignore
			pastedCode = document.getElementById('pastedCode').value;
		} else if (!pastePrefilled) {
			// Handle how mobile sends input events for each line
			// of inputted code.
			return;
		}

		await sodium.ready;

		let createdPaste: PasteCreatedModel;
		let rawUrlSafeKey: string;

		try {
			const rawKey = sodium.crypto_aead_xchacha20poly1305_ietf_keygen();
			const rawIv = sodium.randombytes_buf(sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);

			const cipherArray = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
				new TextEncoder().encode(pastedCode),
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

			if (!response.ok) {
				toast.error((createdPaste as any).detail);
				isLoading = false;
				acts.show(false, 'main');
				pastedCode = '';
				return;
			}
		} catch (error) {
			if (error instanceof ApiError) toast.error(error.body.detail);
			else if (error instanceof Error) toast.error(error.toString());

			isLoading = false;
			acts.show(false, 'main');
			pastedCode = '';
			return;
		}

		pasteCache.set(pastedCode);

		isLoading = false;
		acts.show(false, 'main');

		try {
			await savePaste(
				createdPaste.id,
				rawUrlSafeKey,
				createdPaste.created,
				createdPaste.owner_secret
			);
		} catch {
			toast.error($_('create.errors.private_window'));
		}

		goto(`/${createdPaste.id}#${rawUrlSafeKey}`);
	}
</script>

<div style="display: none;">
	<FileDrop on:filedrop={onFileDrop} fileLimit={1} clickToUpload={false}></FileDrop>
</div>

<main>
	<textarea
		on:input={async () => await pasteSubmit(false)}
		value={pastedCode}
		placeholder={$_('create.input')}
		name="create-paste"
		disabled={isLoading}
		id="pastedCode"
	/>

	<section>
		<h3>{$_('about.title')}</h3>
		<p>
			{$_('about.content')}
		</p>
		<p>
			{@html $_('about.source_code', {
				values: {
					github:
						'<a href="https://github.com/WardPearce/paaster"referrerpolicy="no-referrer">Github</a>'
				}
			})}
		</p>
		<a href="/privacy-policy" style="margin-top: 1em;display: block;">Privacy policy</a>
		<a href="/terms-of-service" style="display: block;">Terms of service</a>
	</section>
</main>
