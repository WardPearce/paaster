let words: string[] | null = null;

async function loadWords(): Promise<string[]> {
	if (words) return words;
	const response = await fetch('/words.txt');
	const text = await response.text();
	words = text.split('\n').filter((w) => w.length > 0);
	return words;
}

function unbiasedRandom(max: number): number {
	const random = new Uint32Array(1);
	const limit = 0x100000000 - (0x100000000 % max);
	while (true) {
		crypto.getRandomValues(random);
		if (random[0] < limit) return random[0] % max;
	}
}

export async function generatePassphrase(): Promise<string> {
	const wordList = await loadWords();
	const selected: string[] = [];
	for (let i = 0; i < 6; i++) {
		selected.push(wordList[unbiasedRandom(wordList.length)]);
	}
	return selected.join('-');
}
