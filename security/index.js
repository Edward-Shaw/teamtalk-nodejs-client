var crypto = require('crypto');

var clearEncoding = 'utf8';
var algorithm = 'aes-256-ecb';
var iv = "";
var cipherEncoding = 'hex';
var keys = '12345678901234567890123456789012';

module.exports = {
  DecryptMsg: function(crypted/*: Buffer*/) /*: Buffer*/{
    var decipher = crypto.createDecipheriv(algorithm, keys, iv);
    decipher.setAutoPadding(false);

    crypted = new Buffer(crypted.toString(), 'base64');   //base64_decode

    var plainChunks = [];
    plainChunks.push(decipher.update(crypted.toString('hex'), cipherEncoding, clearEncoding));
    plainChunks.push(decipher.final(clearEncoding));
    
    ///console.log( plainChunks.join(' ###XXXX '));
    
    return new Buffer(plainChunks.join(''));
  },
  
  EncryptMsg: function(plain/*: String*/) /*: Buffer*/{
    var cipher = crypto.createCipheriv(algorithm, keys, iv);
    cipher.setAutoPadding(false);

    var cipherChunks = [];
    cipherChunks.push(cipher.update(plain, clearEncoding, cipherEncoding));
    cipherChunks.push(cipher.final(cipherEncoding));
    
    return new Buffer(cipherChunks.join(''));
  }
}