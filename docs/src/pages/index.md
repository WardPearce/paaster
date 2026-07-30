<div align="center">
  <img src="https://raw.githubusercontent.com/WardPearce/paaster/main/assets/logo.png" width="300px" />
  <h1>Paaster.io</h1>
  <blockquote>
    Paaster is a secure and user-friendly pastebin application that prioritizes privacy and simplicity. With end-to-end encryption and paste history, Paaster ensures that your pasted code remains confidential and accessible.
  </blockquote>

  <a href="https://paaster.io/terms-of-service">Terms of service</a> · <a href="https://paaster.io/privacy-policy">Privacy policy</a>

  <br /><br />

  <a href="https://fink.inlang.com/github.com/WardPearce/paaster"><img src="https://img.shields.io/badge/Help_translate-0a0a0a?style=for-the-badge" alt="Translate" /></a>
  <a href="https://github.com/WardPearce/paaster/releases"><img src="https://img.shields.io/github/v/release/WardPearce/paaster?style=for-the-badge&label=Release&color=0a0a0a" alt="Release" /></a>
  <a href="https://matrix.to/#/#ward:matrix.org"><img src="https://img.shields.io/badge/Chat-0a0a0a?style=for-the-badge&logo=matrix" alt="Matrix" /></a>
  <a href="https://hub.docker.com/r/wardpearce/paaster"><img src="https://img.shields.io/docker/pulls/wardpearce/paaster?style=for-the-badge&label=Docker&color=0a0a0a" alt="Docker" /></a>
</div>

---

# Features

- [End-to-end encryption](#what-is-e2ee)
- Memory efficient
- File drag & drop
- Keyboard shortcuts
- Paste history
- Themes
- Delete after view or X amount of time
- Share via QR code
- [CLI Tool](https://github.com/WardPearce/paaster-cli)
- i18n support ([Contribute](https://fink.inlang.com/github.com/WardPearce/paaster))
- Automatic or manual language detection
- No dynamically loaded 3rd party dependencies — malicious code must be present at build time
- Use of `package-lock.json` & [Socket.dev](https://socket.dev/) to fight supply chain attacks

---

# Security

## What is E2EE?

End-to-end encryption (E2EE) is a zero-trust encryption methodology. When you paste code into Paaster, it is encrypted locally in your browser using a secret that is never shared with the server. Only people you share the link with can view the paste.

## FAQ

### Can I trust an instance of Paaster not hosted by me?

No. Anyone could modify the functionality of Paaster to expose your secret key to the server. We recommend using an instance you host or trust.

### How are client secrets stored?

Client secrets are stored in IndexedDB when the paste is created, allowing for paste history. This method of storage makes Paaster vulnerable to malicious JavaScript, but it would require malicious code to be present when the application is built.

### How are client secrets transported?

Paaster uses URI fragments to transport secrets. According to the [Mozilla Foundation](https://developer.mozilla.org/en-US/docs/Learn/Common_questions/Web_mechanics/What_is_a_URL#anchor), URI fragments aren't meant to be sent to the server. Bitwarden also has an article covering this usage [here](https://bitwarden.com/blog/bitwarden-send-how-it-works/).

### How are server secrets stored?

Server secrets are stored in IndexedDB when the paste is created, allowing for modification or deletion of pastes later on.

---

# Cipher

Paaster uses the following libsodium functions:

- `crypto_secretstream_xchacha20poly1305_*`
- `crypto_pwhash`
- `crypto_secretbox_easy`

These are implemented using the [libsodium-wrappers-sumo](https://www.npmjs.com/package/libsodium-wrappers-sumo) library.

---

# Requesting Features

- Open a [new issue](https://github.com/WardPearce/paaster/issues/new) to request a feature (one issue per feature).

### What we won't add

- **Paste editing** — Paaster isn't a text editor, it's a pastebin.
- **Paste button** — Paaster isn't a text editor. When code is inputted, it will always be automatically uploaded.
- **Optional encryption** — Paaster will never have opt-in/opt-out encryption. Encryption will always be present.

---

# Support

Have any questions? [Join our Matrix space](https://matrix.to/#/#ward:matrix.org).
