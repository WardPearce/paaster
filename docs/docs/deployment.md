---
title: Deployment
sidebar_position: 9
---

# Deployment

MongoDB is always required for paste metadata, user accounts, and sessions. The `STORAGE_BACKEND` variable selects where the encrypted paste content is stored.

## Docker Compose — S3 backend

Uses [Garage](https://garagehq.deuxfleurs.fr/) for S3-compatible object storage.

```yaml
services:
  paaster:
    image: wardpearce/paaster:latest
    restart: unless-stopped
    ports:
      - 3000:3000
    environment:
      STORAGE_BACKEND: s3
      S3_ENDPOINT: http://paaster_garage:3900
      S3_REGION: garage
      S3_ACCESS_KEY_ID: changeme
      S3_SECRET_ACCESS_KEY: changeme
      S3_BUCKET: paaster
      MONGO_URL: mongodb://paaster_mongodb:27017
      MONGO_DB: paasterv3

  paaster_mongodb:
    image: mongo
    restart: unless-stopped
    volumes:
      - mongo_data:/data/db

  paaster_garage:
    image: dxflrs/garage:v1.0.1
    ports:
      - "3900:3900"
    environment:
      GARAGE_API_PORT: 3900
    volumes:
      - garage_data:/var/lib/garage/data
      - garage_meta:/var/lib/garage/meta

volumes:
  mongo_data:
  garage_data:
  garage_meta:
```

Create a bucket and access key after starting:

```bash
garage bucket create paaster
garage bucket allow --read --write paaster --key-name mykey
garage key new mykey          # prints access + secret key
```

## Docker Compose — MongoDB backend

Stores encrypted chunks in MongoDB alongside metadata. No S3 required.

```yaml
services:
  paaster:
    image: wardpearce/paaster:latest
    restart: unless-stopped
    ports:
      - 3000:3000
    environment:
      STORAGE_BACKEND: mongodb
      MONGO_URL: mongodb://paaster_mongodb:27017
      MONGO_DB: paasterv3

  paaster_mongodb:
    image: mongo
    restart: unless-stopped
    volumes:
      - mongo_data:/data/db

volumes:
  mongo_data:
```

## Docker Compose — Filesystem backend

Stores encrypted chunks as files on disk. No S3 required.

```yaml
services:
  paaster:
    image: wardpearce/paaster:latest
    restart: unless-stopped
    ports:
      - 3000:3000
    environment:
      STORAGE_BACKEND: filesystem
      FS_STORAGE_PATH: /data/paaster
      MONGO_URL: mongodb://paaster_mongodb:27017
      MONGO_DB: paasterv3
    volumes:
      - paaster_data:/data/paaster

  paaster_mongodb:
    image: mongo
    restart: unless-stopped
    volumes:
      - mongo_data:/data/db

volumes:
  paaster_data:
  mongo_data:
```

## Docker

Build and run the image directly:

```bash
docker build -t paaster ./paaster
docker run -p 3000:3000 --env-file .env paaster
```

## Manual setup

### Prerequisites

- Node.js 20+
- MongoDB

### Setup

```bash
cd paaster
npm install
cp .env.example .env  # configure your environment
npm run build
node build
```

The server listens on port 3000.

## Notes

- The filesystem backend needs write access to `FS_STORAGE_PATH`
- Change all secrets (`S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`) before production use
- After starting Garage, run `garage bucket create` and `garage key new` to set up access
