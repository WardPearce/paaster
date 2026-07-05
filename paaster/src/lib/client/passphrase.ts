let words: string[] | null = null;

async function loadWords(): Promise<string[]> {
	if (words) return words;
	const response = await fetch('/words.txt');
	const text = await response.text();
	words = text.split('\n').filter((w) => w.length > 0);
	return words;
}

export async function generatePassphrase(): Promise<string> {
	const wordList = await loadWords();
	const selected: string[] = [];
	const random = new Uint32Array(1);
	for (let i = 0; i < 6; i++) {
		crypto.getRandomValues(random);
		selected.push(wordList[random[0] % wordList.length]);
	}
	return selected.join('-');
}
