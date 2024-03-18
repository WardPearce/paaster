&nbsp;

<div align="center">
  <img src="https://i.imgur.com/8S9SPyZ.png" width="100px" />
  <h1>Paaster.io</h1>
  <quote>
    Paaster is a secure and user-friendly pastebin application that prioritizes privacy and simplicity. With end-to-end encryption and paste history, Paaster ensures that your pasted code remains confidential and accessible.
  </quote>

<a href="https://paaster.io/terms-of-service">Terms of service |</a>
<a href="https://paaster.io/privacy-policy"> Privacy policy</a>

</div>

&nbsp;

[Help translate paaster!](https://fink.inlang.com/github.com/WardPearce/paaster)

# Preview

![Desktop preview](https://files.catbox.moe/gk2x3q.gif)

# Features

- [End-to-end encryption](#what-is-e2ee).
- Memory efficient.
- File drag & drop.
- [Shortcuts](#shortcuts).
- Paste history (with support for [unix-like search](https://fusejs.io/examples.html#extended-search)).
- Delete after view or X amount of time.
- [API documentation](https://api.paaster.io/schema).
- [CLI Tool](https://github.com/WardPearce/paaster-cli).
- Access code protection (Require a passphrase to view paste.)
- Rate limiting.
- Share via QR code.
- PWA support.
- i18n support ([Contribute](https://fink.inlang.com/github.com/WardPearce/paaster)).
- Automatic or manual language detection.
- No dynamically loaded 3rd party dependencies, meaning malicious code must be present at build time.
- Use of `package-lock.json`, `poetry.lock` & [Socket.dev](https://socket.dev/) to fight against supply chain attacks & vulnerabilities.
- [Vercel](https://vercel.com) support.

# Security

## What is E2EE?

End-to-end encryption (E2EE) is a zero-trust encryption methodology. When you paste code into Paaster, it is encrypted locally in your browser using a secret that is never shared with the server. Only people you share the link with can view the paste.

## Can I trust a instance of paaster not hosted by me?

No. Anyone could modify the functionality of Paaster to expose your secret key to the server. We recommend using a instance you host or trust.

## How are client secrets stored?

Client secrets are stored with IndexedDB when the paste is created, allowing for paste history. This method of storage makes Paaster vulnerable to malicious JavaScript, but it would require malicious code to be present when the Svelte application is built.

## How are client secrets transported?

Paaster uses URI fragments to transport secrets, according to the [Mozilla foundation](https://developer.mozilla.org/en-US/docs/Learn/Common_questions/Web_mechanics/What_is_a_URL#anchor) URI fragments aren't meant to be sent to the server. Bitwarden also has a article covering this usage [here](https://bitwarden.com/blog/bitwarden-send-how-it-works/).

## How are server secrets stored?

Server secrets are stored with IndexedDB when the paste is created, allowing for modification or deletion of pastes later on. The server-sided secrets are generated using the Python secrets module and stored in the database using bcrypt hashing.

## Cipher

Paaster uses XChaCha20-Poly1305 encryption, which is implemented using the [libsodium-wrappers](https://www.npmjs.com/package/libsodium-wrappers) library.

# Shortcuts

- `Ctrl+V` - Paste code.
- `Ctrl+S` - Download code as file.
- `Ctrl+A` - Copy all code to clipboard.
- `Ctrl+X` - Copy URL to clipboard.

# Requesting features

- Open a [new issue](https://github.com/WardPearce/paaster/issues/new) to request a feature (one issue per feature.)

## What we won't add

- Paste editing.
  - Paaster isn't a text editor, it's a pastebin.
- Paste button.
  - Paaster isn't a text editor, when code is inputted it will always be automatically uploaded.
- Optional encryption.
  - Paaster will never have opt-in / opt-out encryption, encryption will always be present.

# Setup
## Production with Docker

NOTE: Latest MongoDB requires CPU with AVX support. If you're using virtual CPU (e.g. `kvm64`) it will not work.
To fix that, either downgrade MongoDB to 4.x, or adjust your VM CPU configuration.

### Public S3
- During configuration, no provided URLs should be suffixed with a slash.
- Configure `docker-compose.yml` (example [here](docker-public-s3/docker-compose.yml))
- Fine-tune networks and/or volumes, if needed
- `sudo docker compose up -d`
- Proxy exposed ports using Caddy/Traefik/Nginx/Apache2 (or whatever reverse proxy you prefer)

### Self-hosted S3 (using [MinIO](https://github.com/minio/minio))
- Create `.env` file (example [here](docker-selfhosted-s3/.env.example))
- Create `docker-compose.yml` (example [here](docker-selfhosted-s3/docker-compose.yml))
- Fine-tune networks and/or volumes, if needed
- `sudo docker compose up -d`
- Proxy exposed ports using Caddy/Traefik/Nginx/Apache2 (or whatever reverse proxy you prefer)

NOTE: the self-hosted version uses a temporary container (`paaster-minio-init`) to create initial bucket
in MinIO container and configure it for public access.

### Recommended headers for frontend
**Disable automatically via Vercel**

- `Strict-Transport-Security: max-age=31536000`
- `X-XSS-Protection: 1; mode=block`
- `X-Frame-Options: DENY`
- `Feature-Policy: microphone 'none'; camera 'none'; geolocation 'none'; payment 'none';`

### Vercel

Paaster's frontend is also configured to work with [Vercel](https://vercel.com), which offers enhanced security through server separation and improved performance.

### Using Rclone

Rclone is no longer supported for performance reasons & paaster is now only s3 compatible.

Look at [Self-hosted S3](#self-hosted-s3-using-minio) or [Storage providers](#object-storage-providers) for cheap / free s3 storage.

### Object storage providers
- [iDrive e2](https://www.idrive.com/e2/) (no free tier anymore)
- [Backblaze b2](https://www.backblaze.com/b2/cloud-storage.html) (10 GB free)
- [Wasabi Hot Cloud Storage](https://wasabi.com/hot-cloud-storage/)
- [Storj](https://www.storj.io/) (25GB free tier)
- [Contabo object storage](https://contabo.com/en/object-storage/)
- [Cloudflare R2](https://www.cloudflare.com/products/r2/)
- [Amazon S3](https://aws.amazon.com/s3/)
- [Google Cloud Storage](https://cloud.google.com/storage)

## Production without docker

**This setup is not recommended & requires more research / knowledge.**

- `git clone https://github.com/WardPearce/paaster`.
- `cd frontend`
- Create `.env`
  - `VITE_NAME` - The name displayed on the website.
  - `VITE_API_URL` - The URL of the API.
- Install nodejs
  - `npm install`
  - `npm run build`
- Serve files generated in `dist` with Nginx (or whatever reverse proxy you use.)
- `cd backend`
- Install Python 3.10+
  - `curl -sSL https://install.python-poetry.org | python3 -`
  - Configure `run.py` following the guide for [uvicorn](https://www.uvicorn.org/deployment/).
- Pass environmental variables
  - `paaster_proxy_urls`.
  - `paaster_s3`.
  - `paaster_mongo`.
  - `paaster_open_api`.
  - `paaster_max_iv_size`.
  - `paaster_max_paste_size`.
- Run `poetry run server`, to start server.
- Proxy exposed ports using Caddy/Nginx/Apache2 (or whatever reverse proxy you prefer.)

# Storage breakdown

Paaster uses Amazon S3 for storing large files, specifically, encrypted pastes. This allows us to save and share data
quickly and easily through a Content Delivery Network (CDN). Some key advantages of using S3 are splitting data
into smaller chunks, fast data sharing, and making copies of data for safety. The S3 buckets are expected to be publicly
downloadable (they are end-to-end encrypted anyway), but the public directory listing should be disabled.

We use MongoDB for handling metadata information about each encrypted paste. It includes details like when the
paste will expire, storage of access codes, initialization vector (IV) storage, and owner's secrets.

# Adding translations
[Use inlang to contribute to translations](https://fink.inlang.com/github.com/WardPearce/paaster)