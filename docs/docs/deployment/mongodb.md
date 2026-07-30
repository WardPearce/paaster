---
title: MongoDB backend
sidebar_position: 2
---

# Docker Compose — MongoDB

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
