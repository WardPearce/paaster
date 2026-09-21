import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
	resolve: {
		alias: {
			$lib: resolve(root, 'src/lib'),
			'$env/dynamic/private': resolve(root, 'src/test/utils/env-private.ts'),
			'$env/static/private': resolve(root, 'src/test/utils/env-static.ts')
		}
	},
	ssr: {
		resolve: {
			conditions: ['node', 'development', 'import', 'svelte']
		}
	},
	test: {
		environment: 'node',
		include: ['src/test/**/*.test.ts'],
		fileParallelism: false,
		hookTimeout: 120_000,
		testTimeout: 60_000,
		teardownTimeout: 30_000
	}
});
