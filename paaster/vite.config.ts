import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			adapter: adapter({
				out: 'build',
				precompress: true
			}),
			preprocess: vitePreprocess(),
			csp: {
				directives: {
					'script-src': ['self', 'wasm-unsafe-eval']
				},
				reportOnly: {
					'script-src': ['self', 'wasm-unsafe-eval'],
					'report-uri': ['/']
				}
			}
		})
	]
});
