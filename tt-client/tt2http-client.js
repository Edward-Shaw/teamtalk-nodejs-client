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

//construct function for TTWebClient.
function TTWebClient(ipv4, port, onMessageReceived){
	this.ipv4 = ipv4;
	this.port = port;
	this.socket = new WebSocket("ws://" + ipv4 + ":" + port);
	this.socket.binaryType = "arraybuffer";

	this.socket.onopen = function(evt){
		console.log("Connected\n");
	};

	this.socket.onclose = function(evt){
		console.log("Disconnected\n");
	};

	this.socket.onmessage = function(message){
		try {
        	// Decode the Message
	        console.log("Received data: " + message.data);
	    } catch (err) {
	        console.log("Error occured: " + err + "\n");
	    }

	    onMessageReceived(message.data);
	};

	this.socket.onerror = function(evt){
		console.log("Error occured: " + evt.data + "\n");
	};
}

TTWebClient.prototype.login = function(userName, password){
	this.sendMessage(userName + password);
}

TTWebClient.prototype.generateJsonMsg = function(messageType, messageData){
	var msg = new this._message(messageType, messageData);
	return JSON.stringify(msg);
}

TTWebClient.prototype._message = function(messageType, messageData){
	this.messageType = messageType;
	this.messageData = messageData;
}

TTWebClient.prototype.sendMessage = function(message){
	if (this.socket.readyState == WebSocket.OPEN) {
        this.socket.send(this._beforeSend(message));
    } else {
    	alert("Network Error!");
    }
}

TTWebClient.prototype._beforeSend = function(message){
	return message;
}



