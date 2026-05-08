<script lang="ts">
	import FileText from 'lucide-svelte/icons/file-text';
</script>

<div class="flex min-h-screen flex-col items-center justify-center gap-6">
	<div class="flex flex-col items-center gap-6">
		<FileText class="text-primary/70 size-16" />
		<span class="loading loading-spinner text-primary size-20"></span>
	</div>
	<div class="text-base-content/50 text-xl font-medium tracking-wide">
		Loading<span class="animate-bounce ml-0.5" style="animation-delay: 0ms">.</span>
		<span class="animate-bounce" style="animation-delay: 200ms">.</span>
		<span class="animate-bounce" style="animation-delay: 400ms">.</span>
	</div>
</div>