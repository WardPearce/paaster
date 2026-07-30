---
title: Paste API
sidebar_position: 1
---

# Paste API

## Create paste

```
POST /api/paste
```

Creates paste metadata and returns the paste ID and access key.

**Body (multipart/form-data):**

| Field | Type | Description |
|---|---|---|
| `codeHeader` | string | Base64-encoded secretstream header (max 128 chars) |
| `codeKeySalt` | string | Base64-encoded key derivation salt (max 64 chars) |
| `codeName` | string | Optional base64-encoded encrypted name (max 32 chars) |
| `codeNameNonce` | string | Nonce for name encryption (max 32 chars) |
| `codeNameKeySalt` | string | Salt for name encryption key (max 32 chars) |

**Response:**

```json
{
  "pasteId": "67a1b2c3d4e5f6a7b8c9d0e1",
  "accessKey": "base64...",
  "maxUploadSize": 10485760
}
```

## Upload chunk

```
POST /api/paste/{pasteId}/chunks
```

Uploads a single encrypted chunk.

**Body (multipart/form-data):**

| Field | Type | Description |
|---|---|---|
| `chunkIndex` | string | 0-based chunk index |
| `totalChunks` | string | Total number of chunks |
| `data` | file | The encrypted chunk binary |

**Response:** `200 OK`

## Get chunk

```
GET /api/paste/{pasteId}/chunks/{chunkIndex}
```

Downloads a single encrypted chunk.

**Response:** Binary octet-stream of the encrypted chunk.

## Update paste

```
POST /api/paste/{pasteId}
```

Updates paste metadata. Requires `Authorization: Bearer {accessKey}` header.

**Body (multipart/form-data):**

| Field | Description |
|---|---|
| `codeName`, `codeNameNonce`, `codeNameKeySalt` | New encrypted name |
| `langName`, `langNonce`, `langKeySalt` | New encrypted language |
| `expireAfter` | Expiration policy (-2 = never, -1 = after view, >0 = hours) |
| `wrapWords` | `true` or `false` |
| `passphrase` | Set passphrase (min 8 chars) or empty string to remove |

## Delete paste

```
DELETE /api/paste/{pasteId}
```

Deletes paste metadata and all chunks. Requires `Authorization: Bearer {accessKey}`.

## List user pastes

```
GET /api/paste?offset=0
```

Returns paginated paste history for the authenticated user.
