import "niceware/browser/niceware";

// Handle weird browser version of niceware.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const nicewareWindow = window.niceware;

export function bytesToPassphrase(bytes: Uint8Array): string {
    return nicewareWindow.bytesToPassphrase(bytes);
}

export function passphraseToBytes(words: string[]): Uint8Array {
    return nicewareWindow.passphraseToBytes(words);
}

export function generatePassphrase(size: number): string[] {
    return nicewareWindow.generatePassphrase(size);
}
