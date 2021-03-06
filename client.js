"use strict";
var tokenController;
var button;
var data = {
    amount: 4.99,
    currency: 'EUR',
    description: 'Book Purchase',
};
var selectedTransferType;

function clean() {
    if (button) {
        button.destroy();
        button = null;
    }

    if (tokenController && tokenController.destroy) {
        tokenController.destroy();
        tokenController = null;
    }
}

function tokenRedirectPath() {
    var path = '';
    if (selectedTransferType === 'STANDING_ORDER') {
        path = '/standing-order?';
    } else if (selectedTransferType === 'FUTURE_DATED') {
        path = '/future-dated?';
    } else if (selectedTransferType === 'ONE_STEP') {
        path = '/one-step-payment?';
    } else if (selectedTransferType === 'CROSS_BORDER') {
        path = '/cross-border?';
    } else {
        path = '/transfer?'
    }
    return path;
}

function redeemTokenPopUp() {
    var path = "";
    if (selectedTransferType === 'STANDING_ORDER') {
        path = '/redeem-standing-order-popup';
    } else if (selectedTransferType === 'FUTURE_DATED') {
        path = '/redeem-future-dated-popup';
    } else if (selectedTransferType === 'ONE_STEP') {
        path = '/redeem-popup';
    } else if (selectedTransferType === 'CROSS_BORDER') {
        path = '/redeem-popup';
    } else {
        path = '/redeem-popup';
    }
    return path;
}

function tokenPopupPath() {
    var path = "";
    if (selectedTransferType === 'STANDING_ORDER') {
        path = '/standing-order-popup?';
    } else if (selectedTransferType === 'FUTURE_DATED') {
        path = '/future-dated-popup?';
    } else if (selectedTransferType === 'ONE_STEP') {
        path = '/one-step-payment-popup?';
    } else if (selectedTransferType === 'CROSS_BORDER') {
        path = '/cross-border-popup?';
    } else {
        path = '/transfer-popup?';
    }
    return path;
}

function setupButtonTypeSelector() {
    var transferTypeSelector = document.getElementsByName('transferTypeSelector');
    var modeSelector = document.getElementsByName('buttonTypeSelector');
    var selectedMode = modeSelector[0].value;
    selectedTransferType = transferTypeSelector[0].value;

    for (var i = 0; i < transferTypeSelector.length; i++) {
        transferTypeSelector[i].addEventListener('click', function (e) {
            var value = e.target.value;
            if (value === selectedTransferType) return;
            selectedTransferType = value;
            createTokenRequestButton(selectedMode)
        });
    }

    for (var i = 0; i < modeSelector.length; i++) {
        modeSelector[i].addEventListener('click', function (e) {
            var value = e.target.value;
            if (value === selectedMode) return;
            selectedMode = value;
            createTokenRequestButton(selectedMode)
        });
    }
    createTokenRequestButton(selectedMode);
}

function createTokenRequestButton(selectedMode) {
    if (selectedMode === 'POPUP') {
        createTokenButton('POPUP')
    } else if (selectedMode === 'REDIRECT') {
        createTokenButton('REDIRECT');
    }
}

function createTokenButton(type) {
    // clean up instances
    clean();

    // Client side Token object for creating the Token button, handling the Token Controller, etc
    var token = new window.Token({
        env: 'sandbox',
    });

    // get button placeholder element
    var element = document.getElementById('tokenPayBtn');
    const webapp = type === 'POPUP' ? true : false;

    // create the button
    button = token.createTokenButton(element, {
        label: 'Token Quick Checkout',
    });

    var path = (type === 'POPUP') ? tokenPopupPath() : tokenRedirectPath();
    var queryString = Object.keys(data).map(key => key + '=' + window.encodeURIComponent(data[key])).join('&');

    tokenController = token.createController({
        onSuccess: function (data) { // Success Callback
            // build success URL
            var successURL = `${redeemTokenPopUp()}?data=${window.encodeURIComponent(JSON.stringify(data))}`;
            // navigate to success URL
            window.location.assign(successURL);
        },
        onError: function (error) { // Failure Callback
            throw error;
        },
    });

    // bind the Token Button to the Token Controller when ready
    tokenController.bindButtonClick(
        button, // Token Button
        token.createRequest(
            redirect => {
                window.location.assign(path + queryString);
            },
            async (done, error) => {
                fetch(path, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json; charset=utf-8',
                    },
                    body: JSON.stringify(data),
                })
                    .then(function (response) {
                        if (response.ok) {
                            response.text()
                                .then(function (data) {
                                    // execute callback when successful response is received
                                    done(data);
                                    console.log('data: ', data);
                                });
                        }
                    });
            }
        ), // token request function
        function (error) { // bindComplete callback
            if (error) throw error;
            // enable button after binding
            button.enable();
        },
        { // options
            desktop: webapp ? 'POPUP' : 'REDIRECT',
        }
    );
}

setupButtonTypeSelector();
