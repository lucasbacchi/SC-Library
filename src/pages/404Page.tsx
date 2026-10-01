import { useNavigate } from "react-router";

export default function NotFoundPage() {
    const navigate = useNavigate();

    return (
        <div
            id="not-found-page-container"
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                marginTop: "32px",
                gap: "16px"
            }}
        >
            <h1>404 - Page Not Found</h1>
            <p>The page you are looking for does not exist.</p>
            <button onClick={() => navigate("/")}>Go Home</button>
        </div>
    );
}
