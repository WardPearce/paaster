<script lang="ts">
	import { page } from '$app/state';
	import CircleSlashIcon from 'lucide-svelte/icons/circle-slash';
</script>

<div class="flex flex-col items-center pt-10">
	<CircleSlashIcon size={200} />
	<h1 class="mt-2 text-2xl font-bold">{page.error?.message}</h1>
</div>
