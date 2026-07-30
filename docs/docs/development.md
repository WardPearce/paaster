---
title: Development
sidebar_position: 10
---

# Development

## Prerequisites

- Node.js 20+
- MongoDB running locally (default `mongodb://localhost:27017`)
- [Garage](https://garagehq.deuxfleurs.fr/) or other S3-compatible storage (for S3 backend)

## Setup

```bash
cd paaster
npm install
```

Copy the `.env` file:

```bash
cp .env.example .env
```

## Running the dev server

```bash
npm run dev
```

The dev server starts on port 5173 by default.

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run check` | TypeScript + Svelte type checking |
| `npm run lint` | Prettier + ESLint |
| `npm run format` | Prettier formatting |

## Project conventions

- TypeScript throughout
- Svelte 5 runes (`$state`, `$derived`, `$effect`)
- Zod for API input validation
- Argon2 for password/access key hashing
- Tailwind CSS v4 for styling
