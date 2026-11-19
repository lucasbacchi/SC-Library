import { useState, type SyntheticEvent } from "react";
import { Link } from "react-router";
import defaultBookImage from "../img/default-book.png";
import avImage from "../img/av-image.png";

export interface BookCardData {
    barcodeNumber: number;
    title: string;
    authors?: { firstName: string; lastName: string }[];
    iconImageLink?: string;
    thumbnailImageLink?: string;
    coverImageLink?: string;
    medium?: string;
}

interface BookCardProps {
    book: BookCardData;
}

export default function BookCard({ book }: BookCardProps) {
    const [imageLoaded, setImageLoaded] = useState(false);

    const imageSrc =
        book.iconImageLink ||
        book.thumbnailImageLink ||
        book.coverImageLink ||
        (book.medium === "av" ? avImage : defaultBookImage);

    let authorString = "";
    if (book.authors && book.authors.length > 0) {
        authorString = book.authors
            .map((a) => `${a.lastName || ""}${a.lastName && a.firstName ? ", " : ""}${a.firstName || ""}`)
            .filter((s) => s.length > 0)
            .join(" & ");
    }

    function handleImageLoad() {
        setImageLoaded(true);
    }

    function handleImageError(e: SyntheticEvent<HTMLImageElement>) {
        const img = e.currentTarget;
        img.onerror = null;
        img.src = defaultBookImage;
        setImageLoaded(true);
    }

    return (
        <Link to={`/result?id=${book.barcodeNumber}`}>
            <div
                className="book"
                style={{
                    opacity: imageLoaded ? 1 : 0,
                    transition: "opacity 0.3s ease-in, box-shadow 0.3s"
                }}
            >
                <div>
                    <img
                        className="bookimage"
                        src={imageSrc}
                        alt={`Cover of ${book.title}`}
                        onLoad={handleImageLoad}
                        onError={handleImageError}
                    />
                </div>
                <div className="basic-info">
                    <b>
                        <p className="title">{book.title || "Untitled"}</p>
                    </b>
                    {authorString && <p className="author">{authorString}</p>}
                </div>
            </div>
        </Link>
    );
}
