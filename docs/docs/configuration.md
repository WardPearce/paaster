---
title: Configuration
sidebar_position: 8
---

# Configuration

All configuration is via environment variables.

## Storage backend

| Variable | Default | Description |
|---|---|---|
| `STORAGE_BACKEND` | `s3` | Storage backend: `s3`, `mongodb`, or `filesystem` |
| `FS_STORAGE_PATH` | `/data/paaster` | Base path for filesystem backend |

## S3

| Variable | Description |
|---|---|
| `S3_ENDPOINT` | S3-compatible endpoint URL |
| `S3_REGION` | Region |
| `S3_ACCESS_KEY_ID` | Access key |
| `S3_SECRET_ACCESS_KEY` | Secret key |
| `S3_BUCKET` | Bucket name |
| `s3_FORCE_PATH_STYLE` | Set `true` for Garage (default: `false`) |

## MongoDB

| Variable | Default | Description |
|---|---|---|
| `MONGO_URL` | `mongodb://localhost:27017` | MongoDB connection string |
| `MONGO_DB` | `paasterv3` | Database name |

## Upload limits

| Variable | Default | Description |
|---|---|---|
| `MAX_UPLOAD_SIZE` | `10` | Maximum total upload size in MB |

## Other

| Variable | Description |
|---|---|
| `RATE_LIMITER_SECRET` | Secret for rate limiter |
| `NODE_ENV` | `production` or `development` |
