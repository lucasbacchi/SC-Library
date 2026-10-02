import cors from "cors";
import express, { type Request, type Response } from "express";
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const app = express();
const port = Number(process.env.PORT ?? 8080);
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "https://library.southchurch.com,http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const firebaseApp = getApps().length > 0 ? getApps()[0] : initializeApp();
export const firebaseAuth = getAuth(firebaseApp);
export const firestore = getFirestore(firebaseApp);

app.disable("x-powered-by");
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

// Root endpoint
app.get("/", (_req: Request, res: Response) => {
    res.json({ name: "SC Library API", status: "ok" });
});

// Health check endpoint
app.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok" });
});

// 404 handler
app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: "Not found" });
});

// Error handling middleware
app.use((error: Error, _req: Request, res: Response) => {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
});

// Start the server
app.listen(port, "0.0.0.0", () => {
    console.log(`SC Library API listening on port ${port}`);
});
