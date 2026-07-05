<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { _ } from '$lib/i18n';
	import KeyIcon from 'lucide-svelte/icons/key';
	import ArrowRightIcon from 'lucide-svelte/icons/arrow-right';

	let passphrase = $state('');
	let formError = $state('');

	function onSuccess() {
		const hash = window.location.hash;
		goto(`/${page.params.pasteId}${hash}`);
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
					} else if (result.type === 'failure') {
						const data = result.data as { error?: string };
						formError = data?.error ?? '';
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

				{#if formError}
					<p class="text-error text-xs">{formError}</p>
				{/if}

				<button type="submit" class="btn btn-primary btn-sm h-10 w-full">
					<ArrowRightIcon size={16} />
					{$_('require_passphrase_model.button')}
				</button>
			</div>
		</form>
	</div>
</div>
