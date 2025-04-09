import sodium from 'libsodium-wrappers-sumo';
import { get } from "svelte/store";
import { localDb } from "./dexie";
import { authStore } from "./stores";

export async function deletePaste(pasteId: string, accessKey?: string) {
  if (accessKey) {
    await fetch(`/api/paste/${pasteId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessKey}`
      }
    });
  }
  await localDb.pastes.delete(pasteId);
}

export async function savePaste(
  pasteId: string,
  accessKey: string,
  masterKey: string,
  created?: Date,
  name?: string
) {

  const auth = get(authStore);

  if (!auth) {
    await localDb.pastes.add({
      id: pasteId,
      accessKey: accessKey,
      masterKey: masterKey,
      created: created ?? new Date(),
      name: name ?? 'Unknown'
    });
  } else {
    await sodium.ready;

    const rawEncryptionKey = auth.encryptionKey;

    const encryptedPasteNonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
    const encryptedPaste = sodium.crypto_secretbox_easy(
      sodium.from_base64(masterKey),
      encryptedPasteNonce,
      rawEncryptionKey
    );

    const encryptedAccessNonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
    const encryptedAccessKey = sodium.crypto_secretbox_easy(
      sodium.from_base64(accessKey),
      encryptedAccessNonce,
      rawEncryptionKey
    );

    const savePastePayload = new FormData();
    savePastePayload.append('encryptedPasteNonce', sodium.to_base64(encryptedPasteNonce));
    savePastePayload.append('encryptedPasteKey', sodium.to_base64(encryptedPaste));

    savePastePayload.append('encryptedAccessNonce', sodium.to_base64(encryptedAccessNonce));
    savePastePayload.append('encryptedAccessKey', sodium.to_base64(encryptedAccessKey));

    await fetch(
      `/api/account/paste/${pasteId}`,
      { method: 'POST', body: savePastePayload }
    );
  }
}