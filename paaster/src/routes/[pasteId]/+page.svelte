<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { localDb, type Paste } from '$lib/client/dexie';
	import {
		deriveExistingKeyFromMaster,
		secretBoxDecryptFromMaster,
		secretBoxEncryptFromMaster
	} from '$lib/client/sodiumWrapped';
	import { authStore, themeStore, rawModeStore } from '$lib/client/stores.js';
	import { getToast } from '$lib/client/toasts';
	import Loading from '$lib/components/Loading.svelte';
	import sodium from 'libsodium-wrappers-sumo';
	import CommandIcon from 'lucide-svelte/icons/command';
	import QrCodeIcon from 'lucide-svelte/icons/qr-code';
	import ShareIcon from 'lucide-svelte/icons/share-2';
	import TrashIcon from 'lucide-svelte/icons/trash';
	import Mousetrap from 'mousetrap';
	import { onMount, tick } from 'svelte';
	import Highlight, { HighlightAuto, LineNumbers } from 'svelte-highlight';
	import type { LanguageType } from 'svelte-highlight/languages';
	import atonOneDark from 'svelte-highlight/styles/atom-one-dark';
	import atonOneLight from 'svelte-highlight/styles/atom-one-light';
	import { _ } from '$lib/i18n';
	import Select from 'svelte-select';
	import SvelteMarkdown from '@humanspeak/svelte-markdown';
	// @ts-expect-error qrcode types missing
	import QrCode from 'svelte-qrcode';
	import { get } from 'svelte/store';
	import { oklchToHex } from '$lib/client/colors';
	import { pasteDeletionTimes } from '$lib/client/paste.js';
	import { HSOverlay } from 'flyonui/flyonui.js';

	let { data } = $props();

	let rawMasterKey: Uint8Array;
	let rawPaste: string = $state('');

	let preWrap = $state(data.wrapWords);

	let localStored: Paste | undefined = $state();

	let pasteDownloading = $state(true);

	let qrCodeColor: string | undefined = $state();
	let qrCodeBg: string | undefined = $state();

	let supportedLangs: {
		[key: string]: LanguageType<string>;
	} = $state({});
	let langImport: LanguageType<string> | null = $state(null);

	let qrCodeOverlay: HSOverlay;
	let shortcutsOverlay: HSOverlay;

	let isMarkdown = $state(false);
	let showRenderedMarkdown = $state(false);

	let highlightStyle: string = $state(atonOneLight);

	$effect(() => {
		$themeStore;
		if (typeof document !== 'undefined') {
			const bg = getComputedStyle(document.documentElement)
				.getPropertyValue('--color-base-100')
				.trim();
			const match = bg.match(/oklch\((\d+(?:\.\d+)?)%/);
			if (match) {
				highlightStyle = parseFloat(match[1]) > 50 ? atonOneLight : atonOneDark;
			}
		}
	});

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

	function handleError(error: string) {
		getToast().error(error);
		goto('/');
	}

	async function deletePaste() {
		if (!localStored || !localStored.accessKey) return;

		const deletePasteResponse = await fetch(`/api/paste/${page.params.pasteId}`, {
			method: 'DELETE',
			headers: {
				Authorization: `Bearer ${localStored.accessKey}`
			}
		});

		if (deletePasteResponse.ok) {
			await localDb.pastes.delete(page.params.pasteId);
			getToast().success(get(_)('paste_actions.delete.success'));
			goto('/');
		}
	}

	let pasteName: string | undefined = $state();
	async function setName(event: SubmitEvent) {
		event.preventDefault();

		if (!pasteName || !localStored || !localStored.accessKey) return;

		const nameEncrypted = secretBoxEncryptFromMaster(
			new TextEncoder().encode(pasteName),
			rawMasterKey
		);

		const updatePayload = new FormData();
		updatePayload.append('codeName', sodium.to_base64(nameEncrypted.data.value));
		updatePayload.append('codeNameNonce', sodium.to_base64(nameEncrypted.data.nonce));
		updatePayload.append('codeNameKeySalt', sodium.to_base64(nameEncrypted.key.salt));

		const updatePayloadResponse = await fetch(`/api/paste/${page.params.pasteId}`, {
			method: 'POST',
			body: updatePayload,
			headers: {
				Authorization: `Bearer ${localStored.accessKey}`
			}
		});
		if (updatePayloadResponse.ok) {
			getToast().success(get(_)('paste_actions.rename.success'));
			if (!$authStore) {
				await localDb.pastes.update(page.params.pasteId, { name: pasteName });
			}
		}
	}

	let expireTime:
		| {
				value: number | null;
				label: string;
		  }
		| undefined = $state();
	async function setExpire() {
		if (!expireTime || !expireTime.value || !localStored || !localStored.accessKey) return;

		const updatePayload = new FormData();
		updatePayload.append('expireAfter', expireTime.value.toString());

		const updatePayloadResponse = await fetch(`/api/paste/${page.params.pasteId}`, {
			method: 'POST',
			body: updatePayload,
			headers: {
				Authorization: `Bearer ${localStored.accessKey}`
			}
		});
		if (updatePayloadResponse.ok) {
			getToast().success(
				get(_)('paste_actions.expire.success').replace('{period}', expireTime.label)
			);
		}
	}

	let selectedLang: { label: string; value: string } | undefined = $state();
	async function setLang() {
		if (!selectedLang || !localStored || !localStored.accessKey) return;

		isMarkdown = selectedLang.value === 'markdown';

		const langEncrypted = secretBoxEncryptFromMaster(
			new TextEncoder().encode(selectedLang.value),
			rawMasterKey
		);

		const updatePayload = new FormData();
		updatePayload.append('langName', sodium.to_base64(langEncrypted.data.value));
		updatePayload.append('langNonce', sodium.to_base64(langEncrypted.data.nonce));
		updatePayload.append('langKeySalt', sodium.to_base64(langEncrypted.key.salt));

		const updatePayloadResponse = await fetch(`/api/paste/${page.params.pasteId}`, {
			method: 'POST',
			body: updatePayload,
			headers: {
				Authorization: `Bearer ${localStored.accessKey}`
			}
		});
		if (updatePayloadResponse.ok) {
			getToast().success(get(_)('paste_actions.lang_updated'));
			langImport = supportedLangs[selectedLang.value];
		}
	}

	async function setPreWrap() {
		preWrap = !preWrap;

		if (!localStored || !localStored.accessKey) return;

		const updatePayload = new FormData();
		updatePayload.append('wrapWords', preWrap.toString());

		await fetch(`/api/paste/${page.params.pasteId}`, {
			method: 'POST',
			body: updatePayload,
			headers: {
				Authorization: `Bearer ${localStored.accessKey}`
			}
		});
	}

	async function sharePaste() {
		await navigator.clipboard.writeText(page.url.href);
		getToast().success(get(_)('paste_actions.share.success'));
	}

	async function copyCode() {
		await navigator.clipboard.writeText(rawPaste);
		getToast().success(get(_)('paste_actions.clipboard.success'));
	}

	async function downloadPaste() {
		const anchor = document.createElement('a');
		const url = window.URL.createObjectURL(new Blob([rawPaste], { type: 'text/plain' }));
		anchor.download = pasteName ?? 'Unknown';
		anchor.href = url;
		anchor.click();
		window.URL.revokeObjectURL(url);
	}

	async function setQrColors() {
		qrCodeColor = undefined;
		qrCodeBg = undefined;
		await tick();
		qrCodeColor = oklchToHex(
			getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim()
		);
		qrCodeBg = oklchToHex(
			getComputedStyle(document.documentElement).getPropertyValue('--color-base-100').trim()
		);
	}

	themeStore.subscribe(() => {
		setQrColors();
	});

	onMount(async () => {
		await sodium.ready;

		try {
			rawMasterKey = sodium.from_base64(window.location.hash.replace('#', ''));
		} catch {}
		if (!rawMasterKey) {
			handleError(get(_)('view.invalid_format'));
			return;
		}

		if (data.account) {
			authStore.subscribe((auth) => {
				if (!auth || !data.account) return;

				const rawEncryptionKey = sodium.from_base64(auth.encryptionKey);

				const rawPasteKey = sodium.crypto_secretbox_open_easy(
					sodium.from_base64(data.account.paste.key),
					sodium.from_base64(data.account.paste.nonce),
					rawEncryptionKey
				);

				const rawAccessKey = sodium.crypto_secretbox_open_easy(
					sodium.from_base64(data.account.accessKey.key),
					sodium.from_base64(data.account.accessKey.nonce),
					rawEncryptionKey
				);

				localStored = {
					id: page.params.pasteId as string,
					accessKey: sodium.to_base64(rawAccessKey),
					masterKey: sodium.to_base64(rawPasteKey),
					created: data.account.created,
					name: undefined
				};
			});
		} else {
			const result = await localDb.pastes.get(page.params.pasteId);
			if (result) {
				localStored = result;
			} else {
				await localDb.pastes.add({
					id: page.params.pasteId as string,
					masterKey: sodium.to_base64(rawMasterKey),
					accessKey: undefined,
					created: data.created,
					name: pasteName
				});
			}
		}

		await loadSupportedLangs();

		const codeResponse = await fetch(data.signedUrl);
		if (!codeResponse.ok) {
			handleError(get(_)('view.cdn_down'));
			return;
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

			const decryptedChunk = sodium.crypto_secretstream_xchacha20poly1305_pull(state, chunk, null);

			if (decryptedChunk) {
				rawPaste += new TextDecoder().decode(decryptedChunk.message);
			} else {
				handleError(get(_)('view.invalid_format'));
				return;
			}

			chunkStart = chunkEnd; // Move to the next chunk
		}

		if (data.language) {
			const rawLang = new TextDecoder().decode(
				secretBoxDecryptFromMaster(
					{
						value: sodium.from_base64(data.language.value),
						nonce: sodium.from_base64(data.language.nonce)
					},
					{ value: rawMasterKey, salt: sodium.from_base64(data.language.keySalt) }
				).rawData
			);

			if (rawLang in supportedLangs) {
				selectedLang = { value: rawLang, label: rawLang };
				langImport = supportedLangs[rawLang];
			}

			if (rawLang === 'markdown') {
				isMarkdown = true;
			}
		}

		if (data.name.value) {
			pasteName = new TextDecoder().decode(
				secretBoxDecryptFromMaster(
					{
						value: sodium.from_base64(data.name.value),
						nonce: sodium.from_base64(data.name.nonce)
					},
					{ value: rawMasterKey, salt: sodium.from_base64(data.name.keySalt) }
				).rawData
			);
		}

		if (data.expireAfter !== null) {
			// Allows us to change the period label in the future.
			pasteDeletionTimes().forEach((time) => {
				if (time.value === data.expireAfter) {
					expireTime = time;
					return true;
				}
			});
		}

		pasteDownloading = false;

		Mousetrap.bind(['command+a', 'ctrl+a'], () => {
			copyCode();
			return false;
		});

		Mousetrap.bind(['command+x', 'ctrl+x'], () => {
			sharePaste();
			return false;
		});

		Mousetrap.bind(['command+s', 'ctrl+s'], () => {
			downloadPaste();
			return false;
		});

		qrCodeOverlay = new HSOverlay(document.querySelector('#qr-code') as HTMLElement);
		shortcutsOverlay = new HSOverlay(document.querySelector('#shortcuts') as HTMLElement);
	});
</script>

<svelte:head>
	{@html highlightStyle}

	{#if preWrap}
		<style>
			pre > code {
				white-space: pre-wrap !important;
			}
		</style>
	{/if}
</svelte:head>

<div
	id="qr-code"
	class="overlay modal overlay-open:opacity-100 modal-middle overlay-open:duration-300 hidden"
	role="dialog"
	tabindex="-1"
>
	<div class="modal-dialog overlay-open:opacity-100 overlay-open:duration-300 sm:max-w-md">
		<div class="modal-content border-base-content/20 border">
			<div class="modal-header">
				<h1 class="modal-title">{$_('paste_actions.qr_code.model.header')}</h1>
				<button type="button" class="btn btn-text btn-sm" onclick={() => qrCodeOverlay.close()}>
					✕
				</button>
			</div>
			<div class="modal-body flex justify-center p-6">
				{#if qrCodeBg && qrCodeColor}
					<QrCode value={page.url.href} color={qrCodeColor} background={qrCodeBg} size={280} />
				{/if}
			</div>
		</div>
	</div>
</div>

<div
	id="shortcuts"
	class="overlay modal overlay-open:opacity-100 modal-middle hidden"
	role="dialog"
	tabindex="-1"
>
	<div class="modal-dialog overlay-open:opacity-100 sm:max-w-sm">
		<div class="modal-content border-base-content/20 border">
			<div class="modal-header">
				<h1 class="modal-title">{$_('shortcuts')}</h1>
				<button type="button" class="btn btn-text btn-sm" onclick={() => shortcutsOverlay.close()}>
					✕
				</button>
			</div>
			<div class="modal-body divide-base-content/10 divide-y">
				<div class="flex items-center justify-between py-2.5">
					<span class="text-base-content text-sm">{$_('paste_actions.share.button')}</span>
					<div class="flex items-center gap-1">
						<kbd class="kbd kbd-sm">Ctrl</kbd>
						<span class="text-base-content/40 text-xs">+</span>
						<kbd class="kbd kbd-sm">X</kbd>
					</div>
				</div>
				<div class="flex items-center justify-between py-2.5">
					<span class="text-base-content text-sm">{$_('paste_actions.clipboard.button')}</span>
					<div class="flex items-center gap-1">
						<kbd class="kbd kbd-sm">Ctrl</kbd>
						<span class="text-base-content/40 text-xs">+</span>
						<kbd class="kbd kbd-sm">A</kbd>
					</div>
				</div>
				<div class="flex items-center justify-between py-2.5">
					<span class="text-base-content text-sm">{$_('paste_actions.download.button')}</span>
					<div class="flex items-center gap-1">
						<kbd class="kbd kbd-sm">Ctrl</kbd>
						<span class="text-base-content/40 text-xs">+</span>
						<kbd class="kbd kbd-sm">S</kbd>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>

{#if pasteDownloading}
	<Loading />
{:else}
	<div class="flex flex-col gap-4 p-0 pt-4 pb-4 sm:p-4 md:flex-row">
		{#if localStored && localStored.accessKey && !$rawModeStore}
			<div
				class="card border-base-content/20 flex w-full flex-col gap-4 rounded-lg border p-5 md:order-last md:w-72 md:shrink-0 md:self-start"
			>
				<div class="border-base-content/10 border-b pb-3">
					<h1 class="text-base-content text-lg font-semibold">{$_('paste_owner')}</h1>
				</div>

				<form onsubmit={setName}>
					<label class="label label-text mb-1.5" for="name-paste"
						>{$_('paste_actions.rename.button')}</label
					>
					<div class="flex items-center gap-1">
						<input
							bind:value={pasteName}
							type="text"
							class="input h-9 flex-1 text-sm"
							id="name-paste"
						/>
					</div>
				</form>

				<div>
					<label class="label label-text mb-1.5" for="delete-after"
						>{$_('paste_actions.expire.button')}</label
					>
					<Select
						items={pasteDeletionTimes()}
						clearable={false}
						bind:value={expireTime}
						on:change={setExpire}
					/>
				</div>

				<div>
					<label class="label label-text mb-1.5" for="lang">{$_('paste_actions.language')}</label>
					<Select
						items={Object.keys(supportedLangs)}
						clearable={false}
						bind:value={selectedLang}
						on:change={setLang}
						placeholder="Auto-detect language"
					/>
				</div>

				<div class="flex items-center justify-between">
					<span class="label-text">{$_('paste_actions.wrap_words')}</span>
					<input
						type="checkbox"
						class="checkbox checkbox-primary checkbox-sm"
						id="wrap-words"
						bind:checked={preWrap}
						onclick={setPreWrap}
					/>
				</div>

				<div class="border-base-content/10 flex flex-col gap-2 border-t pt-3">
					<button
						class="btn btn-primary btn-sm w-full"
						onclick={() => {
							qrCodeOverlay.open();
						}}
					>
						<QrCodeIcon size={16} />
						{$_('paste_actions.qr_code.button')}</button
					>

					<button class="btn btn-primary btn-sm w-full" onclick={sharePaste}>
						<ShareIcon size={16} />
						{$_('paste_actions.share.button')}
					</button>

					<button
						class="btn btn-ghost btn-sm w-full"
						onclick={() => {
							shortcutsOverlay.open();
						}}
					>
						<CommandIcon size={16} /> {$_('shortcuts')}</button
					>

					<button class="btn btn-error btn-outline btn-sm mt-1 w-full" onclick={deletePaste}>
						<TrashIcon size={16} />
						{$_('paste_actions.delete.button')}
					</button>
				</div>
			</div>
		{/if}

		<div
			class={`min-w-0 ${localStored?.accessKey ? 'flex-1' : 'w-full'} ${$rawModeStore ? '' : 'rounded-lg'}`}
		>
			<div class="mb-3 flex flex-wrap items-center justify-between gap-1.5">
				<div class="flex items-center gap-2">
					{#if pasteName}
						<div class="bg-base-content/5 flex items-center gap-1.5 rounded-md px-3 py-1.5">
							<svg
								class="h-4 w-4 shrink-0 opacity-50"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								><path
									d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"
								/><polyline points="14 2 14 8 20 8" /></svg
							>
							<span
								class="text-base-content xs:max-w-40 max-w-24 truncate text-sm font-medium sm:max-w-56"
								>{pasteName}</span
							>
						</div>
					{/if}
				</div>
				<div class="flex items-center gap-1">
					<button
						type="button"
						class="btn btn-soft btn-sm"
						onclick={copyCode}
						title={$_('paste_actions.clipboard.button')}
					>
						<svg
							class="h-4 w-4 shrink-0"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path
								d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
							/></svg
						>
						<span class="hidden sm:inline">{$_('paste_actions.clipboard.button')}</span>
					</button>
					<button
						type="button"
						class="btn btn-soft btn-sm"
						onclick={downloadPaste}
						title={$_('paste_actions.download.button')}
					>
						<svg
							class="h-4 w-4 shrink-0"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline
								points="7 10 12 15 17 10"
							/><line x1="12" y1="15" x2="12" y2="3" /></svg
						>
						<span class="hidden sm:inline">{$_('paste_actions.download.button')}</span>
					</button>
					{#if isMarkdown && !$rawModeStore}
						<button
							type="button"
							class="btn btn-soft btn-sm"
							onclick={() => (showRenderedMarkdown = !showRenderedMarkdown)}
						>
							{showRenderedMarkdown
								? $_('paste_actions.show_code')
								: $_('paste_actions.render_markdown')}
						</button>
					{/if}
					<button
						type="button"
						class="btn btn-soft btn-sm"
						onclick={() => rawModeStore.set(!$rawModeStore)}
					>
						{$rawModeStore ? $_('paste_actions.exit_raw_mode') : $_('paste_actions.raw_mode')}
					</button>
				</div>
			</div>
			{#if showRenderedMarkdown && !$rawModeStore}
				<div class="markdown-render border-base-content/10 rounded-lg border p-4 sm:p-6">
					<SvelteMarkdown source={rawPaste} />
				</div>
			{:else if langImport}
				<Highlight language={langImport} code={rawPaste} let:highlighted>
					{#if !$rawModeStore}
						<LineNumbers {highlighted} hideBorder />
					{:else}
						{@html highlighted}
					{/if}
				</Highlight>
			{:else}
				<HighlightAuto code={rawPaste} let:highlighted>
					{#if !$rawModeStore}
						<LineNumbers {highlighted} hideBorder />
					{:else}
						{@html highlighted}
					{/if}
				</HighlightAuto>
			{/if}
		</div>
	</div>
{/if}
