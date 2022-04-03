### [Follow the development of our desktop client here](https://github.com/WardPearce/paaster-client)

# Paaster
Paaster is a secure by default end to end encrypted pastebin built with the objective of simplicity.

## Preview
![Video of paaster in action!](https://i.imgur.com/KwOsIxL.gif)
![Mobile preview](https://i.imgur.com/00eIv0g.png)

## Features
- [End to end encryption](#what-is-e2ee).
- Memory efficient.
- File drag & drop.
- [Shortcuts](#shortcuts).
- Paste history.
- Fast.
- Delete after view or X amount of time.

## Security
### What is E2EE?
E2EE or end to end encryption is a zero trust encryption methodology. When you paste code into `paaster` the code is encrypted locally with a secret generated on your browser. This secret is never shared with the server & only people you share the link with can view the paste.

### Can I trust a instance of paaster not hosted by me?
No. Anyone could modify the functionality of `paaster` to expose your secret key to the server. We recommend using a instance you host or trust.

### How are client secrets stored?
Client-sided secrets are stored in localStorage on paste creation (for paste history.) Anything else would be retrievable by the server or be overly complicated. This does make `paaster` vulnerable to malicious javascript being executed, but this would require malicious javascript to be present when the svelte application is built. If this was the case you'd have bigger issues, like the module just reading all inputs & getting the plain text paste.

### How are client secrets transported?
`Paaster` uses URI fragments to transport secrets, according to the [Mozilla foundation](https://developer.mozilla.org/en-US/docs/Learn/Common_questions/What_is_a_URL#anchor) URI fragments aren't meant to be sent to the server. Bitwarden also has a article covering this usage [here](https://bitwarden.com/blog/bitwarden-send-how-it-works/).

### How are server secrets stored?
Server-sided secrets are stored in localStorage on paste creation, allowing you to modify or delete pastes later on. Server-sided secrets are generated on the server using the python `secrets` module & are stored in the database using `bcrypt` hashing.

### Cipher
`paaster` is built using the [forge module](https://github.com/digitalbazaar/forge), using `AES-256` in `CBC` mode with PKCS7 padding & PBKDF2 key derivation at `50,000` iterations. 

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
### Production
- `git clone --branch Production https://github.com/WardPearce/paaster`.
- Configure `docker-compose.yml`.
- `sudo docker-compose build; sudo docker-compose up -d`.
- Proxy exposed ports.

#### Using Rclone
[Using rclone with Docker Compose](https://rclone.org/docker/#getting-started)

Basically the most important part is to install `fuse`, create `/var/lib/docker-plugins/rclone/config` & `/var/lib/docker-plugins/rclone/cache`, install the docker plugin `docker plugin install rclone/docker-volume-rclone:amd64 args="-v" --alias rclone --grant-all-permissions`, configure the `rclone.conf` for the storage service you want to use & then configure your docker compose to use the rclone volume. [Example rclone docker compose](/rclone-docker-example.yml).