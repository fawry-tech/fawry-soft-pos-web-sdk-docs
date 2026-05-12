---
title: Home
layout: home
nav_order: 1
---

# Fawry SoftPOS Web SDK

Integrate card payments into your website using the Fawry SoftPOS Android app. The Web SDK handles the communication between your website and the SoftPOS app via deep links, providing a seamless payment experience on Android devices.

---

## How It Works

```
┌───────────────┐     deep link      ┌────────────────┐     response       ┌──────────────┐
│  Your Website │ ─────────────────▶ │  SoftPOS App   │ ─────────────────▶ │ Callback Page│
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
2. The SDK builds a `softpos://open/{operation}` deep link with the signed payload and redirects the browser. Each operation uses its own path: `payment`, `refund`, `void`, `inquiry`, or `clearCache`.
3. The SoftPOS Android app processes the request and redirects back to your **callback page**.
4. The SDK on the callback page parses the response, stores it in `localStorage`, and the original tab resolves the Promise.

---

## Supported Operations

| Operation | Description |
|-----------|-------------|
| [Card Sale]({% link operations/sale.md %}) | Accept a card payment |
| [Card Refund]({% link operations/refund.md %}) | Refund a previous transaction |
| [Card Void]({% link operations/void.md %}) | Void/cancel a recent transaction |
| [Inquiry]({% link operations/inquiry.md %}) | Query the status of a transaction |
| [Clear Cache]({% link operations/clear-cache.md %}) | Clear SoftPOS app cache and keys |

---

## Quick Links

- [Getting Started]({% link getting-started.md %}) -- Install the SDK and make your first payment in 5 minutes
- [Installation]({% link installation.md %}) -- Detailed setup instructions
- [Backend Setup]({% link backend-setup.md %}) -- Set up server-side signature generation
- [API Reference]({% link api-reference.md %}) -- Full SDK API documentation
- [Callback Handling]({% link callback-handling.md %}) -- Handle payment results on your callback page
- [Troubleshooting]({% link troubleshooting.md %}) -- Common issues and fixes

---

## Requirements

- A Fawry merchant account with SoftPOS credentials
- An Android device with the Fawry SoftPOS app installed
- HTTPS-enabled website (required for callback redirects)
- A backend server to generate payment signatures (Node.js or Python examples provided)
