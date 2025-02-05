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
		themes: ["light", "dark"],
		vendors: true
	},
	plugins: [typography, forms, flyonui, flyonuiPlugin],

} satisfies Config;
