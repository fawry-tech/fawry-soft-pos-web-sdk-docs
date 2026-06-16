# Fawry SoftPOS Web SDK

Integrate card payments into your website using the Fawry SoftPOS Android app. The Web SDK handles the communication between your website and the SoftPOS app via deep links, providing a seamless payment experience on Android devices.

**[View Full Documentation](https://fawry-tech.github.io/fawry-soft-pos-web-sdk-docs/)**

## How It Works

```
┌───────────────┐     deep link      ┌────────────────┐     response       ┌──────────────┐
│  Your Website │ ─────────────────▶ │  SoftPOS App   │ ────────────────▶ │ Callback Page│
│  (SDK loaded) │                    │  (Android)     │                    │ (SDK loaded) │
└──────┬────────┘                    └────────────────┘                    └──────┬───────┘
       │                                                                          │
       │  1. Build request                                               3. Parse result
       │  2. Generate deep link                                          4. Store in localStorage
       │                                                                 5. Original tab picks it up
       ▼                                                                          ▼
┌──────────────┐                                                           ┌───────────────┐
│ Your Backend │  POST /api/generate-signature                             │ Payment Result│
│ (signature)  │  ◀──── called before step 1                               │ (resolved)    │
└──────────────┘                                                           └───────────────┘
```

1. Your website calls your **backend** to generate a signature.
2. The SDK builds a `softpos://open/{operation}` deep link with the signed payload and redirects the browser.
3. The SoftPOS Android app processes the request and redirects back to your **callback page**.
4. The SDK on the callback page parses the response, stores it in `localStorage`, and the original tab resolves the Promise.

## Supported Operations

| Operation     | Description                         |
|---------------|-------------------------------------|
| Card Sale     | Accept a card payment               |
| Card Refund   | Refund a previous transaction       |
| Card Void     | Void/cancel a recent transaction    |
| Inquiry       | Query the status of a transaction   |
| Clear Cache   | Clear SoftPOS app cache and keys    |

## Quick Start

### 1. Install the SDK

Add the `fawry-softpos-sdk-1.0.0.tgz` file to your project and update `package.json`:

```json
{
  "dependencies": {
    "fawry-softpos-sdk": "file:./fawry-softpos-sdk-1.0.0.tgz"
  }
}
```

```bash
npm install
```

### 2. Load the SDK

```html
<script src="node_modules/fawry-softpos-web-sdk/dist/fawry-softpos-sdk.js"></script>
```

Or with a bundler:

```javascript
import FawrySDK from 'fawry-softpos-sdk';
```

### 3. Make a Payment

```javascript
var sid = FawrySDK.generateSessionId();
var clientTimeStamp = Date.now();

// Get a signature from your backend
var response = await fetch('/api/generate-signature', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        operationType: 'purchase',
        amount: '100.00',
        merchantAccountNumber: 'YOUR_ACCOUNT_NUMBER',
        orderId: 'ORDER-001',
        sid: sid,
        clientTimeStamp: clientTimeStamp,
    }),
});
var data = await response.json();

// Build and send the payment request
var result = await FawrySDK.requestSale(FawrySDK.PaymentOptionType.CARD)
    .setAmount('100.00')
    .setCurrency('EGP')
    .setSignature(data.signature)
    .setSid(sid)
    .setClientTimeStamp(clientTimeStamp)
    .setPartnerCode('YOUR_PARTNER_CODE')
    .setMerchantAccountNumber('YOUR_ACCOUNT_NUMBER')
    .setOrderId('ORDER-001')
    .setBtc(99901)
    .send();

if (result.isSuccess()) {
    console.log('Payment successful!', result.body.fcrn);
} else {
    console.log('Payment failed:', result.header.status.statusDesc);
}
```

For refund, void, and inquiry operations, send the operation-specific signature fields to your backend as well: `transactionFCRN` for refund/void, and `transactionId` plus `idType` for inquiry.

## Example Sample App

This repository includes a runnable sample in `example/` that demonstrates a complete browser integration. It shows how to load the SDK bundle, request a signature from your backend, open the Fawry SoftPOS app, and handle the response on a callback page.

The sample includes:

- `index.html`: payment form for sale, refund, void, and inquiry operations
- `callback.html`: callback/result page loaded after the SoftPOS app redirects back
- `app.js`: browser logic for building SDK requests and calling the signature API
- `callback.js`: callback parsing and result rendering
- `styles.css`: sample UI styling

### Run The Sample

1. Start a backend signature service that exposes `POST /api/generate-signature`. The sample defaults to:

```text
http://localhost:3001/api/generate-signature
```

2. Install and run the sample app:

```bash
cd example
npm install
npm start
```

3. Open the sample in your browser:

```text
http://localhost:8080
```

4. Enter your SoftPOS values in the form:

- `Signature API URL`
- `Partner Code`
- `Account Number`
- `Bill Type Code`
- operation-specific fields such as `Amount`, `Reference Number (FCRN)`, or inquiry identifiers

5. Click the action button, for example `Pay Now`. The sample calls your signature API, builds the SDK request, opens the SoftPOS app through the deep link, and displays the returned result on `callback.html`.

For real Android device testing, expose both the sample site and backend over HTTPS, for example with [ngrok](https://ngrok.com). Keep `merchantToken` on the backend and leave the sample's `Merchant Token` field empty for normal use.

See `example/README.md` for the full sample setup, backend request contract, mobile testing notes, and troubleshooting steps.

## Requirements

- Fawry merchant account with SoftPOS credentials (`merchantAccountNumber`, `partnerCode`, `merchantToken`)
- Android device with the Fawry SoftPOS app installed
- HTTPS-enabled website (use [ngrok](https://ngrok.com) for local development)
- Node.js 16+ for the backend signature server

## Documentation

| Guide                                                                                              | Description                              |
|----------------------------------------------------------------------------------------------------|------------------------------------------|
| [Getting Started](https://eslamwael74.github.io/fawry-soft-pos-web-sdk-docs/getting-started.html)       | Install and make your first payment      |
| [Installation](https://eslamwael74.github.io/fawry-soft-pos-web-sdk-docs/installation.html)             | Detailed setup instructions              |
| [Backend Setup](https://eslamwael74.github.io/fawry-soft-pos-web-sdk-docs/backend-setup.html)           | Server-side signature generation         |
| [API Reference](https://eslamwael74.github.io/fawry-soft-pos-web-sdk-docs/api-reference.html)           | Full SDK API documentation               |
| [Operations](https://eslamwael74.github.io/fawry-soft-pos-web-sdk-docs/operations/)                     | Sale, refund, void, inquiry, clear cache |
| [Callback Handling](https://eslamwael74.github.io/fawry-soft-pos-web-sdk-docs/callback-handling.html)   | Handle payment results                   |
| [Troubleshooting](https://eslamwael74.github.io/fawry-soft-pos-web-sdk-docs/troubleshooting.html)       | Common issues and fixes                  |

## License

Copyright Fawry Payment Solutions. All rights reserved.
