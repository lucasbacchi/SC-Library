export default function InventoryPage() {
    return (
        <>
            <div id="inventory-container" className="my-0 mx-12">
                <p className="text-left">
                    Would you like to start a new inventory? This will restart the input process and you will lose
                    progress.
                </p>
                <br />
                <button id="restart-inventory">Restart</button>
                <br />
                <br />
                <p className="text-left">If you would like to continue your current inventory, please click below.</p>
                <br />
                <button id="continue-scanning-button">Continue Scanning</button>
                <div id="recent-scans" className="h-100 w-50 overflow-scroll m-0"></div>
            </div>
            <div id="inventory-popup">
                <div id="inventory-popup-box">
                    <div id="inventory-inner-popup-box"></div>
                    <button id="inventory-cancel-button" className="absolute bottom-2 left-2">
                        Cancel
                    </button>
                    <button id="inventory-next-button" className="absolute bottom-2 right-2">
                        Next
                    </button>
                </div>
                <input className="hidden-input" id="inventory-book-barcode" />
            </div>
        </>
    );
}
