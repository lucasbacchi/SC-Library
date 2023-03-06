// Webworker for logout timer
const POPUP_DELAY = 3 * 60 * 1000; // 3 minutes
const COUNTDOWN_TIMER = 2 * 60; // 2 minutes

// This creates an event listener for the main thread to send messages to
onmessage = (e) => {
    if (e.data === "start") {
        start();
    } else if (e.data === "stop") {
        stop();
    } else if (e.data === "reset") {
        stop();
        start();
    }
};

var logoutTimer;
var logoutCountdown;
/**
 * @description Starts the logout timer.
 */
function start() {
    logoutTimer = setTimeout(() => {
        let timeRemaining = COUNTDOWN_TIMER;
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
    }, POPUP_DELAY);
}

/**
 * @description Stops the logout timer.
 */
function stop() {
    clearTimeout(logoutTimer);
    clearInterval(logoutCountdown);
}

console.log("logoutTimer.js has Loaded!");
