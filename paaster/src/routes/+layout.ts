import { browser } from '$app/environment';
import '$lib/i18n';
import { initI18n } from '$lib/i18n';

export const load = async () => {
	if (browser) {
		await initI18n();
	}
};
