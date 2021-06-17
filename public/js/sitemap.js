function sitemapSetup() {
    var folder = "", blacklist = ['404', 'autogenindex', 'account', 'result'];
    for (var i = 0; i < directory.length; i++) {
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
            if (folder == "account") char = "?"; else char = "/";
            $('#' + folder).append("<li><a onclick='javascript:goToPage(\"" + folder + char + page + "\");'>" + formatPageString(page) + "</a></li>");
        } else {
            folder = "";
            $('#sitemap').append("<li><a onclick='javascript:goToPage(\"" + folder + char + page + "\");'>" + formatPageString(page) + "</a></li>");
        }
    }
    isAdminCheck().then((x) => {buildAdminSitemap();}).catch((y) => {});
}

function buildAdminSitemap() {
    $('#sitemap').append("<li>Admin</li>");
    $('#sitemap').append("<ul id='admin'></ul>");
    for (var i = 0; i < directory.length; i++) {
        var page = directory[i].substring(1);
        var slash = page.indexOf('/');
        if (slash != -1) {
            var newFolder = page.substring(0, slash);
            page = page.substring(slash + 1);
            if (newFolder != "admin") continue;
            $('#admin').append("<li><a onclick='javascript:goToPage(\"admin/" + page + "\");'>" + formatPageString(page) + "</a></li>");
        }
    }
}

function formatPageString(page) {
    page = page.charAt(0).toUpperCase() + page.substring(1);
    for (var i = 1; i < page.length; i++) {
        if (/[A-Z]/.test(page.charAt(i))) {
            page = page.substring(0, i) + " " + page.substring(i);
            i++
        }
    }
    return page;
}