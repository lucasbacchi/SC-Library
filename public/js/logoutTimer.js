// Webworker for logout timer

onmessage = function (e) {
    if (e.data === "start") {
        start();
    } else if (e.data === "stop") {
        stop();
    }
};

var logoutTimer;
var logoutCountdown;

function start() {
    logoutTimer = setTimeout(() => {
        let timeRemaining = 2 * 60 * 0.1;
        postMessage({command: "show", timeRemaining: timeRemaining});
        clearInterval(logoutCountdown);
        logoutCountdown = setInterval(() => {
            if (timeRemaining > 0) {
                timeRemaining--;
                postMessage({command: "update", timeRemaining: timeRemaining});
            } else {
                postMessage({command: "logout", timeRemaining: timeRemaining});
            }
        }, 1000);
    }, 3 * 60 * 1000 * 0.05);
}

function stop() {
    clearTimeout(logoutTimer);
    clearInterval(logoutCountdown);
}

console.log("logoutTimer.js has Loaded!");
