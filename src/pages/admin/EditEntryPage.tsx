export default function EditEntryPage() {
    return (
        <div id="form-container">
            <h1 id="edit-entry-header">Edit This Entry:</h1>
            <h6 className="form-title no-underline">
                Barcode: <span id="barcode"></span>
            </h6>
            <div className="form-section">
                <h6 className="form-title">Title</h6>
                <p className="form-description">Required.</p>
                <input id="book-title" placeholder="" className="long-form-input" />
            </div>
            <div className="form-section no-av">
                <h6 className="form-title">Subtitle</h6>
                <p className="form-description">Optional. If the book has a subtitle, include it.</p>
                <input id="book-subtitle" placeholder="" className="long-form-input" />
            </div>
            <div className="form-section no-av">
                <h6 className="form-title">Author</h6>
                <p className="form-description">
                    Currently only allows for 2 authors to be added. If there are more than 2 authors, include it in the
                    description.
                </p>
                <input id="book-author-1-last" placeholder="Last Name" className="short-form-input" />
                <span>, </span>
                <input id="book-author-1-first" placeholder="First Name" className="short-form-input" />
                <br />
                <input id="book-author-2-last" placeholder="Last Name" className="short-form-input" />
                <span>, </span>
                <input id="book-author-2-first" placeholder="First Name" className="short-form-input" />
            </div>
            <div className="form-section no-av">
                <h6 className="form-title">Illustrator</h6>
                <p className="form-description">
                    Currently only allows for 2 illustrators to be added. If there are more than 2 illustrators, include
                    it in the description.
                </p>
                <input id="book-illustrator-1-last" placeholder="Last Name" className="short-form-input" />
                <span>, </span>
                <input id="book-illustrator-1-first" placeholder="First Name" className="short-form-input" />
                <br />
                <input id="book-illustrator-2-last" placeholder="Last Name" className="short-form-input" />
                <span>, </span>
                <input id="book-illustrator-2-first" placeholder="First Name" className="short-form-input" />
            </div>
            <div className="form-section">
                <h6 className="form-title">Medium</h6>
                <p className="form-description">Required.</p>
                <select id="book-medium" name="medium" defaultValue="">
                    <option value="">Select One …</option>
                    <option value="hardcover">Hardcover</option>
                    <option value="paperback">Paperback</option>
                    <option value="av">AV</option>
                </select>
            </div>
            <div className="form-section no-av">
                <h6 className="form-title">Cover</h6>
                <p className="form-description">
                    An image of the cover of the book. If one does not automatically load, then try finding a picture of
                    it online. Try to ensure that the image is at least 1000px tall. If you can't find an image that
                    looks like the cover of the book, or if you can't find one that's high quality, take a picture of
                    the book and upload the image here.
                </p>
                <div className="book-cover-image-container image-overlay-container no-select">
                    <img id="book-cover-image" src="../img/favicon.ico" alt="" />
                    <div id="book-cover-image-overlay" tabIndex={0} className="image-overlay">
                        <span>Change Photo</span>
                    </div>
                    <input type="file" id="file-input" style={{ display: "none" }} accept="image/*" />
                </div>
            </div>
            <div className="form-section">
                <h6 className="form-title">Subject</h6>
                <p className="form-description">
                    List as many subjects as is appropriate for the book. If you can't find a list of subjects, try
                    looking up on the book on Google or the Library of Congress.
                </p>
                <input id="book-subject-1" placeholder="" className="normal-form-input subject-field" />
                <button id="add-subject">Add a Subject Field</button>
            </div>
            <div className="form-section">
                <h6 className="form-title">Description</h6>
                <p className="form-description">
                    If a description did not load automatically, please enter a brief description. These can often be
                    found on the back of the book, or sometimes on the inside cover. Ensure that the description
                    includes keywords that someone might use to search for the book.
                </p>
                <textarea id="book-description" placeholder="Enter a description" className="long-form-input" />
            </div>
            <div className="form-section">
                <h6 className="form-title">Audience</h6>
                <p className="form-description">
                    This is used to determine the call number as well as to help people filter for the book. "Children"
                    takes first presidence, followed by "Youth" and then "Adult". If none apply, just check "None".
                </p>
                <input type="checkbox" id="book-audience-children" name="audience" value="children" />
                Children
                <input type="checkbox" id="book-audience-youth" name="audience" value="youth" />
                Youth
                <input type="checkbox" id="book-audience-adult" name="audience" value="adult" />
                Adult
                <input type="checkbox" id="book-audience-none" name="audience" value="none" />
                None
            </div>
            <div className="form-section">
                <h6 className="form-title">ISBN 10 Number</h6>
                <p className="form-description">
                    This number is usually found on the back side of the book near the barcode. It is 10 digits long. Do
                    not include any dashes.
                </p>
                <input id="book-isbn-10" placeholder="" className="short-form-input" />
            </div>
            <div className="form-section">
                <h6 className="form-title">ISBN 13 Number</h6>
                <p className="form-description">
                    This number is usually found on the back side of the book near the barcode. It is 13 digits long and
                    starts with "978". Do not include any dashes.
                </p>
                <input id="book-isbn-13" placeholder="" className="short-form-input" />
                <br />
                <input id="book-no-isbn" type="checkbox" /> This book does not have an ISBN number
            </div>
            <div className="form-section">
                <h6 className="form-title">Publisher</h6>
                <p className="form-description">
                    Currently, this only supports adding a maximum of two publishers. If there are more, please list
                    them in the description.
                </p>
                <input id="book-publisher-1" placeholder="" className="normal-form-input" />
                <input id="book-publisher-2" placeholder="" className="normal-form-input" />
            </div>
            <div className="form-section">
                <h6 className="form-title">Publish Date</h6>
                <p className="form-description">
                    Sometimes found on the first few pages of the book. If you can't find a publishing date, you can use
                    the copyright date. If you can only find the year, or only the month and the year, just enter what
                    you can find.
                </p>
                <input
                    id="book-publish-month"
                    placeholder="Month"
                    className="short-form-input"
                    style={{ width: "60px" }}
                />
                <span> / </span>
                <input id="book-publish-day" placeholder="Day" className="short-form-input" style={{ width: "60px" }} />
                <span> / </span>
                <input
                    id="book-publish-year"
                    placeholder="Year"
                    className="short-form-input"
                    style={{ width: "120px" }}
                />
            </div>
            <div className="form-section">
                <h6 className="form-title">Number of Pages</h6>
                <p className="form-description">
                    Enter the number of pages in the book. If the book has no page numbers, check the box below instead.
                </p>
                <input id="book-pages" placeholder="" className="short-form-input" />
                <br />
                <input id="book-unnumbered" type="checkbox" /> This book does not have page numbers
            </div>
            <div className="form-section">
                <h6 className="form-title">Dewey Decimal Class</h6>
                <p className="form-description">
                    If the book is fiction, enter "FIC". Otherwise, there should be a number on the book's spine. If you
                    can't find anything, you can try to look it up{" "}
                    <a href="http://classify.oclc.org/classify2/" target="_blank" rel="noreferrer">
                        here
                    </a>
                    .
                </p>
                <input id="book-dewey" placeholder="" className="short-form-input" />
            </div>
            <div className="form-section">
                <h6 className="form-title">Can this book be checked out?</h6>
                <p className="form-description">
                    Some books, like reference books, cannot be checked out. This will add "REF" to the call number and
                    prevent users from checking out the book.
                </p>
                <select id="book-can-be-checked-out" name="cbco" defaultValue="y">
                    <option value="y">Yes</option>
                    <option value="">No</option>
                </select>
            </div>
            <div className="form-section">
                <h6 className="form-title">Should this book be unlisted?</h6>
                <p className="form-description">This will hide the book from public searches.</p>
                <select id="book-is-hidden" name="hidden" defaultValue="">
                    <option value="">No</option>
                    <option value="y">Yes</option>
                </select>
            </div>
            <div className="form-section">
                <h6 className="form-title">Date of Purchase</h6>
                <p className="form-description">The date the book was purchased for the library.</p>
                <input
                    id="book-purchase-month"
                    placeholder="Month"
                    className="short-form-input"
                    style={{ width: "60px" }}
                />
                <span> / </span>
                <input
                    id="book-purchase-day"
                    placeholder="Day"
                    className="short-form-input"
                    style={{ width: "60px" }}
                />
                <span> / </span>
                <input
                    id="book-purchase-year"
                    placeholder="Year"
                    className="short-form-input"
                    style={{ width: "120px" }}
                />
            </div>
            <div className="form-section">
                <h6 className="form-title">Purchase Price</h6>
                <p className="form-description">The price of the book when purchased for the library.</p>
                <span>$ </span>
                <input id="book-purchase-price" placeholder="" className="short-form-input" />
            </div>
            <div className="form-section">
                <h6 className="form-title">Vendor</h6>
                <p className="form-description">
                    The name of the place where this book was bought. If it was a donation, please enter "Donation".
                </p>
                <input id="book-vendor" placeholder="" className="short-form-input" />
            </div>
            <p id="last-updated"></p>
            <button id="edit-entry-save">Save</button>
            <button id="edit-entry-cancel">Cancel</button>
            <button id="edit-entry-delete" className="delete-button">
                Delete
            </button>
        </div>
    );
}
