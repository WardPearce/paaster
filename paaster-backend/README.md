# Integration
`paaster` provides a simple REST API for submitting pastes for storage, this documentation covers how to interact with them & the required encryption. Paaster welcomes custom clients!

## Terminology
- Client secret
    - A securely generated 32 byte long secret generated on the local client, this secret should never be sent to the server for any reason.
- Server secret
    - A securely generated 32 byte long secret generated on the server, this secret is bcrypt hashed (with 12 rounds) & stored in the database.

## Encryption
`paaster` uses `AES-256` in `CBC` (16 byte IV) mode with `PKCS7` (128 block size) padding & `PBKDF2` key derivation at `50,000` iterations (with a 128 byte salt & SHA-1 algorithm).

### Why use a key derivation function for secure secrets?
Requiring key derivation adds a extra layer of secure (for brute-forcing), if a client (for whatever reason) provides a weak / poorly generated secret this makes it more computationally intensive to brute-force.

### Isn't SHA-1 insecure?
Yes, but for key derivation it's fine. As mentioned [here](https://csrc.nist.gov/Projects/Hash-Functions/NIST-Policy-on-Hash-Functions). If `paaster` used passphrases we'd use 390,000+ iterations & SHA-512, but for deriving keys from secure secrets this is fine.

### Formatting encrypted data, salts & IVs
`paaster` expects IVs, salts & encrypted data to be transformed into hexadecimal (base16), these should be separated using commas (`,`).

formatted like the following, `{iv},{salt},{encrypted_data}`

#### e.g.
```
d69e3625f81bc7bb8e700f36e6258852,5d6e1524835c7b69e8a93b380954a8b25f85f634fee16534dfe1b4ffbc7cf1f9765f4fb2449352ef275102732ae767895294a240b65dd587af3a5ea63662018c06929727118694dd635daba28c8f91c336d52356ac35013787c24b6f93acd3d8f1a834830cae88c725615514048964403bb0bc62003f753b13fe1bf1aeaf3bfc,84f059b97d5b9c2e787e2517d9f20618
```

### Example Python implantation using [cryptography](https://cryptography.io.io/en/latest/)
We recommend using python's [secrets](https://docs.python.org/3/library/secrets.html) module for generating secure URL safe secrets & using `os.urandom` for generating secure salts & IVs.

```py
# -*- coding: utf-8 -*-

import os
import secrets

from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import padding
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes


raw_data = b""
secret = secrets.token_urlsafe(32)

padder = padding.PKCS7(
    algorithms.AES.block_size
).padder()
padded_data = padder.update(raw_data) + padder.finalize()

salt = os.urandom(128)
iv = os.urandom(16)

kdf = PBKDF2HMAC(
    algorithm=hashes.SHA1(),
    length=32,
    salt=salt,
    iterations=50000
)

cipher = Cipher(
    algorithms.AES(kdf.derive(secret.encode())),
    modes.CBC(iv)
)
encryptor = cipher.encryptor()

encrypted_data = encryptor.update(padded_data) + encryptor.finalize()

formatted_for_paaster = (
    iv.hex() + "," + salt.hex() + "," +
    encrypted_data.hex()
)
```

## REST API
### Global errors
#### Rate limiting
#####  Response
- Status code - `429`
```json
{
	"error": "Rate limit exceeded: X per 1 minute"
}
```

#### Invalid server secret
#####  Response
- Status code - `403`
```json
{
	"error": "Server secret invalid"
}
```

### Create paste
`https://api.paaster.io/api/paste/create`

- Method - `PUT`
- Body - `Plain`
- Response - `Json`
- Rate-limiting - `20/minute`

#### Payload

[Explained here](#formatting-encrypted-data-salts--ivs)
```
d69e3625f81bc7bb8e700f36e6258852,5d6e1524835c7b69e8a93b380954a8b25f85f634fee16534dfe1b4ffbc7cf1f9765f4fb2449352ef275102732ae767895294a240b65dd587af3a5ea63662018c06929727118694dd635daba28c8f91c336d52356ac35013787c24b6f93acd3d8f1a834830cae88c725615514048964403bb0bc62003f753b13fe1bf1aeaf3bfc,84f059b97d5b9c2e787e2517d9f20618
```
#### Response
- Status code - `200`
```json
{
	"pasteId": "OO8Nn3LBna3gv2XsCD0TO",
	"serverSecret": "X52RpvhshiXMEXAnQgEhZAwYRfeBp5x_mMymI41_pn0",
	"created": 1649037023.241266
}
```
### Get paste
`https://api.paaster.io/api/paste/{pasteId}`

- Method - `GET`
- Body - `No body`
- Response - `Json`
- Rate-limiting - `60/minute`

#### Response
- Status code - `200`
```json
{
	"pastedId": "OO8Nn3LBna3gv2XsCD0TO"
}
```

### Update paste
`https://api.paaster.io/api/paste/{pasteId}`

- Method - `POST`
- Body - `Json`
- Response - `Json`
- Rate-limiting - `20/minute`

#### Payload
```json
{
	"serverSecret": "X52RpvhshiXMEXAnQgEhZAwYRfeBp5x_mMymI41_pn0",
	"deleteAfterHours": 1
}
```

#### Response
- Status code - `200`
```json
{
	"pastedId": "OO8Nn3LBna3gv2XsCD0TO"
}
```
