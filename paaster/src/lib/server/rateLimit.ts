import { RateLimiter } from 'sveltekit-rate-limiter/server';

export const passphraseLimiter = new RateLimiter({
	IP: [10, 'm']
});

export const limiter = new RateLimiter({
	IP: [30, 'm']
});

export const strictLimiter = new RateLimiter({
	IP: [10, 'm']
});

export const pasteSharePollLimiter = new RateLimiter({
	IP: [120, 'm']
});

export const sensitivePathPatterns = [
	/^\/api\/account\/create$/,
	/^\/api\/account\/delete$/,
	/^\/api\/account\/passwordReset$/,
	/^\/api\/account\/2fa\/verify$/,
	/^\/api\/account\/[^/]+\/login$/,
	/^\/api\/account\/[^/]+\/public$/
];

export const pasteSharePollPathPatterns = [
	/^\/api\/pasteShare\/[A-Z0-9]{8}$/,
	/^\/api\/pasteShare\/[A-Z0-9]{8}\/data$/
];

export function getLimiter(pathname: string, method: string): RateLimiter {
	if (sensitivePathPatterns.some((p) => p.test(pathname))) {
		return strictLimiter;
	}
	if (method === 'GET' && pasteSharePollPathPatterns.some((p) => p.test(pathname))) {
		return pasteSharePollLimiter;
	}
	return limiter;
}
