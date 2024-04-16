<script lang="ts">
	import '$lib/i18n';
	import { _ } from 'svelte-i18n';

	import { Loading } from '@tadashi/svelte-loading';
	import { Toaster } from 'svelte-french-toast';
	import { Modals, closeModal } from 'svelte-modals';
</script>

<nav>
	<a href="/"
		><h1>
			{import.meta.env.VITE_NAME ? import.meta.env.VITE_NAME : 'paaster'}
		</h1></a
	>
	<ul>
		<li>
			<a href="https://github.com/WardPearce/paaster" target="_blank" rel="noopener noreferrer">
				<i class="lab la-github" /></a
			>
		</li>
		<li>
			<a href="/pastes" class="button"><i class="lab la-buffer" />{$_('saved_pastes')}</a>
		</li>
	</ul>
</nav>

<slot />

<Loading
	name="main"
	animation="Jelly"
	--tadashi_svelte_loading_color="var(--lighterBg)"
	--tadashi_svelte_loading_background_color="var(--darkBgTrans)"
	--tadashi_svelte_loading_zindex="1011"
/>

<Toaster toastOptions={{ className: 'toast' }} />

<Modals>
	<div slot="backdrop" class="backdrop" on:click={closeModal} on:keydown={() => {}} />
</Modals>
