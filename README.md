# Paaster
Paaster is a secure and user-friendly pastebin application that prioritizes privacy and simplicity. With end-to-end encryption and paste history, Paaster ensures that your pasted code remains confidential and accessible. 

## Preview

![Desktop preview](https://files.catbox.moe/5pa9zc.gif)
![Mobile preview](https://i.imgur.com/3lLW9bB.png)

## Features

- [End-to-end encryption](#what-is-e2ee).
- Memory efficient.
- File drag & drop.
- [Shortcuts](#shortcuts).
- Paste history (with support for [unix-like search](https://fusejs.io/examples.html#extended-search)).
- Delete after view or X amount of time.
- [API documentation](https://api.paaster.io/schema).
- Rate limiting.
- No dynamically loaded 3rd party dependencies, meaning malicious code must be present at build time. 
- [Vercel](https://vercel.com) support.

## Security

### What is E2EE?
End-to-end encryption (E2EE) is a zero-trust encryption methodology. When you paste code into Paaster, it is encrypted locally in your browser using a secret that is never shared with the server. Only people you share the link with can view the paste.

### Can I trust a instance of paaster not hosted by me?

No. Anyone could modify the functionality of `paaster` to expose your secret key to the server. We recommend using a instance you host or trust.

### How are client secrets stored?
Client secrets are stored with IndexedDB when the paste is created, allowing for paste history. This method of storage makes Paaster vulnerable to malicious JavaScript, but it would require malicious code to be present when the Svelte application is built.

### How are client secrets transported?

`Paaster` uses URI fragments to transport secrets, according to the [Mozilla foundation](https://developer.mozilla.org/en-US/docs/Learn/Common_questions/What_is_a_URL#anchor) URI fragments aren't meant to be sent to the server. Bitwarden also has a article covering this usage [here](https://bitwarden.com/blog/bitwarden-send-how-it-works/).

### How are server secrets stored?
Server secrets are stored with IndexedDB when the paste is created, allowing for modification or deletion of pastes later on. The server-sided secrets are generated using the Python secrets module and stored in the database using bcrypt hashing.

### Cipher
Paaster uses XChaCha20-Poly1305 encryption, which is implemented using the [libsodium-wrappers](https://www.npmjs.com/package/libsodium-wrappers) library.

## Shortcuts

- `Ctrl+V` - Paste code.
- `Ctrl+S` - Download code as file.
- `Ctrl+A` - Copy all code to clipboard.
- `Ctrl+X` - Copy URL to clipboard.

## Requesting features

- Open a [new issue](https://github.com/WardPearce/paaster/issues/new) to request a feature (one issue per feature.)

### What we won't add

- Paste editing.
  - `paaster` isn't a text editor, it's a pastebin.
- Paste button.
  - `paaster` isn't a text editor, when code is inputted it will always be automatically uploaded.
- Optional encryption.
  - `paaster` will never have opt-in / opt-out encryption, encryption will always be present.

## Setup

### Production with Docker

- During configuration, no provided URLs should be suffixed with a slash.
- `git clone https://github.com/WardPearce/paaster`
- Configure `docker-compose.yml` (example [here](./docker-compose.yml))
- Proxy exposed ports using Nginx (or whatever reverse proxy you prefer.)
- `paaster_proxy_urls.frontend` should be the proxied address for "paaster_frontend". E.g. for paaster.io this is "https://paaster.io"
- `VITE_API_URL` should be the proxied address for "paaster_backend". E.g. for paaster.io this is "https://api.paaster.io"
- `paaster_s3` should contain your S3 secrets.
- `sudo docker compose build; sudo docker compose up -d`.

#### Vercel
Paaster's frontend is also configured to work with [Vercel](https://vercel.com), which offers enhanced security through server separation and improved performance.

#### Using Rclone

Rclone is no longer supported for performance reasons & paaster is now only s3 compatible.

Luckily you can get cheap & easy to setup s3 compatible storage from [idrive e2](https://www.idrive.com/e2/) or [backblaze b2](https://www.backblaze.com/b2/cloud-storage.html).

### Production without docker

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
- Proxy port with Nginx (or whatever reverse proxy you use.)
