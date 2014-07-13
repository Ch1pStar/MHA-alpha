
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


// Create a World
var world = new p2.World({
    doProfiling:true,                    // Enable stats
    gravity : [0,0],                   // Set gravity to -10 in y direction
    broadphase : new p2.SAPBroadphase(), // Broadphase algorithm
});


var server = http.createServer(app);

server.listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});



var players = Array();
var playersIndex = -1;
var clients = Array();

// To get the trajectories of the bodies,
// we must step the world forward in time.
// This is done using a fixed time step size.
var timeStep = 1 / 60; // seconds


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
			console.log("RECIEVED ID: ", parsedData.currPlayerId);
  			updatePlayerPosition(ws, parsedData.currPlayerId);
  			break;
		case "purgePlayers":
			purgePlayers(ws);
  			break;
  		default:
  			console.log('Unknown action\n');

  	}
  	//console.log(players);


  });

  ws.on('close', function() {
  	deleteId = ws.id;
	removePlayer(deleteId);
  });

});



	// The "Game loop". Could be replaced by, for example, requestAnimationFrame.
	setInterval(function(){

	    // The step method moves the bodies forward in time.
	    world.step(timeStep);

	    // Print the circle position to console.
	    // Could be replaced by a render call.
	    
	    if(typeof players!= 'undefined'){
		    if(typeof players[0]!= 'undefined'){
		    	var currPlayer = players[0];
			    // console.log("Circle x position: " + currPlayer.body.position[0]);
			    console.log("Circle y position: " + currPlayer.body.position[1]);
			    sendPlayersPositions(currPlayer);
			    // console.log(currPlayer.body.mass);
		    }
	    }

	}, 1000 * timeStep);


//////////////////////////////////////

Player = function(sprite){
	this.body =  new p2.Body({ position: [sprite.x, sprite.y ], mass: sprite.mass });
	this.force = [0,0];
}

Player.prototype = {
	thrust: function(speed){
     	var magnitude = this.pxmi(speed);
        var angle = this.body.angle + Math.PI / 2;
		

		// console.log(magnitude,this.body.angle,angle);
		// process.exit(1);


        this.force[0] += (magnitude * Math.cos(angle));
        this.force[1] += (magnitude * Math.sin(angle));

        this.body.force[0] = this.force[0]
        this.body.force[1] = this.force[1];

        console.log("Movement stuff: ", this.body.force[0], this.body.force[1]);

	},


	reverse: function (speed) {

        var magnitude = this.pxmi(speed);
        var angle = this.body.angle + Math.PI / 2;
        

        this.force[0] -= (magnitude * Math.cos(angle));
        this.force[1] -= (magnitude * Math.sin(angle));

        this.body.force[0] = this.force[0]
        this.body.force[1] = this.force[1];

    },

	pxmi: function (v) {
        return v * -0.05;
    }
};



function TransferObject(obj) {
	this.x = obj.body.position[0];
	this.y = obj.body.position[1];
	this.angle = obj.body.angle;
	this.id = obj.id;
}

function addPlayer(ws, sprite){
	console.log('newPlayerConnected');
	obj = new Player(sprite)
	obj.id = playersIndex;

	var shape = new p2.Rectangle();
	obj.body.addShape(shape);
	world.addBody(obj.body);

	console.log(new TransferObject(obj));
	players.push(obj);
	data = {
		action: 'newPlayerConnected',
		playerData: new TransferObject(obj)
	}

	for (var i = 0; i < wss.clients.length; i++) {
		// console.log("Some ids: ", i, obj.id, playersIndex);
		if(i!=playersIndex)
			wss.clients[i].send(JSON.stringify(data));
	}

	data.action = 'newPlayerCreated';
	//console.log(JSON.stringify(data));
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
	// console.log("PLAYERS: ",player, playerId, players);
	// player.thrust(400);
	player.reverse(400);
	

	// data = {
	// 	action: 'updatePlayerPositionViewers',
	// 	player: new TransferObject(player),
	// 	time: new Date().getTime()
	// }


	// for (var i = 0; i < wss.clients.length; i++) {

	// 	if(i!=playerId)
	// 		wss.clients[i].send(JSON.stringify(data));
	// };

	// data.action = 'updatePlayerPosition';
	// ws.send(JSON.stringify(data));


}


function sendPlayersPositions (player) {
	var playerId = player.id;
	 data = {
		action: 'updatePlayerPositionViewers',
		player: new TransferObject(player),
		time: new Date().getTime()
	}

	data.action = 'updatePlayerPosition';

	for (var i = 0; i < wss.clients.length; i++) {

		// if(i!=playerId)
			wss.clients[i].send(JSON.stringify(data));
	};

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