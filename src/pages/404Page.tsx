export default function NotFoundPage() {
    return (
        <div id="error-box">
            <h2 className="mx-auto text-[2em]">404</h2>
            <h2>Page Not Found</h2>
            <p className="text-left">
                The page you requested could not be found.
                <br />
                <br />
                Please check the URL for mistakes and try again.
            </p>
        </div>
    );
}
