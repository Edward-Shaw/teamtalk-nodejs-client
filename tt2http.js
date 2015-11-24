/*
// The real TeamTalk client.
var TeamTalk = require('./tt/tt.js');

var tt = new TeamTalk("172.18.0.236", 8000);
tt.connect();

var logedin = function(){
  console.log('logedin');
  tt.list('buddies');
  tt.list('departments');
  tt.list('groups');
}

tt.login('test', 'pl,okm123');

tt.on('message', function(message){
  if(message.service == 0x001){         //login
    if(message.command == 0x104){ 
      logedin();
    }
  }else if(message.service == 0x002){   ///buddy
    if(message.command == 0x209){ ///user list
      console.log(message);
    }else if(message.command == 0x211){ ///departments
      console.log(message);
    }
  }else if(message.service == 0x004){   ///group
    if(message.command == 0x402){ ///normal list
      console.log(message);
    }
  }
});

tt.on('closed', function(){});
*/

var http = require("http");
var server = http.createServer(function(req, res) {
  res.writeHead(500, {"Content-Type": "text/html"});
  res.end("NEVER DO THIS");
});
server.listen(8081);
server.on("listening", function() {
    console.log("Server started");
});
server.on("error", function(err) {
    console.log("Failed to start server:", err);
    process.exit(1);
});

//Web Socket adapter to receive message from web pages.
var ws = require("ws");
var wss = new ws.Server({server: server});
wss.on("connection", function(socket) {
  console.log("New WebSocket connection");
  socket.on("close", function() {
    console.log("WebSocket disconnected");
  });
  socket.on("message", function(data, flags) {
    if (flags.binary) {
      try {
          socket.send(data);
          console.log("Sent: " + data);
      } catch (err) {
          console.log("Processing failed:", err);
      }
    } else {
      console.log("Not binary data");
      socket.send("HEY");
    }
  });
});