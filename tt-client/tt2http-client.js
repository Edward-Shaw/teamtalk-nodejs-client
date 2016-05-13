/**********
*
*	1.使用WebSocket和TT2HTTP建立连接
*	2.定义一组方法覆盖需求
*	需求如下：
*		1.新建/删除消息(个人/群)
*		2.消息对话中人员的添加/删除
*		3.查看聊天记录
*		4.消息免打扰
*		5.退出对话
*		6.查看人员(本人/对方)信息
*		7.发送/接收消息(文字/图片/语音/表情)
*		8.修改群对话名称
*		9.登录
*
*		拓展功能:
*		1.接收消息附带已读未读状态
*		2.发送消息修改已读未读状态
*		3.消息已读未读人员列表
*		4.群对话中@功能,接受消息无视免打扰带提醒
*
*/

// md5 encode
//document.write("<script language=javascript src='./md5.js'></script>");
document.write("<script language=javascript src='/tt-client/md5.js'></script>");

// Initialize ProtoBuf.js
var ProtoBuf = dcodeIO.ProtoBuf;
var ByteBuffer = dcodeIO.ByteBuffer;
var builders = new Object();
var protos = ["IM.Group", "IM.Other", "IM.Buddy", "IM.Login", "IM.Server", "IM.File", "IM.Message", "IM.SwitchService", "CAP"];
for(var p in protos){
	//builders[protos[p]] = ProtoBuf.loadProtoFile("./tt-message-pb/" + protos[p] + ".proto");
	builders[protos[p]] = ProtoBuf.loadProtoFile("/tt-client/tt-message-pb/" + protos[p] + ".proto");
}

function getBuilder(name){
	if(name === "IM.BaseDefine"){
		name = "IM.Login";
	}
	return builders[name];
}

var defines = new Object();

function getDefine(qualifier){
	var result = null;
	if(defines[qualifier] == undefined){
		var index = qualifier.lastIndexOf('.');
		result = defines[qualifier] = getBuilder(qualifier.substring(0, index)).build(qualifier);
	}
	
	return result;
}

var
  EasyHeader = getDefine("CAP.EasyHeader");

var 
  IMLoginReq = getDefine("IM.Login.IMLoginReq"),
  IMLoginRes = getDefine("IM.Login.IMLoginRes");

var
  UserStatType = getDefine("IM.BaseDefine.UserStatType"),
	ClientType = getDefine("IM.BaseDefine.ClientType"),
	SessionType = getDefine("IM.BaseDefine.SessionType"),
	UserInfo = getDefine("IM.BaseDefine.UserInfo"),
	ResultType = getDefine("IM.BaseDefine.ResultType"),
	ServiceID = getDefine("IM.BaseDefine.ServiceID"),
	LoginCmdID = getDefine("IM.BaseDefine.LoginCmdID"),
	BuddyListCmdID = getDefine("IM.BaseDefine.BuddyListCmdID"),
	GroupCmdID = getDefine("IM.BaseDefine.GroupCmdID"),
	MsgType = getDefine("IM.BaseDefine.MsgType"),
	GroupVersionInfo = getDefine("IM.BaseDefine.GroupVersionInfo"),
	MessageCmdID = getDefine("IM.BaseDefine.MessageCmdID"),
	GroupType = getDefine("IM.BaseDefine.GroupType");
	
var
  IMMsgData = getDefine("IM.Message.IMMsgData"),
  IMMsgDataAck = getDefine("IM.Message.IMMsgDataAck"),
  IMUnreadMsgCntReq = getDefine("IM.Message.IMUnreadMsgCntReq"),
  IMUnreadMsgCntRsp = getDefine("IM.Message.IMUnreadMsgCntRsp"),
  IMGetMsgListReq = getDefine("IM.Message.IMGetMsgListReq"),
  IMGetMsgListRsp = getDefine("IM.Message.IMGetMsgListRsp"),
  IMMsgDataReadAck = getDefine("IM.Message.IMMsgDataReadAck"),
  IMMsgDataReadNotify = getDefine("IM.Message.IMMsgDataReadNotify");

var
  IMUserStatNotify = getDefine("IM.Buddy.IMUserStatNotify"),
  IMAllUserReq = getDefine("IM.Buddy.IMAllUserReq"),
  IMAllUserRsp = getDefine("IM.Buddy.IMAllUserRsp"),
  IMDepartmentReq = getDefine("IM.Buddy.IMDepartmentReq"),
  IMDepartmentRsp = getDefine("IM.Buddy.IMDepartmentRsp"),
  IMRecentContactSessionReq = getDefine("IM.Buddy.IMRecentContactSessionReq"),
  IMRecentContactSessionRsp = getDefine("IM.Buddy.IMRecentContactSessionRsp"),
  IMRemoveSessionReq = getDefine("IM.Buddy.IMRemoveSessionReq"),
  IMRemoveSessionRsp = getDefine("IM.Buddy.IMRemoveSessionRsp");
  
var
  IMNormalGroupListReq = getDefine("IM.Group.IMNormalGroupListReq"),
  IMNormalGroupListRsp = getDefine("IM.Group.IMNormalGroupListRsp"),
  IMGroupInfoListReq = getDefine("IM.Group.IMGroupInfoListReq"),
  IMGroupInfoListRsp = getDefine("IM.Group.IMGroupInfoListRsp"),
  IMGroupShieldReq = getDefine("IM.Group.IMGroupShieldReq"),
  IMGroupShieldRsp = getDefine("IM.Group.IMGroupShieldRsp"),
  IMGroupCreateReq = getDefine("IM.Group.IMGroupCreateReq"),
  IMGroupCreateRsp = getDefine("IM.Group.IMGroupCreateRsp");

//construct function for TTWebClient.
function TTWebClient(ipv4, port, onMessageReceived, onStateChanged, ctx){

	var user_name = '';
	if(ctx != undefined && typeof ctx == 'object'){
		user_name = ctx['user_name'] != undefined ? ctx['user_name'] : '';
	}

	if(user_name == ''){
		onStateChanged('error', {message: 'user_name can not be empty!'});
		return new Error('Bad username');
	}

	this.ipv4 = ipv4;
	this.port = port;
	this.socket = new WebSocket("ws://" + ipv4 + ":" + port + "/p?user_name=" + user_name);
	this.socket.binaryType = "arraybuffer";
	this.callbacks = new Object();
	var thiz = this;
	
	this.mySessionDic = new Object();

	//store group_id as key, GroupInfo as value.
	this._myGroupDic = new Object();

	this.socket.onopen = function(evt){
		if(onStateChanged != undefined && typeof onStateChanged == 'function'){
			onStateChanged('connected', evt);
		}
		console.log("Connected\n");
	};

	this.socket.onclose = function(evt){
		if(onStateChanged != undefined && typeof onStateChanged == 'function'){
			onStateChanged('closed', evt);
		}
		console.log("Disconnected\n");
	};

	this.socket.onmessage = function(evt){
	    var message = evt.data;
	    var header = EasyHeader.decode(message.slice(0, 5));
		//console.log("header", header);
	    var res = null;
	    switch(header.service){
    	case ServiceID.SID_LOGIN: {
    		try{
    			var loginRes = IMLoginRes.decode(message.slice(5));
    			
    			if(loginRes.result_code != undefined && loginRes.result_code != 0){
    				return thiz.getFunction("logedin")(loginRes);
    			}

	    		thiz.user_info = loginRes.user_info;
	    		thiz.server_time = loginRes.server_time;
	    		res = loginRes.user_info;

	    		//获取未读消息列表
	    		thiz._getUnreadMsgCntReq();
	    		thiz._departmentRequest();
	    		thiz.getFunction("logedin")(res);
    		}catch(err){
    			thiz.getFunction("exception")(res, err);
    		}
    	} break;
    	
    	case ServiceID.SID_BUDDY_LIST:
    		switch(header.command){
	        case BuddyListCmdID.CID_BUDDY_LIST_STATUS_NOTIFY: {
	        	try{
					res = IMUserStatNotify.decode(message.slice(5));
					thiz._alluserRequest();
					thiz._normalGroupListRequest();
					thiz._getAllUserContactSession();
	        	}catch(err){
	    			thiz.getFunction("exception")(res, err);
    			}
	        } break;
	        
	        case BuddyListCmdID.CID_BUDDY_LIST_ALL_USER_RESPONSE: {
	        	try{
	        		res = IMAllUserRsp.decode(message.slice(5));
		            //store user list.
		            thiz.user_list = res.user_list;
		            thiz.getFunction("buddy_list")(res.user_list);
		            //get recent contact session.
		            thiz._getAllUserContactSession();
	        	}catch(err){
	    			thiz.getFunction("exception")(res, err);
    			}
	        } break;
	        
	        case BuddyListCmdID.CID_BUDDY_LIST_DEPARTMENT_RESPONSE: {
	        	try{
	        	    res = IMDepartmentRsp.decode(message.slice(5));
		            thiz.getFunction("dept_list")(res.dept_list);
					thiz._alluserRequest();
					thiz._normalGroupListRequest();
					thiz._getAllUserContactSession();
	        	}catch(err){
	    			thiz.getFunction("exception")(res, err);
    			}
	        } break;
	        
	        //store recent contact session.
	        case BuddyListCmdID.CID_BUDDY_LIST_RECENT_CONTACT_SESSION_RESPONSE: {
	        	try{
	        		res = IMRecentContactSessionRsp.decode(message.slice(5));
		        	if(res.contact_session_list == null || res.contact_session_list == undefined){
		        		console.log("no contact session!!");
		        		break;
		        	}
		        	thiz._updateSessionStatus(res.contact_session_list);
		        	thiz.getFunction("recent_sessions")(res.contact_session_list);
	        	}catch(err){
	        		console.log("err: ", err);
	    			thiz.getFunction("exception")(res, err);
    			}
	        } break;

	        case BuddyListCmdID.CID_BUDDY_LIST_REMOVE_SESSION_RES: {
	        	try{
	        		res = IMRemoveSessionRsp.decode(message.slice(5));
	        		thiz.getFunction("session_removed")(res);
	        	}catch(err){
	        		console.log("err: ", err);
	    			thiz.getFunction("exception")(res, err);
    			}
	        } break;

			default:
				console.log(header.service + "-" + header.command);
	        }
    		break;

    	case ServiceID.SID_MSG: {
    		switch(header.command){
    		case MessageCmdID.CID_MSG_DATA:{
    			try{
					res = IMMsgData.decode(message.slice(5));
		    		//如果是群组消息则更新群组信息
		    		if(res.msg_type == MsgType.MSG_TYPE_GROUP_TEXT){
		    			var group_version_list = new Array();
						var group_version_info = new Object();
						group_version_info["group_id"] = res.to_session_id;
						group_version_info["version"] = 0;
						group_version_list[0] = group_version_info;
		    			thiz._getGroupInfoListReq(group_version_list);
		    		}

		    		var text = res.msg_data.toString('utf8');
		    		res.msg_text = text;
					
					//APP客户端的@判断是没有加空格的，为了兼容就把Web端的空格去掉了	
		    		//var idx = text.indexOf('@' + thiz.user_info.user_nick_name + ' ');
		    		var idx = text.indexOf('@' + thiz.user_info.user_nick_name);
		    		onMessageReceived(res, idx != -1);
    			}catch(err){
	    			thiz.getFunction("exception")(res, err);
    			}
    		} break;

    		//发送消息的确认信息
    		case MessageCmdID.CID_MSG_DATA_ACK:{
    			try{
	    			res = IMMsgDataAck.decode(message.slice(5));
	    			thiz.getFunction("msg_ack")(res);
    			}catch(err){
	    			thiz.getFunction("exception")(res, err);
    			}
    		} break;

    		case MessageCmdID.CID_MSG_UNREAD_CNT_RESPONSE:{
    			try{
					res = IMUnreadMsgCntRsp.decode(message.slice(5));
	    			thiz.getFunction("unread_cnt")(res.unreadinfo_list);
					thiz._alluserRequest();
					thiz._normalGroupListRequest();
					thiz._getAllUserContactSession();
    			}catch(err){
	    			thiz.getFunction("exception")(res, err);
    			}
    		} break;

    		case MessageCmdID.CID_MSG_LIST_RESPONSE:{
    			try{
					res = IMGetMsgListRsp.decode(message.slice(5));
	    			thiz.getFunction("msg_list")(res);
    			}catch(err){
	    			thiz.getFunction("exception")(res, err);
    			}
    		} break;

    		case MessageCmdID.CID_MSG_READ_NOTIFY:{
    			try{
    				res = IMMsgDataReadNotify.decode(message.slice(5));
    				thiz.getFunction("msg_read_notify")(res);
    			}catch(err){
    				thiz.getFunction("exception")(res, err);
    			}
    		} break;

    		default:
    			console.log("msg: " + header.service + "-" + header.command + "\n");
    		}
    	} break;

    	case ServiceID.SID_GROUP:{
    		switch(header.command){
    		case GroupCmdID.CID_GROUP_NORMAL_LIST_RESPONSE:{
    			try{
    				res = IMNormalGroupListRsp.decode(message.slice(5));
	    			thiz._allGroupInfoListRequest(res.group_version_list);
	    			thiz._getAllUserContactSession();
    			}catch(err){
    				console.log("err: ", message);
	    			thiz.getFunction("exception")(res, err);
    			}
    		} break;

    		case GroupCmdID.CID_GROUP_INFO_RESPONSE:{
    			try{
    				res = IMGroupInfoListRsp.decode(message.slice(5));
    				thiz._updateGroupInfoList(res.group_info_list);
    			}catch(err){
    				console.log("err: ", message);
	    			thiz.getFunction("exception")(res, err);
    			}
    		} break;
    		
    		/*
			message IMGroupShieldRsp{
				required uint32 user_id = 1;
				required uint32 group_id = 2;
				required uint32 result_code = 3;  //0:successed 1:failed
				optional bytes attach_data = 20;
			}
    		*/
    		case GroupCmdID.CID_GROUP_SHIELD_GROUP_RESPONSE:{
    			try{
    				res = IMGroupShieldRsp.decode(message.slice(5));
	    			thiz.getFunction("group_shield")(res);
    			}catch(err){
	    			thiz.getFunction("exception")(res, err);
    			}
    		} break;

    		case GroupCmdID.CID_GROUP_CREATE_RESPONSE:{
    			try{
    				res = IMGroupCreateRsp.decode(message.slice(5));
	    			thiz.getFunction("group_created")(res);
    			}catch(err){
	    			thiz.getFunction("exception")(res, err);
    			}
    		} break;

    		default:
    			console.log("group: " + header.service + "-" + header.command + "\n");
    		}
    	}

		default:
			//console.log(header.service + "-" + header.command + "\n");
	    }

	};

	this.socket.onerror = function(evt){
		if(onStateChanged != undefined && typeof onStateChanged == 'function'){
			onStateChanged('error', evt);
		}
		console.log("Error occured: " + evt.data + "\n");
	};
}

TTWebClient.prototype.logout = function(){
	this.socket.close();
	this.socket = null;
}

TTWebClient.prototype.getMsgList = function(session_id, msg_id_begin, session_type, msg_cnt){
	var getMsgListReq = new IMGetMsgListReq(this.user_info.user_id, session_type, session_id, msg_id_begin, msg_cnt);
	var header = new  EasyHeader(ServiceID.SID_MSG, MessageCmdID.CID_MSG_LIST_REQUEST);

	this._sendMessage(header, getMsgListReq);
}

TTWebClient.prototype.on = function(event, callback){
	if(callback == undefined || typeof callback != 'function'){
		concole.log("callback is not a function");
	}

    this.callbacks[event] = callback;
    return this;
}

TTWebClient.prototype.login = function(user_name, password){
	var loginReq= new IMLoginReq(user_name, md5(password), UserStatType.USER_STATUS_ONLINE, ClientType.CLIENT_TYPE_WINDOWS, "win_10086");
	var header = new EasyHeader(ServiceID.SID_LOGIN, LoginCmdID.CID_LOGIN_REQ_USERLOGIN);

	this._sendMessage(header, loginReq);
}

TTWebClient.prototype.generateJsonMsg = function(message_type, messageData){
	var msg = new this._message(message_type, messageData);
	return JSON.stringify(msg);
}

/*
IMGroupShieldReq{
	//cmd id:			0x0409
	required uint32 user_id = 1;
	required uint32 group_id = 2;
	required uint32 shield_status = 3;  0 屏蔽 1 不屏蔽
	optional bytes attach_data = 20;
}
*/
TTWebClient.prototype.updateGroupShieldStatus = function(group_id, shield_status){
	var groupShieldReq = new IMGroupShieldReq(this.user_info.user_id, group_id, shield_status);
	var header = new EasyHeader(ServiceID.SID_GROUP, GroupCmdID.CID_GROUP_SHIELD_GROUP_REQUEST);
	this._sendMessage(header, groupShieldReq);
}

TTWebClient.prototype.createGroup = function(group_name, group_avatar, member_id_list){
	var groupCreateReq = new IMGroupCreateReq(this.user_info.user_id, GroupType.GROUP_TYPE_TMP, group_name, group_avatar, member_id_list);
	var header = new EasyHeader(ServiceID.SID_GROUP, GroupCmdID.CID_GROUP_CREATE_REQUEST);
	this._sendMessage(header, groupCreateReq);
}

TTWebClient.prototype.removeSession = function(session_type, session_id){
	var removeSessionReq = new IMRemoveSessionReq(this.user_info.user_id, session_type, session_id);
	var header = new EasyHeader(ServiceID.SID_BUDDY_LIST, BuddyListCmdID.CID_BUDDY_LIST_REMOVE_SESSION_REQ);
	this._sendMessage(header, removeSessionReq);
}

TTWebClient.prototype.sendMsgReadAck = function(session_id, msg_id, session_type){
	var msgDataReadAck = new IMMsgDataReadAck(this.user_info.user_id, session_id, msg_id, session_type);
	var header = new EasyHeader(ServiceID.SID_MSG, MessageCmdID.CID_MSG_READ_ACK);
	this._sendMessage(header, msgDataReadAck);
}

/*
如果该群组的version小于获取到的群组version，则调用回调函数更新该群组信息
GroupInfo{
	required uint32 group_id = 1;
	required uint32 version = 2;
	required string group_name = 3;
	required string group_avatar = 4;
	required uint32 group_creator_id = 5;
	required GroupType group_type = 6;
	required uint32 shield_status = 7;		//1: shield  0: not shield 
	repeated uint32 group_member_list = 8;
}
*/
TTWebClient.prototype._updateGroupInfoList = function(group_info_list){
	for(var i = 0; i < group_info_list.length; i++){
		var temp_group_info = group_info_list[i];
		if(this._myGroupDic[temp_group_info.group_id] == undefined){
			this._myGroupDic[temp_group_info.group_id] = temp_group_info;
		}else if(this._myGroupDic[temp_group_info.group_id].version < temp_group_info.version){
			this._myGroupDic[temp_group_info.group_id] = temp_group_info;
		}else{
			//local group info is up-to-date, do nothing.
			continue;
		}
	}

	var all_group_info_list = new Array();
	for(temp_group_id in this._myGroupDic){
		all_group_info_list.push(this._myGroupDic[temp_group_id]);
	}

	this.getFunction("group_info_list")(all_group_info_list);
}

TTWebClient.prototype._getUnreadMsgCntReq = function(){
	var unreadMsgCntReq= new IMUnreadMsgCntReq(this.user_info.user_id);
	var header = new EasyHeader(ServiceID.SID_MSG, MessageCmdID.CID_MSG_UNREAD_CNT_REQUEST);
	this._sendMessage(header, unreadMsgCntReq);
}

TTWebClient.prototype.getUnreadMessageCount = TTWebClient.prototype._getUnreadMsgCntReq;

TTWebClient.prototype._updateSessionStatus = function(session_list){
	var group_version_list = new Array();
	for(var i = 0; i < session_list.length; i++){
		var temp_session = session_list[i];
		//TODO:compare updatedTime with GlobalUpdateTime, if updatedTime is bigger, update group info.
		if(temp_session.session_type == SessionType.SESSION_TYPE_GROUP){
			var group_version_info = new Object();
			group_version_info["group_id"] = temp_session.session_id;
			group_version_info["version"] = 0;
			group_version_list.push(group_version_info);
		}
	}
	this._getGroupInfoListReq(group_version_list);
}

TTWebClient.prototype._getGroupInfoListReq = function(group_version_list){
	var allGroupInfoListReq = new IMGroupInfoListReq(this.user_info.user_id, group_version_list);
	var header = new EasyHeader(ServiceID.SID_GROUP, 0x0403);
	this._sendMessage(header, allGroupInfoListReq);
}

TTWebClient.prototype.getFunction = function($name) /*:Function*/{
	if(this.callbacks[$name] == undefined || typeof this.callbacks[$name] != 'function'){
		return function(){ console.log("function", $name, "not exists!"); };
	}
	return this.callbacks[$name];
}

TTWebClient.prototype._message = function(message_type, messageData){
	this.message_type = message_type;
	this.messageData = messageData;
}

TTWebClient.prototype._sendMessage = function(header, message){
	if (this.socket.readyState == WebSocket.OPEN) {
        this.socket.send(this._beforeSend(header, message));
    } else {
    	console.log("Network Error!");
    }
}

TTWebClient.prototype._beforeSend = function(header, message){
	var headerBuf = new Uint8Array(header.toBuffer());
	var messageBuf = new Int8Array(message.toArrayBuffer());
	var data = new Int8Array(headerBuf.byteLength + messageBuf.byteLength);
	data.set(headerBuf);
	data.set(messageBuf, headerBuf.length);
	return data.buffer;
}

TTWebClient.prototype._allGroupInfoListRequest = function(group_version_list){
	var allGroupInfoListReq = new IMGroupInfoListReq(this.user_info.user_id, group_version_list);
	var header = new EasyHeader(ServiceID.SID_GROUP, 0x0403);
	this._sendMessage(header, allGroupInfoListReq);
}

TTWebClient.prototype._departmentRequest = function(){
	var departmentReq = new IMDepartmentReq(this.user_info.user_id, 0);
	var header = new EasyHeader(ServiceID.SID_BUDDY_LIST, 0x0210);
	this._sendMessage(header, departmentReq);
}

TTWebClient.prototype._alluserRequest = function(){
	var alluserReq = new IMAllUserReq(this.user_info.user_id, 0);
	var header = new EasyHeader(ServiceID.SID_BUDDY_LIST, 0x0208);
	this._sendMessage(header, alluserReq);
}

TTWebClient.prototype._normalGroupListRequest = function(){
	var normalGroupListReq = new IMNormalGroupListReq(this.user_info.user_id);
	var header = new EasyHeader(ServiceID.SID_GROUP, 0x0401);
	this._sendMessage(header, normalGroupListReq);
}

TTWebClient.prototype._getAllUserContactSession = function(){
	var recentContactSessionReq = new IMRecentContactSessionReq(this.user_info.user_id, 0);
	var header = new EasyHeader(ServiceID.SID_BUDDY_LIST, 0x0201);
	this._sendMessage(header, recentContactSessionReq);
}

TTWebClient.prototype.getAllUserContactSession = TTWebClient.prototype._getAllUserContactSession;

/*@target_session_id: 点对点消息时即对方的user_id*/
/*@message: text string*/
/*@message_type: MSG_TYPE_SINGLE_TEXT = 0x01[default] MSG_TYPE_GROUP_TEXT = 0x11;*/
TTWebClient.prototype.sendMessage = function(target_session_id, message, message_type){
	/*
	required uint32 from_user_id = 1;				//消息发送方
	required uint32 to_session_id = 2;				//消息接受方
	required uint32 msg_id = 3;
	required uint32 create_time = 4; 
	required IM.BaseDefine.MsgType msg_type = 5;
	required bytes msg_data = 6;
	*/
	message_type = (message_type == undefined ? 0x01 : message_type);
	console.log('sending type: ', message_type);

	/**TODO:
	1. msg_id 是否需要手动增长?
	2. create_time 登录成功后需要和服务器同步时间 CID_MSG_TIME_REQUEST
	*/
	var msgData = new IMMsgData(this.user_info.user_id, target_session_id, 1, 0, message_type, ByteBuffer.fromUTF8(message).toBuffer());
	var header = new EasyHeader(ServiceID.SID_MSG, 0x0301);
	this._sendMessage(header, msgData);
}
