var net = require("net");
var crypto = require('crypto');
var Messages = require("./Messages");

var IMLoginReq = Messages.getDefine("IM.Login.IMLoginReq"),
  IMLoginRes = Messages.getDefine("IM.Login.IMLoginRes"),
	UserStatType = Messages.getDefine("IM.BaseDefine.UserStatType"),
	ClientType = Messages.getDefine("IM.BaseDefine.ClientType"),
	UserInfo = Messages.getDefine("IM.BaseDefine.UserInfo"),
	ResultType = Messages.getDefine("IM.BaseDefine.ResultType"),
	ServiceID = Messages.getDefine("IM.BaseDefine.ServiceID"),
	LoginCmdID = Messages.getDefine("IM.BaseDefine.LoginCmdID"),
	BuddyListCmdID = Messages.getDefine("IM.BaseDefine.BuddyListCmdID"),
	IMUserStatNotify = Messages.getDefine("IM.Buddy.IMUserStatNotify");
	
/*
  CByteStream::WriteInt32(m_pHeaderBuff, m_length);
	CByteStream::WriteUint16(m_pHeaderBuff + 4, m_version);
	CByteStream::WriteUint16(m_pHeaderBuff + 6, m_flag);
	CByteStream::WriteUint16(m_pHeaderBuff + 8, m_moduleId);1
	CByteStream::WriteUint16(m_pHeaderBuff + 10, m_commandId);259
	CByteStream::WriteUint16(m_pHeaderBuff + 12, m_seqNumber);1
	CByteStream::WriteUint16(m_pHeaderBuff + 14, m_reserved);
 */
function TTHeader(module, command, msgBodyLength, seq){
  this.length = msgBodyLength + 16;
  this.version = 1;
  this.flag = 0;
  this.module = module; //service
  this.command = command;
  this.seq = seq;
  this.reserved = 0;
}

TTHeader.decode = function(buffer){
  var header = new TTHeader();
  header.length = buffer.readInt32BE(0);
  header.version = buffer.readInt16BE(4);
  header.flag = buffer.readInt16BE(6);
  header.module = buffer.readInt16BE(8);
  header.command = buffer.readInt16BE(10);
  header.seq = buffer.readInt16BE(12);
  header.reserved = buffer.readInt16BE(14);
  
  return header;
}

TTHeader.prototype.toBuffer = function(){
  var buf = new Buffer(16);
  buf.fill(0);
  buf.writeInt32BE(this.length);
  buf.writeInt16BE(this.version, 4);
  buf.writeInt16BE(this.flag, 6);
  buf.writeInt16BE(this.module, 8);
  buf.writeInt16BE(this.command, 10);
  buf.writeInt16BE(this.seq, 12);
  buf.writeInt16BE(this.reserved, 14);
  
  return buf;
}

function TeamTalk(ipv4, port){
  this.client = new net.Socket();
  this._seq = 1;
  this.callbacks = new Object();
  this.ipv4 = ipv4;
  this.port = port;
}

  TeamTalk.prototype.on = function(event, callback){
    this.callbacks[event] = callback;
  }

  TeamTalk.prototype.connect = function(){
    var callbacks = this.callbacks;
    this.client.connect(this.port, this.ipv4, function(){
      var cb = callbacks["connected"];
      if(cb != undefined && typeof cb == 'function'){
        cb();
      }
    });
    
    this.client.on('data', function(data) {
      var header = TTHeader.decode(data);
      ///TODO: CHECK
      
      console.log(header);
      
      var message = null;
      switch(header.module){
      case ServiceID.SID_LOGIN:{
        switch(header.command){
        case LoginCmdID.CID_LOGIN_RES_USERLOGIN: {
          message = IMLoginRes.decode(data.slice(16));
        } break;
        }
      } break;
      
      case ServiceID.SID_BUDDY_LIST:{
        switch(header.command){
        case BuddyListCmdID.CID_BUDDY_LIST_STATUS_NOTIFY: {
          message = IMUserStatNotify.decode(data.slice(16));
        } break;
        }
      }
      }

      if(message != null){
        message.service = header.module;
        message.command = header.command;
      }

      callbacks['message'](message);
    });

    this.client.on('close', function() {    
      callbacks['closed']();
    });
  }
  
  TeamTalk.prototype._sendMessage = function(message, module, command){
    this._seq += 1;
    
    var buffer = message.toBuffer();
    var header = new TTHeader(module, command, buffer.length, this._seq);
    this.client.write(Buffer.concat([header.toBuffer(), buffer]));
  }
  
  TeamTalk.prototype.login = function(username, password){
    var _md5 = crypto.createHash('md5');
    _md5.update(password);
    var msg = new IMLoginReq(username, _md5.digest('hex'), 
      UserStatType.USER_STATUS_ONLINE, 
      ClientType.CLIENT_TYPE_WINDOWS, 
      "1.0.0");
      
    this._sendMessage(msg, ServiceID.SID_LOGIN, LoginCmdID.CID_LOGIN_REQ_USERLOGIN);
  }

module.exports = TeamTalk;