---
title: Operations
nav_order: 4
has_children: true
---

# Operations

The SDK supports five operations through the SoftPOS app. Each operation uses a builder pattern: configure the request with setter methods, then call `.send()` to execute it. You must set **`setMerchantToken`** and **`setBtc`** on every flow (see [API Reference]({% link api-reference.md %}#common-methods-all-builders)). **`setPrintReceipt`** and **`setDisplayInvoice`** are optional and default to **`false`**. For card sale and refund, pass **amount as a string** matching your signature request (see [Card Sale]({% link operations/sale.md %})).

| Operation | Builder | Description |
|-----------|---------|-------------|
| [Card Sale]({% link operations/sale.md %}) | `requestSale()` | Accept a card payment |
| [Card Refund]({% link operations/refund.md %}) | `requestRefund()` | Refund a previous transaction |
| [Card Void]({% link operations/void.md %}) | `requestVoid()` | Void/cancel a recent transaction |
| [Inquiry]({% link operations/inquiry.md %}) | `requestInquiry()` | Query transaction status |
| [Clear Cache]({% link operations/clear-cache.md %}) | `requestClearCache()` | Clear app cache and keys |

All operations require a **server-generated signature** and follow the same lifecycle:

1. Generate a session ID with `FawrySDK.generateSessionId()`
2. Request a signature from your backend
3. Build the request using the appropriate builder
4. Call `.send()` -- the SDK redirects to the SoftPOS app
5. The SoftPOS app processes the request and redirects back
6. The SDK resolves the Promise with the result
