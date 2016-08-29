if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        function (callback) {
            window.setTimeout(callback, 1000 / 60);
        };
}
function escapeHTML(text) {
    var map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function (m) {
        return map[m];
    });
}
var canvas = $("#map")[0],
    ctx = canvas.getContext("2d"),
    socket = io(),
    FPS = {
        lastShow: 0,
        lastCount: 0,
        framesShown: 0,
        calcFPS: false
    },
    sizes = {
        back: {
            size: 20000,
            spacing: 200,
            dotsize: 4
        },
        ball: 30,
        glow: 0,

    },
    last = 0,
    players = {},
    back = new Image(),
    view = "#FFF";

back.src = "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Graph-paper.svg/1000px-Graph-paper.svg.png";

$(window).resize(setCanvas);

function setCanvas() {
    canvas.width = $(document).width();
    canvas.height = $(document).height();
    sizes.toEnd = Math.max($(document).height(), $(document).width());
    ctx.font = 'bold ' + sizes.ball * 0.6 + 'px Arial';
    ctx.textAlign = 'center';
}

$("form").on("submit", function (e) {
    var name = $("[name='name']"),
        home = $("#home");
    socket.emit("join", {usr: name.val()});
    home.css("opacity", 0);
    FPS.calcFPS = true;
    $("#overlays > div").css("opacity", 1);
    document.onmousemove = function (e) {
        if (Date.now() - last > 20) {
            var distance = Math.sqrt(Math.pow(($(document).width() / 2) - e.pageX, 2) + Math.pow(($(document).height() / 2) - e.pageY, 2)),
                angle = Math.atan2(e.pageY - $(document).height() / 2, e.pageX - $(document).width() / 2);
            socket.emit("i", {a: angle, d: distance});
            last = Date.now();
        }
    };
    name.val("");
    setTimeout(function () {
        home.css("z-index", -1);
    }, 300)
    e.preventDefault();
    return false;
})
setCanvas();
(function draw() {
    var base = players["/#" + socket.id] ? players["/#" + socket.id] : {x: 0.5, y: 0.5},
        offs = [(canvas.width / 2 - (sizes.back.size * base.x))%sizes.back.spacing, (canvas.height / 2 - (sizes.back.size * base.y))%sizes.back.spacing],
        delta;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#112632";
    for (var xc=-sizes.back.spacing; xc < canvas.width+sizes.back.spacing; xc+=sizes.back.spacing) {
        for (var yc=-sizes.back.spacing; yc < canvas.height+sizes.back.spacing; yc+=sizes.back.spacing){
            ctx.beginPath();
            ctx.arc(xc+offs[0],yc+offs[1],sizes.back.dotsize,0,2*Math.PI);
            ctx.closePath();
            ctx.fill();
        }
    }
    for (var id in players) {
        ctx.translate((canvas.width / 2) - (sizes.back.size * (base.x - players[id].x)), (canvas.height / 2) - (sizes.back.size * (base.y - players[id].y)));
        ctx.save();
        ctx.rotate(players[id].Angle + (Math.PI * 3 / 2));
        ctx.beginPath();
        ctx.arc(0, 0, sizes.ball, Math.PI, 0);
        ctx.lineTo((sizes.ball * 15) / 2, sizes.toEnd);
        ctx.lineTo(-(sizes.ball * 15) / 2, sizes.toEnd);
        ctx.closePath();
        view = ctx.createRadialGradient(0, 0, sizes.ball, 0, 0, Math.max(sizes.toEnd * 2 * players[id].Speed, sizes.ball));
        view.addColorStop(0.3, "rgba(255,255,255,0.7)");
        view.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = view;
        ctx.fill();
        ctx.restore();
        ctx.translate((sizes.back.size * (base.x - players[id].x)) - (canvas.width / 2), (sizes.back.size * (base.y - players[id].y)) - (canvas.height / 2));

    }
    for (var id in players) {
        ctx.translate((canvas.width / 2) - (sizes.back.size * (base.x - players[id].x)), (canvas.height / 2) - (sizes.back.size * (base.y - players[id].y)));
        ctx.fillStyle = "#FFF";
        ctx.beginPath();
        ctx.arc(0, 0, sizes.ball + sizes.glow, 0, 2 * Math.PI);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#AAA";
        ctx.fillText(players[id].Name.substr(0, 1).toUpperCase(), 0, sizes.ball / 4, 20);
        ctx.translate((sizes.back.size * (base.x - players[id].x)) - (canvas.width / 2), (sizes.back.size * (base.y - players[id].y)) - (canvas.height / 2));
    }
    if (FPS.calcFPS && (delta = Date.now() - FPS.lastCount) >= 500) {
        $("#fps").html(Math.round(FPS.framesShown*1000/delta));
        FPS.lastCount = Date.now();
        FPS.framesShown = 0;
    }
    FPS.framesShown++;
    requestAnimationFrame(draw);
})();
window.onbeforeunload = function () {
    socket.disconnect();
};
socket.on("u", function (u) {
    players = u;
});
socket.on("b", function (b) {
    var top = $("#top10").html("");
    for (var i = 0; i < b.length; ++i) {
        var user = document.createElement("span");
        user.innerHTML = (i + 1) + " " + escapeHTML(b[i].Name);
        top.append(user);
    }
});
//TODO: give only users in range ... so server doesn't DDOS user...
//            var glow = ctx.createRadialGradient(0,0,sizes.ball,0,0,sizes.ball+sizes.glow);
//            glow.addColorStop(0,"#999");
//            glow.addColorStop(1,"rgba(0,0,0,0)");
