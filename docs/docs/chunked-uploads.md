---
title: Chunked Uploads
sidebar_position: 4
---

# Chunked Uploads

Paaster uses chunked uploads at two levels: **encryption chunks** (client-side) and **storage chunks** (server-side).

## Client-side encryption chunking

Text content is split into chunks of `CHUNK_SIZE` (1 MB) before encryption:

```
[raw text]  →  split into 1 MB chunks  →  encrypt each with secretstream  →  upload individually
```

Each chunk is encrypted with `crypto_secretstream_xchacha20poly1305_push` using either `TAG_MESSAGE` (intermediate) or `TAG_FINAL` (last chunk).

## Upload protocol

1. **Create paste** — `POST /api/paste` with metadata (header, salt, etc.)
2. **Upload chunks** — `POST /api/paste/{pasteId}/chunks` for each chunk

Each chunk request sends:

| Field | Description |
|---|---|
| `chunkIndex` | 0-based index of the chunk |
| `totalChunks` | Total number of chunks |
| `data` | The raw encrypted chunk binary |

When the last chunk (index `totalChunks - 1`) is uploaded, the server persists `totalChunks` on the paste document so the viewer knows how many chunks to fetch.

## Download protocol

The viewer fetches each chunk individually:

```
GET /api/paste/{pasteId}/chunks/{chunkIndex}
```

Each response contains the raw encrypted chunk data, which is fed directly into `crypto_secretstream_xchacha20poly1305_pull` for decryption.

## Maximum upload size

The maximum total upload size is configurable via the `MAX_UPLOAD_SIZE` environment variable (value in MB, default `10`). The server enforces this limit per-chunk and the client checks against the value returned by the server.
