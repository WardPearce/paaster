<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { _ } from '$lib/i18n';
	import KeyIcon from 'lucide-svelte/icons/key';
	import ArrowRightIcon from 'lucide-svelte/icons/arrow-right';
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import { solveCaptchaChallenge, type CaptchaPayload } from '$lib/client/captcha';

	let passphrase = $state('');
	let formError = $state('');

	let captchaPayload = $state<CaptchaPayload | null>(null);
	let captchaState = $state<'idle' | 'solving' | 'solved' | 'error'>('idle');

	async function refreshCaptcha() {
		captchaState = 'solving';
		captchaPayload = await solveCaptchaChallenge();
		captchaState = captchaPayload ? 'solved' : 'error';
	}

	onMount(() => {
		void refreshCaptcha();
	});

	function onSuccess() {
		const hash = window.location.hash;
		goto(resolve(`/${page.params.pasteId}${hash}`));
	}
</script>

<div class="flex min-h-[70vh] items-center justify-center p-4">
	<div class="card border-base-content/20 w-full max-w-md rounded-lg border p-6">
		<div class="mb-6 flex flex-col items-center gap-3 text-center">
			<div class="bg-base-content/10 flex h-12 w-12 items-center justify-center rounded-full">
				<KeyIcon size={24} />
			</div>
			<h1 class="text-base-content text-lg font-semibold">
				{$_('require_passphrase_model.header')}
			</h1>
			<p class="text-base-content/60 text-sm">
				{$_('require_passphrase_model.description')}
			</p>
		</div>

		<form
			method="POST"
			use:enhance={() => {
				return async ({ result }) => {
					if (result.type === 'success') {
						onSuccess();
					} else {
						const data =
							result.type === 'failure' ? (result.data as { error?: string }) : undefined;
						formError = data?.error ?? $_('require_passphrase_model.invalid');
						void refreshCaptcha();
					}
				};
			}}
		>
			<div class="flex flex-col gap-4">
				<input
					type="password"
					name="passphrase"
					bind:value={passphrase}
					placeholder={$_('require_passphrase_model.input')}
					class="input h-10 w-full text-sm"
					required
					autofocus
				/>

				{#if captchaPayload}
					<input type="hidden" name="captchaPayload" value={JSON.stringify(captchaPayload)} />
				{/if}

				{#if captchaState === 'solving'}
					<div
						class="bg-primary/20 flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm"
					>
						<span class="loading loading-spinner loading-xs"></span>
						{$_('account.verifying_captcha', 'Verifying captcha...')}
					</div>
				{:else if captchaState === 'solved'}
					<div
						class="bg-primary/5 text-success flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm"
					>
						{$_('account.captcha_verified', 'Captcha verified')}
					</div>
				{:else if captchaState === 'error'}
					<div
						class="bg-primary/5 text-error flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm"
					>
						<button
							type="button"
							class="btn btn-ghost btn-xs"
							onclick={() => void refreshCaptcha()}
						>
							{$_('account.retry', 'Retry')}
						</button>
					</div>
				{/if}

				{#if formError}
					<p class="text-error text-xs">{formError}</p>
				{/if}

				<button type="submit" class="btn btn-primary btn-sm h-10 w-full" disabled={!captchaPayload}>
					<ArrowRightIcon size={16} />
					{$_('require_passphrase_model.button')}
				</button>
			</div>
		</form>
	</div>
</div>
