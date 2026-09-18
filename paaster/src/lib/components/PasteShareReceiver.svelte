<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { _ } from '$lib/i18n';
	import { onDestroy } from 'svelte';
	import { get } from 'svelte/store';
	import {
		applySharedPaste,
		fetchPasteShareData,
		normalizePasteShareCode,
		openPasteShareData,
		registerPasteShareReceiver,
		pasteShareTtlMs
	} from '$lib/client/pasteShare';
	import CheckCircle2Icon from 'lucide-svelte/icons/check-circle-2';

	let phase = $state<'entering' | 'connecting' | 'waiting' | 'success' | 'error'>('entering');
	let errorMessage = $state('');

	let code = $state('');
	let keypair: { publicKey: Uint8Array; privateKey: Uint8Array } | null = null;
	let deadline = $state(0);

	let pollTimer: ReturnType<typeof setInterval> | undefined;
	let errorResetTimer: ReturnType<typeof setTimeout> | undefined;

	async function submit(enteredCode: string) {
		if (phase !== 'entering') return;

		code = enteredCode;
		phase = 'connecting';

		const result = await registerPasteShareReceiver(code);
		if (result.status !== 'ok') {
			if (result.status === 'not-found' || result.status === 'error') {
				showError(get(_)('quickShare.invalidCode'));
			} else if (result.status === 'conflict') {
				showError(get(_)('quickShare.alreadyUsed'));
			} else {
				showError(get(_)('quickShare.captchaFailed'));
			}
			return;
		}

		keypair = result.keypair;
		deadline = Date.now() + pasteShareTtlMs;
		phase = 'waiting';
		startPolling();
	}

	function showError(message: string) {
		errorMessage = message;
		phase = 'error';
		clearTimeout(errorResetTimer);
		errorResetTimer = setTimeout(() => void reset(), 3000);
	}

	async function poll() {
		if (!keypair) return;

		const cipher = await fetchPasteShareData(code);
		if (cipher) {
			const payload = await openPasteShareData(cipher, keypair.publicKey, keypair.privateKey);
			if (payload) {
				stopPolling();
				phase = 'success';
				await applySharedPaste(payload.pasteId, payload.masterKey);
				goto(resolve(`/[pasteId]#${payload.masterKey}`, { pasteId: payload.pasteId }));
				return;
			}
		}

		if (Date.now() > deadline) {
			stopPolling();
			showError(get(_)('quickShare.expired'));
		}
	}

	function startPolling() {
		stopPolling();
		void poll();
		pollTimer = setInterval(() => void poll(), 2500);
	}

	function stopPolling() {
		if (pollTimer) {
			clearInterval(pollTimer);
			pollTimer = undefined;
		}
	}

	function reset() {
		clearTimeout(errorResetTimer);
		errorResetTimer = undefined;
		stopPolling();
		code = '';
		keypair = null;
		deadline = 0;
		errorMessage = '';
		phase = 'entering';
	}

	function onInput(event: Event) {
		const el = event.target as HTMLInputElement;
		const normalized = normalizePasteShareCode(el.value).slice(0, 8);

		code = normalized;
		if (el.value !== normalized) el.value = normalized;
		if (normalized.length === 8) void submit(normalized);
	}

	onDestroy(() => {
		clearTimeout(errorResetTimer);
		stopPolling();
	});
</script>

<div class="flex flex-col items-center gap-4">
	{#if phase === 'entering' || phase === 'error'}
		<input
			type="text"
			inputmode="text"
			autocomplete="off"
			autocapitalize="characters"
			spellcheck="false"
			maxlength="8"
			class="text-base-content bg-base-content/5 border-base-content/20 focus:border-primary h-16 w-full rounded-xl border text-center font-mono text-3xl tracking-[0.5em] uppercase focus:outline-none"
			placeholder="ABCDEFGH"
			value={code}
			oninput={onInput}
			onkeydown={(event) => {
				if (event.key === 'Enter' && normalizePasteShareCode(code).length === 8) {
					void submit(normalizePasteShareCode(code));
				}
			}}
		/>

		<p class="text-base-content/70 text-center text-sm">{$_('quickShare.codeLocation')}</p>

		{#if phase === 'error'}
			<p class="text-error text-sm">{errorMessage}</p>
		{/if}
	{:else if phase === 'connecting'}
		<div class="flex flex-col items-center gap-2 text-center">
			<span class="loading loading-spinner loading-md"></span>
			<span>{$_('quickShare.connecting')}</span>
		</div>
	{:else if phase === 'waiting'}
		<div class="flex flex-col items-center gap-2 text-center">
			<span class="loading loading-spinner loading-md"></span>
			<span>{$_('quickShare.waiting')}</span>
		</div>
	{:else if phase === 'success'}
		<div class="text-primary flex flex-col items-center gap-2 text-center">
			<CheckCircle2Icon size={20} />
			<span>{$_('quickShare.success')}</span>
		</div>
	{/if}
</div>
