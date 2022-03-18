# Paaster
Paaster is a secure by default end to end encrypted pastebin built with Svelte, Vite, Typescript, Python, Starlette, rclone & Docker.

## Features
- End to end encryption.
- Memory efficient.
- File drag & drop.
- Shortcuts.
- Paste history.
- Fast.

## What is E2EE?
E2EE or end to end encryption is a zero trust encryption methodology. When you paste code into `paaster` the code is encrypted locally with a secret generated on your browser. This secret is never shared with the server & only people you share the link with can view the paste.

### Can I trust a instance of paaster not hosted by me?
No. Anyone could modify the functionality of `paaster` to expose your secret key to the server. We recommend using a instance you host or trust.

### Requesting features
- Open a [new issue](https://github.com/WardPearce/paaster/issues/new) to request a feature (one issue per feature.)

## Preview
![Video of paaster in action!](https://i.imgur.com/6SetSUH.gif)

## Shortcuts
- `Ctrl+V` - Paste code.
- `Ctrl+S` - Download code as file.
- `Ctrl+A` - Copy all code to clipboard.
- `Ctrl+X` - Copy URL to clipboard.

## Setup
### Production
- `git clone --branch Production https://github.com/WardPearce/paaster`.
- Configure `docker-compose.yml`.
- `sudo docker-compose build; sudo docker-compose up -d`.
- Proxy exposed ports.

### Using Rclone
[Using rclone with Docker Compose](https://rclone.org/docker/#using-with-swarm-or-compose)

# ToDo
- Unit tests
- Developer documentation
