var express = require('express'),
    app = express(),
    server = require("http").createServer(app),
    io = require("socket.io").listen(server),
    cors = require("cors"),
    PORT =  process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080,
    playerSpeed = 0.5;

app.use(cors());

app.get("*", function (req, res) {
    res.sendFile(__dirname+"/index.html");
});

server.listen(PORT,function(){
    console.log("Listening at http://127.0.0.1:" + PORT);
});

function kill(User) {
    clearInterval(User.update);
    User = {id:User.id};
    io.emit("d", User.id);
}

io.on('connection', function (socket) {
    console.log('> New connection: '+socket.id);
    var user = {id:socket.id};

    socket.on("join",function(usr) {
        if (!(Object.keys(user).length-1)) {
            user.Angle = 0;
            user.Speed = 0;
            user.name = usr.usr;
            user.x = Math.random();
            user.y = Math.random();
            user.update = setInterval(function (user) {
                user.x = Math.min(Math.max((Math.cos(user.Angle) / (1000 / user.Speed)) + user.x, 0), 1);
                user.y = Math.min(Math.max((Math.sin(user.Angle) / (1000 / user.Speed)) + user.y, 0), 1);
                io.emit("u", {
                    id: user.id,
                    x: user.x,
                    y: user.y,
                    a: user.Angle,
                    s: user.Speed,
                    n: user.name
                });
            }, 20,user);
        }
    })

    socket.on("leave",function() {
        kill(user);
    })

    socket.on('i', function (i) {
        user.Angle = i.a;
        user.Speed = Math.min(Math.max((i.d-25)/400,0),playerSpeed);
    });
    socket.once('disconnect', function () {
        kill(user);
        console.log('> Connection closed: '+socket.id);
    });

});
