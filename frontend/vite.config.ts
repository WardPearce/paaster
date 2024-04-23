import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		SvelteKitPWA({
			injectRegister: 'inline',
			manifest: {
				description: 'Paaster is a secure and user-friendly pastebin application that prioritizes privacy and simplicity. With end-to-end encryption and paste history, Paaster ensures that your pasted code remains confidential and accessible.',
				theme_color: "#1c1735",
				background_color: "#191724",
				icons: [
					{
						purpose: "maskable",
						sizes: "512x512",
						src: "icon512_maskable.png",
						type: "image/png"
					},
					{
						purpose: "any",
						sizes: "512x512",
						src: "icon512_rounded.png",
						type: "image/png"
					}
				],
				orientation: "any",
				display: "standalone",
				name: "Paaster",
			}
		}),
		sveltekit()
	]
});