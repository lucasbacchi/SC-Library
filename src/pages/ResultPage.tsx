export default function ResultPage() {
    return (
        <>
            <div id="result-page-container" className="opacity-0">
                <div id="result-page-header">
                    <div id="result-page-back-button" tabIndex={0}>
                        <span className="material-symbols-outlined">arrow_back</span> Back
                    </div>
                    <div id="checkout-button" tabIndex={0}>
                        Borrow
                    </div>
                </div>
                <div id="result-page-image-container">
                    <img className="result-page-image" tabIndex={0} alt="" />
                </div>
                <div id="result-page-info-bar">
                    <h6>Barcode Number</h6>
                    <p id="result-page-barcode-number"></p>
                    <h6>ISBN Number</h6>
                    <p id="result-page-isbn-number"></p>
                    <h6>Call Number</h6>
                    <p id="result-page-call-number"></p>
                    <h6>Publication Info{/*rmation*/}</h6>
                    <p id="result-page-publisher"></p>
                    <p id="result-page-publish-date"></p>
                    <h6>Actions</h6>
                    <div id="result-page-actions-container">
                        <div id="result-page-email" tabIndex={0} className="hidden">
                            <span className="material-symbols-outlined">mail</span> Save to Email
                        </div>
                        <div id="result-page-link" tabIndex={0}>
                            <span className="material-symbols-outlined">link</span> Copy Link
                        </div>
                        <div id="result-page-print" tabIndex={0}>
                            <span className="material-symbols-outlined">print</span> Print
                        </div>
                        <div id="result-page-edit" tabIndex={0} className="hidden">
                            <span className="material-symbols-outlined">edit</span> Edit
                        </div>
                    </div>
                </div>
                <div id="result-page-details">
                    <p id="result-page-title"></p>
                    <p id="result-page-subtitle"></p>
                    <h6 id="result-page-author-header">Author</h6>
                    <p id="result-page-author"></p>
                    <h6 id="result-page-illustrator-header">Illustrator</h6>
                    <p id="result-page-illustrator"></p>
                    <h6 id="result-page-description-header">Description</h6>
                    <p id="result-page-description"></p>
                    <h6 id="result-page-subjects-header">Subjects</h6>
                    <p id="result-page-subjects"></p>
                    <h6>Audience</h6>
                    <p id="result-page-audience"></p>
                    <h6 id="result-page-physical-description-header">Physical Description</h6>
                    <p id="result-page-medium"></p>
                    <p>
                        <span id="result-page-pages"></span> pages
                    </p>
                </div>
            </div>
            <div id="checkout-popup">
                <div id="checkout-popup-box">
                    <div id="checkout-inner-popup-box"></div>
                    <button id="checkout-cancel-button" className="absolute bottom-2 left-2">
                        Cancel
                    </button>
                    <button id="checkout-next-button" className="absolute bottom-2 right-2">
                        Next
                    </button>
                </div>
                <input className="hidden-input" id="checkout-book-barcode" />
                <input className="hidden-input" id="checkout-security-barcode" />
            </div>
        </>
    );
}
