---
title: Account API
sidebar_position: 2
---

# Account API

## Create account

```
POST /api/account/create
```

Register a new user account.

## Login

```
POST /api/account/{username}/login
```

Authenticate and receive a session cookie. Supports optional TOTP 2FA.

## Logout

```
DELETE /api/account/logout
```

Revoke the current session.

## Delete account

```
DELETE /api/account/delete
```

Permanently delete the account and all associated paste bookmarks.

## Password reset

```
POST /api/account/passwordReset
```

Change the account password. Requires current password.

## Sessions

```
GET  /api/account/sessions         # List active sessions
DELETE /api/account/sessions        # Revoke a specific session
```

## Bookmarks

```
POST /api/account/paste/{pasteId}   # Bookmark a paste to account
```

Saves encrypted paste key and access key to the user's account for paste history.

## Settings

```
GET  /api/account/defaults          # Get default expiration
POST /api/account/defaults          # Set default expiration
GET  /api/account/theme             # Get theme preference
POST /api/account/theme/{themeName} # Set theme preference
```

## 2FA

```
GET    /api/account/2fa             # Get 2FA status/secret
POST   /api/account/2fa             # Enable 2FA
DELETE /api/account/2fa             # Disable 2FA
POST   /api/account/2fa/verify      # Verify a 2FA token
```
