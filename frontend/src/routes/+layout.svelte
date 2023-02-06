<script lang="ts">
	import '../assets/style.css';
	import '../assets/icons/1.3.0/css/line-awesome.min.css';

	import { Toaster } from 'svelte-french-toast';
	import { Loading } from '@tadashi/svelte-loading';
</script>

<nav>
	<a href="/"><h1>paaster.io</h1></a>
	<a href="/pastes" class="button"><i class="lab la-buffer" />Saved pastes</a>
</nav>

<slot />

<Loading
	animation="Jelly"
	color="var(--lighterBg)"
	--tadashi_svelte_loading_background_color="var(--darkBgTrans)"
	--tadashi_svelte_loading_zindex="1011"
/>

<Toaster toastOptions={{ className: 'toast' }} />
