
var TeamTalk = require('./tt/tt.js');

var tt = new TeamTalk("172.18.0.236", 8000);
tt.connect();
tt.login('test', 'pl,okm123');

tt.on('message', function(message){
  console.log(message);
});