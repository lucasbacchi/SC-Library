import { type ReactNode, useEffect, useState } from "react";

interface ClientLoaderProps {
    /** Whether the loader is actively loading. Defaults to true when no children or controlled. */
    loading?: boolean;
    /** Content to display and fade into once loading is complete. */
    children?: ReactNode;
    /** Optional text to display below the spinner. */
    text?: string;
    /** Size of the spinner. Defaults to "medium". */
    size?: "small" | "medium" | "large";
    /** Whether to take the full viewport height. */
    fullScreen?: boolean;
    /** Additional CSS classes for the container. */
    className?: string;
    /** Minimum height of the container to prevent layout shift. */
    minHeight?: string | number;
}

/**
 * ClientLoader displays a clean spinner during client loading/hydration,
 * and smoothly fades into the page content once loading finishes.
 */
export default function ClientLoader({
    loading = true,
    children,
    text,
    size = "medium",
    fullScreen = false,
    className = "",
    minHeight
}: ClientLoaderProps) {
    const [hasFadedIn, setHasFadedIn] = useState(!loading);

    useEffect(() => {
        if (!loading) {
            setHasFadedIn(true);
        }
    }, [loading]);

    // Standalone spinner mode (no children)
    if (!children) {
        if (!loading) return null;

        return (
            <div
                className={`client-loader-container ${fullScreen ? "client-loader-fullscreen" : ""} ${className}`}
                style={minHeight ? { minHeight } : undefined}
                role="status"
                aria-live="polite"
            >
                <div className={`spinner spinner-${size}`} aria-hidden="true" />
                {text && <p className="client-loader-text">{text}</p>}
                <span className="sr-only">Loading...</span>
            </div>
        );
    }

    // Wrapper mode with fade-in into children
    return (
        <div className={`client-loader-wrapper ${className}`} style={minHeight ? { minHeight } : undefined}>
            {loading ? (
                <div
                    className={`client-loader-container ${fullScreen ? "client-loader-fullscreen" : ""}`}
                    role="status"
                    aria-live="polite"
                >
                    <div className={`spinner spinner-${size}`} aria-hidden="true" />
                    {text && <p className="client-loader-text">{text}</p>}
                    <span className="sr-only">Loading...</span>
                </div>
            ) : (
                <div className={hasFadedIn ? "fade" : ""}>{children}</div>
            )}
        </div>
    );
}
