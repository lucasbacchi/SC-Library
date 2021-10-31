function setupReport(pageQuery) {
    var type = findURLValue(pageQuery, "type");
    switch (type) {
        case "circulation":
            setupCirculationReport();
            break;
        case "purchases":
            setupPurchasesReport();
            break;
        case "removed":
            setupRemovedReport();
            break;
        default:
            goToPage("404");
            break;
    }
}

function setupCirculationReport() {
    //
}

function setupPurchasesReport() {
    //
}

function setupRemovedReport() {
    //
}