const store = new Map<string, { value: unknown; expiry: number }>();

export function cacheGet<T>(key: string): T | undefined {
	const entry = store.get(key);
	if (!entry) return;
	if (Date.now() > entry.expiry) {
		store.delete(key);
		return;
	}
	return entry.value as T;
}

export function cacheSet(key: string, value: unknown, ttlMs: number): void {
	store.set(key, { value, expiry: Date.now() + ttlMs });
}

export function cacheClear(): void {
	store.clear();
}
