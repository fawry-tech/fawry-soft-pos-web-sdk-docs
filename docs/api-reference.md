---
title: API Reference
nav_order: 5
---

# API Reference

Complete reference for the `FawrySDK` global object and its classes.

---

## FawrySDK (Global)

The SDK is exposed as a global `FawrySDK` object when loaded via script tag.

### Methods

#### `FawrySDK.generateSessionId()`

Generate a unique session ID (UUID v4) for a payment request.

```javascript
var sid = FawrySDK.generateSessionId();
// e.g. "3f2504e0-4f89-11d3-9a0c-0305e82c3301"
```

**Returns:** `string` -- UUID v4 string

---

#### `FawrySDK.configureLogging(options)`

Configure optional remote diagnostics. If `logApiUrl` is omitted, empty, or never set, the SDK **does not** send any log HTTP requests.

```javascript
FawrySDK.configureLogging({
    logApiUrl: 'https://your-domain.com/api/fawry-log'
});
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `logApiUrl` | `string` \| `null` | No | Full URL for `POST` requests with JSON `{ message, data }` |

---

#### `FawrySDK.requestSale(paymentOptionType)`

Create a builder for a card sale (purchase) request.

```javascript
var builder = FawrySDK.requestSale(FawrySDK.PaymentOptionType.CARD);
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `paymentOptionType` | `PaymentOptionType` | Yes | Must be `PaymentOptionType.CARD` |

**Returns:** [`CardSaleBuilder`](#cardsalebuilder)

---

#### `FawrySDK.requestRefund(paymentOptionType)`

Create a builder for a card refund request.

```javascript
var builder = FawrySDK.requestRefund(FawrySDK.PaymentOptionType.CARD);
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `paymentOptionType` | `PaymentOptionType` | Yes | Must be `PaymentOptionType.CARD` |

**Returns:** [`CardRefundBuilder`](#cardrefundbuilder)

---

#### `FawrySDK.requestVoid(paymentOptionType)`

Create a builder for a card void request.

```javascript
var builder = FawrySDK.requestVoid(FawrySDK.PaymentOptionType.CARD);
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `paymentOptionType` | `PaymentOptionType` | Yes | Must be `PaymentOptionType.CARD` |

**Returns:** [`CardVoidBuilder`](#cardvoidbuilder)

---

#### `FawrySDK.requestInquiry()`

Create a builder for a transaction inquiry request.

```javascript
var builder = FawrySDK.requestInquiry();
```

**Returns:** [`InquiryBuilder`](#inquirybuilder)

---

#### `FawrySDK.requestClearCache()`

Create a builder for a clear cache request.

```javascript
var builder = FawrySDK.requestClearCache();
```

**Returns:** [`ClearCacheBuilder`](#clearcachebuilder)

---

#### `FawrySDK.handleCallback()`

Process the callback redirect from the SoftPOS app. Should be called on your callback page. This method is also **called automatically** when the page URL contains `sid=` or `sId=` parameters.

```javascript
FawrySDK.handleCallback().then(function(result) {
    console.log(result.isSuccess());
});
```

**Returns:** `Promise<PaymentResult | RefundResult | VoidResult | InquiryResult>`

---

## Builders

All builders share a fluent (chainable) API. Call setter methods to configure the request, then call `.send()` to execute it.

### Common Methods (All Builders)

These methods are available on every builder:

| Method | Type | Required | Description |
|--------|------|----------|-------------|
| `.setSignature(value)` | `string` | **Yes** | Signature from your backend |
| `.setSid(value)` | `string` | **Yes** | Session ID from `generateSessionId()` |
| `.setClientTimeStamp(value)` | `number` | **Yes** | Timestamp (e.g., `Date.now()`) |
| `.setPartnerCode(value)` | `string` | **Yes** | Your Fawry partner code |
| `.setMerchantAccountNumber(value)` | `string` | **Yes** | Your merchant account number |
| `.setCallbackUrl(value)` | `string` | No | Custom callback URL (defaults to `{origin}/callback.html`) |
| `.setAccountNumber(value)` | `string` | No | Alternative to `setMerchantAccountNumber` |
| `.setMerchantToken(value)` | `string` | **Yes** | Merchant token included in the TapNPay payload |
| `.setBtc(value)` | `number` | **Yes** | Business transaction code (from Fawry; no SDK default) |
| `.setPrintReceipt(value)` | `boolean` | No | Print receipt on terminal (default: `false`) |
| `.setDisplayInvoice(value)` | `boolean` | No | Display invoice on terminal (default: `false`) |
| `.setExtras(value)` | `object` | No | Extra info key-value pairs |
| `.send()` | -- | -- | Execute the request. Returns `Promise<PaymentResult>` |

Backend signature generation must use the same operation-specific values you set on the builder. In particular:
- sale uses `amount` and optional `orderId`
- refund uses `amount`, `transactionFCRN`, and optional `orderId`
- void uses `transactionFCRN` and optional `orderId`
- inquiry uses `transactionId` and `idType`

Also pass the merchant token to the SDK builder with `.setMerchantToken(...)` so the TapNPay payload includes the same merchant token used for the signature.

---

### CardSaleBuilder

Created via `FawrySDK.requestSale(PaymentOptionType.CARD)`.

**Additional Methods:**

| Method | Type | Required | Description |
|--------|------|----------|-------------|
| `.setAmount(value)` | `string` | **Yes** | Payment amount (use the **same string** as for signature generation) |
| `.setCurrency(value)` | `string` | No | Currency code (default: `'EGP'` if omitted) |
| `.setOrderId(value)` | `string` | No | Your order/reference ID |

---

### CardRefundBuilder

Created via `FawrySDK.requestRefund(PaymentOptionType.CARD)`.

**Additional Methods:**

| Method | Type | Required | Description |
|--------|------|----------|-------------|
| `.setAmount(value)` | `string` | **Yes** | Refund amount (same string as for signature) |
| `.setTransactionFCRN(value)` | `string` | No | Original transaction FCRN |
| `.setOrderId(value)` | `string` | No | Order/reference ID |

---

### CardVoidBuilder

Created via `FawrySDK.requestVoid(PaymentOptionType.CARD)`.

**Additional Methods:**

| Method | Type | Required | Description |
|--------|------|----------|-------------|
| `.setTransactionFCRN(value)` | `string` | No | Original transaction FCRN |
| `.setOrderId(value)` | `string` | No | Order/reference ID |

---

### InquiryBuilder

Created via `FawrySDK.requestInquiry()`.

**Additional Methods:**

| Method | Type | Required | Description |
|--------|------|----------|-------------|
| `.setIdType(value)` | `IdType` | **Yes** | Type of ID to query by |
| `.setTransactionId(value)` | `string` | No | The transaction ID to look up |
| `.setFromDate(value)` | `string` | No | Start date filter |
| `.setToDate(value)` | `string` | No | End date filter |

---

### ClearCacheBuilder

Created via `FawrySDK.requestClearCache()`.

**Additional Methods:**

| Method | Type | Required | Description |
|--------|------|----------|-------------|
| `.setClearSecurityKeys(value)` | `boolean` | **Yes** | Clear security keys (`true` or `false`) |
| `.setClearProfile(value)` | `boolean` | **Yes** | Clear profile data (`true` or `false`) |

---

## Constants

### PaymentOptionType

```javascript
FawrySDK.PaymentOptionType.CARD  // 'card'
```

### OperationType

```javascript
FawrySDK.OperationType.PURCHASE     // 'purchase'
FawrySDK.OperationType.REFUND       // 'refund'
FawrySDK.OperationType.VOID         // 'void'
FawrySDK.OperationType.INQUIRY      // 'inquiry'
FawrySDK.OperationType.CLEAR_CACHE  // 'clearCache'
```

### IdType

Used with the Inquiry builder:

```javascript
FawrySDK.IdType.FCRN      // 'FCRN' - Fawry Cash Register Number
FawrySDK.IdType.CORRUID   // 'CORRUID' - Correlation UUID
FawrySDK.IdType.ORDER_ID  // 'ORDER_ID' - Your order ID
```

---

## Response Models

### PaymentResult / RefundResult / VoidResult / InquiryResult

All result types extend `SoftPOSResultBase` and share the same structure:

```javascript
result.sid                              // Session ID (string)
result.header                           // ResponseHeader
result.body                             // ResponseBody
result.isSuccess()                      // boolean (statusCode 1 or 3)
result.getMessageCode()                 // string ('purchase', 'refund', 'void', 'inquiry')
result.getTransactionType()             // string
```

### ResponseHeader

```javascript
result.header.messageCode               // string
result.header.requestUuid               // string
result.header.serialNumber              // string
result.header.serverTimestamp            // string
result.header.status                    // ResponseStatus
result.header.userName                  // string
```

### ResponseStatus

```javascript
result.header.status.statusCode         // number (1 = success, 0 = failure, 3 = reversed)
result.header.status.statusDesc         // string
result.header.status.hostStatusCode     // number
result.header.status.hostStatusDesc     // string
```

### ResponseBody

```javascript
result.body.fcrn                        // string - Fawry transaction reference
result.body.amount                      // string
result.body.balance                     // string
result.body.currency                    // string
result.body.fawryReference              // string
result.body.paymentOption               // string
result.body.transactionType             // string
result.body.signature                   // string
result.body.receiptInfo                 // ReceiptInfo
result.body.fees                        // object
```

### ReceiptInfo

```javascript
result.body.receiptInfo.authId          // string - Authorization ID
result.body.receiptInfo.rrn             // string - Retrieval Reference Number
result.body.receiptInfo.merchantId      // string
result.body.receiptInfo.terminalId      // string
result.body.receiptInfo.batchNumber     // string
result.body.receiptInfo.tips            // number
result.body.receiptInfo.cardInfo        // CardInfo
```

### CardInfo

```javascript
result.body.receiptInfo.cardInfo.primaryAccountNumber  // string (masked PAN)
result.body.receiptInfo.cardInfo.cardAcctId            // string
result.body.receiptInfo.cardInfo.appName               // string (e.g. 'VISA')
result.body.receiptInfo.cardInfo.expiryDate             // string
```
