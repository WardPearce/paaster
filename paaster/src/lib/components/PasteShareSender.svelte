<script lang="ts">
	import { _ } from '$lib/i18n';
	import { onDestroy } from 'svelte';
	import { get } from 'svelte/store';
	import {
		cancelPasteShareSession,
		createPasteShareSession,
		getPasteShareStatus,
		sendPasteShareData,
		type PasteSharePayload
	} from '$lib/client/pasteShare';
	import { getToast } from '$lib/client/toasts';
	import SendIcon from 'lucide-svelte/icons/send';
	import SmartphoneIcon from 'lucide-svelte/icons/smartphone';
	import CheckCircle2Icon from 'lucide-svelte/icons/check-circle-2';

	let {
		pasteId,
		masterKey,
		initialSession = null,
		active = true,
		oncancel
	}: {
		pasteId: string;
		masterKey: string;
		initialSession?: { code: string; expires: string } | null;
		active?: boolean;
		oncancel?: () => void;
	} = $props();

	let phase = $state<'idle' | 'showing' | 'awaiting-send' | 'sent'>('idle');

	let code = $state('');
	let expiresAt = $state(0);
	let receiverPublicKey = $state<string | null>(null);
	let now = $state(Date.now());

	let pollTimer: ReturnType<typeof setInterval> | undefined;
	let clockTimer: ReturnType<typeof setInterval> | undefined;
	let pollGeneration = 0;
	let pollInFlight = false;

	const remainingSeconds = $derived(Math.max(0, Math.ceil((expiresAt - now) / 1000)));

	function startSession(codeValue: string, expiryValue: Date) {
		code = codeValue;
		expiresAt = expiryValue.getTime();
		receiverPublicKey = null;
		phase = 'showing';
	}

	$effect(() => {
		if (!initialSession) return;
		if (code === initialSession.code) return;

		startSession(initialSession.code, new Date(initialSession.expires));
	});

	$effect(() => {
		if (!active) {
			stopPolling();
			stopClock();
			if (code) void cancelPasteShareSession(code);
			return;
		}

		if (phase === 'showing' || phase === 'awaiting-send') {
			startPolling();
			startClock();
		}
	});

	async function generate() {
		const session = await createPasteShareSession();
		if (!session) {
			getToast().error(get(_)('quickShare.generateFailed'));
			oncancel?.();
			return;
		}

		startSession(session.code, new Date(session.expires));
	}

	async function poll() {
		if (!code || pollInFlight) return;

		const generation = pollGeneration;
		pollInFlight = true;
		try {
			if (Date.now() > expiresAt) {
				await cancel();
				getToast().error(get(_)('quickShare.expired'));
				return;
			}

			const status = await getPasteShareStatus(code);
			if (generation !== pollGeneration) return;

			if (!status) {
				await cancel();
				getToast().error(get(_)('quickShare.expired'));
				return;
			}

			if (status.status === 'completed') {
				stopPolling();
				phase = 'sent';
				return;
			}

			if (status.receiverPublicKey) {
				receiverPublicKey = status.receiverPublicKey;
				phase = 'awaiting-send';
			}
		} finally {
			pollInFlight = false;
		}
	}

	async function send() {
		if (!code || !receiverPublicKey) return;

		const payload: PasteSharePayload = {
			pasteId,
			masterKey
		};

		const success = await sendPasteShareData(code, receiverPublicKey, payload);
		if (!success) {
			await cancel();
			getToast().error(get(_)('quickShare.sendFailed'));
			return;
		}

		await poll();
		if (phase === 'awaiting-send') phase = 'sent';

		getToast().success(get(_)('quickShare.sent'));
	}

	async function cancel() {
		stopPolling();
		stopClock();
		if (code) await cancelPasteShareSession(code);
		code = '';
		receiverPublicKey = null;
		phase = 'idle';
		oncancel?.();
	}

	function startPolling() {
		stopPolling();
		void poll();
		pollTimer = setInterval(() => void poll(), 2500);
	}

	function stopPolling() {
		pollGeneration++;
		if (pollTimer) {
			clearInterval(pollTimer);
			pollTimer = undefined;
		}
	}

	function startClock() {
		stopClock();
		now = Date.now();
		clockTimer = setInterval(() => {
			now = Date.now();
		}, 1000);
	}

	function stopClock() {
		if (clockTimer) {
			clearInterval(clockTimer);
			clockTimer = undefined;
		}
	}

	onDestroy(() => {
		stopPolling();
		stopClock();
	});
</script>

{#if phase === 'idle'}
	<div class="flex flex-col gap-4">
		<button class="btn btn-primary btn-sm w-full" onclick={generate}>
			<SmartphoneIcon size={16} />
			{$_('quickShare.generate')}
		</button>
	</div>
{:else}
	<div class="flex flex-col gap-4">
		{#if phase === 'showing' || phase === 'awaiting-send'}
			<div class="flex justify-center gap-2">
				{#each code.split('') as char, index (index)}
					<span
						class="bg-base-content/5 border-base-content/20 text-base-content flex aspect-square max-w-12 min-w-0 flex-1 items-center justify-center rounded-lg border font-mono text-2xl"
						>{char}</span
					>
				{/each}
			</div>

			<p class="text-base-content/70 text-sm">
				{phase === 'awaiting-send'
					? $_('quickShare.deviceConnected')
					: $_('quickShare.waitingForDevice')}
			</p>

			<p class="text-base-content/70 text-sm">
				{$_('quickShare.expiresIn', { seconds: remainingSeconds })}
			</p>

			<div class="flex gap-2">
				{#if phase === 'awaiting-send'}
					<button class="btn btn-primary btn-sm flex-1" onclick={send}>
						<SendIcon size={16} />
						{$_('quickShare.send')}
					</button>
				{/if}
				<button class="btn btn-ghost btn-sm flex-1" type="button" onclick={cancel}>
					{$_('quickShare.cancel')}
				</button>
			</div>
		{:else if phase === 'sent'}
			<div class="text-primary flex items-center justify-center gap-2">
				<CheckCircle2Icon size={20} />
				<span>{$_('quickShare.sent')}</span>
			</div>
			<button class="btn btn-soft btn-sm w-full" type="button" onclick={() => void cancel()}>
				{$_('quickShare.done')}
			</button>
		{/if}
	</div>
{/if}
