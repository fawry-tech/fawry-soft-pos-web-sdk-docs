(function() {
    var FIELD_MAP = {
        card_sale: { payment: true, amount: true, currency: true, reference: false, inquiry: false, receipt: true },
        card_refund: { payment: true, amount: true, currency: false, reference: true, inquiry: false, receipt: true },
        card_void: { payment: true, amount: false, currency: false, reference: true, inquiry: false, receipt: true },
        inquiry: { payment: false, amount: false, currency: false, reference: false, inquiry: true, receipt: false },
    };

    var BUTTON_CONFIG = {
        card_sale: { label: 'Pay Now', cls: '' },
        card_refund: { label: 'Refund', cls: 'refund-btn' },
        card_void: { label: 'Void Transaction', cls: 'void-btn' },
        inquiry: { label: 'Run Inquiry', cls: 'inquiry-btn' },
    };

    var DEFAULT_SIGNATURE_API_URL = 'http://localhost:3001/api/generate-signature';
    var statusDiv = document.getElementById('status');
    var submitBtn = document.getElementById('submitButton');
    var signatureApiInput = document.getElementById('signatureApiUrl');

    if (signatureApiInput) {
        signatureApiInput.value = localStorage.getItem('fawry_example_signature_api_url') ||
            DEFAULT_SIGNATURE_API_URL;
    }

    if (typeof FawrySDK === 'undefined') {
        showStatus('Error: Payment SDK failed to load. Run npm install, then serve this folder over HTTP.', 'error');
        return;
    }

    function resetFormInputs() {
        var empty = ['amount', 'orderId', 'transactionFCRN', 'transactionId', 'fromDate', 'toDate', 'merchantToken'];
        empty.forEach(function(id) {
            var el = document.getElementById(id);
            if (el) el.value = '';
        });

        var defs = {
            currency: 'EGP',
            partnerCode: '100',
            merchantAccountNumber: '102551',
            btc: '99901',
        };

        Object.keys(defs).forEach(function(id) {
            var el = document.getElementById(id);
            if (el) el.value = defs[id];
        });

        var idTypeEl = document.getElementById('idType');
        if (idTypeEl) idTypeEl.value = 'FCRN';

        var printReceipt = document.getElementById('printReceipt');
        var displayInvoice = document.getElementById('displayInvoice');
        if (printReceipt) printReceipt.checked = false;
        if (displayInvoice) displayInvoice.checked = false;
        if (statusDiv) {
            statusDiv.textContent = '';
            statusDiv.className = 'status';
        }
    }

    function updateUI() {
        var op = getSelectedOp();
        var fields = FIELD_MAP[op];
        var cfg = BUTTON_CONFIG[op];

        document.getElementById('sec_payment').classList.toggle('hidden', !fields.payment);
        document.getElementById('row_amount').classList.toggle('hidden', !fields.amount);
        document.getElementById('grp_currency').classList.toggle('hidden', !fields.currency);
        document.getElementById('sec_reference').classList.toggle('hidden', !fields.reference);
        document.getElementById('sec_inquiry').classList.toggle('hidden', !fields.inquiry);
        document.getElementById('sec_receipt').classList.toggle('hidden', !fields.receipt);

        submitBtn.textContent = cfg.label;
        submitBtn.className = cfg.cls;
    }

    function showStatus(msg, type) {
        statusDiv.textContent = msg;
        statusDiv.className = 'status show ' + type;
    }

    function val(id) {
        var el = document.getElementById(id);
        return el ? el.value.trim() : '';
    }

    function numVal(id) {
        return parseFloat(val(id)) || 0;
    }

    function checked(id) {
        var el = document.getElementById(id);
        return !!(el && el.checked);
    }

    function getSelectedOp() {
        return document.querySelector('input[name="operationType"]:checked').value;
    }

    function getSignatureApiUrl() {
        var url = val('signatureApiUrl');
        if (!url) {
            return '';
        }

        localStorage.setItem('fawry_example_signature_api_url', url);
        if (/\/api\/generate-signature\/?$/.test(url)) {
            return url;
        }

        return url.replace(/\/+$/, '') + '/api/generate-signature';
    }

    function validate(op) {
        var needsAmount = ['card_sale', 'card_refund'];
        if (!getSignatureApiUrl()) return 'Signature API URL is required';
        if (needsAmount.indexOf(op) !== -1) {
            var amount = numVal('amount');
            if (!amount || amount <= 0) return 'Please enter a valid amount';
        }
        if (!val('partnerCode')) return 'Partner Code is required';
        if (!val('merchantAccountNumber')) return 'Account Number is required';
        if ((op === 'card_refund' || op === 'card_void') && !val('transactionFCRN')) {
            return 'Reference Number (FCRN) is required';
        }
        if (op === 'inquiry' && !val('idType')) return 'ID Type is required for Inquiry';
        if (!val('btc') || isNaN(parseInt(val('btc'), 10))) {
            return 'Bill Type Code (btc) is required and must be a valid number';
        }
        return null;
    }

    function toBackendOperation(op) {
        return op === 'card_sale' ? 'purchase' : op.replace('card_', '');
    }

    async function requestSignature(op, sid, clientTimeStamp, amountStr, orderId) {
        var bodyObj = {
            operationType: toBackendOperation(op),
            merchantAccountNumber: val('merchantAccountNumber'),
            orderId: orderId,
            sid: sid,
            clientTimeStamp: clientTimeStamp,
        };

        var merchantToken = val('merchantToken');
        if (merchantToken) bodyObj.merchantToken = merchantToken;
        if ((op === 'card_sale' || op === 'card_refund') && amountStr !== '') bodyObj.amount = amountStr;
        if (op === 'card_refund' || op === 'card_void') bodyObj.transactionFCRN = val('transactionFCRN');
        if (op === 'inquiry') {
            bodyObj.transactionId = val('transactionId') || '';
            bodyObj.idType = val('idType');
        }

        var signatureUrl = getSignatureApiUrl();
        var sigResponse = await fetch(signatureUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyObj),
        });

        var responseText = await sigResponse.text();
        var sigData;
        try {
            sigData = responseText ? JSON.parse(responseText) : {};
        } catch (error) {
            throw new Error('Backend returned non-JSON response from ' + signatureUrl);
        }

        if (!sigResponse.ok) {
            throw new Error(sigData.error || ('Backend error: ' + sigResponse.status));
        }
        if (!sigData.signature) throw new Error('Missing signature from backend');

        return sigData.signature;
    }

    async function executeRequest(op) {
        var sid = FawrySDK.generateSessionId();
        var clientTimeStamp = Date.now();
        var amountStr = val('amount');
        var orderId = val('orderId') || null;
        var signature = await requestSignature(op, sid, clientTimeStamp, amountStr, orderId);
        var builder;

        switch (op) {
            case 'card_sale':
                builder = FawrySDK.requestSale(FawrySDK.PaymentOptionType.CARD)
                    .setAmount(amountStr)
                    .setCurrency(val('currency') || 'EGP')
                    .setOrderId(orderId);
                break;
            case 'card_refund':
                builder = FawrySDK.requestRefund(FawrySDK.PaymentOptionType.CARD)
                    .setAmount(amountStr)
                    .setTransactionFCRN(val('transactionFCRN'))
                    .setOrderId(orderId);
                break;
            case 'card_void':
                builder = FawrySDK.requestVoid(FawrySDK.PaymentOptionType.CARD)
                    .setTransactionFCRN(val('transactionFCRN'))
                    .setOrderId(orderId);
                break;
            case 'inquiry':
                builder = FawrySDK.requestInquiry()
                    .setIdType(FawrySDK.IdType[val('idType')])
                    .setTransactionId(val('transactionId') || '')
                    .setFromDate(val('fromDate') || '')
                    .setToDate(val('toDate') || '');
                break;
            default:
                throw new Error('Unknown operation: ' + op);
        }

        var merchantToken = val('merchantToken');
        builder
            .setSignature(signature)
            .setSid(sid)
            .setClientTimeStamp(clientTimeStamp)
            .setPartnerCode(val('partnerCode'))
            .setMerchantAccountNumber(val('merchantAccountNumber'))
            .setCallbackUrl(window.location.origin + window.location.pathname.replace(/\/index\.html$/, '') + '/callback.html')
            .setBtc(parseInt(val('btc'), 10))
            .setPrintReceipt(checked('printReceipt'))
            .setDisplayInvoice(checked('displayInvoice'));

        if (merchantToken) builder.setMerchantToken(merchantToken);

        return builder.send();
    }

    function successMessage(op, result) {
        var msg = op.replace('_', ' ').toUpperCase() + ' successful!\n';
        var body = result.body || {};
        var receiptInfo = body.receiptInfo || {};
        var cardInfo = receiptInfo.cardInfo || {};

        if (body.clientTerminalSequenceID) msg += 'Transaction ID: ' + body.clientTerminalSequenceID + '\n';
        if (body.fcrn) msg += 'Reference: ' + body.fcrn + '\n';
        if (body.fawryReference) msg += 'Fawry Ref: ' + body.fawryReference + '\n';
        if (body.paymentOption || cardInfo.primaryAccountNumber) {
            msg += 'Card: ' + (body.paymentOption || '') + ' ' + (cardInfo.primaryAccountNumber || '') + '\n';
        }
        if (receiptInfo.authId) msg += 'Auth ID: ' + receiptInfo.authId + '\n';
        if (body.amount != null) msg += 'Amount: ' + body.amount + ' ' + (body.currency || 'EGP');

        return msg;
    }

    document.querySelectorAll('input[name="operationType"]').forEach(function(radio) {
        radio.addEventListener('change', function() {
            resetFormInputs();
            updateUI();
        });
    });

    document.getElementById('requestForm').addEventListener('submit', async function(event) {
        event.preventDefault();

        var op = getSelectedOp();
        var err = validate(op);
        if (err) {
            showStatus(err, 'error');
            return;
        }

        var originalLabel = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Processing...';
        showStatus('Generating signature from backend...', 'loading');

        try {
            showStatus('Opening SoftPOS app...', 'loading');
            var result = await executeRequest(op);
            showStatus(successMessage(op, result), 'success');
            submitBtn.textContent = originalLabel;
            console.log('Result:', result);
        } catch (error) {
            showStatus('Failed: ' + error.message, 'error');
            submitBtn.textContent = originalLabel;
        } finally {
            submitBtn.disabled = false;
        }
    });

    var urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('sid') || urlParams.get('sId')) {
        window.location.href = 'callback.html' + window.location.search;
    }

    updateUI();
})();
