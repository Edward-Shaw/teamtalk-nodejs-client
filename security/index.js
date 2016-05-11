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
    
    var result = new Buffer(plainChunks.join(''));
    
    var len = result.readInt32BE(result.length - 4);
    ///console.log("DecryptMsg", result.length, len);
    result.writeInt32BE(0, result.length - 4);
    
    return result;
  },
  
  EncryptMsg: function(plain/*: String*/) /*: Buffer*/{
    var cipher = crypto.createCipheriv(algorithm, keys, iv);
    cipher.setAutoPadding(false);

    var data = new Buffer(plain, 'utf8');
    var v = data.length % 16, blocks = Math.floor((data.length + 15) / 16);
    if(v > 12 || v == 0){
      blocks += 1;
    }
    var newData = new Buffer(blocks * 16);
    newData.fill(0);
    data.copy(newData);
    newData.writeInt32BE(data.length, blocks * 16 - 4);

    var cipherChunks = [];
    cipherChunks.push(cipher.update(newData, clearEncoding, cipherEncoding));
    cipherChunks.push(cipher.final(cipherEncoding));
    
    var result = new Buffer(cipherChunks.join(''), 'hex');
    var base64 = result.toString('base64');

    return new Buffer(base64);
  }
}
