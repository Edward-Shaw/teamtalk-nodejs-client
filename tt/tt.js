var net = require("net");
var crypto = require('crypto');
var Messages = require("./Messages");

var
  EasyHeader = Messages.getDefine("CAP.EasyHeader");

var 
  IMLoginReq = Messages.getDefine("IM.Login.IMLoginReq"),
  IMLoginRes = Messages.getDefine("IM.Login.IMLoginRes");

var
  UserStatType = Messages.getDefine("IM.BaseDefine.UserStatType"),
	ClientType = Messages.getDefine("IM.BaseDefine.ClientType"),
	UserInfo = Messages.getDefine("IM.BaseDefine.UserInfo"),
	ResultType = Messages.getDefine("IM.BaseDefine.ResultType"),
	ServiceID = Messages.getDefine("IM.BaseDefine.ServiceID"),
	LoginCmdID = Messages.getDefine("IM.BaseDefine.LoginCmdID"),
	BuddyListCmdID = Messages.getDefine("IM.BaseDefine.BuddyListCmdID"),
  OtherCmdID = Messages.getDefine("IM.BaseDefine.OtherCmdID"),
	GroupCmdID = Messages.getDefine("IM.BaseDefine.GroupCmdID"),
	MsgType = Messages.getDefine("IM.BaseDefine.MsgType"),
  MsgInfo = Messages.getDefine("IM.BaseDefine.MsgInfo"),
	GroupVersionInfo = Messages.getDefine("IM.BaseDefine.GroupVersionInfo"),
  ContactSessionInfo = Messages.getDefine("IM.BaseDefine.ContactSessionInfo"),
  UnreadInfo = Messages.getDefine("IM.BaseDefine.UnreadInfo");
	
var
  IMMsgData = Messages.getDefine("IM.Message.IMMsgData"),
  IMGetMsgListRsp = Messages.getDefine("IM.Message.IMGetMsgListRsp"),
  IMUnreadMsgCntRsp = Messages.getDefine("IM.Message.IMUnreadMsgCntRsp");
  
var
  IMUserStatNotify = Messages.getDefine("IM.Buddy.IMUserStatNotify"),
  IMAllUserReq = Messages.getDefine("IM.Buddy.IMAllUserReq"),
  IMAllUserRsp = Messages.getDefine("IM.Buddy.IMAllUserRsp"),
  IMDepartmentReq = Messages.getDefine("IM.Buddy.IMDepartmentReq"),
  IMDepartmentRsp = Messages.getDefine("IM.Buddy.IMDepartmentRsp"),
  IMRecentContactSessionRsp = Messages.getDefine("IM.Buddy.IMRecentContactSessionRsp");
  
var
  IMNormalGroupListReq = Messages.getDefine("IM.Group.IMNormalGroupListReq"),
  IMNormalGroupListRsp = Messages.getDefine("IM.Group.IMNormalGroupListRsp");

var
  IMHeartBeat = Messages.getDefine("IM.Other.IMHeartBeat");

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

  try{
    header.length = buffer.readInt32BE(0);
    header.version = buffer.readInt16BE(4);
    header.flag = buffer.readInt16BE(6);
    header.module = buffer.readInt16BE(8);
    header.command = buffer.readInt16BE(10);
    header.seq = buffer.readInt16BE(12);
    header.reserved = buffer.readInt16BE(14);
  }catch(err){
    console.log("tt exp 69", err);
  }
  
  return header;
}

TTHeader.prototype.toBuffer = function(){
  var buf = new Buffer(16);

  try{
    buf.fill(0);
    buf.writeInt32BE(this.length);
    buf.writeInt16BE(this.version, 4);
    buf.writeInt16BE(this.flag, 6);
    buf.writeInt16BE(this.module, 8);
    buf.writeInt16BE(this.command, 10);
    buf.writeInt16BE(this.seq, 12);
    buf.writeInt16BE(this.reserved, 14);
  }catch(err){
    console.log("tt exp 88", err);
  }

  return buf;
}

function TeamTalk(ipv4, port, $username){
  this.client = new net.Socket();
  this._seq = 1;
  this.callbacks = new Object();
  this.ipv4 = ipv4;
  this.port = port;
  this.user = $username;
}

var security = require("../security");

TeamTalk.prototype.close = function(){
  try{
    if(this.client != null && this.client != undefined){
      this.client.destroy();
    }
  }catch(err){
    console.log("tt exp 111", err);
  }
}

TeamTalk.prototype.on = function(event, callback){
  try{
    this.callbacks[event] = callback;
  }catch(err){
    console.log("tt exp 119", err);
  }
}

TeamTalk.prototype.heartbeat = function(){
  console.log(this.user, " heartbeat");
  try{
    this._sendMessage(new IMHeartBeat(), ServiceID.SID_OTHER, OtherCmdID.CID_OTHER_HEARTBEAT);
  }catch(err){
    console.log("tt exp 128", err);
  }
}

var DecryptMsg = function($buffer){
	var plain = "";
	try{
    plain = security.DecryptMsg(typeof $buffer == 'object' ? new Buffer($buffer, "base64") : $buffer.toBuffer());
  }catch(err){
    plain = $buffer;	///
    console.log("!!!bad:", err, "type:", typeof $buffer, $buffer);
  }
  
  return plain;
}

TeamTalk.prototype.connect = function(){
  var callbacks = this.callbacks;
  var ctx = this;

  if(this.client == undefined || this.client == null){
    console.log("invalid client 149");
    return;
  }
  
  this.client.connect(this.port, this.ipv4, function(){
    var cb = callbacks["connected"];
    if(cb != undefined && typeof cb == 'function'){
      return cb();
    }
  });
  
  this.client.on('data', function(data) {
    var header;
    var msgBody;

    try{
      header = TTHeader.decode(data);
      msgBody = data.slice(16, header.length);

      if(ServiceID.SID_LOGIN == header.module && LoginCmdID.CID_LOGIN_RES_USERLOGIN == header.command){
        ctx.hbHandler = setInterval(function() {
          ctx.heartbeat();
        }, 5 * 1000);
      }
    }catch(err){
      console.log("data callback exp 168", err);
    }

    var eh = new EasyHeader(header.module, header.command);
    console.log(ctx.user, "receive", eh);

    if(header.module == 0x3 && header.command == 0x301){
      try{
        var psd = IMMsgData.decode(msgBody);
        var msg_data = psd.msg_data;
        var text = DecryptMsg(msg_data.toBuffer());
        console.log(ctx.user, 'recv text' + text);

        var nmsg = new IMMsgData(psd.from_user_id, psd.to_session_id, psd.msg_id, psd.create_time, psd.msg_type, text);
        callbacks['message2'](Buffer.concat([eh.toBuffer(), nmsg.toBuffer()]));
      }catch(err){
        console.log("data callback exp 190", err);
      }
    
    }else if(header.module == 0x3 && header.command == 0x30a){    ///消息列表
      try{
        var mlr = IMGetMsgListRsp.decode(msgBody);
        /*
        //cmd id:   0x030a
        required uint32 user_id = 1;
        required IM.BaseDefine.SessionType session_type = 2;
        required uint32 session_id = 3;
        required uint32 msg_id_begin = 4;
        repeated IM.BaseDefine.MsgInfo msg_list = 5;
        */
        var list = [];
        for(var i in mlr.msg_list){
          var msgi = mlr.msg_list[i];
          var text = DecryptMsg(msgi.msg_data.toBuffer());
          var mi = new MsgInfo(msgi.msg_id, msgi.from_session_id, msgi.create_time, msgi.msg_type, text);
          list.push(mi);
        }
        var newRsp = new IMGetMsgListRsp(mlr.user_id, mlr.session_type, mlr.session_id, mlr.msg_id_begin, list);
        callbacks['message2'](Buffer.concat([eh.toBuffer(), newRsp.toBuffer()]));
      }catch(err){
        console.log("data callback exp 214", err);
      }
      /*
      message MsgInfo
      required uint32 msg_id = 1;
      required uint32 from_session_id = 2;   //发送的用户id
      required uint32 create_time = 3;
      required MsgType msg_type = 4;
      required bytes msg_data = 5;
      */

    }else if(header.module == 0x3 && header.command == 0x308){  ///未读
      try{
        /*IMUnreadMsgCntRsp
        required uint32 user_id = 1;
        required uint32 total_cnt = 2;
        repeated IM.BaseDefine.UnreadInfo unreadinfo_list = 3;
        */
        var umcr = IMUnreadMsgCntRsp.decode(msgBody);
        /*UnreadInfo
        required uint32 session_id = 1;
        required SessionType session_type = 2;
        required uint32 unread_cnt = 3;
        required uint32 latest_msg_id = 4;
        required bytes latest_msg_data = 5;
        required MsgType latest_msg_type = 6;
        required uint32 latest_msg_from_user_id = 7;
        */
        var list = [];
        for(var i in umcr.unreadinfo_list){
          var ui = umcr.unreadinfo_list[i];
          var text = DecryptMsg(ui.latest_msg_data.toBuffer());
          var nui = new UnreadInfo(ui.session_id, ui.session_type, ui.unread_cnt, ui.latest_msg_id, 
            text, 
            ui.latest_msg_type, ui.latest_msg_from_user_id);
          list.push(nui);
        }
        var newRsp = new IMUnreadMsgCntRsp(umcr.user_id, umcr.total_cnt, list);
        callbacks['message2'](Buffer.concat([eh.toBuffer(), newRsp.toBuffer()]));
      }catch(err){
        console.log("data callback exp 254", err);
      }

    }else if(header.module == 0x2 && header.command == 0x202){   ///最近会话记录
      try{
        /* IMRecentContactSessionRsp
        required uint32 user_id = 1;
        repeated IM.BaseDefine.ContactSessionInfo contact_session_list = 2;
        */
        var rcsr = IMRecentContactSessionRsp.decode(msgBody);
        /* ContactSessionInfo
        required uint32 session_id = 1;
        required SessionType session_type = 2;
        required SessionStatusType session_status = 3;
        required uint32 updated_time = 4;
        required uint32 latest_msg_id = 5;
        required bytes latest_msg_data = 6;
        required MsgType latest_msg_type = 7;
        required uint32 latest_msg_from_user_id = 8;
        */
        var list = [];
        for(var i in rcsr.contact_session_list){
          var csi = rcsr.contact_session_list[i];
          var text = DecryptMsg(csi.latest_msg_data.toBuffer());
          var ncsi = new ContactSessionInfo(csi.session_id, csi.session_type, csi.session_status, 
            csi.updated_time, 
            csi.latest_msg_id,
            text,
            csi.latest_msg_type,
            csi.latest_msg_from_user_id);
          list.push(ncsi);
        }
        var newRsp = new IMRecentContactSessionRsp(rcsr.user_id, list);
        callbacks['message2'](Buffer.concat([eh.toBuffer(), newRsp.toBuffer()]));
      }catch(err){
        console.log("data callback exp 289", err);
      }
    }else{
      try{
        callbacks['message2'](Buffer.concat([eh.toBuffer(), msgBody]));
      }catch(err){
        console.log("data callback exp 295", err);
      }
    }
  });

  this.client.on('close', function() {
    try{
      clearInterval(ctx.hbHandler);
      var cb = callbacks['closed'];
      if(cb != undefined && typeof cb == 'function'){
        cb();
      }
    }catch(err){
      console.log("close exp 308", err);
    }
  });
}

TeamTalk.prototype.send = function(easyHeaderBuffer, messageBodyBuffer){
  try{
    var eh = EasyHeader.decode(easyHeaderBuffer);
    console.log("sending easy header:", eh);
    
    ///对于MsgData需要加密
    if(eh.service == 0x3 && eh.command == 0x301){
      var psd = IMMsgData.decode(messageBodyBuffer);
      var text = psd.msg_data.toString('utf8');
      console.log('text: ' + text);

      var msgData = new IMMsgData(psd.from_user_id, psd.to_session_id, psd.msg_id, psd.create_time, psd.msg_type, security.EncryptMsg(text));
      messageBodyBuffer = msgData.toBuffer();
    }
    
    this._sendMessage2(messageBodyBuffer, eh.service, eh.command);
  }catch(err){
    console.log("send exp 330", err);
  }
}

TeamTalk.prototype._sendMessage2 = function(messageBuffer, module, command){
  try{
    this._seq += 1;
    
    var header = new TTHeader(module, command, messageBuffer.length, this._seq);
    var hb = header.toBuffer();
    var c = Buffer.concat([hb, messageBuffer]);
    this.client.write(c);
  }catch(err){
    console.log("_sendMessage2 exp 343", err);
  }
}

TeamTalk.prototype._sendMessage = function(message, module, command){
  try{
    this._sendMessage2(message.toBuffer(), module, command);
  }catch(err){
    console.log("_sendMessage exp 351", err);
  }
}

module.exports = TeamTalk;
