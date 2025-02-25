var express = require("express");

var app = express();
var server = app.listen(3000);

app.use(express.static('public'));

var socket = require("socket.io");

var io = socket(server);


var PlayerCount = 0;

io.sockets.on("connection", newConnection);
function newConnection(socket){
    if(PlayerCount == 0){
        io.emit("Connected", "white");
        PlayerCount++;
    }
    if(PlayerCount == 1){
        io.emit("Connected", "black");
        PlayerCount++;
    }
    else{
        io.emit("NotConnected");
    }
    
}