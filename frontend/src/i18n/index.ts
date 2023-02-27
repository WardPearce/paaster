import { register, init, getLocaleFromNavigator } from "svelte-i18n";

register("en", () => import("./en.json"));
register("en-US", () => import("./en.json"));

init({
  fallbackLocale: "en",
  initialLocale: getLocaleFromNavigator(),
});