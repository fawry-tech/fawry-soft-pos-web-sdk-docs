(function() {
    if (typeof FawrySDK === 'undefined') {
        document.getElementById('loading').innerHTML =
            '<h1>Error</h1><p>Payment SDK failed to load. Run npm install, then serve this folder over HTTP.</p>';
        return;
    }

    var loadingDiv = document.getElementById('loading');
    var resultDiv = document.getElementById('result');
    var iconDiv = document.getElementById('icon');
    var resultTitle = document.getElementById('resultTitle');
    var resultMessage = document.getElementById('resultMessage');
    var resultInfo = document.getElementById('resultInfo');

    window.backToPayment = function backToPayment() {
        var focusedOpener = focusOriginalPaymentWindow();
        if (focusedOpener) {
            window.close();
        }
        setTimeout(function() {
            if (!window.closed) {
                window.location.replace(getPaymentPageUrl());
            }
        }, 150);
    };

    function getPaymentPageUrl() {
        return window.location.origin + window.location.pathname.replace(/\/callback\.html$/, '/index.html');
    }

    function buildReturnUrl(result) {
        var target = result && result._callbackReturnUrl ? result._callbackReturnUrl : getPaymentPageUrl();
        try {
            var url = new URL(target, window.location.origin);
            var sid = result && result.sid ? result.sid : new URLSearchParams(window.location.search).get('sId');
            if (sid) url.searchParams.set('fawrySid', sid);
            return url.toString();
        } catch (error) {
            return getPaymentPageUrl();
        }
    }

    function focusOriginalPaymentWindow() {
        try {
            if (window.opener && !window.opener.closed && typeof window.opener.focus === 'function') {
                window.opener.focus();
                return true;
            }
        } catch (error) {
            console.log('Could not focus opener window:', error);
        }
        return false;
    }

    function getFlowFromUrl() {
        var params = new URLSearchParams(window.location.search);
        var responseStr = params.get('response');
        if (!responseStr) return 'purchase';

        try {
            var decoded = decodeURIComponent(responseStr);
            var parsed = JSON.parse(decoded);
            var code = parsed.header && parsed.header.messageCode ? parsed.header.messageCode : 'purchase';
            return typeof code === 'string' ? code.toLowerCase() : 'purchase';
        } catch (error) {
            try {
                var parsedFallback = JSON.parse(responseStr);
                var fallbackCode = parsedFallback.header && parsedFallback.header.messageCode ? parsedFallback.header.messageCode : 'purchase';
                return typeof fallbackCode === 'string' ? fallbackCode.toLowerCase() : 'purchase';
            } catch (fallbackError) {
                return 'purchase';
            }
        }
    }

    function getLoadingText(flow) {
        var f = (typeof flow === 'string' ? flow : '').toLowerCase();
        var flowMap = {
            purchase: { title: 'Processing Payment...', message: 'Please wait while we process your payment.' },
            refund: { title: 'Processing Refund...', message: 'Please wait while we process your refund.' },
            void: { title: 'Processing Void...', message: 'Please wait while we reverse the transaction.' },
            inquiry: { title: 'Running Inquiry...', message: 'Please wait while we fetch the transaction details.' },
        };
        return flowMap[f] || flowMap.purchase;
    }

    function getBriefResultTitle(result, isSuccess) {
        if (!result) return isSuccess ? 'Successful' : 'Processed';
        var body = result.body || {};
        var transactionType = result.getTransactionType ? result.getTransactionType() : body.transactionType;
        var messageCode = result.header && result.header.messageCode ? result.header.messageCode : '';

        if (transactionType === 'Void') return isSuccess ? 'Void Completed' : 'Void Processed';
        if (transactionType === 'Refund') return isSuccess ? 'Refund Successful' : 'Refund Processed';
        if (messageCode === 'inquiry') return isSuccess ? 'Inquiry Complete' : 'Inquiry Processed';
        return isSuccess ? 'Payment Successful' : 'Payment Processed';
    }

    function addInfo(html, label, value) {
        if (value == null || value === '') return html;
        return html + '<div><strong>' + label + ':</strong> ' + escapeHtml(String(value)) + '</div>';
    }

    function escapeHtml(value) {
        return value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function showResult(result, isSuccess) {
        loadingDiv.style.display = 'none';
        resultDiv.classList.add('show');
        resultDiv.classList.add(isSuccess ? 'success' : 'error');

        var header = result.header || {};
        var body = result.body || {};
        var status = header.status || {};
        var receiptInfo = body.receiptInfo || {};
        var cardInfo = receiptInfo.cardInfo || {};
        var messageCode = (header.messageCode || '').toLowerCase();
        var transactionType = result.getTransactionType ? result.getTransactionType() : body.transactionType;
        var infoHtml = '';

        if (isSuccess) {
            iconDiv.textContent = '✓';
            iconDiv.classList.add('success');

            if (messageCode === 'inquiry') {
                resultTitle.textContent = 'Inquiry Complete';
                resultMessage.textContent = 'Transaction details retrieved successfully.';
            } else if (transactionType === 'Void') {
                resultTitle.textContent = 'Void Completed';
                resultMessage.textContent = 'The transaction has been reversed successfully.';
            } else if (transactionType === 'Refund') {
                resultTitle.textContent = 'Refund Successful!';
                resultMessage.textContent = 'Your refund has been processed successfully.';
            } else {
                resultTitle.textContent = 'Payment Successful!';
                resultMessage.textContent = 'Your payment has been processed successfully.';
            }

            infoHtml = addInfo(infoHtml, 'Transaction Type', body.transactionType);
            infoHtml = addInfo(infoHtml, 'Transaction ID', body.clientTerminalSequenceID);
            infoHtml = addInfo(infoHtml, 'Reference (FCRN)', body.fcrn);
            infoHtml = addInfo(infoHtml, 'Fawry Reference', body.fawryReference);
            if (body.amount != null) infoHtml = addInfo(infoHtml, 'Amount', body.amount + ' ' + (body.currency || 'EGP'));
            if (body.paymentOption || cardInfo.primaryAccountNumber) {
                infoHtml = addInfo(infoHtml, 'Card', (body.paymentOption || '') + ' ' + (cardInfo.primaryAccountNumber || ''));
            }
            infoHtml = addInfo(infoHtml, 'Auth ID', receiptInfo.authId);
            infoHtml = addInfo(infoHtml, 'RRN', receiptInfo.rrn);
            infoHtml = addInfo(infoHtml, 'Merchant ID', receiptInfo.merchantId);
            infoHtml = addInfo(infoHtml, 'Terminal ID', receiptInfo.terminalId);
            if (receiptInfo.customerReceiptUrl) {
                infoHtml += '<div><strong>Customer Receipt:</strong> <a href="' + encodeURI(receiptInfo.customerReceiptUrl) + '" target="_blank" rel="noopener">Download</a></div>';
            }
            if (receiptInfo.merchantReceiptUrl) {
                infoHtml += '<div><strong>Merchant Receipt:</strong> <a href="' + encodeURI(receiptInfo.merchantReceiptUrl) + '" target="_blank" rel="noopener">Download</a></div>';
            }
            resultInfo.innerHTML = infoHtml || '<div>Operation completed successfully.</div>';
            return;
        }

        iconDiv.textContent = '✗';
        iconDiv.classList.add('error');
        if (messageCode === 'inquiry') {
            resultTitle.textContent = 'Inquiry Failed';
        } else if (transactionType === 'Void') {
            resultTitle.textContent = 'Void Failed';
        } else if (transactionType === 'Refund') {
            resultTitle.textContent = 'Refund Failed';
        } else {
            resultTitle.textContent = 'Payment Failed';
        }

        resultMessage.textContent = status.hostStatusDesc || status.statusDesc || 'Your request could not be processed.';
        infoHtml = addInfo(infoHtml, 'Session ID', result.sid);
        infoHtml = addInfo(infoHtml, 'Status', status.statusDesc);
        infoHtml = addInfo(infoHtml, 'Status Code', status.statusCode);
        if (body.amount != null) infoHtml = addInfo(infoHtml, 'Amount', body.amount + ' ' + (body.currency || 'EGP'));
        resultInfo.innerHTML = infoHtml || '<div>Please try again or contact support.</div>';
    }

    async function handleCallback() {
        var flow = getFlowFromUrl();
        var loadingText = getLoadingText(flow);
        var loadingH1 = loadingDiv.querySelector('h1');
        var loadingMsg = loadingDiv.querySelector('.message');
        if (loadingH1) loadingH1.textContent = loadingText.title;
        if (loadingMsg) loadingMsg.textContent = loadingText.message;

        try {
            var result = await FawrySDK.handleCallback();
            if (!result) {
                showResult({ header: { status: { statusDesc: 'failed' } }, body: {} }, false);
                return;
            }

            var isSuccess = result.isSuccess ? result.isSuccess() : false;
            if (result._storedForCrossTab || result._callbackReturnUrl) {
                var briefTitle = getBriefResultTitle(result, isSuccess);
                loadingDiv.innerHTML =
                    '<div class="icon ' + (isSuccess ? 'success' : 'error') + '">' + (isSuccess ? '✓' : '✗') + '</div>' +
                    '<h1>' + briefTitle + '</h1>' +
                    '<p class="message">Returning to payment page...</p>';

                setTimeout(function() {
                    if (result._callbackReturnUrl) {
                        window.location.replace(buildReturnUrl(result));
                        return;
                    }

                    var focusedOpener = focusOriginalPaymentWindow();
                    if (focusedOpener) {
                        try {
                            window.close();
                        } catch (error) {
                            console.log('Could not close window:', error);
                        }
                    } else {
                        window.location.replace(getPaymentPageUrl());
                        return;
                    }

                    setTimeout(function() {
                        if (!document.hidden && (typeof document.hasFocus !== 'function' || document.hasFocus())) {
                            window.location.replace(getPaymentPageUrl());
                        }
                    }, 100);
                }, result._callbackReturnUrl ? 300 : 3000);
            } else {
                showResult(result, isSuccess);
            }
        } catch (error) {
            showResult({
                header: {
                    status: {
                        statusDesc: 'error',
                        hostStatusDesc: error.message || 'An error occurred while processing the payment.',
                    },
                },
                body: {},
            }, false);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', handleCallback);
    } else {
        handleCallback();
    }
})();
