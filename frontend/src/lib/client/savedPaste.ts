import { set, get, del, values } from 'idb-keyval';


export interface SavedPaste {
    pasteId: string,
    b64EncodedRawKey: string,
    created: number,
    ownerSecret?: string
    name?: string
}


export async function savePaste(
    pasteId: string,
    b64EncodedRawKey: string,
    created: number | string,
    ownerSecret?: string
) {
    await set(
        pasteId,
        <SavedPaste>{
            pasteId: pasteId,
            b64EncodedRawKey: b64EncodedRawKey,
            created: Number(created),
            ownerSecret: ownerSecret
        }
    );
}


export async function getPaste(pasteId: string): Promise<SavedPaste> {
    const paste = await get(pasteId);
    if (!paste)
        throw Error("No page by that ID");
    return paste;
}


export async function setPasteName(pasteId: string, name: string) {
    const paste = await getPaste(pasteId);
    await del(pasteId);
    await set(pasteId, { ...paste, name: name });
}


export async function listPastes(): Promise<SavedPaste[]> {
    return await values();
}


export async function deletePaste(pasteId: string) {
    await del(pasteId);
}
