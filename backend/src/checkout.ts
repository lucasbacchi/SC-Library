/**
 * Book checkout (borrowing) routes for the SC Library API.
 *
 * Plug into the Express app with one line, after app.use(express.json()):
 *     app.use(createCheckoutRouter({ firestore, auth: firebaseAuth }));
 *
 * Data model
 *   checkouts/{autoId}          one document per loan (kept after return, as history)
 *       { barcodeNumber, uid, cardNumber, title, checkedOutAt, dueDate, returnedAt: null }
 *   activeCheckouts/{barcode}   exists only while that book is out; makes "one borrower per book" safe
 *       { checkoutId, uid, dueDate, checkedOutAt }
 *
 * Loans are NOT stored in the books documents, because those are publicly readable
 * and would reveal who borrowed what. Browsers never write these collections;
 * only this server (Firebase Admin SDK) does.
 */

import { Router, type NextFunction, type Request, type Response } from "express";
import { Timestamp, type DocumentData, type Firestore } from "firebase-admin/firestore";
import type { Auth, DecodedIdToken } from "firebase-admin/auth";

/* ---------- Policy (change these as the library decides) ---------- */

export interface CheckoutPolicy {
    /** How long a loan lasts before the member is reminded to return it. */
    loanDays: number;
    /** How many books one member may have out at once, or null for no limit. */
    maxActiveLoans: number | null;
    /** If true, only accounts an admin approved (users.canCheckOutBooks) may borrow. */
    requireApproval: boolean;
}

/**
 * Current library policy (Nov 2026): loans of about 3 weeks, no borrowing limit,
 * and anyone with a library account may borrow. Every account gets a card number at signup;
 * it works as an ID in the system, not a physical card.
 * To add a limit later, set maxActiveLoans to a number, e.g. 3.
 */
export const DEFAULT_CHECKOUT_POLICY: CheckoutPolicy = {
    loanDays: 21,
    maxActiveLoans: null,
    requireApproval: false
};

/* ---------- Helpers ---------- */

class CheckoutError extends Error {
    constructor(
        public readonly status: number,
        message: string
    ) {
        super(message);
    }
}

interface StoredBook {
    barcodeNumber: number;
    title?: string;
    canBeCheckedOut?: boolean;
    isDeleted?: boolean;
    isHidden?: boolean;
}

/** Library barcodes look like 1171100323: "11711" followed by 5 digits. */
function parseBarcode(value: unknown): number {
    // Express 5 types a route parameter as string | string[], so check it really is one string.
    if (typeof value !== "string" || !/^11711\d{5}$/.test(value)) {
        throw new CheckoutError(400, "A valid barcode number is required.");
    }
    return Number(value);
}

/** 1171100323 is book 23 in document "003". */
function bookLocation(barcodeNumber: number): { documentId: string; index: number } {
    return {
        documentId: String(Math.floor(barcodeNumber / 100) % 1000).padStart(3, "0"),
        index: barcodeNumber % 100
    };
}

function findBook(data: DocumentData | undefined, barcodeNumber: number): StoredBook | null {
    const book = (data?.books as StoredBook[] | undefined)?.[bookLocation(barcodeNumber).index];
    if (!book || book.barcodeNumber != barcodeNumber || book.isDeleted || book.isHidden) return null;
    return book;
}

function addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

/* ---------- Router ---------- */

export function createCheckoutRouter(options: {
    firestore: Firestore;
    auth: Auth;
    policy?: Partial<CheckoutPolicy>;
}): Router {
    const { firestore, auth } = options;
    const policy: CheckoutPolicy = { ...DEFAULT_CHECKOUT_POLICY, ...options.policy };
    const router = Router();

    /** Returns the logged-in user, or null when the token is missing, invalid, or expired. */
    async function getUser(req: Request): Promise<DecodedIdToken | null> {
        const header = req.header("authorization");
        if (!header?.startsWith("Bearer ")) return null;
        try {
            return await auth.verifyIdToken(header.slice("Bearer ".length));
        } catch (error) {
            const code = (error as { code?: unknown })?.code;
            if (typeof code === "string" && code.startsWith("auth/")) return null; // bad token -> 401
            throw error; // a real server problem (e.g. missing credentials) -> 500
        }
    }

    /** Wraps a route so errors become clean JSON responses. */
    function handle(fn: (req: Request, res: Response) => Promise<void>) {
        return (req: Request, res: Response, next: NextFunction) => {
            fn(req, res).catch((error: unknown) => {
                if (error instanceof CheckoutError) {
                    res.status(error.status).json({ error: error.message });
                    return;
                }
                console.error("Checkout route error:", error);
                if (res.headersSent) {
                    next(error);
                    return;
                }
                res.status(500).json({ error: "Internal server error" });
            });
        };
    }

    /**
     * GET /books/:barcode/availability
     * Public. Says whether a book can be borrowed, without revealing who has it.
     */
    router.get(
        "/books/:barcode/availability",
        handle(async (req, res) => {
            const barcodeNumber = parseBarcode(req.params.barcode);
            const bookSnapshot = await firestore.doc(`books/${bookLocation(barcodeNumber).documentId}`).get();
            const book = findBook(bookSnapshot.data(), barcodeNumber);
            if (!book) throw new CheckoutError(404, "That book could not be found.");

            if (book.canBeCheckedOut === false) {
                res.json({ available: false, reason: "reference" });
                return;
            }
            const active = await firestore.doc(`activeCheckouts/${barcodeNumber}`).get();
            if (active.exists) {
                const dueDate = (active.get("dueDate") as Timestamp | undefined)?.toDate().toISOString() ?? null;
                res.json({ available: false, reason: "checked-out", dueDate });
                return;
            }
            res.json({ available: true, loanDays: policy.loanDays });
        })
    );

    /**
     * POST /books/:barcode/checkout
     * Logged-in members only. Borrows the book in one transaction.
     */
    router.post(
        "/books/:barcode/checkout",
        handle(async (req, res) => {
            const user = await getUser(req);
            if (!user) throw new CheckoutError(401, "Please log in to borrow books.");
            const barcodeNumber = parseBarcode(req.params.barcode);

            const userRef = firestore.doc(`users/${user.uid}`);
            const bookDocRef = firestore.doc(`books/${bookLocation(barcodeNumber).documentId}`);
            const activeRef = firestore.doc(`activeCheckouts/${barcodeNumber}`);
            const myActiveQuery = firestore.collection("activeCheckouts").where("uid", "==", user.uid);
            const checkoutRef = firestore.collection("checkouts").doc();

            const result = await firestore.runTransaction(async (transaction) => {
                // All reads first (Firestore transactions require reads before writes).
                const [userSnap, bookSnap, activeSnap, myActive] = await Promise.all([
                    transaction.get(userRef),
                    transaction.get(bookDocRef),
                    transaction.get(activeRef),
                    transaction.get(myActiveQuery)
                ]);

                // Membership: must have a library account with a card number, not disabled or deleted.
                const member = userSnap.data();
                if (!member || typeof member.cardNumber !== "number" || member.isDeleted || member.isDisabled) {
                    throw new CheckoutError(403, "Please finish setting up your library account to borrow books.");
                }
                if (policy.requireApproval && member.canCheckOutBooks !== true) {
                    throw new CheckoutError(403, "Your account has not been approved to borrow books yet.");
                }

                // The book: must exist, be visible, and not be a reference book.
                const book = findBook(bookSnap.data(), barcodeNumber);
                if (!book) throw new CheckoutError(404, "That book could not be found.");
                if (book.canBeCheckedOut === false) {
                    throw new CheckoutError(409, "This book is a reference book and cannot be checked out.");
                }

                // Availability and the per-member limit.
                if (activeSnap.exists) {
                    const message =
                        activeSnap.get("uid") === user.uid
                            ? "You already have this book checked out."
                            : "This book is already checked out.";
                    throw new CheckoutError(409, message);
                }
                if (policy.maxActiveLoans !== null && myActive.size >= policy.maxActiveLoans) {
                    throw new CheckoutError(
                        409,
                        `You can have up to ${policy.maxActiveLoans} books checked out at a time.`
                    );
                }

                // Writes.
                const now = new Date();
                const checkedOutAt = Timestamp.fromDate(now);
                const dueDate = Timestamp.fromDate(addDays(now, policy.loanDays));

                transaction.create(checkoutRef, {
                    barcodeNumber,
                    uid: user.uid,
                    cardNumber: member.cardNumber,
                    title: book.title ?? "",
                    checkedOutAt,
                    dueDate,
                    returnedAt: null
                });
                // create() fails if this document already exists, so two people can never
                // borrow the same book even if they click at the same moment.
                transaction.create(activeRef, { checkoutId: checkoutRef.id, uid: user.uid, checkedOutAt, dueDate });
                transaction.update(userRef, { lastCheckoutTime: checkedOutAt, lastUpdated: checkedOutAt });

                return { checkoutId: checkoutRef.id, barcodeNumber, title: book.title ?? "", dueDate };
            });

            res.status(201).json({ ...result, dueDate: result.dueDate.toDate().toISOString() });
        })
    );

    /**
     * GET /checkouts/mine
     * Logged-in members only. Lists the books they currently have out.
     */
    router.get(
        "/checkouts/mine",
        handle(async (req, res) => {
            const user = await getUser(req);
            if (!user) throw new CheckoutError(401, "Please log in to see your checkouts.");

            const active = await firestore.collection("activeCheckouts").where("uid", "==", user.uid).get();
            const loans = await Promise.all(
                active.docs.map(async (doc) => {
                    const loan = await firestore.doc(`checkouts/${doc.get("checkoutId")}`).get();
                    return {
                        checkoutId: loan.id,
                        barcodeNumber: loan.get("barcodeNumber") as number,
                        title: loan.get("title") as string,
                        checkedOutAt: (loan.get("checkedOutAt") as Timestamp).toDate().toISOString(),
                        dueDate: (loan.get("dueDate") as Timestamp).toDate().toISOString()
                    };
                })
            );
            loans.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
            res.json({ checkouts: loans, maxActiveLoans: policy.maxActiveLoans });
        })
    );

    return router;
}