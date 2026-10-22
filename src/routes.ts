import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [index("pages/HomePage.tsx"), 
    route("about", "pages/about.tsx"), 
    route("help", "pages/help.tsx"),
    route("search", "pages/search.tsx"),
    route("*?", "pages/404Page.tsx")] satisfies RouteConfig;
