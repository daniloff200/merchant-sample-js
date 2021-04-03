'use strict';

var express = require('express');
var fs = require('fs');
var app = express();
var cookieSession = require('cookie-session');
var bodyParser = require('body-parser');
var urlencodedParser = bodyParser.json({ extended: false });

// See https://github.com/tokenio/sdk-js for details
var TokenClient = require('@token-io/tpp').TokenClient; // main Token SDK entry object

// Connect to Token's development sandbox, if you change this, you also need to change window.Token({env}) in client.js
var Token = new TokenClient({ env: 'sandbox', developerKey: '4qY7lqQw8NOl9gng0ZHgT4xdiDqxqoGVutuZwrUYQsI', keyDir: './keys' });
var tokenRequestId = "";


async function init() {
    var alias; // merchant alias
    var member; // merchant member
    // If we know of a previously-created merchant member, load it; else create a new one.

    // Token SDK stores member keys in files in ./keys.
    // If merchant member's ID is "m:1234:567", its key file is "m_1234_567".
    var keyPaths;
    try {
        keyPaths = fs.readdirSync('./keys');
    } catch (x) {
        keyPaths = [];
    }

    if (keyPaths && keyPaths.length) {
        var keyPath = keyPaths[0];
        var mid = keyPath.replace(/_/g, ":");
        member = Token.getMember(Token.UnsecuredFileCryptoEngine, mid);
    }

    // If member is defined, that means we found keys and loaded them.
    if (member) {
        // We're using an existing merchant member. Fetch its alias (email address)
        try {
            alias = await member.firstAlias();
        } catch (e) {
            console.log("Something went wrong: " + e);
            console.log("If member ID not found or firstAlias fails, `rm -r ./keys` and try again.");
            throw e;
        }
    } else {
        // Didn't find an existing merchant member. Create a new one.
        // If a domain alias is used instead of an email, please contact Token
        // with the domain and member ID for verification.
        // See https://developer.token.io/sdk/#aliases for more information.
        alias = {
            type: 'DOMAIN',
            value: 'dmitriy.danilov@valor-software.com'
        };
        member = await Token.createMember(alias, Token.UnsecuredFileCryptoEngine);
        // A member's profile has a display name and picture.
        // The Token UI shows this (and the alias) to the user when requesting access.
        await member.setProfile({
            displayNameFirst: 'Liberty Flights'
        });
        await member.setProfilePicture('image/png', fs.readFileSync('southside.png'))
    }

    // launch server
    return initServer(member, alias);
}

async function initServer(member, alias) {
    app.use(cookieSession({
        name: 'session',
        keys: ['cookieSessionKey'],
        // Cookie Options
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
    }));

    app.get('/', function (req, res) {
        fs.readFile('index.html', 'utf8', function (err, contents) {
            res.set('Content-Type', 'text/html');
            res.send(contents);
        })
    });

    // Endpoint for transferring, called by client side after user approval
    app.get('/transfer', async function (req, res) {
        const destination = {
            sepa: {
                iban: 'DE16700222000072880129',
                bic: '123456'
            },
            customerData: {
                legalNames: ['liberty-flights']
            }
        };

        const queryData = req.query;
        const refId = Token.Util.generateNonce();
        const csrfToken = Token.Util.generateNonce();
        req.session.csrfToken = csrfToken;

        var redirectUrl = req.protocol + '://' + req.get('host') + '/redeem';

        // set up the TokenRequest
        const tokenRequest = Token.createTransferTokenRequest(queryData.amount, queryData.currency)
            .setDescription(queryData.description)
            .setToAlias(alias)
            .setToMemberId(member.memberId())
            .addTransferDestination(destination)
            .setRedirectUrl(redirectUrl)
            .setCSRFToken(csrfToken)
            .setRefId(refId);


        // store the token request
        const request1 = await member.storeTokenRequest(tokenRequest);
        const requestId = request1.id;

        const tokenRequestUrl = Token.generateTokenRequestUrl(requestId);
        const replaceurl = tokenRequestUrl.replace('https://', 'https://hsbc.');
        res.redirect(302, replaceurl);
    });


    app.get('/redeem', urlencodedParser, async function (req, res) {
        // get the token ID from the callback url
        var callbackUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
        let csrfTokenValue = req.session.csrfToken;


        const result = await Token.parseTokenRequestCallbackUrl(callbackUrl, csrfTokenValue);
        const token1 = await member.getToken(result.tokenId);
        // Redeem the token to move the funds
        const transfer = await member.redeemToken(token1);
         console.log('\n Redeem Token Response:', transfer);
    });


    app.use(express.static(__dirname));
    app.listen(3000, function () {
        console.log('Example app listening on port 3000!')
    })
}

init();
