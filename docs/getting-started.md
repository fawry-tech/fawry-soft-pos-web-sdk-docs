---
title: Getting Started
nav_order: 2
---

# Getting Started

This guide walks you through the minimal steps to integrate the Fawry SoftPOS Web SDK and process your first card payment.

---

## Prerequisites

Before you begin, make sure you have:

1. **Fawry merchant credentials** -- `merchantAccountNumber`, `partnerCode`, and `merchantToken`
2. **Android device** with the Fawry SoftPOS app installed
3. **HTTPS-enabled website** (use [ngrok](https://ngrok.com) for local development)
4. **Node.js 16+** (for the backend signature server)

---

## Step 1: Install the SDK

You will receive a `fawry-softpos-sdk-1.0.0.tgz` file. Place it in your project directory and add it to your `package.json`:

```json
{
  "dependencies": {
    "fawry-softpos-sdk": "file:./fawry-softpos-sdk-1.0.0.tgz"
  }
}
```

Then install:

```bash
npm install
```

See [Installation]({% link installation.md %}) for alternative methods.

---

## Step 2: Set Up Your Backend

The SDK requires a **server-generated signature** for every payment request. Never generate signatures on the client side.

Create a backend endpoint that calls the signature generation function:

```javascript
const { generatePaymentSignature } = require('./lib/generate-payment-signature');

// POST /api/generate-signature
app.post('/api/generate-signature', (req, res) => {
    const { amount, merchantAccountNumber, orderId, sid, clientTimeStamp } = req.body;

    const result = generatePaymentSignature({
        operationType: 'purchase',
        amount: String(amount),
        merchantAccountNumber,
        orderId,
        sid,
        clientTimeStamp,
    });

    res.json({ signature: result.signature });
});
```

See [Backend Setup]({% link backend-setup.md %}) for the full server implementation.

---

## Step 3: Load the SDK in Your Page

```html
<script src="node_modules/fawry-softpos-sdk/dist/fawry-softpos-sdk.js"></script>
```

Verify it loaded:

```javascript
if (typeof FawrySDK !== 'undefined') {
    console.log('SDK loaded successfully');
}
```

---

## Step 4: Make a Payment

Use the **same string** for `amount` in your signature request and in `setAmount()` (see [Card Sale]({% link operations/sale.md %}) for why).

```javascript
// 1. Generate a session ID
var sid = FawrySDK.generateSessionId();
var clientTimeStamp = Date.now();
var amountStr = '100.00';

// 2. Get a signature from your backend
var response = await fetch('/api/generate-signature', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        operationType: 'purchase',
        amount: amountStr,
        merchantAccountNumber: 'YOUR_ACCOUNT_NUMBER',
        orderId: 'ORDER-001',
        sid: sid,
        clientTimeStamp: clientTimeStamp,
    }),
});
var data = await response.json();

// For refund, void, and inquiry operations, also send the operation-specific
// signature fields such as transactionFCRN, transactionId, and idType.

// 3. Build and send the payment request
var result = await FawrySDK.requestSale(FawrySDK.PaymentOptionType.CARD)
    .setAmount(amountStr)
    .setCurrency('EGP')
    .setSignature(data.signature)
    .setSid(sid)
    .setClientTimeStamp(clientTimeStamp)
    .setPartnerCode('YOUR_PARTNER_CODE')
    .setMerchantAccountNumber('YOUR_ACCOUNT_NUMBER')
    .setOrderId('ORDER-001')
    .setBtc(99901)
    .send();

// 4. Handle the result
if (result.isSuccess()) {
    console.log('Payment successful!', result.body.fcrn);
} else {
    console.log('Payment failed:', result.header.status.statusDesc);
}
```

`setCurrency()` is optional; if you do not call it, the SDK defaults the currency to **`EGP`**. Use `.setCurrency('EGP')` (or another code) when you need a non-default currency.

---

## Step 5: Set Up the Callback Page

Create a `callback.html` page that loads the SDK. The SDK **automatically** handles the callback when the URL contains a `sid` parameter:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Payment Result</title>
</head>
<body>
    <div id="loading">Processing...</div>
    <div id="result" style="display:none;"></div>
    <script src="node_modules/fawry-softpos-sdk/dist/fawry-softpos-sdk.js"></script>
    <script>
        FawrySDK.handleCallback().then(function(result) {
            document.getElementById('loading').style.display = 'none';
            var el = document.getElementById('result');
            el.style.display = 'block';

            if (result.isSuccess()) {
                el.textContent = 'Successful! FCRN: ' + result.body.fcrn;
            } else {
                el.textContent = 'Failed: ' + (result.header.status.hostStatusDesc || result.header.status.statusDesc);
            }

            // Auto-redirect back after cross-tab result is stored
            if (result._storedForCrossTab) {
                setTimeout(function() { window.location.replace('/index.html'); }, 2000);
            }
        });
    </script>
</body>
</html>
```

---

## Remote diagnostics (optional)

To send SDK diagnostics to your own server, configure the full log endpoint URL once at startup. If you do not call this, **no** remote logging requests are made.

```javascript
FawrySDK.configureLogging({
    logApiUrl: 'https://your-domain.com/api/fawry-log'
});
```

The SDK sends `POST` requests with JSON body `{ message, data }` to that URL.

---

## Next Steps

- Read the [API Reference]({% link api-reference.md %}) for the full list of builder methods
- See [Card Sale]({% link operations/sale.md %}) for the supported sale flow
- Set up [Card Refund]({% link operations/refund.md %}) and [Card Void]({% link operations/void.md %}) flows
- Review the [Troubleshooting]({% link troubleshooting.md %}) guide for common issues
