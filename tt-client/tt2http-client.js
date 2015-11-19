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

<<<<<<< HEAD
//construct function for TTWebClient.
function TTWebClient(ipv4, port){
	this.ipv4 = ipv4;
	this.port = port;
	this.socket = new WebSocket("ws://" + ipv4 + ":" + port);
	//this.socket.binaryType = "arraybuffer";
	this.socket.onopen = function(evt){this._onopen(evt)};
	this.socket.onclose = function(evt){this._onclose(evt)};
	this.socket.onmessage = function(message){this._onmessage(message)};
	this.socket.onerror = function(evt){this._onerror(evt)};
}

TTWebClient.prototype.login = function(userName, password){
	this._sendMessage(userName + password);
}

TTWebClient.prototype._sendMessage = function(message){
	if (this.socket.readyState == WebSocket.OPEN) {
        this.socket.send(this._beforeSend(message));
    } else {
    	alert("Network Error!");
    }
}

TTWebClient.prototype._beforeSend = function(message){
	return message;
}

TTWebClient.prototype._onopen = function(evt){
	console.log("Connected\n");
}

TTWebClient.prototype._onclose = function(evt){
	console.log("Disconnected\n");
}

//TODO:判断message类型并调用相应的onXXXMessageReceived()方法进行处理
TTWebClient.prototype._onmessage = function(message){
	try {
        // Decode the Message
        console.log("Received data: " + message.data);
    } catch (err) {
        console.log("Error occured: " + err + "\n");
    }
}

TTWebClient.prototype._onerror = function(evt){
	console.log("Error occured: " + evt.data + "\n");
}


