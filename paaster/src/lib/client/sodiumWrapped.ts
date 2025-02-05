import sodium from 'libsodium-wrappers-sumo';


export function deriveNewKeyFromMaster(
  keyLength: number, masterKey: Uint8Array
): { rawKey: Uint8Array; salt: Uint8Array; } {
  const keySalt = sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES);
  const derivedKey = sodium.crypto_pwhash(
    keyLength,
    masterKey,
    keySalt,
    sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
    sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
    sodium.crypto_pwhash_ALG_DEFAULT
  );

  return {
    rawKey: derivedKey,
    salt: keySalt
  };
}

export function deriveExistingKeyFromMaster(keyLength: number, masterKey: Uint8Array, salt: Uint8Array): { rawKey: Uint8Array; } {
  const key = sodium.crypto_pwhash(
    keyLength,
    masterKey,
    salt,
    sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
    sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
    sodium.crypto_pwhash_ALG_DEFAULT
  );

  return {
    rawKey: key
  };
}


export function secretBoxDecryptFromMaster(
  toDecrypt: { value: Uint8Array; nonce: Uint8Array; }, masterKey: { value: Uint8Array; salt: Uint8Array; }
): { rawData: Uint8Array; } {
  const rawKey = deriveExistingKeyFromMaster(
    sodium.crypto_secretbox_KEYBYTES, masterKey.value, masterKey.salt
  ).rawKey;

  const rawData = sodium.crypto_secretbox_open_easy(
    toDecrypt.value,
    toDecrypt.nonce,
    rawKey
  );

  return {
    rawData: rawData
  };
}


export function secretBoxEncryptFromMaster(
  toEncrypt: Uint8Array | string, masterKey: Uint8Array
): {
  data: {
    nonce: Uint8Array;
    value: Uint8Array;
  };
  key: {
    salt: Uint8Array,
  };
} {
  const secretKey = deriveNewKeyFromMaster(
    sodium.crypto_secretbox_KEYBYTES,
    masterKey
  );

  const encryptedDataNonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);

  const encryptedData = sodium.crypto_secretbox_easy(
    toEncrypt instanceof Uint8Array ? toEncrypt : new TextEncoder().encode(toEncrypt),
    encryptedDataNonce,
    secretKey.rawKey
  );

  return {
    data: {
      nonce: encryptedDataNonce,
      value: encryptedData
    },
    key: {
      salt: secretKey.salt,
    }
  };
}

