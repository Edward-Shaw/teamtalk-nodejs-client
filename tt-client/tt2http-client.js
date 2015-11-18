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

var TeamTalk = {
	address: "172.18.0.236",
	port: 8000,
	socket: null,
	createNew: function(var ipAddress, var port){
		var tt = {};
		TeamTalk.address = ipAddress;
		TeamTalk.port = port;

		tt.connect = function(){
			TeamTalk.socket	= new WebSocket("ws://" + TeamTalk.address + ":" + TeamTalk.port);
			TeamTalk.onmessage = onMessageReceived;
		};

		tt.login = function(var userName, var password){
			TeamTalk.socket.send(userName + password);
		};

		tt.onMessageReceived = function(evt){
			return evt.data;
		};

		return tt;
	}
}


//connect to TT2HTTP server.
var socket = new WebSocket("ws://172.18.0.236:8080/ws");

//communicate with binary data.
socket.binaryType = "arraybuffer";

//login to TT
//TODO:add login arguments
function login(var userName, var password){
	message = userName + password;
	send(message);
}

//add message header before send
function beforeSend(var message){
	//TODO:add message header
	return message;
}

function send(var message) {
    if (socket.readyState == WebSocket.OPEN) {
        socket.send(beforeSend(message));
    } else {
    	alert("Network Error!");
    }
}

socket.onopen = function() {
    log.value += "Connected\n";
};

socket.onclose = function() {
    log.value += "Disconnected\n";
};

//TODO:判断message类型并调用相应的onXXXMessageReceived()方法进行处理
socket.onmessage = function(evt) {
    try {
        // Decode the Message
        var msg = Message.decode(evt.data);
        log.value += "Received: "+msg.text+"\n";
    } catch (err) {
        log.value += "Error: "+err+"\n";
    }
};
