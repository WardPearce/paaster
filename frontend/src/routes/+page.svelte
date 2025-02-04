<script lang="ts">
	import { goto } from '$app/navigation';
	import type { PasteCreatedModel } from '$lib/client/models/PasteCreatedModel';
	import { savePaste } from '$lib/savedPaste';
	import Spinner from '$lib/Spinner.svelte';
	import { pasteCache } from '$lib/stores';
	import { error } from '@sveltejs/kit';
	import sodium from 'libsodium-wrappers-sumo';
	import Dropzone from 'svelte-file-dropzone';
	import { _ } from 'svelte-i18n';

	let loading = $state(false);

	async function onFileDrop(event: { detail: { acceptedFiles: File[]; fileRejections: File[] } }) {
		await uploadPaste(await event.detail.acceptedFiles[0].text());
	}

	async function uploadPaste(rawCode: string) {
		if (loading) return;

		loading = true;

		await sodium.ready;

		let createdPaste: PasteCreatedModel;
		let rawUrlSafeKey: string;

		const rawKey = sodium.crypto_aead_xchacha20poly1305_ietf_keygen();
		const rawIv = sodium.randombytes_buf(sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);

		const cipherArray = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
			new TextEncoder().encode(rawCode),
			null,
			null,
			rawIv,
			rawKey
		);
		rawUrlSafeKey = sodium.to_base64(rawKey, sodium.base64_variants.URLSAFE_NO_PADDING);
		const rawUrlSafeIv = sodium.to_base64(rawIv, sodium.base64_variants.URLSAFE_NO_PADDING);

		let response;
		response = await fetch(`${import.meta.env.VITE_API_URL}/controller/paste/${rawUrlSafeIv}`, {
			method: 'POST',
			body: new Blob([cipherArray])
		});

		if (!response.ok) {
			loading = false;
			try {
				error(500, (await response.json()).detail);
			} catch {
				error(500);
			}
		}

		createdPaste = await response.json();

		try {
			await savePaste(
				createdPaste.id,
				rawUrlSafeKey,
				createdPaste.created,
				createdPaste.owner_secret
			);
		} catch {}

		pasteCache.set(rawCode);

		goto(`/${createdPaste.id}#${rawUrlSafeKey}`);
	}

	async function onInput(event: Event & { currentTarget: EventTarget & HTMLTextAreaElement }) {
		let value: string;

		if (event.currentTarget.value !== '') {
			value = event.currentTarget.value;
		} else {
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-ignore
			value = document.getElementById('pasted-code').value;
		}

		await uploadPaste(value);
	}
</script>

{#if loading}
	<Spinner />
{:else}
	<Dropzone disableDefaultStyles={true} multiple={false} onClick={false} on:drop={onFileDrop}>
		<main>
			<textarea
				oninput={onInput}
				placeholder={$_('create.input')}
				name="create-paste"
				id="pasted-code"
			></textarea>
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
	</Dropzone>
{/if}
