export default function BarcodePage() {
    return (
        <>
            <a id="link" download></a>
            <h3 className="ml-2 text-left">Generate a Single Barcode</h3>
            <p className="text-left ml-2 mb-2">
                It must start with <strong>1 1711</strong> and be a total of 10 characters long.
            </p>
            <span className="ml-2">1 1711</span>
            <input id="barcode-single-input" className="w-17.5 ml-2" />
            <button id="merge-one-barcode" className="ml-1">
                Generate One
            </button>
            <br />
            <h3 className="ml-2 text-left mt-6">Generate Multiple Barcodes</h3>
            <p className="text-left ml-2 mb-2">
                They must both start with <strong>1 1711</strong> and be a total of 10 characters long.
            </p>
            <span className="ml-2">Start: 1 1711</span>
            <input id="barcode-multiple-input-start" className="w-17.5 ml-2" />
            <span className="ml-2">End: 1 1711</span>
            <input id="barcode-multiple-input-end" className="w-17.5 ml-2" />
            <button id="merge-multiple-barcodes" className="ml-1">
                Generate Multiple
            </button>
            <p className="ml-2 clear-left text-left mt-2.5 text-[14px]">
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
            <canvas id="canvas" width={1125} height={375} className="clear-both mt-4 ml-17.5"></canvas>
        </>
    );
}
