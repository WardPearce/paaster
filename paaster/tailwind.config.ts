import forms from '@tailwindcss/forms';
import typography from '@tailwindcss/typography';
import flyonui from 'flyonui';
import flyonuiPlugin from 'flyonui/plugin';
import type { Config } from 'tailwindcss';

export default {
	content: [
		'./src/**/*.{html,js,svelte,ts}',
		'./node_modules/flyonui/dist/js/*.js',
		'./node_modules/notyf/**/*.js'
	],

	flyonui: {
		themes: [
			{
				paasterDark: {
					"primary": "#8478c9",
					"primary-content": "#06050f",
					"secondary": "#4834b8",
					"secondary-content": "#d5d7f4",
					"accent": "#9b59b6",
					"accent-content": "#ebddf1",
					"neutral": "#95a5a6",
					"neutral-content": "#080a0a",
					"base-100": "#191724",
					"base-200": "#14121e",
					"base-300": "#100e18",
					"base-content": "#cbcbce",
					"info": "#1abc9c",
					"info-content": "#000d09",
					"success": "#2ecc71",
					"success-content": "#010f04",
					"warning": "#f1c40f",
					"warning-content": "#140e00",
					"error": "#e74c3c",
					"error-content": "#130201"
				}
			},
		],
		vendors: true
	},
	plugins: [typography, forms, flyonui, flyonuiPlugin],

} satisfies Config;

