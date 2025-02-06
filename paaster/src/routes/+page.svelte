<script lang="ts">
	import { goto } from '$app/navigation';
	import { localDb } from '$lib/client/dexie';
	import { deriveNewKeyFromMaster, secretBoxEncryptFromMaster } from '$lib/client/sodiumWrapped';
	import Loading from '$lib/components/Loading.svelte';
	import { CHUNK_SIZE, MAX_UPLOAD_SIZE } from '$lib/consts';
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

		if (rawCode.length > MAX_UPLOAD_SIZE) {
			getToast().error(get(_)('paste_size_too_large'));
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
		formData.append('codeHeader', sodium.to_base64(header));
		formData.append('codeKeySalt', sodium.to_base64(pasteKey.salt));

		if (codeName && codeName.length > 0) {
			const codeNameEncrypted = secretBoxEncryptFromMaster(
				new TextEncoder().encode(codeName),
				rawMasterKey
			);

			formData.append('codeName', sodium.to_base64(codeNameEncrypted.data.value));
			formData.append('codeNameNonce', sodium.to_base64(codeNameEncrypted.data.nonce));
			formData.append('codeNameKeySalt', sodium.to_base64(codeNameEncrypted.key.salt));
		}

		const createPasteResp = await fetch('/api/paste', { method: 'POST', body: formData });
		if (!createPasteResp.ok) {
			pasteUploading = false;
			try {
				getToast().error(await createPasteResp.json());
			} catch {
				getToast().error(get(_)('upload_failed'));
			}
			return;
		}
		const createPasteJson = await createPasteResp.json();

		const s3Payload = new FormData();
		for (const [key, value] of Object.entries(createPasteJson.signedUrl.fields)) {
			s3Payload.append(key, value as string);
		}

		const blob = new Blob(encryptedBuffer, { type: 'application/octet-stream' });
		s3Payload.append('file', blob);

		const s3Response = await fetch(createPasteJson.signedUrl.url, {
			method: 'POST',
			body: s3Payload
		});
		if (!s3Response.ok) {
			try {
				getToast().error(await s3Response.json());
			} catch {
				getToast().error(get(_)('upload_failed'));
			}
			return;
		}

		const rawMasterKeyB64 = sodium.to_base64(rawMasterKey);

		await localDb.pastes.add({
			id: createPasteJson.pasteId,
			accessKey: createPasteJson.accessKey,
			masterKey: rawMasterKeyB64,
			created: new Date(),
			name: codeName
		});

		rawCode = '';

		goto(`${createPasteJson.pasteId}#${rawMasterKeyB64}`);
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
