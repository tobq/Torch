var express = require('express'),
    app = express(),
    server = require("http").createServer(app),
    io = require("socket.io").listen(server),
    cors = require("cors")
    PORT = process.env.PORT || 4000;

app.use(cors());

app.get("/", function (req, res) {
    res.send("OK");
})

server.listen(PORT,function(){
    console.log("Running att http://localhost:"+PORT)
});

io.on('connection', function (socket) {
    var A = Math.random() * 2 * Math.PI,
        x = Math.random() * 100,
        y = Math.random() * 100,
        update = setInterval(function () {
            x = Math.min(Math.max(2 * (Math.cos(A)) + x, 0), 100);
            y = Math.min(Math.max(2 * (Math.sin(A)) + y, 0), 100);
            io.emit("u", {id: socket.id, x: x, y: y});
        }, 100);

    console.log('> New connection');
    socket.on('disconnect', function () {
        clearInterval(update);
        io.emit("d", socket.id);
    });
    socket.on('a', function (a) {
        A = a;
    });

});


// app.use(bodyParser.urlencoded({extended: false}));
// app.use(cookieParser());
// app.use(function (req, res, next) {
//     if (!req.cookies.sid) {
//         req.cookies.sid = Math.random().toString().slice(2);
//         res.cookie('sid', req.cookies.sid, {maxAge: 24 * 60 * 60 * 1000, httpOnly: true});
//     }
//     if (!sessions[req.cookies.sid]) {
//         sessions[req.cookies.sid] = {
//             angle: 0,
//             x: Math.random() * 100,
//             y: Math.random() * 100,
//             timeout: setTimeout(function () {
//                 delete sessions[req.cookies.sid];
//             }, 1000 * 60)
//         };
//     } else {
//         clearTimeout(sessions[req.cookies.sid].timeout);
//         sessions[req.cookies.sid].timeout = setTimeout(function () {
//             delete sessions[req.cookies.sid];
//         }, 1000 * 60);
//     }
//     next();
// });
//
// app.post("*", function (req, res) {
//     res.send({
//         x: sessions[req.cookies.sid].x,
//         y: sessions[req.cookies.sid].y
//     });
//     sessions[req.cookies.sid].angle = req.body.angle;
// });
// app.get("*", function (req, res) {
//     res.sendFile("index.html", {root: __dirname});
// });
//
// app.listen(3000, function () {
//     console.log('Listening at: http://localhost:3000');
// });
//
// setInterval(function () {
//     for (var session in sessions) {
//         session = sessions[session];
//         session.x = Math.min(Math.max(2 * (Math.cos(session.angle)) + session.x,0),100);
//         session.y = Math.min(Math.max(2 * (Math.sin(session.angle)) + session.y,0),100);
//     }
// }, 100)