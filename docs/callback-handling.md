---
title: Callback Handling
nav_order: 7
---

# Callback Handling

After the SoftPOS app processes a payment, it redirects the browser back to your **callback page**. The SDK handles parsing the response and making the result available to your original page.

---

## How Callbacks Work

1. Your original page calls `.send()`, which redirects to `softpos://open/payment?...`
2. The SoftPOS Android app processes the transaction
3. The app redirects the browser to your callback URL with the response in the query string
4. The SDK on the callback page parses the response and stores it in `localStorage`
5. The original page (if still open) detects the result via `localStorage` polling and resolves the Promise

---

## Setting Up the Callback Page

Create a `callback.html` file in your site root:

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Payment Result</title>
</head>
<body>
    <div id="loading">Processing...</div>
    <div id="result" style="display:none;"></div>

    <script src="node_modules/fawry-softpos-sdk/dist/fawry-softpos-sdk.js"></script>
    <script>
        FawrySDK.handleCallback().then(function(result) {
            var loadingEl = document.getElementById('loading');
            var resultEl = document.getElementById('result');

            loadingEl.style.display = 'none';
            resultEl.style.display = 'block';

            if (result.isSuccess()) {
                resultEl.textContent = 'Successful!';
                resultEl.style.color = 'green';
            } else {
                resultEl.textContent = 'Failed: '
                    + (result.header.status.hostStatusDesc || result.header.status.statusDesc);
                resultEl.style.color = 'red';
            }

            // The SDK stores the result in localStorage for cross-tab communication.
            // If result._storedForCrossTab is true, the original tab will automatically
            // pick up the result. You can close this page or redirect back:
            if (result._storedForCrossTab) {
                setTimeout(function() {
                    window.close();
                    // If window.close() doesn't work, redirect to your main page:
                    setTimeout(function() {
                        window.location.replace('/index.html');
                    }, 100);
                }, 2000);
            }
        });
    </script>
</body>
</html>
```

The callback page detects the operation type from the response (`purchase`, `refund`, `void`, `inquiry`) and can display flow-specific messages accordingly.

---

## Auto-Callback Detection

The SDK **automatically** calls `handleCallback()` when it detects `sid=` or `sId=` in the page URL. You don't need to call it manually in most cases, but calling it explicitly gives you access to the result Promise.

---

## Custom Callback URL

By default, the SDK uses `{your-origin}/callback.html`. To use a different URL:

```javascript
FawrySDK.requestSale(FawrySDK.PaymentOptionType.CARD)
    .setCallbackUrl('https://your-site.com/payment/result')
    // ... other setters ...
    .send();
```

Make sure the callback page also loads the SDK script.

---

## Cross-Tab Communication

The payment flow involves a page redirect, so the original tab may lose its JavaScript context. The SDK handles this through `localStorage`:

1. **Before redirect:** The original page stores session data and sets up a `localStorage` poll.
2. **On callback:** The callback page stores the result in `localStorage` with key `fawry_result_{sid}`.
3. **Original tab:** Detects the new `localStorage` entry (via `storage` event or polling every 500ms) and resolves the pending Promise.

This means your original page's `.send()` Promise will resolve even though the browser was redirected to the SoftPOS app and back.

---

## Session Expiry

| Setting | Duration | Description |
|---------|----------|-------------|
| Session expiry | 5 minutes | Session data is valid for 5 minutes |
| Max callback age | 10 minutes | Callback responses are accepted for 10 minutes |
| Payment timeout | 3 minutes | Promise rejects if no response within 3 minutes |

---

## Result Types

The callback returns the appropriate result type based on the operation:

| Operation | Result Type |
|-----------|-------------|
| Sale | `PaymentResult` |
| Refund | `RefundResult` |
| Void | `VoidResult` |
| Inquiry | `InquiryResult` |

All result types share the same interface (`isSuccess()`, `header`, `body`). See [API Reference]({% link api-reference.md %}#response-models) for the full structure.

---

## Security: Amount Validation

The SDK validates that the amount in the response matches the amount stored in the session. If there is a mismatch, the result is marked as failed with:

```
Security validation failed: Data mismatch
```

This prevents response tampering between the SoftPOS app and the callback page.
