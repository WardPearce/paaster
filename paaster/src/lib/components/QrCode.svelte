<script lang="ts">
	import { qr } from '@svelte-put/qr/img';
	import { themeStore } from '$lib/client/stores.js';
	import { oklchToHex } from '$lib/client/colors';

	let {
		data,
		width = 280,
		height = 280
	}: { data: string; width?: number; height?: number } = $props();

	let moduleFill = $state<string>();
	let backgroundFill = $state<string>();

	$effect(() => {
		if (typeof document !== 'undefined') {
			$themeStore;
			const primary = getComputedStyle(document.documentElement)
				.getPropertyValue('--color-primary')
				.trim();
			const base100 = getComputedStyle(document.documentElement)
				.getPropertyValue('--color-base-100')
				.trim();
			moduleFill = oklchToHex(primary);
			backgroundFill = oklchToHex(base100);
		}
	});
</script>

<img
	use:qr={{
		data,
		moduleFill,
		anchorOuterFill: moduleFill,
		anchorInnerFill: moduleFill,
		backgroundFill,
		width,
		height
	}}
	alt="QR Code"
	{width}
	{height}
/>
