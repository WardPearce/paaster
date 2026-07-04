const MAX_SIZE = 1_000;

const store = new Map<string, { value: unknown; expiry: number }>();

const SWEEP_INTERVAL = 60_000;

let sweepTimer: ReturnType<typeof setInterval> | null = null;

function startSweep(): void {
	if (sweepTimer) return;
	sweepTimer = setInterval(() => {
		const now = Date.now();
		for (const [key, entry] of store) {
			if (now > entry.expiry) store.delete(key);
		}
		if (store.size === 0) {
			clearInterval(sweepTimer!);
			sweepTimer = null;
		}
	}, SWEEP_INTERVAL);
	sweepTimer.unref();
}

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
	if (store.size >= MAX_SIZE && !store.has(key)) {
		const oldest = store.keys().next().value;
		if (oldest) store.delete(oldest);
	}
	store.set(key, { value, expiry: Date.now() + ttlMs });
	startSweep();
}

export function cacheDelete(key: string): void {
	store.delete(key);
}
