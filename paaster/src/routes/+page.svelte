<script lang="ts">
	import { goto } from '$app/navigation';
	import { savePaste } from '$lib/client/paste';
	import { deriveNewKeyFromMaster, secretBoxEncryptFromMaster } from '$lib/client/sodiumWrapped';
	import { getToast } from '$lib/client/toasts';
	import Loading from '$lib/components/Loading.svelte';
	import { CHUNK_SIZE } from '$lib/consts';
	import sodium from 'libsodium-wrappers-sumo';
	import Dropzone from 'svelte-file-dropzone';
	import { _ } from '$lib/i18n';
	import { get } from 'svelte/store';
	import { resolve } from '$app/paths';

	let codeTextArea: HTMLTextAreaElement | undefined = $state();
	let pasteUploading = $state(false);
	let isDragging = $state(false);

	async function onFileDropped(event: { detail: { acceptedFiles: File[] } }) {
		if (!event.detail.acceptedFiles) {
			return;
		}

		isDragging = false;

		await uploadPaste(
			await event.detail.acceptedFiles[0].text(),
			event.detail.acceptedFiles[0].name
		);
	}

	function onDragEnter() {
		isDragging = true;
	}

	function onDragLeave() {
		isDragging = false;
	}

	async function onCodePasted() {
		if (!codeTextArea) return;
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

		const pasteId = createPasteJson.pasteId;
		const maxUploadSize = createPasteJson.maxUploadSize;

		if (rawCode.length > maxUploadSize) {
			pasteUploading = false;
			getToast().error(get(_)('paste_size_too_large'));
			return;
		}

		let rawProcessedLength = 0;
		const totalChunks = Math.ceil(rawCode.length / CHUNK_SIZE);

		for (let i = 0; i < rawCode.length; i += CHUNK_SIZE) {
			let rawNonEncodedChunk = rawCode.substring(i, i + CHUNK_SIZE);

			rawProcessedLength += rawNonEncodedChunk.length;

			let rawChunk = new TextEncoder().encode(rawNonEncodedChunk);

			const tag =
				rawProcessedLength >= rawCode.length
					? sodium.crypto_secretstream_xchacha20poly1305_TAG_FINAL
					: sodium.crypto_secretstream_xchacha20poly1305_TAG_MESSAGE;

			const encryptedChunk = sodium.crypto_secretstream_xchacha20poly1305_push(
				state,
				rawChunk,
				null,
				tag
			);

			const chunkForm = new FormData();
			chunkForm.append('chunkIndex', (i / CHUNK_SIZE).toString());
			chunkForm.append('totalChunks', totalChunks.toString());
			chunkForm.append('data', new File([new Uint8Array(encryptedChunk)], `chunk_${i / CHUNK_SIZE}`, { type: 'application/octet-stream' }));

			const chunkResp = await fetch(`/api/paste/${pasteId}/chunks`, { method: 'POST', body: chunkForm });
			if (!chunkResp.ok) {
				pasteUploading = false;
				try {
					getToast().error(await chunkResp.json());
				} catch {
					getToast().error(get(_)('upload_failed'));
				}
				return;
			}
		}

		const rawMasterKeyB64 = sodium.to_base64(rawMasterKey);

		await savePaste(
			createPasteJson.pasteId,
			createPasteJson.accessKey,
			rawMasterKeyB64,
			new Date(),
			codeName
		);

		goto(resolve(`/[pasteId]#${rawMasterKeyB64}`, { pasteId: createPasteJson.pasteId }));
	}
</script>

{#if pasteUploading}
	<Loading />
{:else}
	<div class="flex flex-col p-4 sm:p-6">
		<Dropzone
			on:drop={onFileDropped}
			on:dragenter={onDragEnter}
			on:dragleave={onDragLeave}
			multiple={false}
			noClick={true}
			disableDefaultStyles={true}
		>
			<textarea
				oninput={onCodePasted}
				bind:this={codeTextArea}
				autofocus
				class="textarea placeholder:text-base-content/25 focus:border-primary h-[90vh] resize-none rounded-xl border-2 bg-transparent p-6 font-mono text-base leading-relaxed transition-colors focus:outline-none {isDragging
					? 'border-primary bg-primary/5 border-dashed'
					: 'border-base-content/10'}"
				placeholder={$_('create.input')}
			></textarea>
		</Dropzone>
	</div>
{/if}
