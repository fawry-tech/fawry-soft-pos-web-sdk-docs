---
title: Card Void
parent: Operations
nav_order: 3
---

# Card Void

Void (cancel) a recently completed card transaction. Voids are typically available only within the same batch/settlement period.

> **Signature inputs:** Void signatures must include `operationType: 'void'` and `transactionFCRN` in the backend request body. Void signatures do not include an amount, but they still include `orderId` in part 2 when you provide one.

> **Do not remap fields:** `transactionFCRN` is the void `referenceNumber`. If `orderId` is blank, leave it blank in the backend request so the signature logic uses an empty amount and `"null"` for the order-id portion of part 2.

---

## Example

```javascript
var sid = FawrySDK.generateSessionId();
var clientTimeStamp = Date.now();

// Get signature from your backend (no amount needed for void)
var sigResponse = await fetch('/api/generate-signature', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        operationType: 'void',
        transactionFCRN: 'ORIGINAL_FCRN_HERE',
        orderId: 'VOID-ORDER-001',
        merchantAccountNumber: 'YOUR_ACCOUNT_NUMBER',
        sid: sid,
        clientTimeStamp: clientTimeStamp,
    }),
});
var sigData = await sigResponse.json();

try {
    var result = await FawrySDK.requestVoid(FawrySDK.PaymentOptionType.CARD)
        .setTransactionFCRN('ORIGINAL_FCRN_HERE')
        .setOrderId('VOID-ORDER-001')
        .setSignature(sigData.signature)
        .setSid(sid)
        .setClientTimeStamp(clientTimeStamp)
        .setPartnerCode('YOUR_PARTNER_CODE')
        .setMerchantAccountNumber('YOUR_ACCOUNT_NUMBER')
        .setBtc(99901)
        .send();

    if (result.isSuccess()) {
        console.log('Void successful!');
    }
} catch (error) {
    console.error('Void failed:', error.message);
}
```

---

## Parameters

| Parameter | Method | Required | Description |
|-----------|--------|----------|-------------|
| Transaction FCRN | `setTransactionFCRN()` | No | FCRN of the transaction to void |
| Order ID | `setOrderId()` | No | Order/reference ID |

Plus all [common builder methods]({% link api-reference.md %}#common-methods-all-builders) (signature, sid, timestamp, `setBtc`, optional `setPrintReceipt` / `setDisplayInvoice` — default `false`, etc.).

When generating the signature on your backend, pass the same `transactionFCRN` and `orderId` values used in the builder request.

---

## Successful void

A successful void returns `statusCode: 3` (REVERSED), which `result.isSuccess()` recognizes as success.

```javascript
result.isSuccess()                    // true when statusCode is 1 or 3
result.header.status.statusCode       // 3 (REVERSED)
result.header.status.statusDesc       // 'reversed'
```

---

## Example successful response

```json
{
  "header": {
    "messageCode": "void",
    "status": {
      "statusCode": 3,
      "statusDesc": "reversed",
      "hostStatusCode": 0,
      "hostStatusDesc": "Voided"
    }
  },
  "body": {
    "fcrn": "FCRN-VOID-001"
  }
}
```

---

## Example failed response

```json
{
  "header": {
    "messageCode": "void",
    "status": {
      "statusCode": 0,
      "statusDesc": "failed",
      "hostStatusDesc": "Void not allowed"
    }
  },
  "body": {}
}
```
