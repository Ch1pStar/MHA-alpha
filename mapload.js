var http = require('http');
var p2 = require('p2');

var options = {
	host: 'localhost',
	port: 3000,
	path: '/assets/tilemaps/maps/collision_test.json',
	method: 'GET'
};
var map;
var objects;
var timeStep = 1/60;
var data = [];

// Create a World
var world = new p2.World({
    doProfiling:true,                    // Enable stats
    gravity : [0,0],                   // Set gravity to -10 in y direction
    broadphase : new p2.SAPBroadphase(), // Broadphase algorithm
});

var req = http.request(options, function(res) {

	res.setEncoding('utf8');		
	res.on('data', function (chunk) {
		map = JSON.parse(chunk);
	});

	res.on('end', function(){
		// console.log(JSON.stringify(map));
		objects = map.layers[2].objects;
		for(var i in objects){
			var group = objects[i].polyline;
			for(var j in group){
				obj = group[j];

				var body = new p2.Body({
				    mass: 0,
				    position: [obj.x, obj.y],
				    angle: 0,
				    velocity: [0, 0],
				    angularVelocity: 0
				});

				var shape = new p2.Rectangle(32, 32);
				body.addShape(shape);

				world.addBody(body);
				data.push(body);
			}
		}
		for(var i in data){
			console.log(data[i].position[0], data[i].position[1]);
		}
		setInterval(function(){
		    world.step(timeStep);
		}, 1000 * timeStep);

	});
});


req.on('error', function(e) {
  console.log('problem with request: ' + e.message);
});
req.end();
