<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { localDb, type Paste } from '$lib/client/dexie';
	import {
		deriveExistingKeyFromMaster,
		secretBoxDecryptFromMaster,
		secretBoxEncryptFromMaster
	} from '$lib/client/sodiumWrapped';
	import { authStore } from '$lib/client/stores.js';
	import Loading from '$lib/components/Loading.svelte';
	import { getToast } from '$lib/toasts';
	import sodium from 'libsodium-wrappers-sumo';
	import CommandIcon from 'lucide-svelte/icons/command';
	import QrCodeIcon from 'lucide-svelte/icons/qr-code';
	import SendIcon from 'lucide-svelte/icons/send-horizontal';
	import ShareIcon from 'lucide-svelte/icons/share-2';
	import TrashIcon from 'lucide-svelte/icons/trash';
	import Mousetrap from 'mousetrap';
	import { onMount } from 'svelte';
	import Highlight, { HighlightAuto, LineNumbers } from 'svelte-highlight';
	import type { LanguageType } from 'svelte-highlight/languages';
	import rosPine from 'svelte-highlight/styles/ros-pine';
	import { _ } from 'svelte-i18n';
	import Select from 'svelte-select';
	// @ts-ignore
	import QrCode from 'svelte-qrcode';
	import { get } from 'svelte/store';

	let { data } = $props();

	let rawMasterKey: Uint8Array;
	let rawPaste: string = $state('');

	let preWrap = $state(data.wrapWords);

	let localStored: Paste | undefined = $state();

	let pasteDownloading = $state(true);

	let supportedLangs: {
		[key: string]: LanguageType<string>;
	} = $state({});
	let langImport: LanguageType<string> | null = $state(null);

	const timePeriods = [
		{ value: -2, label: $_('paste_actions.expire.periods.never') },
		{ value: -1, label: $_('paste_actions.expire.periods.being_viewed') },
		{
			value: 0.08333,
			label: `5 ${$_('paste_actions.expire.periods.minutes')}`
		},
		{ value: 0.25, label: `15 ${$_('paste_actions.expire.periods.minutes')}` },
		{ value: 0.5, label: `30 ${$_('paste_actions.expire.periods.minutes')}` },
		{ value: 1, label: `1 ${$_('paste_actions.expire.periods.hour')}` },
		{ value: 2, label: `2 ${$_('paste_actions.expire.periods.hours')}` },
		{ value: 3, label: `3 ${$_('paste_actions.expire.periods.hours')}` },
		{ value: 4, label: `4 ${$_('paste_actions.expire.periods.hours')}` },
		{ value: 5, label: `5 ${$_('paste_actions.expire.periods.hours')}` },
		{ value: 6, label: `6 ${$_('paste_actions.expire.periods.hours')}` },
		{ value: 7, label: `7 ${$_('paste_actions.expire.periods.hours')}` },
		{ value: 8, label: `8 ${$_('paste_actions.expire.periods.hours')}` },
		{ value: 9, label: `9 ${$_('paste_actions.expire.periods.hours')}` },
		{ value: 10, label: `10 ${$_('paste_actions.expire.periods.hours')}` },
		{ value: 11, label: `11 ${$_('paste_actions.expire.periods.hours')}` },
		{ value: 12, label: `12 ${$_('paste_actions.expire.periods.hours')}` },
		{ value: 24, label: `1 ${$_('paste_actions.expire.periods.day')}` },
		{ value: 48, label: `2 ${$_('paste_actions.expire.periods.days')}` },
		{ value: 72, label: `3 ${$_('paste_actions.expire.periods.days')}` },
		{ value: 96, label: `4 ${$_('paste_actions.expire.periods.days')}` },
		{ value: 120, label: `5 ${$_('paste_actions.expire.periods.days')}` },
		{ value: 144, label: `6 ${$_('paste_actions.expire.periods.days')}` },
		{ value: 168, label: `1 ${$_('paste_actions.expire.periods.week')}` },
		{ value: 336, label: `2 ${$_('paste_actions.expire.periods.weeks')}` },
		{ value: 504, label: `3 ${$_('paste_actions.expire.periods.weeks')}` },
		{ value: 730, label: `1 ${$_('paste_actions.expire.periods.month')}` },
		{ value: 1461, label: `2 ${$_('paste_actions.expire.periods.months')}` },
		{ value: 2192, label: `3 ${$_('paste_actions.expire.periods.months')}` }
	];

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

				const rawAccountMasterKey = sodium.from_base64(auth.masterPassword);

				const rawPasteKey = sodium.crypto_secretbox_open_easy(
					sodium.from_base64(data.account.paste.key),
					sodium.from_base64(data.account.paste.nonce),
					rawAccountMasterKey
				);

				const rawAccessKey = sodium.crypto_secretbox_open_easy(
					sodium.from_base64(data.account.accessKey.key),
					sodium.from_base64(data.account.accessKey.nonce),
					rawAccountMasterKey
				);

				localStored = {
					id: page.params.pasteId,
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
					id: page.params.pasteId,
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

			const decryptedChunk = sodium.crypto_secretstream_xchacha20poly1305_pull(state, chunk);

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
			timePeriods.forEach((time) => {
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
	});
</script>

<svelte:head>
	{@html rosPine}

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
	class="overlay modal overlay-open:opacity-100 modal-middle hidden"
	role="dialog"
	tabindex="-1"
>
	<div class="modal-dialog overlay-open:opacity-100">
		<div class="modal-content p-4">
			<div class="modal-header">
				<h1 class="modal-title">{$_('paste_actions.qr_code.model.header')}</h1>
			</div>
			<div class="modal-body">
				<QrCode value={page.url.href} color="#8478c9" background="#191724" size={540} />
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
	<div class="modal-dialog overlay-open:opacity-100">
		<div class="modal-content p-4">
			<div class="modal-header">
				<h1 class="modal-title">{$_('shortcuts')}</h1>
			</div>
			<div class="modal-body">
				<div class="pb-2">
					<h3 class="text-base-content text-1xl">{$_('paste_actions.share.button')}</h3>
					<kbd class="kbd">Ctrl</kbd>+<kbd class="kbd">X</kbd>
				</div>
				<div class="pb-2 pt-2">
					<h3 class="text-base-content text-1xl">{$_('paste_actions.clipboard.button')}</h3>
					<kbd class="kbd">Ctrl</kbd>+<kbd class="kbd">A</kbd>
				</div>
				<div class="pb-2 pt-2">
					<h3 class="text-base-content text-1xl">{$_('paste_actions.download.button')}</h3>
					<kbd class="kbd">Ctrl</kbd>+<kbd class="kbd">S</kbd>
				</div>
			</div>
		</div>
	</div>
</div>

{#if pasteDownloading}
	<Loading />
{:else}
	<div class="flex flex-col gap-4 md:flex-row">
		<div class={`w-full rounded-lg pt-4 pb-4 sm:p-4 px-0 ${localStored?.accessKey ? 'md:w-5/6' : ''}`}>
			{#if langImport}
				<Highlight language={langImport} code={rawPaste} let:highlighted>
					<LineNumbers {highlighted} />
				</Highlight>
			{:else}
				<HighlightAuto code={rawPaste} let:highlighted>
					<LineNumbers {highlighted} />
				</HighlightAuto>
			{/if}
		</div>

		{#if localStored && localStored.accessKey}
			<div
				class="bg-neutral-content order-first flex w-full flex-col space-y-2 rounded-lg p-4 md:order-last md:ml-4 md:w-1/6"
			>
				<h1 class="text-base-content text-2xl">{$_('paste_owner')}</h1>

				<form onsubmit={setName}>
					<label class="label label-text" for="name-paste"
						>{$_('paste_actions.rename.button')}</label
					>
					<div class="flex items-center">
						<input bind:value={pasteName} type="text" class="input" id="name-paste" />
						<button type="submit" class="btn btn-outline h-full"><SendIcon /></button>
					</div>
				</form>

				<label class="label label-text" for="delete-after"
					>{$_('paste_actions.expire.button')}</label
				>
				<Select
					items={timePeriods}
					clearable={false}
					bind:value={expireTime}
					on:change={setExpire}
				/>

				<label class="label label-text" for="lang">{$_('paste_actions.language')}</label>
				<Select
					items={Object.keys(supportedLangs)}
					clearable={false}
					bind:value={selectedLang}
					on:change={setLang}
					placeholder="Auto-detect language"
				/>
				<div class="mt-2"></div>
				<div class="flex items-center gap-1">
					<input
						type="checkbox"
						class="checkbox checkbox-primary"
						id="wrap-words"
						bind:checked={preWrap}
						onclick={setPreWrap}
					/>
					<label class="label label-text text-base" for="wrap-words"
						>{$_('paste_actions.wrap_words')}</label
					>
				</div>
				<div class="mt-2"></div>

				<button
					class="btn btn-primary"
					onclick={() => {
						// @ts-ignore
						new HSOverlay(document.querySelector('#qr-code')).open();
					}}
				>
					<QrCodeIcon />
					{$_('paste_actions.qr_code.button')}</button
				>

				<button class="btn btn-primary" onclick={sharePaste}>
					<ShareIcon />
					{$_('paste_actions.share.button')}
				</button>

				<button
					class="btn btn-primary"
					onclick={() => {
						// @ts-ignore
						new HSOverlay(document.querySelector('#shortcuts')).open();
					}}
				>
					<CommandIcon /> {$_('shortcuts')}</button
				>

				<button class="btn btn-outline" onclick={deletePaste}>
					<TrashIcon />
					{$_('paste_actions.delete.button')}
				</button>
			</div>
		{/if}
	</div>
{/if}
