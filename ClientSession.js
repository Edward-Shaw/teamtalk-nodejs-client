
function ClientSession(socket, tt){
	this.socket = socket;
	this.tt = tt;
}

ClientSession.prototype.getTeamTalk = function(){
	return this.tt;
}

ClientSession.prototype.getSocket = function(){
	return this.socket;
}

ClientSession.prototype.close = function(){
	this.tt.close();
	delete this.tt;
	this.socket.close();
}

module.exports = ClientSession;