import { type RouteConfig, index, layout, prefix, route } from "@react-router/dev/routes";

export default [
    index("pages/HomePage.tsx"),
    route("about", "pages/AboutPage.tsx"),
    ...prefix("account", [
        layout("pages/AccountPage.tsx", [
            index("pages/account/OverviewPage.tsx"),
            route("checkouts", "pages/account/CheckoutsPage.tsx"),
            route("notifications", "pages/account/NotificationsPage.tsx"),
            route("security", "pages/account/SecurityPage.tsx")
        ])
    ]),
    ...prefix("admin", [
        index("pages/admin/MainPage.tsx"),
        route("barcode", "pages/admin/BarcodePage.tsx"),
        route("editEntry", "pages/admin/EditEntryPage.tsx"),
        route("editUser", "pages/admin/EditUserPage.tsx"),
        route("help", "pages/admin/HelpPage.tsx"),
        route("inventory", "pages/admin/InventoryPage.tsx"),
        route("report", "pages/admin/ReportPage.tsx"),
        route("view", "pages/admin/ViewPage.tsx")
    ]),
    route("advancedSearch", "pages/AdvancedSearchPage.tsx"),
    route("help", "pages/HelpPage.tsx"),
    route("login", "pages/LoginPage.tsx"),
    route("result", "pages/ResultPage.tsx"),
    route("search", "pages/SearchPage.tsx"),
    route("signup", "pages/SignupPage.tsx"),
    route("sitemap", "pages/SitemapPage.tsx"),
    route("*?", "pages/404Page.tsx")
] satisfies RouteConfig;
