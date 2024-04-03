import { register, init, getLocaleFromNavigator } from "svelte-i18n";

register("en", () => import("./en.json"));
register("en-US", () => import("./en.json"));
register("de", () => import("./de.json"));
register("fi", () => import("./fi.json"));
register("fr", () => import("./fr.json"));
register("hi", () => import("./hi.json"));
register("id", () => import("./id.json"));
register("it", () => import("./it.json"));
register("ja", () => import("./ja.json"));
register("ko", () => import("./ko.json"));
register("lt", () => import("./lt.json"));
register("lv", () => import("./lv.json"));
register("mi", () => import("./mi.json"));
register("ml", () => import("./ml.json"));
register("no", () => import("./no.json"));
register("ru", () => import("./ru.json"));
register("sv", () => import("./sv.json"));
register("vi", () => import("./vi.json"));
register("zh", () => import("./zh.json"));
register("uk", () => import("./uk.json"));
register("pt-br", () => import("./pt-br.json"));


init({
  fallbackLocale: "en",
  initialLocale: getLocaleFromNavigator(),
});
