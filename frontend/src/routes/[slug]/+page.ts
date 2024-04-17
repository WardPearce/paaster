import { paasterClient } from '$lib/client.js';
import { ApiError, type PasteModel } from '$lib/client/index';
import { deletePaste, getPaste } from '$lib/savedPaste';
import { pasteCache } from '$lib/stores';
import { error } from '@sveltejs/kit';
import sodium from 'libsodium-wrappers-sumo';
import { _ } from 'svelte-i18n';
import { get } from 'svelte/store';

export async function load({ params, url }) {
  await sodium.ready;

  let ownerSecret = '';
  const [b64EncodedRawKey, givenOwnerSecret]: string[] = url.hash
    .substring(1)
    .split('&ownerSecret=');

  if (typeof givenOwnerSecret !== 'undefined') {
    url.hash = `#${b64EncodedRawKey}`;
  }

  if (b64EncodedRawKey === '') {
    error(400, get(_)('view.no_key'));
  }

  let isSaved = false;
  let rawSecretKey: Uint8Array;

  try {
    rawSecretKey = sodium.from_base64(
      b64EncodedRawKey,
      sodium.base64_variants.URLSAFE_NO_PADDING
    );
  } catch (errorMessage: any) {
    error(500, errorMessage);
  }

  try {
    const savedPaste = await getPaste(params.slug);
    if (savedPaste.ownerSecret) ownerSecret = savedPaste.ownerSecret;
    isSaved = true;
  } catch { }

  let pasteCacheData = get(pasteCache);
  if (pasteCacheData) {
    return {
      rawCode: pasteCacheData,
      rawLang: '',
      isSaved: isSaved,
      rawSecretKey: rawSecretKey,
      ownerSecret: ownerSecret
    };
  }

  let paste: PasteModel;
  try {
    paste = await paasterClient.default.controllerPastePasteIdGetPaste(
      params.slug
    );
  } catch (errorMessage: any) {
    if (errorMessage instanceof ApiError) {
      // Delete paste from local storage if no longer exists on server.
      if (errorMessage.status === 404) {
        await deletePaste(params.slug);
        error(404);
      } else if (errorMessage.status == 401) {
        // Todo handle auth
      } else {
        error(500, errorMessage.body.detail);
      }
    }

    error(500, errorMessage.toString());
  }

  let rawLang = '';

  if (paste.language) {
    rawLang = new TextDecoder("utf8").decode(
      sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
        null,
        sodium.from_base64(
          paste.language.cipher_text,
          sodium.base64_variants.URLSAFE_NO_PADDING
        ),
        null,
        sodium.from_base64(
          paste.language.iv,
          sodium.base64_variants.URLSAFE_NO_PADDING
        ),
        rawSecretKey
      )
    );
  }

  let response: Response;
  try {
    response = await fetch(paste.download_url);
  } catch {
    error(500, get(_)("view.cdn_down"));
  }

  let rawCode;
  try {
    rawCode = new TextDecoder("utf8").decode(
      sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
        null,
        new Uint8Array(await response.arrayBuffer()),
        null,
        sodium.from_base64(
          paste.iv,
          sodium.base64_variants.URLSAFE_NO_PADDING
        ),
        rawSecretKey
      )
    );
  } catch (errorMessage: any) {
    error(500, errorMessage.toString());
  }

  return {
    rawCode: rawCode,
    rawLang: rawLang,
    isSaved: isSaved,
    rawSecretKey: rawSecretKey,
    ownerSecret: ownerSecret
  };
}