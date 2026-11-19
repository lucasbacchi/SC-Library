import type { ReactNode } from "react";
import "./css/main.css";
import "./css/print.css";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

type AppProps = {
    children: ReactNode;
};

/**
 * Primary application layout component.
 * Provides the global layout shell including the top navigation bar,
 * notification/alert banner container, main content area, and footer.
 */
export default function App({ children }: AppProps) {
    return (
        <>
            <Navbar />
            <div id="banner-container"></div>
            {children}
            <Footer />
        </>
    );
}
