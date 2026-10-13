import cors from "cors";
import express, { type Request, type Response } from "express";
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import nodemailer from "nodemailer";

const app = express();
const port = Number(process.env.PORT ?? 8080);
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "https://library.southchurch.com,http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
const mailCollection = process.env.MAIL_COLLECTION ?? "mail";
const defaultFrom = "South Church Library <library@southchurch.com>";
const smtpConnectionUri = process.env.SMTP_CONNECTION_URI;
const smtpPassword = process.env.SMTP_PASSWORD;

const firebaseApp = getApps().length > 0 ? getApps()[0] : initializeApp();
export const firebaseAuth = getAuth(firebaseApp);
export const firestore = getFirestore(firebaseApp);

type MailAttachment = {
    filename?: string;
    content?: string;
    path?: string;
    contentType?: string;
};

type MailRequest = {
    to: string | string[];
    subject: string;
    text?: string;
    html?: string;
    cc?: string | string[];
    bcc?: string | string[];
    from?: string;
    replyTo?: string;
    headers?: Record<string, string>;
    attachments?: MailAttachment[];
};

function getMailRequest(body: unknown): MailRequest {
    if (!body || typeof body !== "object") {
        throw new Error("Email request is required.");
    }

    const request = body as Record<string, unknown>;
    const to = request.to;
    const subject = request.subject;
    const text = request.text;
    const html = request.html;
    if (
        !((typeof to === "string" && to.length > 0) || (Array.isArray(to) && to.length > 0)) ||
        typeof subject !== "string" ||
        subject.length === 0 ||
        (typeof text !== "string" && typeof html !== "string")
    ) {
        throw new Error("Email recipient, subject, and content are required.");
    }

    if (
        subject.length > 998 ||
        (typeof text === "string" && text.length > 1_000_000) ||
        (typeof html === "string" && html.length > 1_000_000)
    ) {
        throw new Error("Email content is too large.");
    }

    return {
        to: to as string | string[],
        subject,
        text: typeof text === "string" ? text : undefined,
        html: typeof html === "string" ? html : undefined,
        cc: request.cc as string | string[] | undefined,
        bcc: request.bcc as string | string[] | undefined,
        from: typeof request.from === "string" ? request.from : undefined,
        replyTo: typeof request.replyTo === "string" ? request.replyTo : undefined,
        headers: request.headers as Record<string, string> | undefined,
        attachments: request.attachments as MailAttachment[] | undefined
    };
}

function addresses(value: string | string[] | undefined): string[] {
    return value ? (Array.isArray(value) ? value : [value]) : [];
}

function canSendMail(request: MailRequest, email: string | undefined): boolean {
    if (!email) {
        return false;
    }

    const userEmail = email.toLowerCase();
    const recipients = addresses(request.to).map((address) => address.toLowerCase());
    const cc = addresses(request.cc).map((address) => address.toLowerCase());
    const bcc = addresses(request.bcc).map((address) => address.toLowerCase());
    const libraryAddress = "library@southchurch.com";
    const onlyUserOrLibrary = [...recipients, ...cc, ...bcc].every(
        (address) => address === userEmail || address === libraryAddress
    );

    return onlyUserOrLibrary && (recipients.includes(userEmail) || recipients.includes(libraryAddress));
}

function createMailTransport() {
    if (!smtpConnectionUri || !smtpPassword) {
        throw new Error("SMTP_CONNECTION_URI and SMTP_PASSWORD must be configured.");
    }

    const uri = new URL(smtpConnectionUri);
    return nodemailer.createTransport({
        host: uri.hostname,
        port: Number(uri.port || (uri.protocol === "smtps:" ? 465 : 587)),
        secure: uri.protocol === "smtps:",
        auth: {
            user: decodeURIComponent(uri.username),
            pass: smtpPassword
        }
    });
}

async function authenticateRequest(req: Request) {
    const authorization = req.header("authorization");
    if (!authorization?.startsWith("Bearer ")) {
        return null;
    }

    return firebaseAuth.verifyIdToken(authorization.slice("Bearer ".length));
}

type RegistrationProfile = {
    firstName: string;
    lastName: string;
    phone: string;
    address: string;
};

function getRegistrationProfile(body: unknown): RegistrationProfile {
    if (!body || typeof body !== "object") {
        throw new Error("Registration profile is required.");
    }

    const profile = body as Record<string, unknown>;
    const firstName = typeof profile.firstName === "string" ? profile.firstName.trim() : "";
    const lastName = typeof profile.lastName === "string" ? profile.lastName.trim() : "";
    const phone = typeof profile.phone === "string" ? profile.phone.trim() : "";
    const address = typeof profile.address === "string" ? profile.address.trim() : "";

    if (!firstName) {
        throw new Error("firstName is required.");
    }
    if (!lastName) {
        throw new Error("lastName is required.");
    }
    if (!phone) {
        throw new Error("phone is required.");
    }
    if (!address) {
        throw new Error("address is required.");
    }
    if (firstName.length > 100 || lastName.length > 100) {
        throw new Error("Name is too long.");
    }
    if (phone.length > 200) {
        throw new Error("phone is too long.");
    }
    if (address.length > 200) {
        throw new Error("address is too long.");
    }

    if (!/^(\+\d{1,2}\s)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/.test(phone)) {
        throw new Error("A valid phone number is required.");
    }

    return {
        firstName,
        lastName,
        phone,
        address
    };
}

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

// Completes registration after Firebase Auth creates the account.
app.post("/users/register", async (req: Request, res: Response) => {
    try {
        const user = await authenticateRequest(req);
        if (!user) {
            res.status(401).json({ error: "A valid Firebase ID token is required." });
            return;
        }

        const profile = getRegistrationProfile(req.body);
        const userReference = firestore.doc(`users/${user.uid}`);
        const writableVariablesReference = firestore.doc("config/writable_vars");
        const userDocument = await firestore.runTransaction(async (transaction) => {
            const existingUser = await transaction.get(userReference);

            if (existingUser.exists) {
                return existingUser.data();
            }

            const writableVariables = await transaction.get(writableVariablesReference);
            if (!writableVariables.exists) {
                const error = new Error("Document config/writable_vars does not exist.");
                error.name = "MissingWritableVariables";
                throw error;
            }

            const variables = writableVariables.data();
            const nextCardNumber =
                typeof variables?.nextCardNumber === "number"
                    ? variables.nextCardNumber
                    : typeof variables?.maxCardNumber === "number"
                      ? variables.maxCardNumber + 1
                      : null;
            if (nextCardNumber === null) {
                const error = new Error("config/writable_vars.nextCardNumber must be a number.");
                error.name = "InvalidWritableVariables";
                throw error;
            }

            const newCardNumber = nextCardNumber;
            const now = new Date();
            const newUser = {
                cardNumber: newCardNumber,
                firstName: profile.firstName,
                lastName: profile.lastName,
                email: user.email ?? null,
                phone: profile.phone,
                address: profile.address,
                pfpLink: null,
                pfpIconLink: null,
                dateCreated: now,
                lastCheckoutTime: null,
                lastSignInTime: now,
                uid: user.uid,
                canCheckOutBooks: false,
                isDeleted: false,
                isHidden: false,
                lastUpdated: now,
                notificationsOn: true,
                emailVerified: false,
                isDisabled: false
            };

            const cardNumberReference = firestore.doc(`cardNumbers/${newCardNumber}`);
            transaction.create(userReference, newUser);
            transaction.create(cardNumberReference, {
                uid: user.uid,
                allocatedAt: now
            });

            transaction.update(writableVariablesReference, {
                nextCardNumber: newCardNumber + 1,
                maxCardNumber: FieldValue.delete()
            });
            return newUser;
        });

        res.status(200).json({ user: userDocument });
    } catch (error) {
        if (error instanceof Error && error.message.endsWith("is required.")) {
            res.status(400).json({ error: error.message });
            return;
        }

        if (
            error instanceof Error &&
            (error.message.endsWith("is too long.") || error.message === "Name is too long.")
        ) {
            res.status(400).json({ error: error.message });
            return;
        }

        if (error instanceof Error && error.message === "A valid phone number is required.") {
            res.status(400).json({ error: error.message });
            return;
        }

        if (error instanceof Error && error.name === "MissingWritableVariables") {
            res.status(500).json({ error: error.message });
            return;
        }

        if (error instanceof Error && error.name === "InvalidWritableVariables") {
            res.status(500).json({ error: error.message });
            return;
        }

        if (error instanceof Error && error.message.includes("Decoding Firebase ID token failed")) {
            res.status(401).json({ error: "The Firebase ID token is invalid or expired." });
            return;
        }

        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.post("/mail/send", async (req: Request, res: Response) => {
    let mailReference;
    try {
        const user = await authenticateRequest(req);
        if (!user) {
            res.status(401).json({ error: "A valid Firebase ID token is required." });
            return;
        }

        const request = getMailRequest(req.body);
        if (!canSendMail(request, user.email)) {
            res.status(403).json({ error: "You are not allowed to send this email." });
            return;
        }

        mailReference = firestore.collection(mailCollection).doc();
        await mailReference.set({
            to: request.to,
            cc: request.cc ?? null,
            bcc: request.bcc ?? null,
            from: request.from ?? defaultFrom,
            replyTo: request.replyTo ?? defaultFrom,
            message: {
                subject: request.subject,
                text: request.text ?? null,
                html: request.html ?? null,
                attachments: request.attachments ?? null
            },
            uid: user.uid,
            delivery: { state: "PROCESSING" },
            createdAt: new Date()
        });

        const transport = createMailTransport();
        const result = await transport.sendMail({
            from: request.from ?? defaultFrom,
            to: request.to,
            cc: request.cc,
            bcc: request.bcc,
            subject: request.subject,
            text: request.text,
            html: request.html,
            replyTo: request.replyTo ?? defaultFrom,
            headers: request.headers,
            attachments: request.attachments
        });
        await mailReference.update({
            delivery: {
                state: "SUCCESS",
                messageId: result.messageId,
                accepted: result.accepted,
                rejected: result.rejected,
                completedAt: new Date()
            }
        });
        res.status(200).json({ id: mailReference.id });
    } catch (error) {
        if (mailReference) {
            await mailReference
                .update({
                    delivery: {
                        state: "ERROR",
                        error: error instanceof Error ? error.message : "Email delivery failed",
                        completedAt: new Date()
                    }
                })
                .catch((updateError) => console.error(updateError));
        }

        if (
            error instanceof Error &&
            (error.message.includes("Email request") ||
                error.message.includes("Email recipient") ||
                error.message.includes("Email content"))
        ) {
            res.status(400).json({ error: error.message });
            return;
        }
        console.error(error);
        res.status(500).json({ error: "Email delivery failed." });
    }
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
