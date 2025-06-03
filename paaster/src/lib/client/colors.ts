import { oklch, formatHex } from 'culori';

export function oklchToHex(str: string): string {
	const regex = /oklch\(\s*([\d.]+%?)\s+([\d.]+)\s+([\d.]+)\s*\)/i;
	const match = str.match(regex);

	if (!match) return '#000';

	const lRaw = match[1];
	const l = lRaw.includes('%') ? parseFloat(lRaw) / 100 : parseFloat(lRaw); // normalize to [0,1]
	const c = parseFloat(match[2]);
	const h = parseFloat(match[3]);

	const color = oklch({ l, c, h });
	return formatHex(color);
}
