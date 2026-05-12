---
title: Troubleshooting
nav_order: 8
---

# Troubleshooting

Common issues and their solutions.

---

## SDK Not Loaded

**Error:** `SDK not loaded. Refresh the page.`

**Cause:** The `FawrySDK` global is `undefined` when the page tries to use it.

**Solutions:**

1. **Ensure the SDK `.tgz` is installed:**

   Verify your `package.json` references the `.tgz` file correctly:

   ```json
   {
     "dependencies": {
       "fawry-softpos-sdk": "file:./fawry-softpos-sdk-1.0.0.tgz"
     }
   }
   ```

   Then run:

   ```bash
   npm install
   ```

2. **Verify the built file exists:**

   ```bash
   ls node_modules/fawry-softpos-sdk/dist/fawry-softpos-sdk.js
   ```

3. **Verify the script path** in your HTML:

   ```html
   <script src="node_modules/fawry-softpos-sdk/dist/fawry-softpos-sdk.js"></script>
   ```

4. **Check the browser console** for 404 errors on the script URL.

---

## SoftPOS App Not Opening

**Symptom:** Clicking "Pay" does nothing or shows a browser error.

**Solutions:**

- Ensure the **Fawry SoftPOS app is installed** on the Android device.
- Verify the device can handle `softpos://` deep links.
- Test on a **physical Android device**, not an emulator (unless the emulator has the app installed).
- Make sure you are accessing your site via the **Android device's browser**, not a desktop browser.

---

## Payment Timeout

**Error:** `Payment timeout: No response received within 3 minutes`

**Cause:** The SoftPOS app did not redirect back within 3 minutes.

**Solutions:**

- Check that the **callback URL is correct** and accessible from the device.
- Ensure the callback URL uses **HTTPS** (required for redirects).
- Verify the SoftPOS app completed the transaction (check the app's transaction history).
- If the callback page loaded but the original tab doesn't resolve, check that both pages load the **same version of the SDK**.

---

## Signature Errors

**Error:** `signature is required. Use setSignature() (from your backend).`

**Cause:** The builder's `.setSignature()` was not called or received `null`/`undefined`.

**Solutions:**

- Ensure your backend `/api/generate-signature` endpoint is running and reachable.
- Check the network tab for errors on the signature request.
- Verify the response format is `{ "signature": "..." }`.
- For refund and void, make sure the signature request includes `transactionFCRN`.
- For inquiry, make sure the signature request includes both `transactionId` and `idType`.
- If you use `orderId`, send the same value to both your backend signature request and the SDK builder.
- Do not copy `transactionFCRN` or `transactionId` into `orderId` when `orderId` is blank.
- For void and inquiry, make sure missing optional values are treated as empty string, not the literal `"undefined"` or `"null"`.

---

## Amount Mismatch

**Error:** `Security validation failed: Data mismatch`

**Cause:** The amount returned in the SoftPOS response doesn't match the amount stored in the session.

**Solutions:**

- This is a security feature. If you see this in testing, ensure:
  - The amount passed to `setAmount()` matches the amount sent to your backend for signing.
  - No middleware or proxy is modifying the callback URL parameters.

---

## CORS Errors

**Error:** `Access to fetch at 'http://localhost:3001/api/generate-signature' has been blocked by CORS policy`

**Cause:** Your backend doesn't include CORS headers.

**Solution:** Add CORS headers to your backend:

```javascript
const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};
```

The provided Node.js server at `server-side/node/server.js` already includes CORS support.

---

## Callback Page Shows "No session ID"

**Cause:** The callback URL is missing the `sid` or `sId` query parameter.

**Solutions:**

- Ensure the SoftPOS app is redirecting to the correct callback URL.
- Verify the callback URL was set correctly in the builder (check `setCallbackUrl()` or the default).
- The URL should look like: `https://your-site.com/callback.html?sid=xxxx&response=...`

---

## localStorage Not Available

**Cause:** The browser has disabled `localStorage` (private browsing mode on some browsers).

**Solutions:**

- Test in a regular (non-private) browser window.
- Ensure your site is served over HTTPS (some browsers restrict `localStorage` on HTTP).

---

## Still Having Issues?

1. Open the **browser developer console** (F12) and check for errors.
2. Look at the **Network tab** for failed requests.
3. Enable SDK logging by checking the server logs (the SDK sends logs to `/api/log` if available).
4. Contact Fawry support with your merchant account number and the error details.
