import { themeStore } from "./stores";

export async function setTheme(theme: string, save: boolean = true) {
  document.documentElement.setAttribute('data-theme', theme);
  themeStore.set(theme);

  if (save) {
    await fetch(`/api/account/theme/${theme}`, { method: 'POST' });
  }
}
