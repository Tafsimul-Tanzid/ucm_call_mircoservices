"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var crypto = require("crypto");
var challenge = '0000001172080728';
var password = 'cdrapi123'; // your password
var token = crypto
    .createHash('md5')
    .update(challenge + password)
    .digest('hex');
console.log('Token:', token);
