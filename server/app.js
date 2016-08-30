var express = require('express'),
    app = express(),
    server = require("http").createServer(app),
    io = require("socket.io").listen(server),
    cors = require("cors"),
    PORT = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080,
    playerSpeed = 0.5,
    ServerRegion = "Europe",
    NumOfSections = 20;
    Sections = (function () {
        var sections = [];
        for (var x = 0; x < NumOfSections; ++x) {
            sections[x] = [];
            for (var y = 0; y < NumOfSections; ++y) {
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
        var sections = (games[game].sections = copy(Sections));
        for (var player in games[game].players) {
            player = games[game].players[player];
            if (player.Health) {
                player.x = Math.min(Math.max((Math.cos(player.Angle) / (1000 / player.Speed)) + player.x, 0), 1);
                player.y = Math.min(Math.max((Math.sin(player.Angle) / (1000 / player.Speed)) + player.y, 0), 1);
                player.Score += 0.185 * player.Speed;
                games[game].sections[Math.floor(player.x * (NumOfSections-0.000000001))][Math.floor(player.y * (NumOfSections-0.000000001))].push(player);
            } else delete player;
        }
        for (var x = 0; x < sections.length; ++x) {
            var xRange,
                yRange;
            if (x === 0) xRange = [0, 1];
            else if (x === NumOfSections -1 ) xRange = [NumOfSections -2, NumOfSections-1];
            else xRange = [x - 1, x, x + 1];
            for (var y = 0; y < sections[x].length; ++y) {
                if (y === 0) yRange = [0, 1];
                else if (y === NumOfSections -1) yRange = [NumOfSections-2, NumOfSections-1];
                else yRange = [y - 1, y, y + 1];
                for (player in sections[x][y]) {
                    player = sections[x][y][player];
                    player.Near = {};
                    for (var xs = 0; xs < xRange.length; ++xs) {
                        for (var ys = 0; ys < yRange.length; ++ys) {
                            var sec = sections[xRange[xs]][yRange[ys]];
                            for (var p = 0; p < sec.length; ++p) {
                                var nearPlayer = sec[p],
                                    d;
                                if ((d = Math.sqrt(Math.pow(player.x-nearPlayer.x,2)+Math.pow(player.y-nearPlayer.y,2))) < player.Beam/20000) {
                                    player.Near[nearPlayer.Socket] = player.Near[nearPlayer.Socket] = {
                                        Name: nearPlayer.Name,
                                        x: nearPlayer.x,
                                        y: nearPlayer.y,
                                        Speed: nearPlayer.Speed,
                                        Angle: nearPlayer.Angle,
                                        Beam: nearPlayer.Beam
                                    }
                                    if (d < 0.003 && player.Socket != nearPlayer.Socket) {
                                        player.Health = 0;
                                        nearPlayer.Health = 0;
                                    }
                                }
                            }
                        }
                    }
                    io.sockets.sockets[player.Socket].emit("u", player.Near);
                }
            }
        }
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
            user.Socket = socket.id;
            user.Angle = 0;
            user.Speed = 0;
            user.Score = 0;
            user.Health = 100;
            user.Beam = 500;
            user.Name = usr.usr.substr(0, 20);
            user.x = Math.random();
            user.y = Math.random();
            games[game].players[socket.id] = user;
            socket.emit("si", {region: ServerRegion, name: game});
            console.log("> " + socket.id + " joined game: " + game + " - Name: " + user.Name);
        }
    });
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
function copy(arr) {
    var new_arr = arr.slice(0);
    for (var i = new_arr.length; i--;)
        if (new_arr[i] instanceof Array)
            new_arr[i] = copy(new_arr[i]);
    return new_arr;
}
//
//
//
