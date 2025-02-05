<script lang="ts">
	import BookMarkedIcon from 'lucide-svelte/icons/book-marked';
	import LoginIcon from 'lucide-svelte/icons/log-in';
	import { _ } from 'svelte-i18n';

	import { afterNavigate } from '$app/navigation';
	import 'notyf/notyf.min.css';
	import '../app.css';

	let { children } = $props();

	afterNavigate(() => {
		// @ts-ignore
		HSStaticMethods.autoInit();
	});
</script>

<nav
	class="navbar bg-neutral-content border-base-content/10 sticky
top-0 z-50 w-full border-b"
>
	<div class="w-full md:flex md:items-center md:gap-2">
		<div class="flex items-center justify-between">
			<div class="navbar-start items-center justify-between max-md:w-full">
				<a class="link text-xl font-semibold text-white no-underline" href="/">paaster.io</a>
				<div class="md:hidden">
					<button
						type="button"
						class="collapse-toggle btn btn-outline btn-primary btn-sm btn-square"
						data-collapse="#default-navbar-collapse"
						aria-controls="default-navbar-collapse"
						aria-label="Toggle navigation"
					>
						<span class="icon-[tabler--menu-2] collapse-open:hidden size-6"></span>
						<span class="icon-[tabler--x] collapse-open:block hidden size-6"></span>
					</button>
				</div>
			</div>
		</div>
		<div
			id="default-navbar-collapse"
			class="md:navbar-end collapse hidden grow basis-full overflow-hidden transition-[height] duration-300 max-md:w-full"
		>
			<ul class="menu md:menu-horizontal gap-2 p-0 text-base max-md:mt-2">
				<li><a href="/pastes" class="btn btn-text"><BookMarkedIcon /> {$_('saved_pastes')}</a></li>
				<li>
					<a href="/login" class="btn btn-primary"><LoginIcon />{$_('account.loginOrRegister')}</a>
				</li>
			</ul>
		</div>
	</div>
</nav>

{@render children?.()}
