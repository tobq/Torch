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
            size: 15000,
            spacing: 300,
            dotsize: 4
        },
        ball: 20,
        scale: 1
    },
    lastM = 0,
    players = {},
    view = "#FFF",
    Base;

function setCanvas() {
    canvas.width = $(document).width();
    canvas.height = $(document).height();
    ctx.font = "bold " + Math.round(sizes.ball * 0.5 * sizes.scale) + "px Rubik";
    ctx.textAlign = 'center';
}
(window.onresize = setCanvas)();

$(window).keydown(function (e) {
    if (e.which === 27) {
        openHome();
    } else if (e.which === 16) toggleFPS();
    else if (e.which === 67) toggleCoords();
});
window.onwheel = function (e) {
    sizes.scale = Math.min(Math.max(sizes.scale - (e.deltaY / 1500), 300 / (Base ? Base.Beam.length : 500)), 2);
    ctx.font = "bold " + Math.round(sizes.ball * 0.5 * sizes.scale) + "px Rubik";
};
document.getElementById("play").onclick = joinGame;
document.getElementById("inform").onsubmit = function (e) {
    joinGame();
    e.preventDefault();
    return false;
};
(function draw() {
    var base = Base || {x: 0.5, y: 0.5},
        delta,
        backX = canvas.width / 2 - (sizes.back.size * sizes.scale * base.x),
        backY = canvas.height / 2 - (sizes.back.size * sizes.scale * base.y),
        offX = backX % (sizes.back.spacing * sizes.scale),
        offY = backY % (sizes.back.spacing * sizes.scale);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    ctx.lineWidth = 3*sizes.scale;
    for (var xc = -sizes.back.spacing * sizes.scale; xc < canvas.width + sizes.back.spacing * sizes.scale; xc += (sizes.back.spacing * sizes.scale)) for (var yc = -sizes.back.spacing * sizes.scale; yc < canvas.height + sizes.back.spacing * sizes.scale; yc += (sizes.back.spacing * sizes.scale)) {
        // ctx.beginPath();
        // ctx.arc(xc + offX, yc + offY, sizes.back.dotsize * sizes.scale, 0, 2 * Math.PI);
        // ctx.closePath();
        // ctx.fill();
        ctx.beginPath();
        ctx.moveTo(xc + offX- sizes.back.dotsize * sizes.scale, yc + offY - sizes.back.dotsize * sizes.scale);
        ctx.lineTo(xc + offX +  sizes.back.dotsize * sizes.scale,yc + offY +  sizes.back.dotsize * sizes.scale);
        ctx.moveTo(xc + offX+ sizes.back.dotsize * sizes.scale, yc + offY - sizes.back.dotsize * sizes.scale);
        ctx.lineTo(xc + offX-  sizes.back.dotsize * sizes.scale, yc + offY +  sizes.back.dotsize * sizes.scale);
        ctx.stroke();
    }
    ctx.fillStyle = "rgba(200,200,200,0.02)";
    ctx.fillRect(backX, backY, sizes.back.size * sizes.scale, sizes.back.size * sizes.scale);
    for (var id in players) {
        var player = players[id];
        ctx.save();
        ctx.translate((canvas.width / 2) - (sizes.back.size * sizes.scale * (base.x - player.x)), (canvas.height / 2) - (sizes.back.size * sizes.scale * (base.y - player.y)));
        ctx.rotate(player.Angle + (Math.PI * 3 / 2));
        ctx.beginPath();
        ctx.arc(0, 0, sizes.ball * sizes.scale, Math.PI, 0);
        ctx.arc(0, 0, player.Beam.length * 2 * player.Speed.val * sizes.scale, -player.Beam.angle + Math.PI / 2, player.Beam.angle + Math.PI / 2);
        ctx.closePath();
        view = ctx.createRadialGradient(0, 0, sizes.ball * sizes.scale, 0, 0, Math.max(player.Beam.length * sizes.scale * 2 * player.Speed.val, sizes.ball * sizes.scale));
        view.addColorStop(0, "rgba(255,255,255,0.6)");
        view.addColorStop(1, "rgba(255,255,255,0.1)");
        ctx.fillStyle = view;
        ctx.fill();
        ctx.restore();

    }
    for (id in players) {
        player = players[id];
        ctx.save();
        ctx.translate((canvas.width / 2) - (sizes.back.size * sizes.scale * (base.x - player.x)), (canvas.height / 2) - (sizes.back.size * sizes.scale * (base.y - player.y)));
        ctx.fillStyle = "rgb(255," + (Math.round(player.Health) + 155) + "," + (Math.round(player.Health) + 155) + ")";
        ctx.beginPath();
        ctx.arc(0, 0, sizes.ball * sizes.scale, 0, 2 * Math.PI);
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
    players = u;
    var coord = document.getElementById("coord");
    if (Base = players["/#" + socket.id]) {
        coord.innerHTML = String.fromCharCode(65 + (~~(Base.x * (9.999999999)))) + " " + (~~(Base.y * (9.999999999)) + 1);
    }
    else coord.innerHTML = "";
});
socket.on("si", function (si) {
    var SI = document.getElementById("si");
    document.getElementById("siN").innerHTML = "Server: " + si.name;
    document.getElementById("siR").innerHTML = "Region: " + si.region;
    SI.style.height = "auto";
    SI.style.paddingBottom = "5px";
});
socket.on("b", function (b) {
    var Score = document.getElementById("score");
    if (Base && Base.Health.val) {
        Score.style.height = "20px";
        Score.innerHTML = Math.round(Base.Score);
    }
    var leaders = document.getElementById("leaders");
    while (leaders.firstChild) {
        leaders.removeChild(leaders.firstChild);
    }
    for (var i = 0; i < b.length; ++i) {
        var user = document.createElement("span"),
            score = document.createElement("span"),
            name = document.createTextNode(escapeHTML(b[i].Name));
        score.className = "score";
        if (b[i].ID === "/#" + socket.id) {
            score.className += " your";
            user.className = "your";
            Score.style.height = 0;
        }
        score.appendChild(document.createTextNode(Math.round(b[i].Score)));
        leaders.appendChild(user).appendChild(score).parentNode.appendChild(name);
    }
});

socket.on("d", function (d) {
    Base.Health = 0;
    document.getElementById("output").innerHTML = (d.type ? "You collided with " : "You were killed by ") + (escapeHTML(d.user).trim() || "an anonymous Wacher");
    openHome();
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
document.getElementsByClassName('coord check')[0].onclick = toggleCoords;

function toggleFPS() {
    var fpsc = document.getElementById("fpsc"),
        check = document.getElementsByClassName("fps check")[0];
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
function joinGame() {
    socket.emit("join", {usr: document.getElementById("wacher").value});
    hideHome();
    document.onmousemove = function (e) {
        if (Date.now() - lastM > 20) {
            var distance = Math.sqrt(Math.pow(($(document).width() / 2) - e.pageX, 2) + Math.pow(($(document).height() / 2) - e.pageY, 2)) / sizes.scale,
                angle = Math.atan2(e.pageY - $(document).height() / 2, e.pageX - $(document).width() / 2);
            socket.emit("i", {a: angle, d: distance});
            lastM = Date.now();
        }
    };
}
function hideHome() {
    var home = document.getElementById("home");
    home.style.opacity = 0;
    document.getElementById("output").innerHTML = "";
    $(".overlays").css("opacity", 1);
    $("button.settings").attr("style", "");
    $("section.settings").css({
        "max-height": 40,
        "padding-top": 0
    }).addClass("closed");
    setTimeout(function () {
        home.style.zIndex = -1;
    }, 300);
}
function openHome() {
    $("#home").css({opacity: 1, "z-index": 0});
    $(".overlays").css("opacity", 0);
    document.onmousemove = null;
}
function toggleCoords() {
    var coord = document.getElementById("coord"),
        check = document.getElementsByClassName("coord check")[0];
    if (!check.style.background || check.style.background === "none") {
        check.style.background = '#444';
        coord.className = "overlays";
        coord.style.opacity = 1;
    }
    else {
        check.style.background = 'none';
        coord.style.opacity = 0;
        setTimeout(function () {
            coord.className = "";
        }, 300);
    }
}

socket.on("console", function (log) {
    console.log(log);
});

window.onmousedown = function(){
    socket.emit("p",1);
}

window.onmouseup = function(){
    socket.emit("p",0);
}
canvas.onselectstart = function() { return false; };