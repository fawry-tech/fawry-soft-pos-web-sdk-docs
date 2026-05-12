---
title: Clear Cache
parent: Operations
nav_order: 5
---

# Clear Cache

Clear the SoftPOS app's cached security keys and/or profile data.

---

## Example

```javascript
var sid = FawrySDK.generateSessionId();
var clientTimeStamp = Date.now();

var sigResponse = await fetch('/api/generate-signature', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        merchantAccountNumber: 'YOUR_ACCOUNT_NUMBER',
        sid: sid,
        clientTimeStamp: clientTimeStamp,
    }),
});
var sigData = await sigResponse.json();

try {
    var result = await FawrySDK.requestClearCache()
        .setClearSecurityKeys(true)
        .setClearProfile(true)
        .setSignature(sigData.signature)
        .setSid(sid)
        .setClientTimeStamp(clientTimeStamp)
        .setPartnerCode('YOUR_PARTNER_CODE')
        .setMerchantAccountNumber('YOUR_ACCOUNT_NUMBER')
        .setBtc(99901)
        .send();

    if (result.isSuccess()) {
        console.log('Cache cleared successfully');
    }
} catch (error) {
    console.error('Clear cache failed:', error.message);
}
```

---

## Parameters

| Parameter | Method | Required | Description |
|-----------|--------|----------|-------------|
| Clear Security Keys | `setClearSecurityKeys()` | **Yes** | Pass `true` or `false` |
| Clear Profile | `setClearProfile()` | **Yes** | Pass `true` or `false` |

Plus all [common builder methods]({% link api-reference.md %}#common-methods-all-builders) (signature, sid, timestamp, `setBtc`, optional `setPrintReceipt` / `setDisplayInvoice` — default `false`, etc.).

---

## Example successful response

```json
{
  "header": {
    "messageCode": "clearCache",
    "status": {
      "statusCode": 1,
      "statusDesc": "success"
    }
  },
  "body": {}
}
```
