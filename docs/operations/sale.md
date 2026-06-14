---
title: Card Sale
parent: Operations
nav_order: 1
---

# Card Sale

Accept a card payment through the SoftPOS app.

> **Amount and signature:** The goal of using a **string** for the amount is to keep the **same decimal representation** everywhere—how many fractional digits you use and how they are padded (for example `'100.00'` vs `'100.0'` vs `100`)—because the backend builds the signature from **plain string concatenation**. If the characters differ from what `setAmount()` puts in the deep link, the hash will not match. Pass the payment amount as a string (for example `'150.00'`) to `setAmount()`, and use the **identical string** in the JSON body for signature generation. Avoid passing a JavaScript number when the string form could differ after formatting.

> **Signature inputs:** Sale signatures may omit `operationType` because the backend defaults to `purchase`, but sending `operationType: 'purchase'` is recommended for clarity. For sale, `referenceNumber` is empty and `orderId` is only used in part 2.

> **Currency:** `setCurrency()` is optional. If you omit it, the SDK sends **`EGP`** as the currency in the payment payload.

---

## Basic Example

```javascript
// 1. Generate session ID and timestamp
var sid = FawrySDK.generateSessionId();
var clientTimeStamp = Date.now();
var amountStr = '150.00';
var merchantToken = 'YOUR_MERCHANT_TOKEN_FROM_BACKEND_CONFIG';

// 2. Get signature from your backend.
// Do not send merchantToken here; the backend should read it from its own config/env.
var sigResponse = await fetch('/api/generate-signature', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        operationType: 'purchase',
        amount: amountStr,
        merchantAccountNumber: 'YOUR_ACCOUNT_NUMBER',
        orderId: 'ORD-12345',
        sid: sid,
        clientTimeStamp: clientTimeStamp,
    }),
});
var sigData = await sigResponse.json();

// 3. Build and send payment request
try {
    var result = await FawrySDK.requestSale(FawrySDK.PaymentOptionType.CARD)
        .setAmount(amountStr)
        .setCurrency('EGP')
        .setSignature(sigData.signature)
        .setSid(sid)
        .setClientTimeStamp(clientTimeStamp)
        .setPartnerCode('YOUR_PARTNER_CODE')
        .setMerchantAccountNumber('YOUR_ACCOUNT_NUMBER')
        .setMerchantToken(merchantToken)
        .setOrderId('ORD-12345')
        .setBtc(99901)
        .send();

    // Payment successful
    console.log('FCRN:', result.body.fcrn);
    console.log('Amount:', result.body.amount);
} catch (error) {
    // Payment failed or timed out
    console.error('Payment error:', error.message);
}
```

---

## Full Example with All Options

```javascript
var merchantToken = 'YOUR_MERCHANT_TOKEN_FROM_BACKEND_CONFIG';

var result = await FawrySDK.requestSale(FawrySDK.PaymentOptionType.CARD)
    // Required
    .setAmount('250.00')
    .setCurrency('EGP')
    .setSignature(signatureFromBackend)
    .setSid(sid)
    .setClientTimeStamp(clientTimeStamp)
    .setPartnerCode('100')
    .setMerchantAccountNumber('ACCT-001')
    .setMerchantToken(merchantToken)
    .setBtc(99901)

    // Optional (printReceipt / displayInvoice default to false if omitted)
    .setPrintReceipt(true)
    .setDisplayInvoice(true)
    .setOrderId('ORD-67890')
    .setExtras({ note: 'VIP customer' })
    .send();
```

---

## Required Parameters

| Parameter | Method | Description |
|-----------|--------|-------------|
| Amount | `setAmount()` | Payment amount as a **string** (same value as in signature request) |
| Bill type code | `setBtc()` | Business transaction code from Fawry |
| Signature | `setSignature()` | Server-generated signature |
| Session ID | `setSid()` | From `FawrySDK.generateSessionId()` |
| Timestamp | `setClientTimeStamp()` | `Date.now()` |
| Partner Code | `setPartnerCode()` | Your Fawry partner code |
| Account Number | `setMerchantAccountNumber()` | Your merchant account number |
| Merchant Token | `setMerchantToken()` | Your merchant token, included in the TapNPay payload |

**Optional:** `setCurrency('EGP')` — if you omit it, currency defaults to **`EGP`**.

**Optional (default `false`):** `setPrintReceipt(true|false)` and `setDisplayInvoice(true|false)` — if you omit them, both are **`false`**.

---

## Example successful response

The SoftPOS app returns JSON in the callback URL. After parsing, the SDK exposes the same shape on `result`. A minimal successful purchase payload looks like this:

```json
{
  "header": {
    "messageCode": "purchase",
    "status": {
      "statusCode": 1,
      "statusDesc": "success",
      "hostStatusCode": 0,
      "hostStatusDesc": "Approved"
    }
  },
  "body": {
    "fcrn": "FCRN123456789",
    "amount": "150.00",
    "currency": "EGP",
    "receiptInfo": {
      "authId": "AUTH123456",
      "cardInfo": {
        "primaryAccountNumber": "****1234",
        "appName": "VISA"
      }
    }
  }
}
```

---

## Example failed response

```json
{
  "header": {
    "messageCode": "purchase",
    "status": {
      "statusCode": 0,
      "statusDesc": "failed",
      "hostStatusCode": 5,
      "hostStatusDesc": "Declined"
    }
  },
  "body": {}
}
```

---

## Handling the Result

```javascript
if (result.isSuccess()) {
    // statusCode === 1
    var fcrn = result.body.fcrn;                    // Transaction reference
    var amount = result.body.amount;                // Charged amount
    var cardInfo = result.body.receiptInfo.cardInfo; // Card details
    var maskedPan = cardInfo.primaryAccountNumber;   // e.g. "****1234"
    var authId = result.body.receiptInfo.authId;     // Authorization ID
} else {
    var errorMsg = result.header.status.hostStatusDesc;
    var statusCode = result.header.status.statusCode;
}
```

---

## Timeout

The SDK waits up to **3 minutes** for a response from the SoftPOS app. If no response is received, the Promise rejects with:

```
Payment timeout: No response received within 3 minutes
```
