<script lang="ts">
	import { localDb, type Paste } from '$lib/client/dexie';
	import { relativeDate } from '$lib/date';
	import { onMount } from 'svelte';

	let bookmarkedPastes: Paste[] | undefined = $state();

	onMount(async () => {
		const results = await localDb.pastes.orderBy('created').reverse().toArray();
		if (results) {
			bookmarkedPastes = results;
		}
	});
</script>

{#if bookmarkedPastes}
	<div class="grid grid-cols-1 gap-4 p-5 md:grid-cols-4">
		{#each bookmarkedPastes as paste}
			<div class="bg-neutral-content rounded-lg p-4">
				<div class="mb-5">
					<h2 class="text-lg font-semibold">{paste.name ?? paste.id}</h2>
					<p class="text-sm text-neutral-500">{relativeDate(paste.created)}</p>
				</div>
				<div class="flex space-x-2 sm:ml-auto sm:mt-0 sm:space-x-4">
					<a href={`/${paste.id}#${paste.masterKey}`} class="btn btn-primary">Go to</a>
					{#if paste.accessKey}
						<button class="btn btn-outline">Delete</button>
					{/if}
				</div>
			</div>
		{/each}
	</div>
{/if}
