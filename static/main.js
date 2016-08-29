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
            dotsize: 3
        },
        ball: 30,
        glow: 0,

    },
    lastM = 0,
    players = {},
    back = new Image(),
    view = "#FFF";

back.src = "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Graph-paper.svg/1000px-Graph-paper.svg.png";

function setCanvas() {
    canvas.width = $(document).width();
    canvas.height = $(document).height();
    ctx.font = "bold " + (sizes.ball * 0.6) + "px Rubik";
    ctx.textAlign = 'center';
}
(window.onresize = setCanvas)();

$(window).keydown(function(e){
    if (e.which === 27) {
        $("#home").css({opacity:1,"z-index":0});
        $(".overlays").css("opacity",0);
        document.onmousemove = null;
    }
});

$("form").submit(function (e) {
    var name = $("[name='name']"),
        home = $("#home");
    socket.emit("join", {usr: name.val()});
    home.css("opacity", 0);
    $(".overlays").css("opacity", 1);
    $("button.settings").attr("style","");
    $("section.settings").css({
        "max-height": 40,
        "padding-top": 0
    });
    document.onmousemove = function (e) {
        if (Date.now() - lastM > 20) {
            var distance = Math.sqrt(Math.pow(($(document).width() / 2) - e.pageX, 2) + Math.pow(($(document).height() / 2) - e.pageY, 2)),
                angle = Math.atan2(e.pageY - $(document).height() / 2, e.pageX - $(document).width() / 2);
            socket.emit("i", {a: angle, d: distance});
            lastM = Date.now();
        }
    };
    name.val("");
    setTimeout(function () {
        home.css("z-index", -1);
    }, 300);
    e.preventDefault();
    return false;
});
(function draw() {
    var base = players["/#" + socket.id] ? players["/#" + socket.id] : {x: 0.5, y: 0.5},
        delta,
        backX = canvas.width / 2 - (sizes.back.size * base.x),
        backY = canvas.height / 2 - (sizes.back.size * base.y),
        offX = backX % sizes.back.spacing,
        offY = backY % sizes.back.spacing;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#112632";
    for (var xc = -sizes.back.spacing; xc < canvas.width + sizes.back.spacing; xc += sizes.back.spacing) {
        for (var yc = -sizes.back.spacing; yc < canvas.height + sizes.back.spacing; yc += sizes.back.spacing) {
            ctx.beginPath();
            ctx.arc(xc + offX, yc + offY, sizes.back.dotsize, 0, 2 * Math.PI);
            ctx.closePath();
            ctx.fill();
        }
    }
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.fillRect(backX, backY, sizes.back.size, sizes.back.size);
    for (var id in players) {
        var player = players[id];
        ctx.translate((canvas.width / 2) - (sizes.back.size * (base.x - player.x)), (canvas.height / 2) - (sizes.back.size * (base.y - player.y)));
        ctx.save();
        ctx.rotate(player.Angle + (Math.PI * 3 / 2));
        ctx.beginPath();
        ctx.arc(0, 0, sizes.ball, Math.PI, 0);
        ctx.lineTo((sizes.ball * 15) / 2, player.Beam);
        ctx.lineTo(-(sizes.ball * 15) / 2, player.Beam);
        ctx.closePath();
        view = ctx.createRadialGradient(0, 0, sizes.ball, 0, 0, Math.max(player.Beam * 2 * player.Speed, sizes.ball));
        view.addColorStop(0.3, "rgba(255,255,255,0.7)");
        view.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = view;
        ctx.fill();
        ctx.restore();
        ctx.translate((sizes.back.size * (base.x - player.x)) - (canvas.width / 2), (sizes.back.size * (base.y - player.y)) - (canvas.height / 2));

    }
    for (id in players) {
        player = players[id];
        ctx.translate((canvas.width / 2) - (sizes.back.size * (base.x - player.x)), (canvas.height / 2) - (sizes.back.size * (base.y - player.y)));
        ctx.fillStyle = "#FFF";
        ctx.beginPath();
        ctx.arc(0, 0, sizes.ball + sizes.glow, 0, 2 * Math.PI);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#AAA";
        ctx.fillText(player.Name.substr(0, 1).toUpperCase(), 0, sizes.ball / 4, 20);
        ctx.translate((sizes.back.size * (base.x - player.x)) - (canvas.width / 2), (sizes.back.size * (base.y - player.y)) - (canvas.height / 2));
    }
    if (FPS.calcFPS && (delta = Date.now() - FPS.lastCount) >= 500) {
        $("#fps").html(Math.round(FPS.framesShown / delta * 1000));
        FPS.lastCount = Date.now();
        FPS.framesShown = 0;
    }
    FPS.framesShown++;
    requestAnimationFrame(draw);
})();

socket.on("u", function (u) {
    players = u;
});
socket.on("si", function (si) {
    $("#siN").html("Server: "+si.name);
    $("#siR").html("Region: "+si.region);
    $("#si").css({
        height: "auto",
        "padding-bottom": 10
    });
});
socket.on("b", function (b) {
    var top = $("#leaders").html("");
    for (var i = 0; i < b.length; ++i) {
        var user = document.createElement("span");
        user.innerHTML = (i + 1) + " " + escapeHTML(b[i].Name);
        top.append(user);
    }
});
$("button.settings").click(function(){
    if (!this.style.transform || this.style.transform === "none") {
        this.style.transform = "rotate(-120deg)";
        $("section.settings").css({
            "max-height": 500,
            "padding-top": 40
        });
    } else {
        this.style.transform = "";
        $("section.settings").css({
            "max-height": 40,
            "padding-top": 0
        });
    }
});
$(".fps.check").click(function(){
    var fpsc = $("#fpsc");
    if (FPS.calcFPS) {
        this.style.background = 'none';
        fpsc.css("opacity",0);
        setTimeout(function(){
            fpsc.removeClass("overlays");
        },300);
    }
    else {
        this.style.background = '#444';
        fpsc.addClass("overlays").css("opacity",1);
    }
    FPS.calcFPS = !FPS.calcFPS;
});

//TODO: give only users in range ... so server doesn't DDOS user...
//            var glow = ctx.createRadialGradient(0,0,sizes.ball,0,0,sizes.ball+sizes.glow);
//            glow.addColorStop(0,"#999");
//            glow.addColorStop(1,"rgba(0,0,0,0)");
