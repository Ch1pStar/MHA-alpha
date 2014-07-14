
var connection;


var players = [];
var currPlayer;
var map;
var layer;
var cursors;
var game;
var maxLag = 0;
var maxYDiff = 0;
var token;

var host = "ws://"+window.location.hostname+":3000/server-socket";

var movementData = {
    	action: "move",
}

Player = function(data){
	console.log("Player data...",data);
	this.obj = game.add.sprite(data.x, data.y, 'ship');
	this.id = data.id;
	
	// console.log(data.id);
	// console.log(this.obj);
   
    game.physics.p2.enable(this.obj);
	// this.obj.body.setZeroRotation();
};

Player.prototype.thrust = function(speed){
		this.obj.body.thrust(speed);
};

Player.prototype.updatePosition = function(data){
	// console.log("Got updated data for player: " + this.id);
	// console.log("I've got this data: ", this.obj.body.x, this.obj.body.y);
	// console.log("Reel Data: ", data);

	this.obj.body.x = data.x;	
	this.obj.body.y = data.y;	
	this.obj.body.angle = data.angle;	
}

function addPlayerServer(){
    data = {
    	action: 'createPlayer'
    }
	connection.send(JSON.stringify(data));
}

function loadExistingPlayers(playersData) {
	for (var i = 0; i <= playersData.length - 1; i++) {
		var data = playersData[i];
		var player = new Player(data);
		players.push(player);
	};
}


function closeConn () {
	connection.close();
}

function getPlayerById(id) {
	return players.filter(function(e){
		return e.id == id;
	});
}

function openConn () {
 	connection = new WebSocket(host);

	 // When the connection is open, send some data to the server
	connection.onopen = function () {
		game = new Phaser.Game(800, 600, Phaser.AUTO, 'phaser-example', { preload: preload, create: create, update: update, render: render });
	};

	// Log errors
	connection.onerror = function (error) {
	  console.log('WebSocket Error ' + error);
	};

	connection.onclose = function (){
	}

	// Log messages from the server
	connection.onmessage = function (e) {
	  	parsedData = JSON.parse(e.data);
	  
		switch(parsedData.action){
			case "playerAdded":
				console.log('playerAdded\n');
				currPlayer = new Player(parsedData.playerData);
				token = parsedData.token;
				movementData.token = token;
    			game.camera.follow(currPlayer.obj);
				break;
			case "newPlayerConnected":
				console.log('newPlayerConnected');
				if(parsedData.playerData.id != currPlayer.id){
					console.log("...yup i was right\n");
					var player = new Player(parsedData.playerData);
					players.push(player);
				}else{
					console.log("nvm...it was just me\n");
				}
				break;
			case "loadExistingPlayers":
				console.log('loadExistingPlayers\n');
				loadExistingPlayers(parsedData.players);
				break;
			case "updatePlayers":
				console.log('updatePlayers\n');
				for (var i = 0; i < parsedData.players.length; i++) {
					var pData = parsedData.players[i];
					if(pData.id == currPlayer.id){
						currPlayer.updatePosition(pData);
					}else{
						var p = getPlayerById(pData.id);
						p = p[0];
						p.updatePosition(pData);					
					}
				};

				/*
				if(parsedData.player.id == currPlayer.id){
					currPlayer.updatePosition(parsedData.player, parsedData.time);
				}else{
					getPlayerById(parsedData.player.id).updatePosition(parsedData.player, parsedData.time);
				}*/
				break;
			case "removePlayer":
				console.log('removePlayer\n');
				console.log(parsedData);
				if(parsedData.playerId == currPlayer.id){
					currPlayer.obj.destroy();
				}else{
					var dp = getPlayerById(parsedData.playerId);
					dp = dp[0];
					dp.obj.destroy();
					players.splice(players.indexOf(dp),1);
				}
				break;
			/*
			case "purgePlayers":
				console.log('purgePlayers\n');
				purgePlayersServerResponse();
				break;
			*/
			default:
				console.log('Unknown action\n');
	  	}
	
	};

}

function preload() {

    game.load.tilemap('map', 'assets/tilemaps/maps/collision_test.json', null, Phaser.Tilemap.TILED_JSON);
    game.load.image('ground_1x1', 'assets/tilemaps/tiles/ground_1x1.png');
    game.load.image('walls_1x2', 'assets/tilemaps/tiles/walls_1x2.png');
    game.load.image('tiles2', 'assets/tilemaps/tiles/tiles2.png');
    game.load.image('ship', 'assets/sprites/thrust_ship2.png');

}

function create() {

    game.physics.startSystem(Phaser.Physics.P2JS);

    game.stage.backgroundColor = '#2d2d2d';

    map = game.add.tilemap('map');

    map.addTilesetImage('ground_1x1');
    map.addTilesetImage('walls_1x2');
    map.addTilesetImage('tiles2');
    
    layer = map.createLayer('Tile Layer 1');

    layer.resizeWorld();

    //  Set the tiles for collision.
    //  Do this BEFORE generating the p2 bodies below.
    map.setCollisionBetween(1, 12);

    //  Convert the tilemap layer into bodies. Only tiles that collide (see above) are created.
    //  This call returns an array of body objects which you can perform addition actions on if
    //  required. There is also a parameter to control optimising the map build.
    game.physics.p2.convertTilemap(map, layer);


    connection.send(JSON.stringify({action:'ping'})); // Send the message 'Ping' to the server
    


    addPlayerServer(); 
    

    // addPlayerServer(Math.floor((Math.random() * 200) + 100), Math.floor((Math.random() * 200) + 100)); 


    //  By default the ship will collide with the World bounds,
    //  however because you have changed the size of the world (via layer.resizeWorld) to match the tilemap
    //  you need to rebuild the physics world boundary as well. The following
    //  line does that. The first 4 parameters control if you need a boundary on the left, right, top and bottom of your world.
    //  The final parameter (false) controls if the boundary should use its own collision group or not. In this case we don't require
    //  that, so it's set to false. But if you had custom collision groups set-up then you would need this set to true.
    game.physics.p2.setBoundsToWorld(true, true, true, true, false);

    //  Even after the world boundary is set-up you can still toggle if the ship collides or not with this:
    // ship.body.collideWorldBounds = false;

    cursors = game.input.keyboard.createCursorKeys();


}



function update() {


    try{
	    if (cursors.left.isDown)
	    {

	        movementData.direction = "left";
	       // currPlayer.obj.body.rotateLeft(100);
	    }
	    else if (cursors.right.isDown)
	    {

	      movementData.direction = "right";
	      // currPlayer.obj.body.rotateRight(100);
	    }
	    else
	    {
	    
	        movementData.direction = "stop";
	       // currPlayer.obj.body.setZeroRotation();
	    }

	    if (cursors.up.isDown){
	        // currPlayer.obj.body.thrust(400);
	        movementData.direction = "forward";
	    }
	    else if (cursors.down.isDown)
	    {
	    
	        movementData.direction = "reverse";
	        // currPlayer.obj.body.reverse(400);
	    }

	    connection.send(JSON.stringify(movementData));
    	
    	// console.log(currPlayer.obj.body.force.destination);
    }catch(e){
    	console.log(e.message);
    }

}

function render() {

}

$(document).ready(function(){

	openConn();


});