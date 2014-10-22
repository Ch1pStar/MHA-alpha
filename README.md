MHA-alpha
=========

Coming soon...when I know what the game will actually be(this is a game btw)

You need to have Node JS to runs this

How to run:
	-after cloning the project install the dependacies with: "npm install"
	-start the server with: "npm start"
	-app listens on port 3000(e.g. "http://localhost:3000")


Additional notes:
	- There is a bug in the p2 physics library that needs to be fixed for the game to run properly.
	In the file node_modules/p2/world/World.js at line 729
    
    e.bodyB = data.bodyA;
    
    Should be:

    e.bodyB = data.bodyB;