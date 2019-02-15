(function () {
    'use strict';

    var CryptoJS = require('crypto-js');
    var Base58 = require('bs58');
    var EC = require('elliptic').ec;

    ////////////////////////////////////////////////////////////////////////////////////////////////////
    // Encoding
    ////////////////////////////////////////////////////////////////////////////////////////////////////

    function utf8ToHex(str) {
        return CryptoJS.enc.Hex.stringify(
            CryptoJS.enc.Utf8.parse(str)
        );
    }

    function encode64(hexData) {
        return CryptoJS.enc.Base64.stringify(
            CryptoJS.enc.Hex.parse(hexData)
        );
    }

    function decode64(base64Data) {
        return CryptoJS.enc.Hex.stringify(
            CryptoJS.enc.Base64.parse(base64Data)
        );
    }

    function encode58(hexData) {
        return Base58.encode(Buffer.from(hexData, 'hex'));
    }

    function decode58(base58Data) {
        return Base58.decode(base58Data).toString('hex');
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////
    // Hashing
    ////////////////////////////////////////////////////////////////////////////////////////////////////

    function sha256(hexData) {
        return CryptoJS.enc.Hex.stringify(
            CryptoJS.SHA256(
                CryptoJS.enc.Hex.parse(hexData)
            )
        );
    }

    function sha512(hexData) {
        return CryptoJS.enc.Hex.stringify(
            CryptoJS.SHA512(
                CryptoJS.enc.Hex.parse(hexData)
            )
        );
    }

    function sha160(hexData) {
        return sha512(hexData).substr(0, 40); // First 20 bytes.
    }

    function hash(hexData) {
        return encode58(sha256(hexData));
    }

    function deriveHash(address, nonce, txActionNumber) {
        var addressHex = decode58(address).padStart(52, "0");
        var nonceHex = nonce.toString(16).padStart(16, "0");
        var txActionNumberHex = txActionNumber.toString(16).padStart(4, "0");
        return hash(addressHex + nonceHex + txActionNumberHex);
    }

    function chainiumAddress(hexPublicKey) {
        var prefix = '065A';
        var publicKeyHashWithPrefix = prefix + sha160(sha256(hexPublicKey));
        var checksum = sha256(sha256(publicKeyHashWithPrefix)).substr(0, 8); // First 4 bytes.
        return encode58(publicKeyHashWithPrefix + checksum);
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////
    // Signing
    ////////////////////////////////////////////////////////////////////////////////////////////////////

    var ec = new EC('secp256k1');

    function generateWallet() {
        var keyPair = ec.genKeyPair();
        return {
            privateKey: encode58(keyPair.getPrivate('hex')),
            address: chainiumAddress(keyPair.getPublic('hex'))
        };
    }

    function addressFromPrivateKey(privateKey) {
        var keyPair = ec.keyFromPrivate(decode58(privateKey), 'hex');
        return chainiumAddress(keyPair.getPublic('hex'));
    }

    function signMessage(networkCode, privateKey, hexMessage) {
        var messageHash = sha256(hexMessage);
        var networkCodeHash = sha256(utf8ToHex(networkCode));
        var dataToSign = sha256(messageHash + networkCodeHash);
        var signature = ec.sign(dataToSign, decode58(privateKey), 'hex', {canonical: true});
        var signatureBytes =
            signature.r.toString('hex').padStart(64, "0")   // R
            + signature.s.toString('hex').padStart(64, "0") // S
            + '0' + signature.recoveryParam                 // V
        return encode58(signatureBytes);
    }

    module.exports = {
        // Encoding
        utf8ToHex: utf8ToHex,
        encode64: encode64,
        decode64: decode64,
        encode58: encode58,
        decode58: decode58,

        // Hashing
        hash: hash,
        deriveHash: deriveHash,

        // Signing
        generateWallet: generateWallet,
        addressFromPrivateKey: addressFromPrivateKey,
        signMessage: signMessage
    };
}());
