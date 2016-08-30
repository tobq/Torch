var express = require('express'),
    app = express(),
    server = require("http").createServer(app),
    io = require("socket.io").listen(server),
    cors = require("cors"),
    PORT = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080,
    playerSpeed = 0.5,
    ServerRegion = "Europe",
    Sections = (function () {
        var sections = [];
        for (var x = 0; x < 20; ++x) {
            sections[x] = [];
            for (var y = 0; y < 20; ++y) {
                sections[x][y] = [];
            }
        }
        return sections;
    })(),
    games = (function () {
        var Games = {},
            games = ["A", "B", "C"];
        for (var i = 0; i < games.length; ++i) {
            Games[games[i]] = {
                players: {}
            }
        }
        return Games;
    })();

setInterval(function () {
    for (var game in games) {
        games[game].sections = copy(Sections);
        for (var player in games[game].players) {
            player = games[game].players[player];
            player.x = Math.min(Math.max((Math.cos(player.Angle) / (1000 / player.Speed)) + player.x, 0), 1);
            player.y = Math.min(Math.max((Math.sin(player.Angle) / (1000 / player.Speed)) + player.y, 0), 1);
            player.Score += 0.185*player.Speed;
            games[game].sections[Math.floor(player.x*19.99999999999999)][Math.floor(player.y*19.99999999999999)].push(player.Name);
        }
        io.to(game).emit("u", games[game].players);
    }
}, 20);

setInterval(function () {
    for (var game in games) {
        var board = [];
        for (var player in games[game].players) board.push(games[game].players[player]);
        board = board.sort(function (a, b) {
            return b.Score - a.Score;
        }).slice(0, 5);
        io.to(game).emit("b", board);
    }
}, 2000)

app.use(cors());
app.use(express.static(__dirname + '/../static'));

server.listen(PORT, function () {
    console.log("Listening at http://127.0.0.1:" + PORT);
});

io.on('connection', function (socket) {
    var user = {},
        game;
    socket.on("join", function (usr) {
        if (!Object.keys(user).length) {
            game = Object.keys(games)[Math.floor(Math.random() * Object.keys(games).length)];
            socket.join(game);
            user.Angle = 0;
            user.Speed = 0;
            user.Score = 0;
            user.Beam = 1000;
            user.Name = usr.usr.substr(0, 20);
            user.x = Math.random();
            user.y = Math.random();
            games[game].players[socket.id] = user;
            socket.emit("si", {region: ServerRegion, name: game});
            console.log("> " + socket.id + " joined game: " + game + " - Name: " + user.Name);
        }
    })
    socket.on('i', function (i) {
        user.Angle = i.a;
        user.Speed = Math.min(Math.max((i.d - 25) / 400, 0), playerSpeed);
    });

    socket.on('leave', function () {
        delete games[game].players[socket.id];
        socket.leave(game);
        user = {};
        console.log("> " + socket.id + " left game: " + game);
    });

    socket.on('disconnect', function () {
        if (games[game]) delete games[game].players[socket.id];
        console.log('Connection closed: ' + socket.id);
    });
    console.log('New connection: ' + socket.id);
});
function copy(arr){
    var new_arr = arr.slice(0);
    for(var i = new_arr.length; i--;)
        if(new_arr[i] instanceof Array)
            new_arr[i] = copy(new_arr[i]);
    return new_arr;
}
