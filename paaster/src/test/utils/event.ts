import type { Cookies, RequestEvent } from '@sveltejs/kit';
import type { StorageBackend } from '$lib/server/storage/types';
import type { Db } from 'mongodb';
import { expect } from 'vitest';

export interface MemoryStorage extends StorageBackend {
	chunks: Map<string, Uint8Array>;
}

export function makeMemoryStorage(): MemoryStorage {
	const chunks = new Map<string, Uint8Array>();
	return {
		chunks,
		async saveChunk(pasteId, chunkIndex, data) {
			chunks.set(`${pasteId}:${chunkIndex}`, data);
		},
		async getChunk(pasteId, chunkIndex) {
			return chunks.get(`${pasteId}:${chunkIndex}`) ?? null;
		},
		async deletePaste(pasteId) {
			for (const key of chunks.keys()) {
				if (key.startsWith(`${pasteId}:`)) {
					chunks.delete(key);
				}
			}
		}
	};
}

export interface TestCookies extends Cookies {
	get(name: string): string | undefined;
	set(name: string, value: string): void;
	delete(name: string): void;
	store: Map<string, string>;
}

export function makeCookies(): TestCookies {
	const store = new Map<string, string>();
	return {
		store,
		get(name) {
			return store.get(name);
		},
		getAll() {
			return [...store.entries()].map(([name, value]) => ({ name, value }));
		},
		set(name, value) {
			store.set(name, value);
		},
		delete(name) {
			store.delete(name);
		},
		serialize(name, value) {
			return `${name}=${value}`;
		}
	};
}

export interface MakeEventInit<Params extends Record<string, string>> {
	locals?: Partial<App.Locals>;
	request?: Request;
	params?: Params;
	url?: URL;
	cookies?: TestCookies;
}

export function makeEvent<Params extends Record<string, string> = Record<string, string>>(
	db: Db,
	storage: StorageBackend,
	init: MakeEventInit<Params> = {}
): RequestEvent<Params, never> {
	const cookies = init.cookies ?? makeCookies();

	const event = {
		locals: {
			mongoDb: db,
			s3Client: null,
			storageBackend: storage,
			captchaKey: init.locals?.captchaKey ?? '',
			captchaSignature: init.locals?.captchaSignature ?? '',
			userId: init.locals?.userId,
			sessionId: init.locals?.sessionId
		},
		request: init.request ?? new Request('http://localhost', { method: 'GET' }),
		params: init.params ?? {},
		url: init.url ?? new URL('http://localhost'),
		cookies
	};

	return event as unknown as RequestEvent<Params, never>;
}

export function formRequest(
	entries: Record<string, string | File>,
	init: { headers?: Record<string, string>; method?: string } = {}
): Request {
	const formData = new FormData();
	for (const [key, value] of Object.entries(entries)) {
		formData.set(key, value);
	}
	return new Request('http://localhost', {
		method: init.method ?? 'POST',
		headers: init.headers,
		body: formData
	});
}

export function jsonRequest(body: unknown): Request {
	return new Request('http://localhost', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
}

export async function expectHttpError(promise: Promise<unknown>, status: number): Promise<void> {
	const error = await promise.then(
		() => {
			throw new Error(`Expected request to fail with status ${status}`);
		},
		(err) => err
	);
	expect(error.status).toBe(status);
}