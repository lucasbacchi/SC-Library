export default function BarcodePage() {
    return (
        <>
            <a id="link" download></a>
            <h3 style={{ marginLeft: "8px", textAlign: "left" }}>Generate a Single Barcode</h3>
            <p style={{ textAlign: "left", marginLeft: "8px", marginBottom: "8px" }}>
                It must start with <strong>1 1711</strong> and be a total of 10 characters long.
            </p>
            <span style={{ marginLeft: "8px" }}>1 1711</span>
            <input id="barcode-single-input" style={{ width: "70px", marginLeft: "8px" }} />
            <button id="merge-one-barcode" style={{ marginLeft: "4px" }}>
                Generate One
            </button>
            <br />
            <h3 style={{ marginLeft: "8px", textAlign: "left", marginTop: "24px" }}>Generate Multiple Barcodes</h3>
            <p style={{ textAlign: "left", marginLeft: "8px", marginBottom: "8px" }}>
                They must both start with <strong>1 1711</strong> and be a total of 10 characters long.
            </p>
            <span style={{ marginLeft: "8px" }}>Start: 1 1711</span>
            <input id="barcode-multiple-input-start" style={{ width: "70px", marginLeft: "8px" }} />
            <span style={{ marginLeft: "8px" }}>End: 1 1711</span>
            <input id="barcode-multiple-input-end" style={{ width: "70px", marginLeft: "8px" }} />
            <button id="merge-multiple-barcodes" style={{ marginLeft: "4px" }}>
                Generate Multiple
            </button>
            <p style={{ marginLeft: "8px", clear: "left", textAlign: "left", marginTop: "10px", fontSize: "14px" }}>
                <b>Note:</b> Your browser may ask if you want to download multiple files. You must click "Allow" for the
                process to work.
                <br />
                This will start the process of downloading multiple image files. Depending on your settings, you may
                have to keep clicking "Save" in popup windows.
                <br />
                If you are downloading more than 10 barcodes, you may want to go switch the setting called "Ask where to
                save each file before downloading" off. Remember to turn it back on when you are finished.
                <br />
                You probably shouldn't do anything else with your computer while this process completes.
                <br />
                Finally, It would be a good idea to check the barcodes visually. There is no way to guarantee that no
                problem has occurred.
            </p>
            <canvas
                id="canvas"
                width={1125}
                height={375}
                style={{ clear: "both", marginTop: "16px", marginLeft: "70px" }}
            ></canvas>
        </>
    );
}
