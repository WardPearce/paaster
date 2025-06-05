import i18next, { type InitOptions } from 'i18next';
import { writable, type Writable } from 'svelte/store';

const defaultLocale = 'en';

export const locale: Writable<string> = writable(defaultLocale);
export const _: Writable<(key: string, options?: any) => string> = writable(() => '');

const resources: Record<string, () => Promise<Record<string, any>>> = {
	en: () => import('./locales/en.json'),
	'en-US': () => import('./locales/en.json'),
	de: () => import('./locales/de.json'),
	fi: () => import('./locales/fi.json'),
	fr: () => import('./locales/fr.json'),
	hi: () => import('./locales/hi.json'),
	id: () => import('./locales/id.json'),
	it: () => import('./locales/it.json'),
	ja: () => import('./locales/ja.json'),
	ko: () => import('./locales/ko.json'),
	lt: () => import('./locales/lt.json'),
	lv: () => import('./locales/lv.json'),
	mi: () => import('./locales/mi.json'),
	ml: () => import('./locales/ml.json'),
	no: () => import('./locales/no.json'),
	ru: () => import('./locales/ru.json'),
	sv: () => import('./locales/sv.json'),
	vi: () => import('./locales/vi.json'),
	zh: () => import('./locales/zh.json'),
	uk: () => import('./locales/uk.json'),
	'pt-br': () => import('./locales/pt-br.json')
};

function getUserLocale(): string {
	if (typeof navigator !== 'undefined') {
		const lang = navigator.language;
		return resources[lang] ? lang : defaultLocale;
	}
	return defaultLocale;
}

export async function initI18n(selectedLocale: string = getUserLocale()): Promise<void> {
	const langToLoad = resources[selectedLocale] ? selectedLocale : defaultLocale;
	const translations = await resources[langToLoad]();

	const options: InitOptions = {
		lng: langToLoad,
		fallbackLng: defaultLocale,
		resources: {
			[langToLoad]: {
				translation: translations.default || translations
			}
		}
	};

	await i18next.init(options);

	locale.set(langToLoad);
	_.set(i18next.t.bind(i18next));

	window.addEventListener('languagechange', () => {
		const newLang = getUserLocale();
		initI18n(newLang);
	});
}
