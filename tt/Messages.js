
var path = require("path"),
    pb = require("protobufjs");


var builders = new Object();
var protos = ["IM.Group", "IM.Other", "IM.Buddy", "IM.Login", "IM.Server", "IM.File", "IM.Message", "IM.SwitchService", "CAP"];
for(var p in protos){
	builders[protos[p]] = pb.loadProtoFile(path.join(__dirname, "pb", protos[p] + ".proto"));
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

module.exports.getDefine = getDefine;
