# Fawry SoftPOS Web SDK Example

This is a complete browser integration example for the Fawry SoftPOS Web SDK. It shows how a merchant website installs the SDK from the provided `.tgz` package, requests a server-generated signature, opens the SoftPOS app, and handles the callback result.

The example is intentionally client-only. It does not implement a backend, proxy, or signing logic inside this directory. The browser calls a signature API directly, exactly like an integrator would call their own backend.

## What This Example Includes

- A payment page: `index.html`
- A callback/result page: `callback.html`
- Browser logic for sale, refund, void, and inquiry flows: `app.js`
- Callback parsing and result rendering: `callback.js`
- UI styling: `styles.css`
- SDK package dependency installed from `fawry-softpos-web-sdk-1.0.0.tgz`

## Prerequisites

Before running the example, make sure you have:

- Node.js installed.
- Python 3 installed, used only to serve static files locally.
- The SDK tarball in this directory: `fawry-softpos-web-sdk-1.0.0.tgz`.
- A backend signature API that exposes `POST /api/generate-signature`.
- Fawry SoftPOS merchant credentials: `partnerCode`, `merchantAccountNumber`, `merchantToken`, and `btc`.
- An Android device with the SoftPOS app installed for a real app-to-browser payment test.

## Project Structure

```text
example/
├── fawry-softpos-web-sdk-1.0.0.tgz
├── package.json
├── package-lock.json
├── index.html
├── callback.html
├── app.js
├── callback.js
├── styles.css
└── README.md
```

## 1. Start The Signature Backend

This example expects a backend server to generate signatures. If you are using the demo Node backend from the SDK repository, start it from `server-side/node`.

Create a `.env` file in the backend folder. From the SDK repository root, run:

```bash
cd server-side/node
```

```bash
cat > .env <<'EOF'
MERCHANT_TOKEN=your-real-merchant-token
PORT=3001
EOF
```

Install dependencies and start the backend:

```bash
npm install
npm start
```

The backend should be available at:

```text
http://localhost:3001
```

Verify it:

```bash
curl http://localhost:3001/health
```

Expected response:

```json
{"ok":true,"service":"fawry-payment-server-side-node"}
```

Important: keep the real `MERCHANT_TOKEN` only on the backend. Do not put it in browser code.

## 2. Install The SDK In This Example

From this `example` directory, install dependencies:

```bash
npm install
```

The SDK is installed from the local tarball declared in `package.json`:

```json
{
  "dependencies": {
    "fawry-softpos-web-sdk": "file:./fawry-softpos-web-sdk-1.0.0.tgz"
  }
}
```

After installation, the browser bundle is available at:

```text
node_modules/fawry-softpos-web-sdk/dist/fawry-softpos-sdk.js
```

Both `index.html` and `callback.html` load that file with a normal script tag.

## 3. Start The Example App

Start the static site:

```bash
npm start
```

This runs:

```bash
python3 -m http.server 8080
```

It only serves static files. It does not run a backend or proxy.

Open:

```text
http://localhost:8080
```

## 4. Configure The Signature API URL

The page defaults to:

```text
http://localhost:3001/api/generate-signature
```

If your backend runs somewhere else, edit the `Signature API URL` field in the page.

You can enter either the full endpoint:

```text
https://your-domain.com/api/generate-signature
```

or a base URL:

```text
https://your-domain.com
```

If a base URL is entered, the example appends `/api/generate-signature`.

Because the browser calls the backend directly, your backend must allow CORS for the page origin.

## 5. Run A Sale

Use the default `Card Sale` operation and enter values such as:

```text
Amount: 10.00
Currency: EGP
Partner Code: 100
Account Number: 102551
Bill Type Code: 99901
```

Leave `Merchant Token` empty for normal use. The backend should read `MERCHANT_TOKEN` from its environment.

Click `Pay Now`.

The browser will:

1. Generate a `sid` with `FawrySDK.generateSessionId()`.
2. Generate `clientTimeStamp` with `Date.now()`.
3. Call your backend signature API.
4. Receive `{ "signature": "part1///part2" }`.
5. Build the SoftPOS deep link using the SDK.
6. Redirect the browser to the SoftPOS app.
7. Receive the result back on `callback.html`.

## Backend API Contract

The example sends `POST` requests to the configured signature API URL.

### Sale

```json
{
  "operationType": "purchase",
  "amount": "100.00",
  "merchantAccountNumber": "102551",
  "orderId": "ORDER-12345",
  "sid": "client-generated-session-id",
  "clientTimeStamp": 1709912345678
}
```

### Refund

```json
{
  "operationType": "refund",
  "amount": "100.00",
  "merchantAccountNumber": "102551",
  "orderId": "ORDER-12345",
  "transactionFCRN": "REF-ABC123",
  "sid": "client-generated-session-id",
  "clientTimeStamp": 1709912345678
}
```

### Void

```json
{
  "operationType": "void",
  "merchantAccountNumber": "102551",
  "orderId": "ORDER-12345",
  "transactionFCRN": "REF-ABC123",
  "sid": "client-generated-session-id",
  "clientTimeStamp": 1709912345678
}
```

### Inquiry

```json
{
  "operationType": "inquiry",
  "merchantAccountNumber": "102551",
  "transactionId": "REF-ABC123",
  "idType": "FCRN",
  "sid": "client-generated-session-id",
  "clientTimeStamp": 1709912345678
}
```

### Response

```json
{
  "signature": "part1///part2"
}
```

If the backend cannot generate a signature, return a non-2xx status with:

```json
{
  "error": "Reason for the failure"
}
```

## Important Security Notes

- Never generate signatures in browser code.
- Never commit a real `MERCHANT_TOKEN`.
- Store `MERCHANT_TOKEN` on the backend using an environment variable, vault, or secrets manager.
- Leave the `Merchant Token` field empty in this example unless you are doing a local-only diagnostic test.
- Use the exact same `amount`, `sid`, `clientTimeStamp`, `orderId`, and reference values for signature generation and SDK request building.
- Keep `amount` as a string, for example `"10.00"`, because signature calculation is string-sensitive.
- Use HTTPS for production and for real mobile device testing.

## Mobile Device Testing

For a real SoftPOS app test, the Android device must be able to open the website URL and return to `callback.html`.

For local development, expose the static site with HTTPS, for example:

```bash
ngrok http 8080
```

Then open the HTTPS ngrok URL on the Android device.

If your backend is also local, expose it separately or run it on a reachable HTTPS domain. Update the `Signature API URL` field in the page to point to that backend.

## Troubleshooting

### The SDK Does Not Load

Run:

```bash
npm install
```

Then confirm this file exists:

```text
node_modules/fawry-softpos-web-sdk/dist/fawry-softpos-sdk.js
```

### The Signature Request Fails

Check that the backend is running:

```bash
curl http://localhost:3001/health
```

Also confirm the `Signature API URL` field points to:

```text
http://localhost:3001/api/generate-signature
```

If the backend runs on another host or port, update the field in the page.

### CORS Error In Browser

The backend must allow requests from the origin serving the example, such as:

```text
http://localhost:8080
```

The demo Node backend already includes CORS headers.

### Payment App Does Not Open

Make sure:

- The SoftPOS app is installed on the Android device.
- You are testing on an Android browser/device that can open the SoftPOS deep link.
- The callback URL is reachable from the device.
- You use HTTPS for real mobile testing.

### Signature Mismatch Or Payment Rejected

Verify:

- `amount` is sent as the same string to both backend and SDK.
- `sid` and `clientTimeStamp` are generated once and reused for the same request.
- `merchantAccountNumber`, `partnerCode`, `merchantToken`, and `btc` are correct.
- Refund and void requests include the correct `transactionFCRN`.
- Inquiry requests include the correct `transactionId` and `idType`.

## Updating The SDK Tarball

If a new SDK version is released:

1. Replace `fawry-softpos-web-sdk-1.0.0.tgz` with the new tarball.
2. Update the dependency path in `package.json`.
3. Run `npm install` again.

Example:

```json
{
  "dependencies": {
    "fawry-softpos-web-sdk": "file:./fawry-softpos-web-sdk-1.0.1.tgz"
  }
}
```
