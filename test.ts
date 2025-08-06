import * as crypto from 'crypto';

const challenge = '0000001172080728';
const password = 'cdrapi123'; // your password

const token = crypto
  .createHash('md5')
  .update(challenge + password)
  .digest('hex');

console.log('Token:', token);
