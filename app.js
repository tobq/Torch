var express = require('express'),
    app = express(),
    server = require("http").createServer(app),
    io = require("socket.io").listen(server),
    cors = require("cors"),
    PORT =  process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080,
    playerSpeed = 3;

app.use(cors());

app.get("*", function (req, res) {
    res.sendFile(__dirname+"/index.html");
});

server.listen(PORT,function(){
    console.log("Listening at http://:" + PORT);
});

io.on('connection', function (socket) {
    var angle = 0,
        Speed = 0,
        x = Math.random(),
        y = Math.random(),
        update = setInterval(function () {
            x = Math.min(Math.max((Math.cos(angle)/(10/Speed)) + x, 0), 1);
            y = Math.min(Math.max((Math.sin(angle)/(10/Speed)) + y, 0), 1);
            io.emit("u", {id: socket.id, x: x, y: y,a: angle});
        }, 20);

    console.log('> New connection: '+socket.id);
    socket.on('i', function (i) {
        angle = i.a;
        Speed = Math.min(Math.max((i.d-25)/35,0),playerSpeed);
    });
    socket.once('disconnect', function () {
        clearInterval(update);
        io.emit("d", socket.id);
        console.log('> Connection closed: '+socket.id);
    });

});
