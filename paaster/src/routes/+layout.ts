import { browser } from '$app/env';
import '#lib/i18n/index';
import { initI18n } from '#lib/i18n/index';

export const load = async () => {
	if (browser) {
		await initI18n();
	}
};
