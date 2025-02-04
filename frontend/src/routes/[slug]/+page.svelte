<script lang="ts">
	import Spinner from '$lib/Spinner.svelte';
	import sodium from 'libsodium-wrappers-sumo';
	import Mousetrap from 'mousetrap';
	import { onMount } from 'svelte';
	import Highlight, { HighlightAuto, LineNumbers } from 'svelte-highlight';
	import rosPine from 'svelte-highlight/styles/ros-pine';
	import { _ } from 'svelte-i18n';
	import Select from 'svelte-select';
	import { get } from 'svelte/store';

	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { paasterClient } from '$lib/client';
	import { ApiError } from '$lib/client/core/ApiError';
	import type { PasteModel } from '$lib/client/models/PasteModel';
	import { deletePaste, getPaste, savePaste } from '$lib/savedPaste';
	import { pasteCache } from '$lib/stores';
	import type { LanguageType } from 'svelte-highlight/languages';

	let pasteId: string = $page.params.slug;

	let ownerSecret = $state('');
	const [b64EncodedRawKey, givenOwnerSecret]: string[] = location.hash
		.substring(1)
		.split('&ownerSecret=');

	// Remove ownerSecret out of URL ASAP if provided.
	if (typeof givenOwnerSecret !== 'undefined') {
		location.hash = `#${b64EncodedRawKey}`;
	}

	let rawSecretKey: Uint8Array;
	let isSaved = $state(false);
	let rawCode = $state('');
	let pasteCreated: number;
	let timePeriods = [
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
	let selectedTime: {
		value: number | null;
		label: string;
	} | null = $state(null);

	let selectedLang: { label: string; value: string } | undefined = $state();
	let supportedLangs: {
		[key: string]: LanguageType<string>;
	} = $state({});
	let langImport: LanguageType<string> | null = $state(null);

	function renamePaste() {}

	function setAccessCode() {}

	function generateQRCode() {}

	async function setLang() {
		if (!selectedLang) return;

		langImport = supportedLangs[selectedLang.value];

		const langIv = sodium.randombytes_buf(sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);
		const langCipher = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
			new TextEncoder().encode(selectedLang.value),
			null,
			null,
			langIv,
			rawSecretKey
		);

		await paasterClient.default.controllerPastePasteIdOwnerSecretUpdatePaste(pasteId, ownerSecret, {
			language: {
				cipher_text: sodium.to_base64(langCipher, sodium.base64_variants.URLSAFE_NO_PADDING),
				iv: sodium.to_base64(langIv, sodium.base64_variants.URLSAFE_NO_PADDING)
			}
		});
	}

	async function shareLinkToClipboard() {
		await navigator.clipboard.writeText(window.location.href);
	}

	async function expireAfter(event: { detail: { value: number; label: string } }) {
		await paasterClient.default.controllerPastePasteIdOwnerSecretUpdatePaste(pasteId, ownerSecret, {
			expires_in_hours: event.detail.value
		});
	}

	async function deletePasteCall() {
		try {
			await paasterClient.default.controllerPastePasteIdOwnerSecretDeletePaste(
				pasteId,
				ownerSecret
			);
			await deletePaste(pasteId);
			goto('');
		} catch {}
	}

	async function download() {
		const anchor = document.createElement('a');
		const url = window.URL.createObjectURL(new Blob([rawCode], { type: 'octet/stream' }));
		anchor.href = url;
		anchor.click();
		window.URL.revokeObjectURL(url);
	}

	async function savePasteLocal() {
		await savePaste(pasteId, b64EncodedRawKey, pasteCreated);
		isSaved = true;
	}

	async function copyToClipboard() {
		await navigator.clipboard.writeText(rawCode);
	}

	async function loadPaste(accessCode?: string) {
		await sodium.ready;

		try {
			rawSecretKey = sodium.from_base64(
				b64EncodedRawKey,
				sodium.base64_variants.URLSAFE_NO_PADDING
			);
		} catch (error) {
			goto('/');
			return;
		}

		try {
			const savedPaste = await getPaste(pasteId);
			if (savedPaste.ownerSecret) ownerSecret = savedPaste.ownerSecret;
			isSaved = true;
		} catch {}

		// If user just created paste,
		// avoid needing to download & decrypt paste for speed reasons.
		let storedPaste = get(pasteCache);
		if (storedPaste !== '') {
			rawCode = storedPaste;
			pasteCache.set('');

			return;
		}

		if (b64EncodedRawKey === '') {
			goto('/');
			return;
		}

		let paste: PasteModel;
		try {
			paste = await paasterClient.default.controllerPastePasteIdGetPaste(pasteId, accessCode);
		} catch (error) {
			if (error instanceof ApiError) {
				// Delete paste from local storage if no longer exists on server.
				if ((error as ApiError).status === 404) {
					await deletePaste(pasteId);
				} else if ((error as ApiError).status == 401) {
					// Handle auth

					return;
				} else {
				}
			}

			goto('/');
			return;
		}

		if (typeof givenOwnerSecret !== 'undefined') {
			ownerSecret = givenOwnerSecret;
			try {
				await savePaste(pasteId, b64EncodedRawKey, paste.created, ownerSecret);
				isSaved = true;
			} catch {}
		}

		if (ownerSecret !== '') {
			if (paste.expires_in_hours !== null) {
				// Allows us to change the period label in the future.
				timePeriods.forEach((time) => {
					if (time.value === paste.expires_in_hours) {
						selectedTime = time;
						return true;
					}
				});
			}
		}

		if (paste.language) {
			const rawLang = new TextDecoder('utf8').decode(
				sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
					null,
					sodium.from_base64(paste.language.cipher_text, sodium.base64_variants.URLSAFE_NO_PADDING),
					null,
					sodium.from_base64(paste.language.iv, sodium.base64_variants.URLSAFE_NO_PADDING),
					rawSecretKey
				)
			);

			if (rawLang in supportedLangs) {
				selectedLang = { value: rawLang, label: rawLang };
				langImport = supportedLangs[rawLang];
			}
		}

		let response: Response;
		try {
			response = await fetch(paste.download_url);
		} catch {
			goto('/');
			return;
		}

		try {
			rawCode = new TextDecoder('utf8').decode(
				sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
					null,
					new Uint8Array(await response.arrayBuffer()),
					null,
					sodium.from_base64(paste.iv, sodium.base64_variants.URLSAFE_NO_PADDING),
					rawSecretKey
				)
			);
		} catch (error) {
			goto('/');
			return;
		}

		pasteCreated = Number(paste.created);

		Mousetrap.bind(['command+a', 'ctrl+a'], () => {
			copyToClipboard();
			return false;
		});
		Mousetrap.bind(['command+x', 'ctrl+x'], () => {
			shareLinkToClipboard();
			return false;
		});
		Mousetrap.bind(['command+s', 'ctrl+s'], () => {
			download();
			return false;
		});
	}

	onMount(async () => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const rawSupportedLangs: { [key: string]: any } = await import('svelte-highlight/languages');

		supportedLangs = Object.keys(rawSupportedLangs).reduce(
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(result: { [key: string]: any }, key) => {
				if (key !== 'default') {
					result[key] = rawSupportedLangs[key];
				}
				return result;
			},
			{}
		);

		await loadPaste();
	});
</script>

<svelte:head>
	{@html rosPine}
</svelte:head>

{#if ownerSecret !== ''}
	<main>
		<section>
			<h3>owner panel</h3>
			<div class="owner-panel">
				<button onclick={renamePaste}
					><i class="las la-pencil-alt"></i>{$_('paste_actions.rename.button')}</button
				>
				<button onclick={shareLinkToClipboard}
					><i class="las la-share"></i>{$_('paste_actions.share.button')}</button
				>
				<button onclick={generateQRCode}
					><i class="las la-qrcode"></i>{$_('paste_actions.qr_code.button')}</button
				>
				<button onclick={setAccessCode}
					><i class="las la-key"></i>{$_('paste_actions.access_code.button')}</button
				>
				<Select
					items={timePeriods}
					clearable={false}
					placeholder={$_('paste_actions.expire.button')}
					on:change={expireAfter}
					bind:value={selectedTime}
				/>
				<Select
					items={Object.keys(supportedLangs)}
					clearable={false}
					bind:value={selectedLang}
					on:change={setLang}
					placeholder="Auto-detect language"
				/>
				<button class="danger" onclick={deletePasteCall}
					><i class="las la-trash"></i>{$_('paste_actions.delete.button')}</button
				>
			</div>
		</section>
	</main>
{/if}

<footer>
	<button onclick={download}
		><i class="las la-download"></i>{$_('paste_actions.download.button')}</button
	>
	<button onclick={copyToClipboard}
		><i class="las la-copy"></i>{$_('paste_actions.clipboard.button')}</button
	>

	{#if !isSaved}
		<button onclick={savePasteLocal}
			><i class="las la-save"></i>{$_('paste_actions.save.button')}</button
		>
	{/if}
</footer>

{#if rawCode !== ''}
	<div class="content">
		{#if langImport}
			<Highlight language={langImport} code={rawCode} let:highlighted>
				<LineNumbers {highlighted} />
			</Highlight>
		{:else}
			<HighlightAuto code={rawCode} let:highlighted>
				<LineNumbers {highlighted} />
			</HighlightAuto>
		{/if}
	</div>
{:else}
	<Spinner />
{/if}

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

	@media screen and (max-width: 1200px) {
		.owner-panel {
			flex-direction: column;
			row-gap: 1em;
		}
	}
</style>
