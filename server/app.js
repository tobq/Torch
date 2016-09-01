var express = require('express'),
    app = express(),
    server = require("http").createServer(app),
    io = require("socket.io").listen(server),
    IP = process.env.OPENSHIFT_NODEJS_IP || "127.0.0.1",
    PORT = process.env.OPENSHIFT_NODEJS_PORT || process.env.PORT || 8080,
    NumOfSections = 10,
    Sections = (function () {
        var sections = [];
        for (var x = NumOfSections; x--;) {
            sections[x] = [];
            for (var y = NumOfSections; y--;) {
                sections[x][y] = {};
            }
        }
        return sections;
    })(),
    GAMES = ["A"],
    ServerRegion = "Europe",
    games = (function () {
        var Games = {};
        for (var i = GAMES.length; i--;) {
            Games[GAMES[i]] = {
                playing: {}
            }
        }
        return Games;
    })();

setInterval(function () {
    for (var game in games) {
        var sections = (games[game].sections = copy(Sections));
        for (var player in games[game].playing) {
            var Socket = player;
            player = games[game].playing[player];
            if (player.Health.val) {
                player.x = Math.min(Math.max((Math.cos(player.Angle) / (1000 / player.Speed.val)) + player.x, 0), 1);
                player.y = Math.min(Math.max((Math.sin(player.Angle) / (1000 / player.Speed.val)) + player.y, 0), 1);
                player.Score += 0.185 * player.Speed.val;
                player.Health.val = Math.min(player.Health.val + player.Health.regen, player.Health.max);
                sections[~~(player.x * (NumOfSections - 0.000000001))][~~(player.y * (NumOfSections - 0.000000001))][Socket] = player;
            } else {
                io.sockets.sockets[Socket].emit("d", player.Health.Death);
                delete games[game].playing[Socket];
            }
        }

        for (var x = NumOfSections; x--;) {
            var xRange, yRange;
            if (x === 0) xRange = [0, 1];
            else if (x === NumOfSections - 1) xRange = [NumOfSections - 2, NumOfSections - 1];
            else xRange = [x - 1, x, x + 1];

            for (var y = NumOfSections; y--;) {
                if (y === 0) yRange = [0, 1];
                else if (y === NumOfSections - 1) yRange = [NumOfSections - 2, NumOfSections - 1];
                else yRange = [y - 1, y, y + 1];

                for (player in sections[x][y]) {
                    Socket = player;
                    player = sections[x][y][player];
                    player.Near = {};
                    player.Near[Socket] = {
                        Name: player.Name,
                        x: player.x,
                        y: player.y,
                        Speed: player.Speed,
                        Angle: player.Angle,
                        Beam: player.Beam,
                        Health: player.Health.val,
                        Score: player.Score
                    };
                    for (var xs = xRange.length; xs--;) for (var ys = yRange.length; ys--;) {
                        var sec = sections[xRange[xs]][yRange[ys]];
                        for (var nearPlayer in sec) {
                            if (nearPlayer != Socket) {
                                var nearSocket = nearPlayer,
                                    nearPlayer = sec[nearPlayer],
                                    dA = Math.atan2(nearPlayer.y - player.y, nearPlayer.x - player.x),
                                    d;
                                if (((d = Math.sqrt(Math.pow(player.x - nearPlayer.x, 2) + Math.pow(player.y - nearPlayer.y, 2))) < (player.Beam.length / 9000 * player.Speed.val))
                                    && (dA <= player.Angle + player.Beam.angle && dA >= player.Angle - player.Beam.angle)) {
                                    player.Near[nearSocket] = {
                                        Name: nearPlayer.Name,
                                        x: nearPlayer.x,
                                        y: nearPlayer.y,
                                        Speed: nearPlayer.Speed,
                                        Angle: nearPlayer.Angle,
                                        Beam: nearPlayer.Beam,
                                        Health: nearPlayer.Health.val
                                    };
                                    nearPlayer.Health.val = Math.max(nearPlayer.Health.val - 1, 0);
                                    if (!nearPlayer.Health.val) {
                                        nearPlayer.Health.Death = {
                                            type: 0,
                                            user: player.Name
                                        }
                                        player.Score += 0.8 * nearPlayer.Score;
                                    }
                                    player.Score += 2;
                                }
                                if (d < 0.003) {
                                    player.Health.Death = { type: 1, user: nearPlayer.Name };
                                    nearPlayer.Health.Death = { type: 0, user: player.Name };
                                    player.Health.val = 0;
                                    nearPlayer.Health.val = 0;
                                }
                            }
                        }
                        if (player.Health.val && io.sockets.sockets[Socket]) io.sockets.sockets[Socket].emit("u", player.Near);
                    }
                }
            }
        }
    }
}, 20);

setInterval(function () {
    for (var game in games) {
        var board = [];
        for (var player in games[game].playing) {
            var Player = games[game].playing[player];
            board.push({
                Score: Player.Score,
                ID: player,
                Name: Player.Name
            });
        }
        io.to(game).emit("b", board.sort(function (a, b) {
            return b.Score - a.Score;
        }).slice(0, 5));
    }
}, 2000)

app.use(require("cors")());
app.use(express.static(__dirname + '/../static'));

server.listen(PORT, function () {
    console.log("Listening at http://" + IP + ":" + PORT);
});

io.on('connection', function (socket) {
    var user = {Health:{val:0}},
        game = Object.keys(games)[~~(Math.random() * Object.keys(games).length)];
    socket.join(game);
    socket.emit("si", {region: ServerRegion, name: game});

    socket.on("join", function (usr) {
        if (!user.Health.val) {
            user = {
                Name: usr.usr?usr.usr.toString().substr(0, 20):"",
                x: Math.random(),
                y: Math.random(),
                Angle: 0,
                Score: 0,
                Health: {
                    regen: 0.1,
                    val: 100,
                    max: 100
                },
                Speed: {
                    val: 0,
                    max: .5
                },
                Beam: {
                    length: 1000,
                    angle: 0.7
                }
            };
            games[game].playing[socket.id] = user;
        }
    });
    socket.on('i', function (i) {
        if (user.Health.val) {
            user.Angle = parseFloat(i.a);
            user.Speed.val = Math.min(Math.max(parseFloat(i.d - 30) / (user.Beam.length / 2), 0), user.Speed.max);
        }
    });

    socket.on('leave', function () {
        delete games[game].playing[socket.id];
        socket.leave(game);
        game = Object.keys(games)[~~(Math.random() * Object.keys(games).length)];
        socket.join(game);
        socket.emit("si", {region: ServerRegion, name: game});
        user = {Health:{val:0}};
    });

    socket.on('disconnect', function () {
        user = {Health:{val:0}};
        delete games[game].playing[socket.id];
        console.log('Connection closed: ' + socket.id);
    });
    console.log('New connection: ' + socket.id);
});
function copy(arr) {
    var Arr = arr.slice(0);
    for (var i = Arr.length; i--;) {
        if (Arr[i] instanceof Array) Arr[i] = copy(Arr[i]);
        else if (Arr[i] instanceof Object) Arr[i] = {};
    }
    return Arr;
}