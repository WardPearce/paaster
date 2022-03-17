# Paaster
Paaster is a secure by default end to end encrypted pastebin built with Svelte, Vite, Typescript, Python, Starlette, rclone & Docker.

## What is E2EE?
E2EE or end to end encryption is a zero trust encryption methodology. When you paste code into `paaster` the code is encrypted locally with a secret generated on your browser. This secret is never shared with the server & only people you share the link with can view the paste.

### Can I trust a instance of paaster not hosted by me?
No. Anyone could modify the functionality of `paaster` to expose your secret key to the server. We recommend using a instance you host or trust.

## Preview
![Video of paaster in action!](https://i.imgur.com/g78UTK2.gif)

## Shortcuts
- `Ctrl+V` - Paste code.
- `Ctrl+S` - Download code as file.
- `Ctrl+A` - Copy all code to clipboard.
- `Ctrl+X` - Copy URL to clipboard.

## Setup
### Production
- `git clone https://github.com/WardPearce/paaster/tree/Production`.
- Configure `docker-compose.yml`.
- `sudo docker-compose build; sudo docker-compose up -d`.
- Proxy exposed ports.

# ToDo
- Unit tests
- Developer documentation
