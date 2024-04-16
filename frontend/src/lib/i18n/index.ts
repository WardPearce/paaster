import { browser } from '$app/environment';
import { init, register } from 'svelte-i18n';

const defaultLocale = 'en';

register("en", () => import("./locales/en.json"));
register("en-US", () => import("./locales/en.json"));
register("de", () => import("./locales/de.json"));
register("fi", () => import("./locales/fi.json"));
register("fr", () => import("./locales/fr.json"));
register("hi", () => import("./locales/hi.json"));
register("id", () => import("./locales/id.json"));
register("it", () => import("./locales/it.json"));
register("ja", () => import("./locales/ja.json"));
register("ko", () => import("./locales/ko.json"));
register("lt", () => import("./locales/lt.json"));
register("lv", () => import("./locales/lv.json"));
register("mi", () => import("./locales/mi.json"));
register("ml", () => import("./locales/ml.json"));
register("no", () => import("./locales/no.json"));
register("ru", () => import("./locales/ru.json"));
register("sv", () => import("./locales/sv.json"));
register("vi", () => import("./locales/vi.json"));
register("zh", () => import("./locales/zh.json"));
register("uk", () => import("./locales/uk.json"));
register("pt-br", () => import("./locales/pt-br.json"));


init({
  fallbackLocale: defaultLocale,
  initialLocale: browser ? window.navigator.language : defaultLocale,
});