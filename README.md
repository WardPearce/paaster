# Paaster
Paaster is a secure by default end-to-end encrypted pastebin built with the objective of simplicity.

## Preview
![Video of paaster in action!](https://s7.gifyu.com/images/latest.gif)
![Mobile preview](https://i.imgur.com/00eIv0g.png)

## Features
- [End to end encryption](#what-is-e2ee).
- Memory efficient.
- File drag & drop.
- [Shortcuts](#shortcuts).
- Paste history.
- Fast.
- Delete after view or X amount of time.
- [Integration documentation](/paaster-backend#readme)
- [API documentation](https://api.paaster.io/api/documentation)
- [CLI Client](https://github.com/WardPearce/paaster-cli)

## Looking to build a client for paaster?
Check out our [Integration documentation](/paaster-backend#readme) and our [API documentation](https://api.paaster.io/api/documentation).

## Security
### What is E2EE?
E2EE or end to end encryption is a zero trust encryption methodology. When you paste code into `paaster` the code is encrypted locally with a secret generated on your browser. This secret is never shared with the server & only people you share the link with can view the paste.

### Can I trust a instance of paaster not hosted by me?
No. Anyone could modify the functionality of `paaster` to expose your secret key to the server. We recommend using a instance you host or trust.

### How are client secrets stored?
Client-sided secrets are stored with IndexedDB on paste creation (for paste history.) Anything else would be retrievable by the server or be overly complicated. This does make `paaster` vulnerable to malicious javascript being executed, but this would require malicious javascript to be present when the svelte application is built. If this was the case you'd have bigger issues, like the module just reading all inputs & getting the plain text paste.

### How are client secrets transported?
`Paaster` uses URI fragments to transport secrets, according to the [Mozilla foundation](https://developer.mozilla.org/en-US/docs/Learn/Common_questions/What_is_a_URL#anchor) URI fragments aren't meant to be sent to the server. Bitwarden also has a article covering this usage [here](https://bitwarden.com/blog/bitwarden-send-how-it-works/).

### How are server secrets stored?
Server-sided secrets are stored with IndexedDB on paste creation, allowing you to modify or delete pastes later on. Server-sided secrets are generated on the server using the python `secrets` module & are stored in the database using `bcrypt` hashing (A hashing algorithm like Argon2 isn't needed due to the secrets already being secure.)

### Cipher
`paaster` is built using the [forge module](https://github.com/digitalbazaar/forge), using `AES-256` in `CBC` mode with `PKCS7` padding & `PBKDF2` key derivation at `50,000` iterations. More details are located in our [Integration documentation](/paaster-backend#readme).

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
- `git clone --branch Production https://github.com/WardPearce/paaster`
- Configure `docker-compose.yml`
- Proxy exposed ports using Nginx (or whatever reverse proxy you prefer.)
- [FRONTEND_PROXIED](https://github.com/WardPearce/paaster/blob/Development/docker-compose.yml#L24) should be the proxied address for "paaster_frontend". E.g. for paaster.io this is "https://paaster.io"
- [VITE_BACKEND](https://github.com/WardPearce/paaster/blob/Development/docker-compose.yml#L41) should be the proxied address for "paaster_starlette".  E.g. for paaster.io this is "https://api.paaster.io"
- `sudo docker-compose build; sudo docker-compose up -d`

#### Using Rclone
[Using rclone with Docker Compose](https://rclone.org/docker/#getting-started)

Basically the most important part is to install `fuse`, create `/var/lib/docker-plugins/rclone/config` & `/var/lib/docker-plugins/rclone/cache`, install the docker plugin `docker plugin install rclone/docker-volume-rclone:amd64 args="-v" --alias rclone --grant-all-permissions`, configure the `rclone.conf` for the storage service you want to use & then configure your docker compose to use the rclone volume. [Example rclone docker compose](/rclone-docker-example.yml).

### Production without docker
**This setup is not recommended & requires more research / knowledge.**
- `git clone https://github.com/WardPearce/paaster`.
- `cd paaster-frontend`
- Create `.env`
    - `VITE_NAME` - The name displayed on the website.
    - `VITE_BACKEND` - The URL of the API.
- Install nodejs
    - `npm install`
    - `npm run build`
- Serve files generated in `dist` with Nginx (or whatever reverse proxy you use.)
- `cd paaster-backend`
- Install Python 3.7+
    - `pip3 install -r requirements.txt`
    - Configure `main.py` following the guide for [uvicorn](https://www.uvicorn.org/deployment/).
- Pass environmental variables
    - `REDIS_HOST`
    - `REDIS_PORT`
    - `MONGO_IP`
    - `MONGO_PORT`
    - `MONGO_DB`
    - `FRONTEND_PROXIED` - The URL of the Frontend.
- Proxy port with Nginx (or whatever reverse proxy you use.)

### Development
- `git clone https://github.com/WardPearce/paaster`.
- `cd paaster-frontend`
- Create `.env`
    - `VITE_NAME` - The name displayed on the website.
    - `VITE_BACKEND` - The URL of the API.
- Install nodejs
    - `npm install`
    - `npm run dev`
- `cd paaster-backend`
- Pass environmental variables
    - `REDIS_HOST`
    - `REDIS_PORT`
    - `MONGO_IP`
    - `MONGO_PORT`
    - `MONGO_DB`
    - `FRONTEND_PROXIED` - The URL of the Frontend.
- Install Python 3.7+
    - `pip3 install -r requirements.txt`
    - Run main.py
