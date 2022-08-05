import firebase from "firebase/compat/app";
import { convertDataTagsToLinks, isAdminCheck } from "./ajax";
import { directory } from "./globals";

export function setupSitemap() {
    var folder = "", blacklist = ['404', 'autogenindex', 'account', 'result'];
    if (firebase.auth().currentUser) blacklist.push('login', 'signup');
    for (let i = 0; i < directory.length; i++) {
        var page = directory[i].substring(1);
        if (blacklist.indexOf(page) != -1) continue;
        var slash = page.indexOf('/');
        if (slash != -1) {
            var newFolder = page.substring(0, slash);
            page = page.substring(slash + 1);
            if (newFolder == "admin") continue;
            if (folder != newFolder && newFolder != "") {
                $('#sitemap').append("<li>" + formatPageString(newFolder) + "</li>");
                $('#sitemap').append("<ul id='" + newFolder + "'></ul>");
            }
            folder = newFolder;
            var char;
            if (folder == "account") char = "?"; else if (folder == "") char = ""; else char = "/";
            $('#' + folder).append("<li><a data-link-target='" + folder + char + page + "'>" + formatPageString(page) + "</a></li>");
        } else {
            folder = "";
            char = "";
            $('#sitemap').append("<li><a data-link-target='" + folder + char + page + "'>" + formatPageString(page) + "</a></li>");
        }
    }
    isAdminCheck().then((isAdmin) => {
        if (isAdmin) {
            buildAdminSitemap();
        }

        convertDataTagsToLinks();
    }).catch((error) => {
        console.error(error);
    });
}

function buildAdminSitemap() {
    $('#sitemap').append("<li>Admin</li>");
    $('#sitemap').append("<ul id='admin'></ul>");
    for (let i = 0; i < directory.length; i++) {
        var page = directory[i].substring(1);
        var slash = page.indexOf('/');
        if (slash != -1) {
            var newFolder = page.substring(0, slash);
            page = page.substring(slash + 1);
            if (newFolder != "admin") continue;
            $('#admin').append("<li><a data-link-target='admin/" + page + "'>" + formatPageString(page) + "</a></li>");
        }
    }
}

function formatPageString(page) {
    page = page.charAt(0).toUpperCase() + page.substring(1);
    for (let i = 1; i < page.length; i++) {
        if (/[A-Z]/.test(page.charAt(i))) {
            page = page.substring(0, i) + " " + page.substring(i);
            i++;
        }
    }
    return page;
}
