var express = require('express'),
    app = express(),
    server = require("http").createServer(app),
    io = require("socket.io").listen(server),
    cors = require("cors"),
    IP = process.env.OPENSHIFT_NODEJS_IP || "127.0.0.1",
    PORT = process.env.OPENSHIFT_NODEJS_PORT || process.env.PORT || 8080,
    playerSpeed = 0.5,
    ServerRegion = "Europe",
    NumOfSections = 10,
    Sections = (function () {
        var sections = [];
        for (var x = 0; x < NumOfSections; ++x) {
            sections[x] = [];
            for (var y = 0; y < NumOfSections; ++y) {
                sections[x][y] = {};
            }
        }
        return sections;
    })(),
    games = (function () {
        var Games = {},
            games = ["A"];
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
            var Socket = player;
            player = games[game].players[player];
            if (player.Health) {
                player.x = Math.min(Math.max((Math.cos(player.Angle) / (1000 / player.Speed)) + player.x, 0), 1);
                player.y = Math.min(Math.max((Math.sin(player.Angle) / (1000 / player.Speed)) + player.y, 0), 1);
                player.Score += 0.185 * player.Speed;
                player.Health.val = Math.min(player.Health.val+player.Health.regen,player.Health.max);
                games[game].sections[~~(player.x * (NumOfSections - 0.000000001))][~~(player.y * (NumOfSections - 0.000000001))][Socket] = player;
            } else {
                delete games[game].players[Socket];
            }
        }
        for (var x = 0; x < sections.length; ++x) {
            var xRange,
                yRange;
            if (x === 0) xRange = [0, 1];
            else if (x === NumOfSections - 1) xRange = [NumOfSections - 2, NumOfSections - 1];
            else xRange = [x - 1, x, x + 1];
            for (var y = 0; y < sections[x].length; ++y) {
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
                        Health: player.Health,
                        Score: player.Score
                    };
                    for (var xs = 0; xs < xRange.length; ++xs) {
                        for (var ys = 0; ys < yRange.length; ++ys) {
                            var sec = sections[xRange[xs]][yRange[ys]];
                            for (var nearPlayer in sec) {
                                if (nearPlayer != Socket) {
                                    var nearSocket = nearPlayer,
                                        nearPlayer = sec[nearPlayer],
                                        dA = Math.atan2(nearPlayer.y - player.y, nearPlayer.x - player.x),
                                        d;
                                    if (((d = Math.sqrt(Math.pow(player.x - nearPlayer.x, 2) + Math.pow(player.y - nearPlayer.y, 2))) < (player.Beam.length / 20000) + 0.002)
                                        && (dA <= player.Angle + player.Beam.angle && dA >= player.Angle - player.Beam.angle)) {
                                        player.Near[nearSocket] = {
                                            Name: nearPlayer.Name,
                                            x: nearPlayer.x,
                                            y: nearPlayer.y,
                                            Speed: nearPlayer.Speed,
                                            Angle: nearPlayer.Angle,
                                            Beam: nearPlayer.Beam,
                                            Health: player.Health
                                        }
                                        nearPlayer.Health.val = Math.max(nearPlayer.Health.val - (d / player.Beam.length * 20000), 0);
                                        if (!nearPlayer.Health) {
                                            nearPlayer.Health.Death = {
                                                type: 1,
                                                user: player.Name
                                            }
                                            player.Score += 0.8 * nearPlayer.Score;
                                            delete games[game].players[nearSocket];
                                        }
                                        player.Score += 2;
                                        if (d < 0.003) {
                                            player.Health.val = 0;
                                            player.Health.Death = {
                                                type: 0,
                                                user: nearPlayer.Name
                                            }
                                            nearPlayer.Health.val = 0;
                                            nearPlayer.Health.Death = {
                                                type: 0,
                                                user: player.Name
                                            }
                                            io.sockets.sockets[Socket].emit("console",player.Health.Death);
                                            io.sockets.sockets[nearSocket].emit("console",nearPlayer.Health.Death);
                                            delete games[game].players[Socket];
                                            delete games[game].players[nearSocket];
                                        }
                                    }
                                }
                            }
                            if (io.sockets.sockets[Socket]) io.sockets.sockets[Socket].emit("u",player.Near);
                        }
                    }
                }
            }
        }
    }
}, 20);

setInterval(function () {
    for (var game in games) {
        var board = [];
        for (var player in games[game].players) {
            var ob = JSON.parse(JSON.stringify(games[game].players[player]));
            ob.ID = player;
            board.push(ob);
        }
        board = board.sort(function (a, b) {
            return b.Score - a.Score;
        }).slice(0, 5);
        io.to(game).emit("b", board);
    }
}, 2000)

app.use(cors());
app.use(express.static(__dirname + '/../static'));

server.listen(PORT, function () {
    console.log("Listening at http://" + IP + ":" + PORT);
});

io.on('connection', function (socket) {
    var user = {},
        game = Object.keys(games)[~~(Math.random() * Object.keys(games).length)];
    socket.join(game);
    socket.on("join", function (usr) {
        if (!user.Health) {
            user.Angle = 0;
            user.Speed = 0;
            user.Score = 0;
            user.Health = {
                regen: 0.1,
                val: 100,
                max: 100
            };
            user.Beam = {
                length: 500,
                angle: 0.6
            };
            user.Name = usr.usr.toString().substr(0, 20);
            user.x = Math.random();
            user.y = Math.random();
            games[game].players[socket.id] = user;
            socket.emit("si", {region: ServerRegion, name: game});
            console.log("> " + socket.id + " joined game: " + game + " - Name: " + user.Name);
        }
    });
    socket.on('i', function (i) {
        if (user.Health) {
            user.Angle = parseFloat(i.a);
            user.Speed = Math.min(Math.max(parseFloat(i.d - 30) / (user.Beam.length / 2), 0), playerSpeed);
        }
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
    for (var i = new_arr.length; i--;){
        if (new_arr[i] instanceof Array) new_arr[i] = copy(new_arr[i]);
        else if (new_arr[i] instanceof Object) new_arr[i] = {};
    }
    return new_arr;
}