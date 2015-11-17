


var crypto = require('crypto');
var path = require("path"),
    pb = require("protobufjs"),
	net = require("net");


//Initialize from .proto file
var builder = pb.loadProtoFile(path.join(__dirname, "", "IM.Login.proto")),
    IMLoginReq = builder.build("IM.Login.IMLoginReq"),
    IMLoginRes = builder.build("IM.Login.IMLoginRes"),
	UserStatType = builder.build("IM.BaseDefine.UserStatType"),
	UserInfo = builder.build("IM.BaseDefine.UserInfo"),
	ResultType = builder.build("IM.BaseDefine.ResultType"),
ClientType = builder.build("IM.BaseDefine.ClientType");

var md5 = crypto.createHash('md5');
md5.update("pl,okm123");

var msg = new IMLoginReq("test", md5.digest('hex'), UserStatType.USER_STATUS_ONLINE, ClientType.CLIENT_TYPE_WINDOWS, "win_10086");

console.log(msg);


var client = new net.Socket();
client.connect(8000, "172.18.0.236", function() {   
 console.log('CONNECTED');    // 建立连接后立即向服务器发送数据，服务器将收到这些数据    
 
 var buf = new Buffer(16 + msg.toBuffer().length);
 buf.fill(0);
 
 buf.writeInt32BE(buf.length);
 buf.writeInt16BE(1, 4);
 buf.writeInt16BE(0, 6);
 buf.writeInt16BE(1, 8);
 buf.writeInt16BE(259, 10);
 buf.writeInt16BE(1, 12);
 buf.writeInt16BE(0, 14);
 
 /*
 CByteStream::WriteInt32(m_pHeaderBuff, m_length);
	CByteStream::WriteUint16(m_pHeaderBuff + 4, m_version);
	CByteStream::WriteUint16(m_pHeaderBuff + 6, m_flag);
	CByteStream::WriteUint16(m_pHeaderBuff + 8, m_moduleId);1
	CByteStream::WriteUint16(m_pHeaderBuff + 10, m_commandId);259
	CByteStream::WriteUint16(m_pHeaderBuff + 12, m_seqNumber);1
	CByteStream::WriteUint16(m_pHeaderBuff + 14, m_reserved);
 */
 
 
 console.log(buf);
 /*UInt32 length = imcore::HEADER_LENGTH + pbBody->ByteSize();
	m_TTPBHeader.setLength(length);
	std::unique_ptr<byte> data(new byte[length]);
	memset(data.get(), 0, length);
	memcpy(data.get(), m_TTPBHeader.getSerializeBuffer(), imcore::HEADER_LENGTH);
	if (!pbBody->SerializeToArray(data.get() + imcore::HEADER_LENGTH, pbBody->ByteSize()))
	{
		LOG__(ERR, _T("pbBody SerializeToArray failed"));
		return;
	}
*/

msg.toBuffer().copy(buf, 16);

	client.write(buf);
});

client.on('data', function(data) {

  var buf = new Buffer(data.length - 16);
  data.copy(buf, 0, 16);

  var res = IMLoginRes.decode(buf);
console.log(res);
client.destroy();});

client.on('close', function() {    
console.log('Connection closed');});

