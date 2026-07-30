---
title: Filesystem backend
sidebar_position: 3
---

# Docker Compose — Filesystem

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
