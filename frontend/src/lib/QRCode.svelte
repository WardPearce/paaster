<script lang="ts">
	import { _ } from 'svelte-i18n';
	import QrCode from 'svelte-qrcode';

	export let pasteId: string;
	export let b64EncodedRawKey: string;
	export let isOpen: boolean;
</script>

{#if isOpen}
	<div role="dialog" class="modal">
		<div class="contents">
			<div class="header">
				<h2>{$_('paste_actions.qr_code.model.header')}</h2>
			</div>
			<QrCode
				color="#8478c9"
				background="#0c0b10"
				size={500}
				value={`${window.location.origin}/${pasteId}#${b64EncodedRawKey}`}
			/>
		</div>
	</div>
{/if}
