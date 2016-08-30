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
var canvas = document.getElementById("map"),
    ctx = canvas.getContext("2d"),
    socket = io(),
    FPS = {
        lastShow: 0,
        lastCount: 0,
        framesShown: 0,
        calcFPS: false,
        div: document.getElementById("fps")
    },
    sizes = {
        back: {
            size: 20000,
            spacing: 200,
            dotsize: 3
        },
        ball: 30,
        glow: 0,
        scale: 1
    },
    lastM = 0,
    players = {},
    playersOld,
    view = "#FFF";

function setCanvas() {
    canvas.width = $(document).width();
    canvas.height = $(document).height();
    ctx.font = "bold " + Math.round(sizes.ball * 0.5 * sizes.scale) + "px Rubik";
    ctx.textAlign = 'center';
}
(window.onresize = setCanvas)();

$(window).keydown(function (e) {
    if (e.which === 27) {
        $("#home").css({opacity: 1, "z-index": 0});
        $(".overlays").css("opacity", 0);
        document.onmousemove = null;
    } else if (e.which === 16) toggleFPS();
});
window.onwheel = function (e) {
    sizes.scale = Math.min(Math.max(sizes.scale - (e.deltaY / 1500), 300/(players["/#"+socket.id]?players["/#"+socket.id].Beam.length:500)),2);
    ctx.font = "bold " + Math.round(sizes.ball * 0.5 * sizes.scale) + "px Rubik";
};

$("form").submit(function (e) {
    var name = $("[name='name']"),
        home = $("#home");
    socket.emit("join", {usr: name.val()});
    home.css("opacity", 0);
    $(".overlays").css("opacity", 1);
    $("button.settings").attr("style", "");
    $("section.settings").css({
        "max-height": 40,
        "padding-top": 0
    }).addClass("closed");
    document.onmousemove = function (e) {
        if (Date.now() - lastM > 20) {
            var distance = Math.sqrt(Math.pow(($(document).width() / 2) - e.pageX, 2) + Math.pow(($(document).height() / 2) - e.pageY, 2))/sizes.scale,
                angle = Math.atan2(e.pageY - $(document).height() / 2, e.pageX - $(document).width() / 2);
            socket.emit("i", {a: angle, d: distance});
            lastM = Date.now();
        }
    };
    setTimeout(function () {
        home.css("z-index", -2);
    }, 300);
    e.preventDefault();
    return false;
});
(function draw() {
    var base = players["/#" + socket.id] || {x: 0.5, y: 0.5},
        delta,
        backX = canvas.width / 2 - (sizes.back.size * sizes.scale * base.x),
        backY = canvas.height / 2 - (sizes.back.size * sizes.scale * base.y),
        offX = backX % (sizes.back.spacing * sizes.scale),
        offY = backY % (sizes.back.spacing * sizes.scale);


    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#112632";
    for (var xc = -sizes.back.spacing * sizes.scale; xc < canvas.width + sizes.back.spacing * sizes.scale; xc += (sizes.back.spacing * sizes.scale)) {
        for (var yc = -sizes.back.spacing * sizes.scale; yc < canvas.height + sizes.back.spacing * sizes.scale; yc += (sizes.back.spacing * sizes.scale)) {
            ctx.beginPath();
            ctx.arc(xc + offX, yc + offY, sizes.back.dotsize * sizes.scale, 0, 2 * Math.PI);
            ctx.closePath();
            ctx.fill();
        }
    }
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.fillRect(backX, backY, sizes.back.size * sizes.scale, sizes.back.size * sizes.scale);
    for (var id in players) {
        var player = players[id];
        ctx.save();
        ctx.translate((canvas.width / 2) - (sizes.back.size * sizes.scale * (base.x - player.x)), (canvas.height / 2) - (sizes.back.size * sizes.scale * (base.y - player.y)));
        ctx.rotate(player.Angle + (Math.PI * 3 / 2));
        ctx.beginPath();
        ctx.arc(0, 0, sizes.ball * sizes.scale, Math.PI, 0);
        ctx.arc(0, 0, player.Beam.length * sizes.scale, -player.Beam.angle+Math.PI/2, player.Beam.angle+Math.PI/2);
        ctx.closePath();
        view = ctx.createRadialGradient(0, 0, sizes.ball * sizes.scale, 0, 0, Math.max(player.Beam.length * sizes.scale * 2 * player.Speed, sizes.ball * sizes.scale));
        view.addColorStop(0.3, "rgba(255,255,255,0.6)");
        view.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = view;
        ctx.fill();
        ctx.restore();

    }
    for (id in players) {
        player = players[id];
        ctx.save();
        ctx.translate((canvas.width / 2) - (sizes.back.size * sizes.scale * (base.x - player.x)), (canvas.height / 2) - (sizes.back.size * sizes.scale * (base.y - player.y)));
        ctx.fillStyle = "#FFF";
        ctx.beginPath();
        ctx.arc(0, 0, sizes.ball * sizes.scale + sizes.glow, 0, 2 * Math.PI);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#AAA";
        ctx.fillText(player.Name.substr(0, 1).toUpperCase(), 0, sizes.ball * sizes.scale / 4, 20);
        ctx.restore();
    }
    if (FPS.calcFPS && (delta = Date.now() - FPS.lastCount) >= 500) {
        FPS.div.innerHTML = Math.round(FPS.framesShown / delta * 1000);
        FPS.lastCount = Date.now();
        FPS.framesShown = 0;
    }
    FPS.framesShown++;
    requestAnimationFrame(draw);
})();

socket.on("u", function (u) {
    playersOld = players;
    players = u;
});
socket.on("si", function (si) {
    $("#siN").html("Server: " + si.name);
    $("#siR").html("Region: " + si.region);
    $("#si").css({
        height: "auto",
        "padding-bottom": 10
    });
});
socket.on("b", function (b) {
    var leaders = document.getElementById("leaders");
    while (leaders.firstChild) {
        leaders.removeChild(leaders.firstChild);
    }
    for (var i = 0; i < b.length; ++i) {
        var user = document.createElement("span"),
            score = document.createElement("span"),
            name = document.createTextNode(escapeHTML(b[i].Name));
        score.className = "score";
        score.appendChild(document.createTextNode(Math.round(b[i].Score)));
        leaders.appendChild(user).appendChild(score).parentNode.appendChild(name);
    }
});
$("button.settings").click(function () {
    if (!this.style.transform || this.style.transform === "none") {
        this.style.transform = "rotate(-120deg)";
        $("section.settings").css({
            "max-height": 500,
            "padding-top": 40
        }).addClass("closed");
    } else {
        this.style.transform = "";
        $("section.settings").css({
            "max-height": 40,
            "padding-top": 0
        }).removeClass("closed");
    }
});
document.getElementsByClassName('fps check')[0].onclick = toggleFPS;

function toggleFPS() {
    var fpsc = document.getElementById("fpsc"),
        check = $(".fps.check")[0];
    if (FPS.calcFPS) {
        check.style.background = 'none';
        fpsc.style.opacity = 0;
        setTimeout(function () {
            fpsc.className = "";
        }, 300);
    }
    else {
        check.style.background = '#444';
        fpsc.className = "overlays";
        fpsc.style.opacity = 1;
    }
    FPS.calcFPS = !FPS.calcFPS;
}
socket.on("console", function (log) {
    console.log(log);
});

//TODO: SMOOTHEN SCROLLING
//TODO: LOWER HEALTH IN BEAM

//            var glow = ctx.createRadialGradient(0,0,sizes.ball,0,0,sizes.ball+sizes.glow);
//            glow.addColorStop(0,"#999");
//            glow.addColorStop(1,"rgba(0,0,0,0)");
