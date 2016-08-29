var express = require('express'),
    app = express(),
    server = require("http").createServer(app),
    io = require("socket.io").listen(server),
    cors = require("cors"),
    PORT = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080,
    playerSpeed = 0.5,
    games = {
        A: {
            players: {}
        }
    };

setInterval(function(){
    for (var game in games) {
        for (var player in games[game].players) {
            player = games[game].players[player];
            player.x = Math.min(Math.max((Math.cos(player.Angle) / (1000 / player.Speed)) + player.x, 0), 1);
            player.y = Math.min(Math.max((Math.sin(player.Angle) / (1000 / player.Speed)) + player.y, 0), 1);
            player.Score += 0.1;
            io.to(game).emit("u", games[game].players);
        }
    }
}, 20);

setInterval(function(){
    for (var game in games) {
        var board = [];
        for ( var player in games[game].players) board.push(games[game].players[player]);
        board = board.sort(function(a, b) {
            return b.Score - a.Score;
        }).slice(0,5);
        io.to(game).emit("b",board);
    }
},2000)

app.use(cors());

app.get("*", function (req, res) {
    res.sendFile(__dirname + "/index.html");
});

server.listen(PORT, function () {
    console.log("Listening at http://127.0.0.1:" + PORT);
});

io.on('connection', function (socket) {
    var user = {};
    socket.on("join", function (usr) {
        var game = "A";
        if (!Object.keys(user).length) {
            socket.join(game);
            games[game].players[socket.id] = user;
            user.Angle = 0;
            user.Speed = 0;
            user.Score = 0;
            user.Name = usr.usr;
            user.x = Math.random();
            user.y = Math.random();
        }
    })
    socket.on('i', function (i) {
        user.Angle = i.a;
        user.Speed = Math.min(Math.max((i.d - 25) / 400, 0), playerSpeed);
    });

    socket.once('disconnect', function () {
        delete games.A.players[socket.id];
        console.log('> Connection closed: ' + socket.id);
    });
    console.log('> New connection: ' + socket.id);
});


