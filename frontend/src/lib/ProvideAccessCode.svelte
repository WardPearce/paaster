<script lang="ts">
	import sodium from 'libsodium-wrappers-sumo';
	import { _ } from 'svelte-i18n';
	import { closeModal } from 'svelte-modals';
	import { paasterClient } from '../lib/client';

	export let isOpen: boolean;
	export let b64EncodedRawKey: string;
	export let loadPasteFunc: Function;
	export let pasteId: string;

	let accessCode = ['', '', '', ''];

	async function onCodeInputted() {
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-ignore
		let inputtedCode = document.getElementById('inputtedCode').value;

		if (inputtedCode.includes('-')) {
			accessCode = inputtedCode.split('-');
			await attemptAccessCode();
		}
	}

	async function attemptAccessCode() {
		const codeString = accessCode.join('-').toLowerCase();

		let attemptedCode: string;
		try {
			const kdf = await paasterClient.default.controllerPastePasteIdKdfGetPasteKdf(pasteId);

			attemptedCode = sodium.to_base64(
				sodium.crypto_pwhash(
					32,
					codeString,
					sodium.from_base64(kdf.salt),
					kdf.ops_limit,
					kdf.mem_limit,
					sodium.crypto_pwhash_ALG_DEFAULT
				)
			);
		} catch (error) {
			attemptedCode = sodium.to_base64(
				sodium.crypto_generichash(64, codeString, b64EncodedRawKey),
				sodium.base64_variants.URLSAFE_NO_PADDING
			);
		}

		await loadPasteFunc(attemptedCode);
		closeModal();
	}
</script>

{#if isOpen}
	<div role="dialog" class="modal">
		<div class="contents">
			<div class="header">
				<h2>{$_('require_access_code_model.header')}</h2>
			</div>
			<form on:submit|preventDefault={attemptAccessCode} class="generate-pass-form">
				<div class="generate-pass">
					<ul>
						{#each Array(accessCode.length) as _, index}
							<li>
								<input
									type="text"
									bind:value={accessCode[index]}
									autofocus={index === 0}
									id="inputtedCode"
									on:input={onCodeInputted}
								/>
								<p>-</p>
							</li>
						{/each}
					</ul>
				</div>
				<button type="submit" on:click={attemptAccessCode}
					>{$_('require_access_code_model.button')}</button
				>
			</form>
		</div>
	</div>
{/if}
