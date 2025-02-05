<script lang="ts">
	import { deriveNewKeyFromMaster, secretBoxEncryptFromMaster } from '$lib/client/sodiumWrapped';
	import Loading from '$lib/components/Loading.svelte';
	import { CHUNK_SIZE } from '$lib/consts';
	import { getToast } from '$lib/toasts';
	import sodium from 'libsodium-wrappers-sumo';
	import Dropzone from 'svelte-file-dropzone';
	import { _ } from 'svelte-i18n';
	import { get } from 'svelte/store';

	let codeTextArea: HTMLTextAreaElement;
	let pasteUploading = $state(false);

	async function onFileDropped(event: { detail: { acceptedFiles: File[] } }) {
		if (!event.detail.acceptedFiles) {
			return;
		}

		await uploadPaste(
			await event.detail.acceptedFiles[0].text(),
			event.detail.acceptedFiles[0].name
		);
	}

	async function onCodePasted() {
		// Binds textarea doesn't work otherwise on chrome.
		await uploadPaste(codeTextArea.value);
	}

	async function uploadPaste(rawCode: string, codeName?: string) {
		if (rawCode.length === 0) {
			getToast().error(get(_)('empty_paste'));
			return;
		}

		pasteUploading = true;
		await sodium.ready;

		const rawMasterKey = sodium.randombytes_buf(32);

		const pasteKey = deriveNewKeyFromMaster(
			sodium.crypto_secretstream_xchacha20poly1305_KEYBYTES,
			rawMasterKey
		);

		const { state, header } = sodium.crypto_secretstream_xchacha20poly1305_init_push(
			pasteKey.rawKey
		);

		let encryptedBuffer = [];
		let rawProcessedLength = 0;

		for (let i = 0; i < rawCode.length; i += CHUNK_SIZE) {
			let rawNonEncodedChunk = rawCode.substring(i, i + CHUNK_SIZE);

			rawProcessedLength += rawNonEncodedChunk.length;

			let rawChunk = new TextEncoder().encode(rawNonEncodedChunk);

			const tag =
				rawProcessedLength >= rawCode.length
					? sodium.crypto_secretstream_xchacha20poly1305_TAG_FINAL
					: sodium.crypto_secretstream_xchacha20poly1305_TAG_MESSAGE;

			// Encrypt the chunk
			const encryptedChunk = sodium.crypto_secretstream_xchacha20poly1305_push(
				state,
				rawChunk,
				null,
				tag
			);

			// Store the length of the chunk in the little-endian
			const chunkLength = new Uint8Array(4);
			new DataView(chunkLength.buffer).setUint32(0, encryptedChunk.byteLength, true);

			encryptedBuffer.push(new Uint8Array([...chunkLength, ...encryptedChunk]));
		}

		const formData = new FormData();
		formData.append('code', new Blob(encryptedBuffer));
		formData.append('codeHeader', sodium.to_base64(header));

		if (codeName && codeName.length > 0) {
			const codeNameEncrypted = secretBoxEncryptFromMaster(
				new TextEncoder().encode(codeName),
				rawMasterKey
			);

			formData.append('codeName', sodium.to_base64(codeNameEncrypted.data.value));
			formData.append('codeNonce', sodium.to_base64(codeNameEncrypted.data.nonce));
			formData.append('codeKeySalt', sodium.to_base64(codeNameEncrypted.key.salt));
		}
	}
</script>

{#if pasteUploading}
	<Loading />
{:else}
	<Dropzone on:drop={onFileDropped} multiple={false} noClick={true} disableDefaultStyles={true}>
		<textarea
			oninput={onCodePasted}
			bind:this={codeTextArea}
			class="textarea h-full min-h-screen w-full rounded-none border-none focus:ring-0"
			placeholder={$_('create.input')}
		></textarea>
	</Dropzone>
{/if}
