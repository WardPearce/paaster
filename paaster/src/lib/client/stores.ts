import type { Account } from '$lib/client/dexie';
import type { Writable } from 'svelte/store';
import { writable } from 'svelte/store';

export const authStore: Writable<Account | undefined> = writable();
export const themeStore: Writable<string> = writable('dark');