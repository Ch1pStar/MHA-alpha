
var connection;

var ship;
var ship2;
var players = Array();
var currPlayer;
var map;
var layer;
var cursors;
var game;
function closeConn () {
	connection.close();
}

function openConn () {
 	connection = new WebSocket('ws://localhost:3000/server-socket');

	 // When the connection is open, send some data to the server
	connection.onopen = function () {
		game = new Phaser.Game(800, 600, Phaser.AUTO, 'phaser-example', { preload: preload, create: create, update: update, render: render });
	};

	// Log errors
	connection.onerror = function (error) {
	  console.log('WebSocket Error ' + error);
	};

	connection.onclose = function (){
		currPlayer.destroy();
	}

	// Log messages from the server
	connection.onmessage = function (e) {
	  	parsedData = JSON.parse(e.data);
	  
		switch(parsedData.action){
			case "newPlayerCreated":
				console.log('newPlayerCreated\n');
				addPlayerToGame(parsedData.playerData);
				break;
			case "newPlayerConnected":
				console.log('newPlayerConnected\n');
				addNewlyConnectedPlayer(parsedData.playerData);
				break;
			case "addExistingPlayers":
				console.log('addExistingPlayers\n');
				addExistingPlayers(parsedData.players);
				break;
			case "updatePlayerPosition":
				console.log('updatePlayerPosition\n');
				updatePlayerPosition(parsedData.player);
				break;
			case "updatePlayerPositionViewers":
				console.log('updatePlayerPosition\n');
				updatePlayerPositionViewers(parsedData.player);
				break;
			case "purgePlayers":
				console.log('purgePlayers\n');
				purgePlayersServerResponse();
				break;
			case "removePlayer":
				console.log('removePlayer\n');
				removePlayer(parsedData.playerId);
				break;
			default:
				console.log('Unknown action\n');
	  	}
	  
	  // if(e.data=='move_left'){
	  // 	ship.body.rotateLeft(100);
	  // 	ship2.body.rotateLeft(100);
	  // }
	  // else if(e.data=='move_right'){
	  // 	ship.body.rotateRight(100);
	  // 	ship2.body.rotateRight(100);
	  // }
	  // else if(e.data=='move_forward'){
	  // 	ship.body.thrust(400);
	  // 	ship2.body.thrust(400);
	  // }
	  // else if(e.data=='reverse'){
	  // 	ship.body.reverse(400);
	  // 	ship2.body.reverse(400);
	  // }
	
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
    addPlayerServer(Math.floor((Math.random() * 200) + 100), Math.floor((Math.random() * 200) + 100)); 


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

function addPlayerServer(x, y){
    data = {
    	action: 'createPlayer',
    	sprite: new RequestNewPlayer(x,y,0,0)
    }
	connection.send(JSON.stringify(data));
}

function removePlayer(id){
	console.log(id, "Player to remove: ", players[id]);
	players[id].destroy();
	players.splice(id,1);
}

function addPlayerToGame(data) {
	obj = game.add.sprite(data.x, data.y, 'ship');
	obj.id = data.id;
	console.log(obj);
    game.physics.p2.enable(obj);
    game.camera.follow(obj);
	obj.body.setZeroRotation();
    currPlayer = obj;
	return currPlayer;
}

function addNewlyConnectedPlayer(data){
	obj = game.add.sprite(data.x, data.y, 'ship');
	obj.id = data.id;
	game.physics.p2.enable(obj);
    game.camera.follow(obj);
    obj.body.setZeroRotation();
	players[obj.id-1] = obj;
	return players[obj.id];
}

function addExistingPlayers (playersData){
	this.players = Array();
	console.log(playersData)
	for (var i = 0; i <= playersData.length - 1; i++) {
		// console.log(players[i]);
		var data = playersData[i];
		obj = game.add.sprite(data.x, data.y, 'ship');
		obj.id = data.id;
		 console.log("adding player...");
		 console.log(obj);
		this.players.push(obj)
	    game.physics.p2.enable(obj);
	    game.camera.follow(obj);
	};
}

function PhaserSpriteDataTransferObject(sprite){
	this.x = sprite.x;
	this.y = sprite.y;
	this.z = sprite.z;
	this.angle = sprite.angle;
}

function RequestNewPlayer(x,y,z,angle){	
	this.x = x;
	this.y = y;
	this.z = z;
	this.angle = angle;
}

function updatePlayerPosition(data){
	currPlayer.x = data.x;
	currPlayer.y = data.y;
	console.log("Curr player: ", currPlayer, data);
	currPlayer.body.thrust(400);
}

function updatePlayerPositionViewers (playerId) {
	
	player = players[playerId.id-1];
	
	player.x = playerId.x;
	player.y = playerId.y;
}

function purgePlayers(){
	connection.send(JSON.stringify({action:"purgePlayers"}))
}

function purgePlayersServerResponse() {
	for (var i = 0; i < players.length; i++) {
		players[i].destroy();
	};
	players = Array();
}

function update() {

    if (cursors.left.isDown)
    {
    	// connection.send('left');
       // ship.body.rotateLeft(100);
    }
    else if (cursors.right.isDown)
    {
    	// connection.send('right');
        // ship.body.rotateRight(100);
    }
    else
    {
    	// connection.send('stop');
        //ship.body.setZeroRotation();
        //ship2.body.setZeroRotation();
    }

    if (cursors.up.isDown)
    {
    	connection.send(JSON.stringify({action:'movePlayer', currPlayerId: currPlayer.id}))
    	// connection.send('forward');
        // ship.body.thrust(400);
    }
    else if (cursors.down.isDown)
    {
    	// connection.send('reverse');
        // ship.body.reverse(400);
    }

}

function render() {

}

$(document).ready(function(){

	openConn();


});