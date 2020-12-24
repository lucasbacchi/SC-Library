var settingsDirectory = [
    "/overview",
    "/notifications",
    "/checkouts",
    "/delete"
];

function updateAccount() {
    alert("To Do: add functionality...");
}

var currentPanel;
function goToSettingsPanel(newPanel) {
    $("#settings-column").removeClass("fade");

    newPanel = "/" + newPanel;
    if (settingsDirectory.includes(newPanel)){
        xhttp.open("GET", "/content/account" + newPanel + ".html" + query + hash, true);
    } else if (settingsDirectory.includes(newPanel.substr(0, newPanel.indexOf(".")))) {
        xhttp.open("GET", "/content/account" + newPanel + query + hash, true);
    } else {
        xhttp.open("GET", "/content/404.html", true);
    }
    xhttp.send();

    // Set the content of the page
    xhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            if (currentPanel != newPanel) {
                $('#settings-column').addClass("fade");
            }

            document.getElementById("settings-column").innerHTML = xhttp.responseText;
            // Remove Placeholder Height
            document.getElementById("settings-column").style.height = "";

            currentPanel = newPanel;
        }
    }
}

console.log("account.js has Loaded!");