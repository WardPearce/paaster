<script lang="ts">
	import { HighlightAuto, LineNumbers } from 'svelte-highlight';
	import rosPine from 'svelte-highlight/styles/ros-pine';

	$: code = `* { 
    margin: 0; 
    padding: 0; 
}

:root {
    --darkBg: #191724;
    --textWhite: rgb(238, 238, 238);
    --toastBarBackground: #565174;
    --toastBackground: #211f29;
    --toastContainerTop: 6em;
}`;
</script>

<svelte:head>
	{@html rosPine}
</svelte:head>

<main>
	<section>
		<h3>owner panel</h3>
		<div class="owner-panel">
			<button><i class="las la-share" />share</button>
			<button><i class="las la-pencil-alt" />rename</button>
			<button><i class="las la-clone" />clone</button>
			<button class="danger"><i class="las la-trash" />delete</button>
		</div>
	</section>
</main>

<footer>
	<button><i class="las la-download" />Download</button>
	<button><i class="las la-copy" />Copy</button>
	<button><i class="las la-save" />Save</button>
</footer>

<div class="content">
	<HighlightAuto {code} let:highlighted>
		<LineNumbers {highlighted} />
	</HighlightAuto>
</div>

<style>
	.content {
		margin-top: 1em;
	}

	.owner-panel {
		margin-top: 0.5em;
		display: flex;
		column-gap: 1em;
	}

	@media screen and (max-width: 600px) {
		.owner-panel {
			flex-direction: column;
			row-gap: 1em;
		}
	}
</style>
