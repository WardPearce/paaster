<script lang="ts">
	import sodium from 'libsodium-wrappers-sumo';
	import { _ } from 'svelte-i18n';

	import { paasterClient } from '$lib/client';
	import { generatePassphrase } from '$lib/niceware';

	interface Props {
		pasteId: string;
		ownerSecret: string;
		isOpen: boolean;
	}

	let { pasteId, ownerSecret, isOpen }: Props = $props();

	let accessCode = $state(['', '', '', '']);
	let codeString = $state('');

	async function generateAccessCode(event: SubmitEvent) {
		event.preventDefault();

		accessCode = generatePassphrase(8);
		codeString = accessCode.join('-').toLowerCase();

		const salt = sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES);
		const opsLimit = sodium.crypto_pwhash_OPSLIMIT_MODERATE;
		const memLimit = sodium.crypto_pwhash_MEMLIMIT_MODERATE;

		const derivedCode = sodium.crypto_pwhash(
			32,
			codeString,
			salt,
			opsLimit,
			memLimit,
			sodium.crypto_pwhash_ALG_DEFAULT
		);

		await paasterClient.default.controllerPastePasteIdOwnerSecretUpdatePaste(pasteId, ownerSecret, {
			access_code: {
				code: sodium.to_base64(derivedCode),
				mem_limit: memLimit,
				ops_limit: opsLimit,
				salt: sodium.to_base64(salt)
			}
		});
	}

	async function copyCodeToClipboard() {
		try {
			await navigator.clipboard.writeText(codeString);
		} catch {}
	}
</script>

{#if isOpen}
	<div role="dialog" class="modal">
		<div class="contents">
			<div class="header">
				<h2>{$_('paste_actions.access_code.model.header')}</h2>
			</div>
			<form onsubmit={generateAccessCode} class="generate-pass-form">
				<div class="generate-pass">
					<ul>
						{#each accessCode as code}
							<li>
								<input type="text" value={code} disabled={true} />
								<p>-</p>
							</li>
						{/each}
					</ul>
				</div>
				{#if !codeString}
					<button type="submit"
						><i class="las la-redo-alt"></i>
						{$_('paste_actions.access_code.model.tooltip')}</button
					>
				{:else}
					<button type="button" onclick={copyCodeToClipboard}
						><i class="las la-copy"></i>{$_('paste_actions.access_code.model.button')}</button
					>
				{/if}
			</form>
		</div>
	</div>
{/if}
