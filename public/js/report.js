import { goToPage } from "./ajax";
import { findURLValue, openModal } from "./common";

/**
 * @description Runs a script based on which report the user requested in the URL.
 * @param {String} pageQuery The query string of the page.
 */
export function setupReport(pageQuery) {
    let type = findURLValue(pageQuery, "type");
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
            openModal("issue", "We couldn't identify the type of report you were trying to view", "Invalid Report Type");
            goToPage("admin/main");
            break;
    }
}

/**
 * @description Sets up the circulation report.
 */
function setupCirculationReport() {
    //
}

/**
 * @description Sets up the purchases report.
 */
function setupPurchasesReport() {
    //
}

/**
 * @description Sets up the removed books report.
 */
function setupRemovedReport() {
    //
}
