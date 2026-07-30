---
title: Introduction
sidebar_position: 1
---

# Introduction

Paaster is a privacy-first pastebin application built with **SvelteKit** and designed with a zero-trust architecture. All encryption and decryption happens in the user's browser — the server stores only encrypted blobs and metadata.

## How it works

1. **Encryption** — the browser generates a random 32-byte master key and derives a file encryption key using `crypto_pwhash`. Paste content is split into 1 MB chunks, each encrypted with `XChaCha20-Poly1305` via libsodium's secretstream API.

2. **Upload** — metadata (encrypted header, key salt, optional encrypted name) is sent to the server. The encrypted chunks are then uploaded individually to the configured storage backend.

3. **Viewing** — the viewer fetches the metadata and each encrypted chunk from the server, re-derives the file key using the master key (from the URL fragment), and decrypts the content in the browser.

## Project structure

```
paaster/
├── src/
│   ├── lib/
│   │   ├── server/storage/   # Storage backends (S3, Mongo, FS)
│   │   ├── client/            # Client utilities (crypto, IndexedDB)
│   │   └── i18n/              # Internationalization
│   ├── routes/
│   │   ├── api/paste/         # Paste API endpoints
│   │   ├── [pasteId]/         # Paste viewing
│   │   └── account/           # Account management
│   └── hooks.server.ts        # Server initialization
├── docker-compose.yml         # Production deployment
└── .env                       # Configuration
```
