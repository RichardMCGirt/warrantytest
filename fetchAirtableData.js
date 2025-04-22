let mergeExecuted = {
    "airtable-data": false,
    "feild-data": false
};

document.addEventListener("DOMContentLoaded", function () {
    console.log("🚀 DOM Fully Loaded, waiting for table population...");

    waitForTableData("airtable-data", () => {
        console.log("✅ Table 'airtable-data' detected, starting merge...");
        if (!mergeExecuted["airtable-data"]) {
            mergeFieldTechColumn("airtable-data", 2);
            mergeExecuted["airtable-data"] = true; // Mark as merged
        }
    });

    waitForTableData("feild-data", () => {
        console.log("✅ Table 'feild-data' detected, starting merge...");
        if (!mergeExecuted["feild-data"]) {
            mergeFieldTechColumn("feild-data", 2);
            mergeExecuted["feild-data"] = true; // Mark as merged
        }
    });
});

// Function to wait for table population
function waitForTableData(tableId, callback) {
    const checkInterval = 500; // Check every 500ms
    let attempts = 20; // Max attempts to prevent infinite loops

    const interval = setInterval(() => {
        const table = document.getElementById(tableId);
        if (table && table.querySelectorAll("tbody tr").length > 0) {
            console.log(`📊 Table '${tableId}' is populated! Rows found: ${table.querySelectorAll("tbody tr").length}`);
            clearInterval(interval);
            callback(); // Run merge function only after detecting data
        } else {
            console.log(`⏳ Waiting for table '${tableId}' to populate... Attempts left: ${attempts}`);
            attempts--;
            if (attempts <= 0) {
                console.warn(`⚠️ Table '${tableId}' never populated. Stopping checks.`);
                clearInterval(interval);
            }
        }
    }, checkInterval);
}

function clearTable(tableId) {
    const table = document.getElementById(tableId);
    if (table) {
        table.querySelector("tbody").innerHTML = ""; // Clear previous rows
    }
}


// Function to merge rows with duplicate names
function mergeFieldTechColumn(tableId, columnIndex) {
    if (mergeExecuted[tableId]) {
        console.warn(`⚠️ Merge already executed for ${tableId}. Skipping.`);
        return;
    }
    mergeExecuted[tableId] = true; // Mark merging as done

    const table = document.getElementById(tableId);
    if (!table) {
        console.warn(`⚠️ Table '${tableId}' not found.`);
        return;
    }

    const rows = Array.from(table.querySelectorAll("tbody tr"));
    const headerRow = table.querySelector("thead tr"); // Get the header row
    console.log(`📊 Found ${rows.length} rows in table '${tableId}' for merging.`);

    let lastCell = null;
    let spanCount = 1;
    let seenNames = new Set(); // Store seen names to track merging

    rows.forEach((row, rowIndex) => {
        const cell = row.cells[columnIndex];
        if (!cell) return;

        const cellText = cell.textContent.trim().replace(/\s+/g, ' ').toLowerCase();

        console.log(`🔎 Checking row ${rowIndex + 1}: "${cellText}"`);

        if (seenNames.has(cellText)) {
            // This is a duplicate, merge it into the same column
            if (lastCell && cellText === lastCell.textContent.trim().replace(/\s+/g, ' ').toLowerCase()) {
                spanCount++;
                lastCell.rowSpan = spanCount; // Expand row span
                row.removeChild(cell); // Remove only the duplicate cell
                console.log(`➡️ Merging row ${rowIndex + 1} with previous. New rowspan: ${spanCount}`);
            }
        } else {
            // First occurrence, keep it
            lastCell = cell;
            spanCount = 1;
            seenNames.add(cellText);
            console.log(`✅ Keeping row ${rowIndex + 1} as unique.`);
        }
    });

    console.log(`✔️ Finished merging for table '${tableId}'.`);

    // Adjust the `<th>` to span correctly
    adjustTableHeader(tableId, columnIndex, spanCount);
}
