import { isAdminCheck } from "./ajax";
import { auth, directory } from "./globals";

/**
 * @description Sets up the sitemap page. It also determines if the user is an admin and adds the admin pages to the sitemap.
 */
export function setupSitemap() {
    let folder = "";
    const blacklist = ["404", "account", "result"];
    if (auth.currentUser) blacklist.push("login", "signup");
    for (let i = 0; i < directory.length; i++) {
        let page = directory[i];
        if (blacklist.indexOf(page) != -1) continue;
        const slash = page.indexOf("/");
        let char;
        if (slash != -1) {
            const newFolder = page.substring(0, slash);
            page = page.substring(slash + 1);
            if (newFolder == "admin") continue;
            if (folder != newFolder && newFolder != "") {
                (document.getElementById("sitemap") as Element).insertAdjacentHTML(
                    "beforeend",
                    "<li>" + formatPageString(newFolder) + "</li>"
                );
                (document.getElementById("sitemap") as Element).insertAdjacentHTML(
                    "beforeend",
                    "<ul id='" + newFolder + "'></ul>"
                );
            }
            folder = newFolder;
            if (folder == "account") char = "?";
            else if (folder == "") char = "";
            else char = "/";
            (document.querySelector("#" + folder) as Element).insertAdjacentHTML(
                "beforeend",
                "<li><a href='/" + folder + char + page + "'>" + formatPageString(page) + "</a></li>"
            );
        } else {
            folder = "";
            char = "";
            (document.getElementById("sitemap") as Element).insertAdjacentHTML(
                "beforeend",
                "<li><a href='/" + folder + char + page + "'>" + formatPageString(page) + "</a></li>"
            );
        }
    }
    isAdminCheck()
        .then((isAdmin) => {
            if (isAdmin) {
                buildAdminSitemap();
            }
        })
        .catch((error) => {
            console.error(error);
        });
}

/**
 * @description Builds the admin sitemap.
 */
function buildAdminSitemap() {
    (document.getElementById("sitemap") as Element).insertAdjacentHTML("beforeend", "<li>Admin</li>");
    (document.getElementById("sitemap") as Element).insertAdjacentHTML("beforeend", "<ul id='admin'></ul>");
    for (let i = 0; i < directory.length; i++) {
        let page = directory[i];
        const slash = page.indexOf("/");
        if (slash != -1) {
            const newFolder = page.substring(0, slash);
            page = page.substring(slash + 1);
            if (newFolder != "admin") continue;
            (document.getElementById("admin") as Element).insertAdjacentHTML(
                "beforeend",
                "<li><a href='/admin/" + page + "'>" + formatPageString(page) + "</a></li>"
            );
        }
    }
}

/**
 * @description Formats a page string to be more readable. It capitalizes the first letter of each page, and adds a space between words.
 * @param {String} page The name of the page to be formatted.
 * @returns {String} The formatted page string.
 */
function formatPageString(page: string) {
    page = page.charAt(0).toUpperCase() + page.substring(1);
    for (let i = 1; i < page.length; i++) {
        if (/[A-Z]/.test(page.charAt(i))) {
            page = page.substring(0, i) + " " + page.substring(i);
            i++;
        }
    }
    return page;
}
