
/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var user = require('./routes/user');
var ss = require('./routes/server-socket');
var http = require('http');
var path = require('path');
var p2 = require('p2');
var WebSocketServer = require('ws').Server;

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', routes.index);
app.get('/server-socket', ss.index);
app.get('/users', user.list);



var server = http.createServer(app);

server.listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});



var players = Array();
var playersIndex = -1;
var clients = Array();


var wss = new WebSocketServer({server: server});
wss.on('connection', function(ws) {

	ws.id = playersIndex++
	clients.push(ws);

  console.log('started client interval');

	console.log("length: ", clients.length);

  ws.on('message', function(e){
  	console.log(e);

  	var parsedData = JSON.parse(e);

  	console.log(parsedData.action);

  	switch(parsedData.action){
  		case "ping":
  			console.log('Pong')
			sendExistingPlayers(ws);
  			break;
  		case "createPlayer":
  			addPlayer(ws, parsedData.sprite);
  			break;
		case "movePlayer":
  			updatePlayerPosition(ws, parsedData.currPlayerId);
  			break;
		case "purgePlayers":
			purgePlayers(ws);
  			break;
  		default:
  			console.log('Unknown action\n');

  	}
  	console.log(players);


  });
  ws.on('close', function() {
  	deleteId = ws.id;
	removePlayer(deleteId);
  });

});


function Player(sprite){
	tmp = sprite;
	this.x = tmp.x;
	this.y = tmp.y;
	this.z = tmp.z;
}

function addPlayer(ws, sprite){
	console.log('newPlayerConnected');
	obj = new Player(sprite);
	obj.id = playersIndex;
	players.push(obj);
	data = {
		action: 'newPlayerConnected',
		playerData: obj
	}

	for (var i = 0; i < wss.clients.length; i++) {
		// console.log("Some ids: ", i, obj.id, playersIndex);
		if(i!=playersIndex)
			wss.clients[i].send(JSON.stringify(data));
	}

	data.action = 'newPlayerCreated';
	console.log(JSON.stringify(data));
	ws.send(JSON.stringify(data));
}

function sendExistingPlayers(ws){

	data = {
		action: 'addExistingPlayers',
		players: players
	}
	ws.send(JSON.stringify(data));
	// for (var i = players.length - 1; i >= 0; i--) {
	// 	data = {
	// 		action: 'newPlayerCreated',
	// 		playerData: players[i]
	// 	}
	// 	ws.send(JSON.stringify(data));
	// };
}


function updatePlayerPosition(ws, playerId) {
	player = players[playerId];
	console.log(player);
	player.x+=1;
	data = {
		action: 'updatePlayerPositionViewers',
		player: player
	}


	for (var i = 0; i < wss.clients.length; i++) {

		if(i!=playerId)
			wss.clients[i].send(JSON.stringify(data));
	};

	data.action = 'updatePlayerPosition';
	ws.send(JSON.stringify(data));

}

function purgePlayers(ws) {
	players = Array();
	ws.send(JSON.stringify({
		action:'purgePlayers'
	}));
}


function removePlayer(id) {

	players.splice(id,1);
  	clients.splice(id,1);
  	playersIndex--;

  	console.log("some len: ", clients.length);
	for(var i = 0; i<wss.clients.length; i++){

		wss.clients[i].send(JSON.stringify({
			action: "removePlayer",
			playerId: id
		}));
	}
}