---
title: Inquiry
parent: Operations
nav_order: 4
---

# Transaction Inquiry

Query the status of a previous transaction by its ID.

> **Signature inputs:** Inquiry signatures must include `operationType: 'inquiry'`, `transactionId`, and `idType` in the backend request body. When `idType` is `ORDER_ID`, the mobile validator also injects `transactionId` into part 2 as the order ID; otherwise part 2 uses the literal string `"null"`.

> **Empty amount:** Inquiry signatures always use an empty amount string. If the client sends literal `"undefined"` or `"null"` for optional fields, normalize them to empty string before hashing.

---

## Example

```javascript
var sid = FawrySDK.generateSessionId();
var clientTimeStamp = Date.now();
var merchantToken = 'YOUR_MERCHANT_TOKEN_FROM_BACKEND_CONFIG';

// Do not send merchantToken here; the backend should read it from its own config/env.
var sigResponse = await fetch('/api/generate-signature', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        operationType: 'inquiry',
        transactionId: 'THE_FCRN_TO_LOOKUP',
        idType: FawrySDK.IdType.FCRN,
        merchantAccountNumber: 'YOUR_ACCOUNT_NUMBER',
        sid: sid,
        clientTimeStamp: clientTimeStamp,
    }),
});
var sigData = await sigResponse.json();

try {
    var result = await FawrySDK.requestInquiry()
        .setIdType(FawrySDK.IdType.FCRN)
        .setTransactionId('THE_FCRN_TO_LOOKUP')
        .setSignature(sigData.signature)
        .setSid(sid)
        .setClientTimeStamp(clientTimeStamp)
        .setPartnerCode('YOUR_PARTNER_CODE')
        .setMerchantAccountNumber('YOUR_ACCOUNT_NUMBER')
        .setMerchantToken(merchantToken)
        .setBtc(99901)
        .send();

    if (result.isSuccess()) {
        console.log('Transaction found:', result.body);
    }
} catch (error) {
    console.error('Inquiry failed:', error.message);
}
```

---

## Parameters

| Parameter | Method | Required | Description |
|-----------|--------|----------|-------------|
| ID Type | `setIdType()` | **Yes** | How to look up the transaction (see below) |
| Transaction ID | `setTransactionId()` | No | The ID value to search for |
| From Date | `setFromDate()` | No | Start date filter |
| To Date | `setToDate()` | No | End date filter |

Plus all [common builder methods]({% link api-reference.md %}#common-methods-all-builders) (signature, sid, timestamp, `setMerchantToken`, `setBtc`, optional `setPrintReceipt` / `setDisplayInvoice` — default `false`, etc.).

---

## ID Types

Use `FawrySDK.IdType` to specify how to look up the transaction:

| Constant | Value | Description |
|----------|-------|---------------|
| `IdType.FCRN` | `'FCRN'` | Look up by Fawry Cash Register Number |
| `IdType.CORRUID` | `'CORRUID'` | Look up by Correlation UUID |
| `IdType.ORDER_ID` | `'ORDER_ID'` | Look up by your order ID |

Use the same `transactionId` and `idType` in both the backend signature request and the SDK builder.

```javascript
// Look up by FCRN
builder.setIdType(FawrySDK.IdType.FCRN).setTransactionId('123456789');

// Look up by your order ID
builder.setIdType(FawrySDK.IdType.ORDER_ID).setTransactionId('ORD-12345');
```

---

## Example successful response

```json
{
  "header": {
    "messageCode": "inquiry",
    "status": {
      "statusCode": 1,
      "statusDesc": "success",
      "hostStatusDesc": "Found"
    }
  },
  "body": {
    "fcrn": "123456789",
    "amount": "100.00",
    "currency": "EGP",
    "transactionType": "purchase"
  }
}
```

---

## Example failed response

```json
{
  "header": {
    "messageCode": "inquiry",
    "status": {
      "statusCode": 0,
      "statusDesc": "failed",
      "hostStatusDesc": "Transaction not found"
    }
  },
  "body": {}
}
```
