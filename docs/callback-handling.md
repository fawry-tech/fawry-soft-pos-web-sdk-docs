---
title: Callback Handling
nav_order: 7
---

# Callback Handling

After the SoftPOS app processes a payment, it redirects the browser back to your **callback page**. The SDK handles parsing the response, stores the result, and lets your original payment page consume that result when the user is returned to it.

---

## How Callbacks Work

1. Your original page calls `.send()`, which redirects to `softpos://open/payment?...`
2. The SoftPOS Android app processes the transaction
3. The app redirects the browser to your callback URL with the response in the query string
4. The callback page calls `FawrySDK.handleCallback()`, which parses the response and stores it in `localStorage`
5. The callback page redirects back to the original payment page with `fawrySid`
6. The original page consumes `fawry_result_{sid}`, displays the final status, removes the stored result, and cleans the URL

---

## Recommended Return Flow

The example project uses two pages:

- `index.html` starts the payment and later consumes the returned result.
- `callback.html` receives the SoftPOS redirect, calls `FawrySDK.handleCallback()`, then returns the user to `index.html`.

Before calling `.send()`, set your callback URL and save enough page state to restore the UI after the app returns:

```javascript
builder
    // ... other setters ...
    .setCallbackUrl(window.location.origin + window.location.pathname.replace(/\/index\.html$/, '') + '/callback.html');

savePaymentPageState(sid, op);
return builder.send();
```

If the original payment page receives the raw SoftPOS callback query (`sid` or `sId`), route it to `callback.html` so there is a single callback handler:

```javascript
var urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('sid') || urlParams.get('sId')) {
    window.location.href = 'callback.html' + window.location.search;
} else {
    consumeReturnedPaymentResult();
}
```

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

    <script src="node_modules/fawry-softpos-web-sdk/dist/fawry-softpos-sdk.js"></script>
    <script>
        function getPaymentPageUrl() {
            return window.location.origin + window.location.pathname.replace(/\/callback\.html$/, '/index.html');
        }

        function buildReturnUrl(result) {
            var target = result && result._callbackReturnUrl ? result._callbackReturnUrl : getPaymentPageUrl();
            var url = new URL(target, window.location.origin);
            var sid = result && result.sid ? result.sid : new URLSearchParams(window.location.search).get('sId');
            if (sid) url.searchParams.set('fawrySid', sid);
            return url.toString();
        }

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

            // The SDK stores the result in localStorage as fawry_result_<sid>.
            // Return to the original payment page with fawrySid so it can consume it.
            if (result._storedForCrossTab || result._callbackReturnUrl) {
                setTimeout(function() {
                    window.location.replace(buildReturnUrl(result));
                }, 300);
            }
        });
    </script>
</body>
</html>
```

The full example in `example/callback.js` also handles tab behavior. If the browser opens the callback in a new tab, it tries to focus and close that tab when possible. If closing is not allowed by the browser, it redirects that tab back to the payment page.

```javascript
var focusedOpener = focusOriginalPaymentWindow();
if (focusedOpener) {
    window.close();
} else {
    window.location.replace(getPaymentPageUrl());
}
```

The callback page can detect the operation type from the response (`purchase`, `refund`, `void`, `inquiry`) and display flow-specific messages while returning the user to the payment page.

---

## Consuming the Returned Result

On the original payment page, read the `fawrySid` query parameter, load the SDK result from `localStorage`, recreate the correct result object, display the status, then remove the temporary data:

```javascript
function consumeReturnedPaymentResult() {
    var params = new URLSearchParams(window.location.search);
    var sid = params.get('fawrySid');
    if (!sid) return false;

    var restoredOp = restorePaymentPageState(readPaymentPageState()) || getSelectedOp();
    var resultKey = 'fawry_result_' + sid;
    var resultData = localStorage.getItem(resultKey);
    if (!resultData) {
        showStatus('Returned from SoftPOS, but no callback result was found for session ' + sid, 'error');
        return true;
    }

    var result = createResultFromStoredData(JSON.parse(resultData));
    localStorage.removeItem(resultKey);
    clearPaymentPageState();
    showPaymentResult(restoredOp, result);
    window.history.replaceState({}, document.title, window.location.pathname);
    return true;
}
```

`window.history.replaceState()` removes `fawrySid` from the address bar after the result is consumed, so refreshing the page does not process the same result again.

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
3. **Original tab still open:** Detects the new `localStorage` entry (via `storage` event or polling every 500ms) and resolves the pending Promise.
4. **Original page reloaded or returned to later:** Uses `fawrySid` and `consumeReturnedPaymentResult()` to restore and display the result.

This means your integration can handle both browser behaviors: same-tab reloads and callbacks opened in a new tab. The browser/Android system controls which behavior happens, so the web SDK cannot guarantee no tab or no reload, but the callback/result handoff keeps the final payment status available to the merchant page.

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
