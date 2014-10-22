
var connection;


var players = [];
var currPlayer;
var map;
var layer;
var walls;
var cursors;
var mouse;
var game;
var maxLag = 0;
var maxYDiff = 0;
var token;
var someTiles;
var serverTiles = [];
var mapUrl = '';
var lastTimeSend = (new Date()).getTime();
var pathLines = [];
var host = "ws://"+window.location.hostname+":3000/server-socket";

var movementData = {
    	action : "move",
}

var cursorDownData = {
	action : "cursor_down"
};

var towers = [];

Player = function(data, isCurrPlayer){
	if(typeof isCurrPlayer === 'undefined')
		isCurrPlayer = false;

	console.log("Player data...",data);
	if(isCurrPlayer){
		this.obj = game.add.sprite(data.x, data.y, 'ptile');
	}else{
		this.obj = game.add.sprite(data.x, data.y, 'atile');
	}
	this.obj.inputEnabled = true;
	this.id = data.id;
	this.health = data.health;

	this.selected = false;
	
	// console.log(data.id);
	// console.log(this.obj);
   
    game.physics.p2.enable(this.obj);
	// this.obj.body.setZeroRotation();
};

Tower = function(data){

	console.log(1231231312312);
	console.log("Tower data... %s",data);
	
	this.obj = game.add.sprite(data.x, data.y, 'tower');
	
	this.obj.inputEnabled = true;
	this.id = data.id;

	this.selected = false;

	this.projectiles = [];
	
	// console.log(data.id);
	// console.log(this.obj);
   
    game.physics.p2.enable(this.obj);
	this.obj.body.static = true;
	// this.obj.body.setZeroRotation();
	

	var tmpLine = game.add.graphics(0,0);  //init rect
	tmpLine.lineStyle(2, 0xFFFFFF, 1); // width, color (0x0000FF), alpha (0 -> 1) // required settings
	tmpLine.beginFill(0xFFFF0B, 0) // color (0xFFFF0B), alpha (0 -> 1) // required settings
	tmpLine.drawCircle(this.obj.body.x, this.obj.body.y, 150); // x, y, radius

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
	this.obj.angle = data.angle;	
	this.obj.body.data.angle = data.p2Angle;

	// this.obj.body.data.force[0] = data.force[0];
	// this.obj.body.data.force[1] = data.force[1];
	// this.obj.body.data.angularVelocity = data.angularVelocity;

	// console.log(data.force);
}

Player.prototype.drawPathToPoint = function(path){
	for(var pathIndex in path){
		var pathItem = path[pathIndex];
		var pathItemX = parseInt(pathItem[0]*map.tileWidth);
		var pathItemY = parseInt(pathItem[1]*map.tileHeight);
		
		var tmpLine = game.add.graphics(0,0);  //init rect
		tmpLine.lineStyle(2, 0xFFFFFF, 1); // width, color (0x0000FF), alpha (0 -> 1) // required settings
		tmpLine.beginFill(0xFFFF0B, 1) // color (0xFFFF0B), alpha (0 -> 1) // required settings
		tmpLine.drawCircle(pathItemX+18.5, pathItemY+18.5, 2); // x, y, radius

		pathLines.push(tmpLine);
		console.log(pathItemX, pathItemY);
	}
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

function loadTowers(towersInfo) {
	for (var i = 0; i <= towersInfo.length - 1; i++) {
		var data = towersInfo[i];
		var tower = new Tower(data);
		towers.push(tower);
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

function getTowerById(id) {
	return towers.filter(function(e){
		return e.id == id;
	});
}

function openConn () {
 	connection = new WebSocket(host);

	 // When the connection is open, send some data to the server
	connection.onopen = function () {

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
			case "init":
				game = new Phaser.Game(($(window).width()-100), 640, Phaser.AUTO, 'phaser-example', { preload: preload, create: create, update: update, render: render, forceSetTimeOut: true });
				Phaser.RequestAnimationFrame(game, true);
				mapUrl = parsedData.mapUrl;
				break;
			case "playerAdded":
				console.log('playerAdded\n');
				currPlayer = new Player(parsedData.playerData, true);
				currPlayer.selected = false;
				token = parsedData.token;
				movementData.token = token;
				cursorDownData.token = token;
    			game.camera.follow(currPlayer.obj);
				break;
			case "newPlayerConnected":
				console.log('newPlayerConnected');
				if(parsedData.playerData.id != currPlayer.id){
					console.log("...yup i was right\n");
					var player = new Player(parsedData.playerData, false);
					players.push(player);
				}else{
					console.log("nvm...it was just me\n");
				}
				break;
			case "loadExistingPlayers":
				console.log('loadExistingPlayers\n');
				loadExistingPlayers(parsedData.players);
				break;
			case "towers-info":
				console.log('loadTowers\n');
				loadTowers(parsedData.towers);
				break;
			case "updateState":
				// console.log('updatePlayers\n');
				
				if(typeof parsedData.players !== 'undefined' && parsedData.players.length > 0){

					for (var i = 0; i < parsedData.players.length; i++) {
						var pData = parsedData.players[i];
						if(typeof currPlayer !== 'undefined' && pData.id == currPlayer.id){
							currPlayer.updatePosition(pData);
							currPlayer.selected = pData.selected;
							currPlayer.health = pData.health;
							logPosition();
						}else{
							var p = getPlayerById(pData.id);
							p = p[0];
							if(typeof p !== 'undefined'){
								p.updatePosition(pData);					
							}
						}
					}
				}

				if(typeof parsedData.towers !== 'undefined' && parsedData.towers.length > 0){
					for (var i = 0; i < parsedData.towers.length; i++) {
						var tData = parsedData.towers[i];
						var t = getTowerById(tData.id);
						t = t[0];
						if(typeof t !== 'undefined'){
							// console.log("Got info for tower %s", t.id);
						}

					};
				}

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
			// case "mapData":
			// 	for (var i = 0; i < parsedData.mapData.length; i++) {
			// 		var d = parsedData.mapData[i];
			// 		serverTiles.push(game.add.sprite(d[0]-16, d[1]-16, 'atile'));
			// 	};
			// 	break;
			case "path-data":
				currPlayer.drawPathToPoint(parsedData.path);
				break;
			case "path-finished":
				setTimeout(function(){
					for(var i=0; i< pathLines.length; i++){
						var lineItem = pathLines[i];
						pathLines.splice(i,1);
						lineItem.destroy();
					}
				},0);
				break;
			case "ms":
				logPing();
				break;
			default:
				console.log('Unknown action %s\n', parsedData.action);
				// console.log(e.data);
	  	}
	
	};

}

function logPing() {
	var receiveDate = (new Date()).getTime();
	document.getElementById('ping').innerHTML = receiveDate - lastTimeSend - 300;
	lastTimeSend = receiveDate;
}

function logPosition() {
	$('#latt').text(currPlayer.obj.body.x);
	$('#lng').text(currPlayer.obj.body.y);
	$('#angle').text(currPlayer.obj.body.angle);
	$('#unit_selected').text(currPlayer.selected);
	$('#unit_health').text(currPlayer.health);
}

setInterval(function(){
	try{
		connection.send(JSON.stringify({action:'ms'})); 
	}catch(e){
		console.log("Log ping error: ", e.message);
	}
}, 300);

function preload() {

	console.log(mapUrl);
    game.load.tilemap('map', mapUrl, null, Phaser.Tilemap.TILED_JSON);
    game.load.image('ground_1x1', 'simple_assets/ground_1x1.png');
    game.load.image('Grass', 'simple_assets/FeThD.png');
    game.load.image('Water', 'simple_assets/water_1x1.png');
    game.load.image('atile', 'simple_assets/tile.png'	, 32, 32);
    game.load.image('ptile', 'simple_assets/tile_player.png', 32, 32);
    game.load.image('tower', 'simple_assets/tower.png'	, 32, 64);
    game.load.image('walls_1x2', 'assets/tilemaps/tiles/walls_1x2.png');
    game.load.image('tiles2', 'assets/tilemaps/tiles/tiles2.png');
    // game.load.image('ship', 'assets/sprites/thrust_ship2.png');
    game.load.image('guy', 'simple_assets/guy.png');

}

function create() {

    game.physics.startSystem(Phaser.Physics.P2JS);

    game.stage.backgroundColor = '#2d2d2d';

    map = game.add.tilemap('map');

    map.addTilesetImage('Grass');
    map.addTilesetImage('Water');
    map.addTilesetImage('ground_1x1');
    map.addTilesetImage('tiles2');
    
    layer = map.createLayer('BG');
    layer.resizeWorld();

    walls = map.createLayer('Tile Layer 1');
    walls.resizeWorld();

    //  Set the tiles for collision.
    //  Do this BEFORE generating the p2 bodies below.
    map.setCollisionBetween(1, 12);

    //  Convert the tilemap layer into bodies. Only tiles that collide (see above) are created.
    //  This call returns an array of body objects which you can perform addition actions on if
    //  required. There is also a parameter to control optimising the map build.
    // someTiles = game.physics.p2.convertTilemap(map, walls);

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
	game.input.onDown.add(mouseClickCallback, this);
}

function mouseClickCallback(pointer) {
	try{
		cursorDownData.point = [
			pointer.worldX,
			pointer.worldY
		];
	    connection.send(JSON.stringify(cursorDownData));
	}catch(e){
		console.log("Mouse click error: ", e.message);
	}
}


function update() {

    try{

	    if (cursors.left.isDown){
	    	movementData.rotation = "left";
	    }
	    else if (cursors.right.isDown){
	      movementData.rotation = "right";
	    }
	    else{
	        movementData.rotation = "stop";
	    }

	    if (cursors.up.isDown){
	    	movementData.direction = "forward";
	    }
	    else if (cursors.down.isDown){
	        movementData.direction = "reverse";
	    }else{
    		movementData.direction = "stop";
	    }

	    connection.send(JSON.stringify(movementData));
    	
    	// console.log(currPlayer.obj.body.force.destination);
    }catch(e){
    	console.log("Keyboard direction error: ", e.message);
    }

}

function render() {

}

$(document).ready(function(){

	openConn();


});