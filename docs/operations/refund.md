---
title: Card Refund
parent: Operations
nav_order: 2
---

# Card Refund

Refund a previously completed card transaction.

> **Amount:** For refunds, the same rule applies as for [Card Sale]({% link operations/sale.md %}): use a **string** for `amount` so the value sent to your signature API uses the **exact same characters** (including decimal places and fractional padding) as `setAmount()`. That way the computed signature matches the refund payload built by the SDK.

> **Signature inputs:** Refund signatures must include `operationType: 'refund'` and `transactionFCRN` in the backend request body. If you use `orderId`, send that too so part 2 matches the mobile validator.

> **Do not remap fields:** `transactionFCRN` is the refund `referenceNumber`. If `orderId` is blank, leave it blank in the backend request and let the signature logic use `"null"` for the order-id portion of part 2.

---

## Example

```javascript
var sid = FawrySDK.generateSessionId();
var clientTimeStamp = Date.now();
var amountStr = '150.00';
var merchantToken = 'YOUR_MERCHANT_TOKEN_FROM_BACKEND_CONFIG';

// Get signature from your backend (amount is required for refund signature).
// Do not send merchantToken here; the backend should read it from its own config/env.
var sigResponse = await fetch('/api/generate-signature', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        operationType: 'refund',
        amount: amountStr,
        transactionFCRN: 'ORIGINAL_FCRN_HERE',
        orderId: 'REFUND-ORDER-001',
        merchantAccountNumber: 'YOUR_ACCOUNT_NUMBER',
        sid: sid,
        clientTimeStamp: clientTimeStamp,
    }),
});
var sigData = await sigResponse.json();

try {
    var result = await FawrySDK.requestRefund(FawrySDK.PaymentOptionType.CARD)
        .setAmount(amountStr)
        .setTransactionFCRN('ORIGINAL_FCRN_HERE')
        .setOrderId('REFUND-ORDER-001')
        .setSignature(sigData.signature)
        .setSid(sid)
        .setClientTimeStamp(clientTimeStamp)
        .setPartnerCode('YOUR_PARTNER_CODE')
        .setMerchantAccountNumber('YOUR_ACCOUNT_NUMBER')
        .setMerchantToken(merchantToken)
        .setBtc(99902)
        .send();

    if (result.isSuccess()) {
        console.log('Refund successful! FCRN:', result.body.fcrn);
    }
} catch (error) {
    console.error('Refund failed:', error.message);
}
```

---

## Parameters

| Parameter | Method | Required | Description |
|-----------|--------|----------|-------------|
| Amount | `setAmount()` | **Yes** | Refund amount as a **string** (same as for signature) |
| Transaction FCRN | `setTransactionFCRN()` | No | FCRN of the original transaction |
| Order ID | `setOrderId()` | No | Order/reference ID |

Plus all [common builder methods]({% link api-reference.md %}#common-methods-all-builders) (signature, sid, timestamp, `setMerchantToken`, `setBtc`, optional `setPrintReceipt` / `setDisplayInvoice` — default `false`, etc.).

---

## Example successful response

```json
{
  "header": {
    "messageCode": "refund",
    "status": {
      "statusCode": 1,
      "statusDesc": "success",
      "hostStatusCode": 0,
      "hostStatusDesc": "Approved"
    }
  },
  "body": {
    "fcrn": "FCRN-REFUND-001",
    "amount": "150.00",
    "currency": "EGP"
  }
}
```

---

## Example failed response

```json
{
  "header": {
    "messageCode": "refund",
    "status": {
      "statusCode": 0,
      "statusDesc": "failed",
      "hostStatusDesc": "Refund not allowed"
    }
  },
  "body": {}
}
```

---

## Notes

- The refund amount should match or be less than the original transaction amount.
- Use the `transactionFCRN` from the original sale's `result.body.fcrn` to link the refund to the correct transaction.
- The backend signature request must use the same `transactionFCRN` and `orderId` values you set on the builder.
- Use the bill type code (`setBtc`) required by Fawry for your refund flow (example value `99902` is illustrative only).
