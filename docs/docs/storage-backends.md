---
title: Storage Backends
sidebar_position: 3
---

# Storage Backends

Paaster supports three storage backends for paste content. All backends support chunked uploads — each encrypted chunk is stored individually.

## Configuration

Set `STORAGE_BACKEND` in your environment to select the backend:

| Value | Backend |
|---|---|
| `s3` | S3-compatible object storage (default) |
| `mongodb` | MongoDB GridFS-like chunk storage |
| `filesystem` | Local filesystem storage |

## S3

Uses the AWS SDK v3 to store chunks as individual objects.

**Key format:** `{pasteId}/chunks/{chunkIndex}`

**Required environment variables:**

| Variable | Description |
|---|---|
| `S3_BUCKET` | Bucket name (required) |
| `S3_ENDPOINT` | S3-compatible endpoint URL |
| `S3_REGION` | Region |
| `S3_ACCESS_KEY_ID` | Access key |
| `S3_SECRET_ACCESS_KEY` | Secret key |
| `s3_FORCE_PATH_STYLE` | Set `true` for Garage (default: `false`) |

No presigned URLs are used — the server proxies all uploads and downloads directly.

## MongoDB

Stores chunks as documents in a `pasteChunks` collection.

**Document schema:**

```json
{
  "pasteId": "string",
  "chunkIndex": 0,
  "data": "Binary",
  "totalChunks": 5
}
```

Indexed on `{ pasteId: 1, chunkIndex: 1 }`.

The same MongoDB connection used for metadata is reused — no additional configuration needed.

## Filesystem

Stores chunks as individual files on disk.

**File layout:**

```
{basePath}/{pasteId}/{chunkIndex}
```

**Environment variables:**

| Variable | Default | Description |
|---|---|---|
| `FS_STORAGE_PATH` | `/data/paaster` | Base directory for chunk storage |

Each chunk is stored as a file named by its integer index. The paste directory is removed on deletion.
