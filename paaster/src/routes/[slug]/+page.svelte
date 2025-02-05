<script lang="ts">
	import { page } from '$app/state';
	import { localDb, type Paste } from '$lib/client/dexie';
	import { deriveExistingKeyFromMaster } from '$lib/client/sodiumWrapped';
	import Loading from '$lib/components/Loading.svelte';
	import { getToast } from '$lib/toasts';
	import { error } from '@sveltejs/kit';
	import sodium from 'libsodium-wrappers-sumo';
	import CommandIcon from 'lucide-svelte/icons/command';
	import QrCodeIcon from 'lucide-svelte/icons/qr-code';
	import RotateCwIcon from 'lucide-svelte/icons/rotate-cw';
	import SendIcon from 'lucide-svelte/icons/send-horizontal';
	import ShareIcon from 'lucide-svelte/icons/share-2';
	import TrashIcon from 'lucide-svelte/icons/trash';
	import Mousetrap from 'mousetrap';
	import { onMount } from 'svelte';
	import Highlight, { HighlightAuto, LineNumbers } from 'svelte-highlight';
	import type { LanguageType } from 'svelte-highlight/languages';
	import typescript from 'svelte-highlight/languages/typescript';
	import rosPine from 'svelte-highlight/styles/ros-pine';
	import { _ } from 'svelte-i18n';
	// @ts-ignore
	import QrCode from 'svelte-qrcode';
	import { get } from 'svelte/store';

	let { data } = $props();

	let rawMasterKey: Uint8Array;
	let rawPaste: string = $state('');

	let localStored: Paste | undefined = $state();

	let pasteDownloading = $state(true);

	let selectedLang: { label: string; value: string };
	let supportedLangs: {
		[key: string]: LanguageType<string>;
	} = {};
	let langImport: LanguageType<string> | null = null;

	const timePeriods = [
		{ value: null, label: $_('paste_actions.expire.periods.never') },
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

	async function deletePaste() {}

	let expireTime = $state();
	async function setExpire(event: Event & { currentTarget: EventTarget & HTMLSelectElement }) {
		event.preventDefault();
		console.log(expireTime);
	}

	async function sharePaste() {
		await navigator.clipboard.writeText(page.url.href);
		getToast().success(get(_)('paste_actions.share.success'));
	}

	async function copyCode() {
		await navigator.clipboard.writeText(page.url.href);
		getToast().success(get(_)('paste_actions.clipboard.success'));
	}

	async function downloadPaste() {
		const anchor = document.createElement('a');
		const url = window.URL.createObjectURL(new Blob([rawPaste], { type: 'octet/stream' }));
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
			error(400, get(_)('view.invalid_format'));
		}

		const result = await localDb.pastes.get(page.params.slug);
		if (result) {
			localStored = result;
		} else {
			await localDb.pastes.add({
				id: page.params.slug,
				masterKey: sodium.to_base64(rawMasterKey),
				accessKey: undefined,
				date: new Date()
			});
		}

		await loadSupportedLangs();

		const codeResponse = await fetch(data.signedUrl);
		if (!codeResponse.ok) {
			error(400, get(_)('view.cdn_down'));
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
				error(400, get(_)('view.invalid_format'));
			}

			chunkStart = chunkEnd; // Move to the next chunk
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

<div class="flex flex-col gap-4 p-4 md:flex-row">
	<div class="w-full rounded-lg p-4 md:w-5/6">
		{#if pasteDownloading}
			<Loading />
		{:else if false}
			<Highlight language={typescript} code={rawPaste} let:highlighted>
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

			<div class="flex flex-col">
				<label class="label label-text" for="name-paste">{$_('paste_actions.rename.button')}</label>
				<div class="flex items-center">
					<input type="text" class="input" id="name-paste" />
					<button class="btn btn-outline h-full"><SendIcon /></button>
				</div>
			</div>

			<div class="flex flex-col">
				<label class="label label-text" for="password-paste">
					{$_('paste_actions.access_code.button')}
				</label>
				<div class="flex items-center">
					<input type="input" readonly value="None" class="input h-full" id="password-paste" />
					<button class="btn btn-outline h-full"><RotateCwIcon /></button>
				</div>
			</div>

			<div>
				<label class="label label-text" for="delete-after"
					>{$_('paste_actions.expire.button')}</label
				>
				<select bind:value={expireTime} class="select" id="delete-after" onchange={setExpire}>
					{#each timePeriods as timePeriod}
						<option value={timePeriod.value}>{timePeriod.label}</option>
					{/each}
				</select>
			</div>

			<div class="mt-5"></div>

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
