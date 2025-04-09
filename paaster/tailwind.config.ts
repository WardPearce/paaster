import forms from '@tailwindcss/forms';
import typography from '@tailwindcss/typography';
import flyonui from 'flyonui';
import type { Config } from 'tailwindcss';


export default {
	content: [
		'./src/**/*.{html,js,svelte,ts}',
		'./node_modules/flyonui/dist/js/*.js',
		'./node_modules/notyf/**/*.js'
	],
	plugins: [typography, forms, flyonui],

} satisfies Config;

