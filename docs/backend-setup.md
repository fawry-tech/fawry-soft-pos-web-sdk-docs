---
title: Backend Setup
nav_order: 6
---

# Backend Setup

The SDK requires a **server-side endpoint** to generate payment signatures. Signatures ensure that payment requests are authentic and have not been tampered with.

{: .warning }
> Never generate signatures on the client side. Keep signature generation on your backend; if your TapNPay integration requires the merchant token in the SDK payload, provide it to the builder through your approved client configuration flow and pass the same value to your signature endpoint.

---

## Signature Scheme

The signature is composed of two SHA-256 hashes joined by `///`:

```
part1 = SHA256( clientTimeStamp + sid + amount + referenceNumber )
part2 = SHA256( clientTimeStamp + orderIdOrNull + merchantToken + accountNumber + amount + referenceNumber )
signature = part1 + "///" + part2
```

| Field | Description |
|-------|-------------|
| `clientTimeStamp` | Epoch timestamp from the client (`Date.now()`) |
| `sid` | Client-generated session/request ID |
| `amount` | Payment amount as string (e.g., `"100.00"`) |
| `referenceNumber` | Operation-specific reference field |
| `orderIdOrNull` | `orderId` when present, otherwise the literal string `"null"` |
| `merchantToken` | Merchant token used in signature part 2; pass the same value to the SDK builder with `setMerchantToken()` |
| `accountNumber` | Your merchant account number |

**Why `amount` must be a string:** The two hash inputs are built by **concatenating** `clientTimeStamp`, `sid`, `amount`, and `referenceNumber` as text. The signature only matches if the **exact same character sequence** is used on the server as in the SDK. Numeric types can change how a value is rendered (for example `100` versus `100.00`, or different fractional precision), which would change the hash. Passing `amount` as a **string** end-to-end keeps one fixed representation—including the decimal places and padding you intend—so the backend signature and the client payment request stay aligned.

### Operation field mapping

The backend must derive `amount`, `referenceNumber`, and `orderIdOrNull` the same way the mobile validator does:

| Operation | `amount` in signature | `referenceNumber` | `orderIdOrNull` in part 2 |
|-----------|-----------------------|-------------------|---------------------------|
| `purchase` | request `amount` | `""` | request `orderId` or `"null"` |
| `refund` | request `amount` | `transactionFCRN` | request `orderId` or `"null"` |
| `void` | `""` | `transactionFCRN` | request `orderId` or `"null"` |
| `inquiry` | `""` | `transactionId` | `transactionId` only when `idType = ORDER_ID`, otherwise `"null"` |

### Important edge cases

- For `void` and `inquiry`, do **not** send `amount: "undefined"` or `amount: "null"` from the client. If there is no amount for the operation, the backend should treat it as an empty string.
- For `refund` and `void`, `transactionFCRN` is the `referenceNumber`. If `orderId` is empty, keep `orderId` empty and let part 2 use the literal string `"null"`. Do **not** copy `transactionFCRN` into `orderId`.
- For `inquiry`, `transactionId` is the `referenceNumber`. Only use `transactionId` as `orderId` in part 2 when `idType = ORDER_ID`.
- If the client accidentally sends literal strings such as `"undefined"` or `"null"` for optional fields, normalize them to empty string before hashing.

---

## Node.js (signature steps)

Below is a minimal illustration of the **hashing and concatenation** only. Your service should still validate `amount`, `accountNumber`, `sid`, and `clientTimeStamp` from the client before calling this.

```javascript
const crypto = require('crypto');

const MERCHANT_TOKEN = process.env.MERCHANT_TOKEN || 'your-merchant-token';

function hash256(message) {
    return crypto.createHash('sha256').update(message, 'utf8').digest('hex');
}

function toOptionalString(value) {
    if (value == null) return '';
    const stringValue = String(value);
    return stringValue === '' || stringValue === 'undefined' || stringValue === 'null'
        ? ''
        : stringValue;
}

function toOrderIdSignaturePart(orderId) {
    const value = toOptionalString(orderId);
    return value !== '' ? value : 'null';
}

function deriveSignatureFields(options) {
    const operationType = toOptionalString(options.operationType).toLowerCase() || 'purchase';
    const amountPart = toOptionalString(options.amount);
    const orderId = toOptionalString(options.orderId);
    const transactionFCRN = toOptionalString(options.transactionFCRN);
    const transactionId = toOptionalString(options.transactionId);
    const idType = toOptionalString(options.idType).toUpperCase();

    switch (operationType) {
        case 'refund':
            return { amountPart, referenceNumber: transactionFCRN, orderId };
        case 'void':
            return { amountPart: '', referenceNumber: transactionFCRN, orderId };
        case 'inquiry':
            return {
                amountPart: '',
                referenceNumber: transactionId,
                orderId: idType === 'ORDER_ID' ? transactionId : '',
            };
        default:
            return { amountPart, referenceNumber: '', orderId };
    }
}

function calculateSignature(clientTimeStamp, sid, amount, referenceNumber, accountNumber, merchantToken, orderId) {
    if (typeof sid !== 'string' || sid.trim() === '') {
        throw new Error('sid must be a non-empty string');
    }
    const amountPart = toOptionalString(amount);
    const token = merchantToken || MERCHANT_TOKEN;
    const ref = toOptionalString(referenceNumber);
    const orderIdPart = toOrderIdSignaturePart(orderId);

    const part1 = hash256(`${clientTimeStamp}${sid}${amountPart}${ref}`);
    const part2 = hash256(`${clientTimeStamp}${orderIdPart}${token}${accountNumber}${amountPart}${ref}`);
    return `${part1}///${part2}`;
}
```

### Express server example

Validate the request body, then call `calculateSignature` with the same `sid` and `clientTimeStamp` the client used for the request.

```javascript
const express = require('express');
const cors = require('cors');
const { calculateSignature, deriveSignatureFields } = require('./signature-hint'); // your module implementing the functions above

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/generate-signature', (req, res) => {
    const data = req.body;
    const amountStr = typeof data.amount === 'string' ? data.amount : String(data.amount);
    const amountNum = parseFloat(amountStr);
    if (amountStr && amountNum <= 0) {
        return res.status(400).json({ error: 'Invalid amount: amount must be greater than 0' });
    }

    const accountNumber = data.merchantAccountNumber || data.accountNumber;
    if (!accountNumber) {
        return res.status(400).json({ error: 'merchantAccountNumber or accountNumber is required' });
    }
    if (data.sid == null || data.sid === '') {
        return res.status(400).json({ error: 'sid is required (client-generated session ID)' });
    }
    if (data.clientTimeStamp == null) {
        return res.status(400).json({ error: 'clientTimeStamp is required (client-generated timestamp)' });
    }

    try {
        const { amountPart, referenceNumber, orderId } = deriveSignatureFields(data);
        const signature = calculateSignature(
            data.clientTimeStamp,
            data.sid,
            amountPart,
            referenceNumber,
            accountNumber,
            data.merchantToken || null,
            orderId
        );
        res.json({ signature });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(process.env.PORT || 3001, () => {
    console.log('Signature server running on http://localhost:' + (process.env.PORT || 3001));
});
```

### Standalone HTTP server (no Express)

A zero-dependency Node.js server ships at [server-side/node/server.js](../../server-side/node/server.js). It uses a shared library and exposes:

```
POST /api/generate-signature
GET  / or GET /health
```

**Request body:**

```json
{
    "operationType": "purchase",
    "amount": "100.00",
    "merchantAccountNumber": "ACCT-001",
    "orderId": "ORD-12345",
    "sid": "REQ-12345",
    "clientTimeStamp": 1709912345678
}
```

For other operations, include the fields used by the signature mapping:

- `refund`: add `transactionFCRN`
- `void`: add `transactionFCRN`
- `inquiry`: add `transactionId` and `idType`

**Response:**

```json
{
    "signature": "a1b2c3...///d4e5f6..."
}
```

Run:

```bash
cd server-side/node
npm install
MERCHANT_TOKEN=your-token node server.js
```

---

## Python (signature steps)

Minimal illustration of the same **hashing and concatenation**. Validate inputs in your HTTP handler before calling `calculate_signature`.

```python
import hashlib
import os
from typing import Optional, Tuple

MERCHANT_TOKEN = os.environ.get("MERCHANT_TOKEN", "your-merchant-token")


def hash256(message: str) -> str:
    return hashlib.sha256(message.encode("utf-8")).hexdigest()


def _to_optional_string(value) -> str:
    if value is None:
        return ""
    string_value = value if isinstance(value, str) else str(value)
    return "" if string_value in ("", "undefined", "null") else string_value


def _to_order_id_signature_part(order_id) -> str:
    value = _to_optional_string(order_id)
    return value if value != "" else "null"


def _derive_signature_fields(options: dict) -> Tuple[str, str, str]:
    operation_type = _to_optional_string(options.get("operationType")).lower() or "purchase"
    amount_part = _to_optional_string(options.get("amount"))
    order_id = _to_optional_string(options.get("orderId"))
    transaction_fcrn = _to_optional_string(options.get("transactionFCRN"))
    transaction_id = _to_optional_string(options.get("transactionId"))
    id_type = _to_optional_string(options.get("idType")).upper()

    if operation_type == "refund":
        return amount_part, transaction_fcrn, order_id
    if operation_type == "void":
        return "", transaction_fcrn, order_id
    if operation_type == "inquiry":
        return "", transaction_id, transaction_id if id_type == "ORDER_ID" else ""
    return amount_part, "", order_id


def calculate_signature(
    client_time_stamp,
    sid: str,
    amount: str,
    reference_number: str,
    account_number: str,
    merchant_token: Optional[str] = None,
    order_id: Optional[str] = None,
) -> str:
    if not isinstance(sid, str) or sid.strip() == "":
        raise ValueError("sid must be a non-empty string")
    amount_part = _to_optional_string(amount)
    token = merchant_token or MERCHANT_TOKEN
    ref = _to_optional_string(reference_number)
    order_id_part = _to_order_id_signature_part(order_id)
    part1 = hash256(f"{client_time_stamp}{sid}{amount_part}{ref}")
    part2 = hash256(f"{client_time_stamp}{order_id_part}{token}{account_number}{amount_part}{ref}")
    return f"{part1}///{part2}"
```

### Run the Python HTTP server

The repo includes a full HTTP server that uses the same library:

```bash
cd server-side/python
pip install -r requirements.txt
MERCHANT_TOKEN=your-token python server.py
```

`POST /api/generate-signature` uses the same JSON body and returns `{ "signature": "..." }`. Include `operationType`, plus `transactionFCRN` or `transactionId` / `idType` for refund, void, and inquiry flows.

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MERCHANT_TOKEN` | (use env in production) | Your secret merchant token |
| `PORT` | `3001` (Node) / see Python server | HTTP server port |

{: .important }
> In production, always set `MERCHANT_TOKEN` via environment variable or a secrets manager. Never commit your real token to source control.

---

## Integration Flow

```
Client (Browser)                          Your Backend
─────────────────                         ────────────
1. sid = generateSessionId()
2. clientTimeStamp = Date.now()
3. POST /api/generate-signature ──────▶  4. Validate inputs
   { operationType, ...fields }          5. Derive signature fields per operation
                                         6. Calculate signature
                                         7. Return { signature }
7. signature = response.signature  ◀─────
8. builder.setSignature(signature)
         .setSid(sid)
         .setClientTimeStamp(ts)
         .setMerchantToken(merchantToken)
         ...
         .send()
```
