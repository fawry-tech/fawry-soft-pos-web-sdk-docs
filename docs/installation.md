---
title: Installation
nav_order: 3
---

# Installation

---

## Install from .tgz (recommended)

The SDK is distributed as a `.tgz` tarball. You will receive a `fawry-softpos-sdk-1.0.0.tgz` file from Fawry.

1. Place the `.tgz` file in your project or a known path.
2. Add it to your `package.json`:

```json
{
  "dependencies": {
    "fawry-softpos-sdk": "file:./fawry-softpos-sdk-1.0.0.tgz"
  }
}
```

3. Install:

```bash
npm install
```

This unpacks the pre-built SDK into `node_modules/fawry-softpos-sdk/dist/`.

---

## Loading the SDK

### Script Tag (recommended for most integrations)

Add the script to your HTML page:

```html
<script src="node_modules/fawry-softpos-sdk/dist/fawry-softpos-sdk.js"></script>
```

The SDK exposes a global `FawrySDK` object on `window`.

### ES Module / Bundler

If you use a bundler (Webpack, Vite, Rollup, etc.):

```javascript
import FawrySDK from 'fawry-softpos-sdk';
```

Or with CommonJS:

```javascript
const FawrySDK = require('fawry-softpos-sdk');
```

---

## Verify Installation

After loading the SDK, verify it is available:

```javascript
if (typeof FawrySDK !== 'undefined') {
    console.log('FawrySDK loaded successfully');
} else {
    console.error('FawrySDK failed to load. Check the script path.');
}
```

---

## Project Structure

After installation, your project should look like:

```
your-website/
├── fawry-softpos-sdk-1.0.0.tgz       ← SDK tarball
├── node_modules/
│   └── fawry-softpos-sdk/
│       └── dist/
│           └── fawry-softpos-sdk.js   ← load this file
├── index.html                         ← your payment page
├── callback.html                      ← handles SoftPOS redirect
├── package.json
└── server.js                          ← your backend for signatures
```

---

## HTTPS Requirement

The SoftPOS app redirects back to your website after processing a payment. This callback URL **must be HTTPS** in production.

For local development, use [ngrok](https://ngrok.com) to create an HTTPS tunnel:

```bash
# Terminal 1: Start your server
npm start

# Terminal 2: Create HTTPS tunnel
ngrok http 8080
```

Use the `https://xxxx.ngrok.io` URL when testing on your Android device.
