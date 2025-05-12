document.addEventListener('DOMContentLoaded', () => {
    // ✅ Load filters from URL (if present)
    const urlParams = new URLSearchParams(window.location.search);
    const urlTechs = urlParams.get('techs');
    if (urlTechs) {
        const techArray = urlTechs.split(',').map(t => t.trim());
        localStorage.setItem("selectedFilters", JSON.stringify(techArray));
        console.log("🌐 Loaded filters from URL:", techArray);
    }
    const menuToggle = document.getElementById('menu-toggle');
    const checkboxContainer = document.getElementById('checkbox-container');

    menuToggle.addEventListener('click', () => {
        checkboxContainer.classList.toggle('show');
    });

    document.addEventListener('click', (event) => {
        if (!checkboxContainer.contains(event.target) && !menuToggle.contains(event.target)) {
            checkboxContainer.classList.remove('show');
        }
    });

    console.log('🚀 DOM Loaded: waiting for table to populate...');

    const savedUser = localStorage.getItem("userName")?.replace(/\s+/g, ' ').trim();
    const storedFiltersRaw = localStorage.getItem("selectedFilters");
    let storedFilters;

    try {
        storedFilters = JSON.parse(storedFiltersRaw);
    } catch {
        storedFilters = [];
    }

    if ((!storedFilters || storedFilters.length === 0) && savedUser) {
        localStorage.setItem("selectedFilters", JSON.stringify([savedUser]));
        console.log(`🔐 No filters found — defaulting selectedFilters to saved userName: "${savedUser}"`);
    } else {
        console.log("📦 Found stored selectedFilters:", storedFilters);
    }

    waitForTableData(() => {
        const techs = extractFieldTechsFromTable();
        console.log('🧑‍🔧 Field Techs Extracted:', techs);
        generateCheckboxes(techs);

        // ✅ Add observers after checkboxes + table are ready
        observeTableData('#airtable-data tbody');
        observeTableData('#feild-data tbody');

        // ♻️ Apply filters one last time after initial table load
        console.log("♻️ Reapplying filters after table is fully populated...");
        applyFilters();
    });
});

function resetTableMerges(tableSelector) {
    const rows = document.querySelectorAll(`${tableSelector} tbody tr`);
    rows.forEach(row => {
        Array.from(row.cells).forEach(cell => {
            cell.removeAttribute('rowspan');
            cell.style.display = ''; // make sure no cell is hidden
        });
    });
}

document.getElementById('search-input').addEventListener('input', function () {
    const searchValue = this.value.toLowerCase();

    ['#airtable-data', '#feild-data'].forEach(tableSelector => {
        resetTableMerges(tableSelector);

        const table = document.querySelector(tableSelector);
        const rows = table.querySelectorAll('tbody tr');
        const thead = table.querySelector('thead');
        const h2 = table.closest('.scrollable-div')?.previousElementSibling;

        let visibleCount = 0;
        const uniqueTechs = new Set();

        rows.forEach(row => {
            const cells = Array.from(row.querySelectorAll('td'));
            const rowMatches = cells.some(cell => cell.textContent.toLowerCase().includes(searchValue));

            row.style.display = rowMatches ? '' : 'none';

            if (rowMatches) {
                visibleCount++;
                const techCell = row.querySelector('td:nth-child(1)');
                if (techCell) {
                    uniqueTechs.add(techCell.textContent.trim());
                }
            }
        });

        // Show/hide the entire table section
        table.style.display = visibleCount > 0 ? 'table' : 'none';
        if (thead) thead.style.display = visibleCount > 0 ? 'table-header-group' : 'none';
        if (h2) h2.style.display = visibleCount > 0 ? 'block' : 'none';

        const hideTechColumn = uniqueTechs.size <= 1;

        // Hide or show TH in column 1
        const ths = table.querySelectorAll('thead th');
        if (ths[0]) ths[0].style.display = hideTechColumn ? 'none' : '';

        // Hide or show TDs in column 1
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells[0]) cells[0].style.display = hideTechColumn ? 'none' : '';
        });
    });
});

function extractFieldTechsFromTable() {
    const techs = new Set();

    ['#airtable-data', '#feild-data'].forEach(selector => {
        const rows = document.querySelectorAll(`${selector} tbody tr`);
        rows.forEach(row => {
            const cell = row.cells[0]; // ✅ Field Tech is the first column
            if (cell) {
                const names = cell.textContent.split(',')
                .map(name => name.replace(/\s+/g, ' ').trim());
                            names.forEach(name => {
                    if (name) techs.add(name);
                });
            }
        });
    });

    return Array.from(techs).sort();
}

// ✅ Function to observe when table rows are added
function observeTableData(selector) {
    const targetNode = document.querySelector(selector);
    if (!targetNode) {
        console.warn(`⚠️ Table body (${selector}) not found. Retrying in 500ms...`);
        setTimeout(() => observeTableData(selector), 500);
        return;
    }

    let timeoutId = null;

    const observer = new MutationObserver((mutationsList) => {
        if (mutationsList.some(mutation => mutation.addedNodes.length > 0)) {
            clearTimeout(timeoutId); // Reset timer on each mutation

            timeoutId = setTimeout(() => {
                console.log("🔁 Reapplying filters after table update...");
                applyFilters();
            }, 200); // Wait 200ms after last row added
        }
    });

    observer.observe(targetNode, { childList: true });
}

// ✅ Generate Checkboxes only when menu is clicked
function generateCheckboxes(fieldTechs) {
    const filterContainer = document.getElementById('filter-branch');
    filterContainer.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'checkbox-row';

    const allLabel = document.createElement('label');
    allLabel.innerHTML = `
        <input type="checkbox" class="filter-checkbox" value="All">
        <span>All</span>
    `;
    wrapper.appendChild(allLabel);

    fieldTechs.forEach(name => {
        const label = document.createElement('label');
        label.innerHTML = `
<input type="checkbox" class="filter-checkbox" value="${name.trim().replace(/\s+/g, ' ')}">
            <span>${name}</span>
        `;
        wrapper.appendChild(label);
    });

    filterContainer.appendChild(wrapper);

    attachCheckboxListeners(); // ✅ Enables user changes
    loadFiltersFromLocalStorage(); // ✅ Applies saved selection
}

document.getElementById('clear-filters').addEventListener('click', () => {
    localStorage.removeItem('selectedFilters');
    document.querySelectorAll('.filter-checkbox').forEach(cb => cb.checked = false);
    const allCheckbox = document.querySelector('.filter-checkbox[value="All"]');
    if (allCheckbox) allCheckbox.checked = true;
    applyFilters();
});

// ✅ Ensure fetchFieldTechs is defined
async function fetchFieldTechs() {
    const AIRTABLE_API_KEY = window.env.AIRTABLE_API_KEY;
    const AIRTABLE_BASE_ID = window.env.AIRTABLE_BASE_ID;
    const AIRTABLE_TABLE_NAME = window.env.AIRTABLE_TABLE_NAME;
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}`;

    try {
        const response = await fetch(url, {
            headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` }
        });

        if (!response.ok) throw new Error(`❌ Error fetching data: ${response.statusText}`);

        const data = await response.json();

        const fieldTechsFromAirtable = new Set();

        data.records.forEach(record => {
            const fieldTech = record.fields['field tech'];
            if (fieldTech) {
                if (Array.isArray(fieldTech)) {
                    fieldTech.forEach(name => fieldTechsFromAirtable.add(name.trim()));
                } else {
                    fieldTech.split(',').forEach(name => fieldTechsFromAirtable.add(name.trim()));
                }
            }
        }); 
    } catch (error) {
        console.error('❌ Error fetching field techs:', error);
    }
}

function filterRows() {
    const selectedBranches = Array.from(document.querySelectorAll('#filter-branch input[name="branch"]:checked'))
        .map(checkbox => checkbox.value.toLowerCase().trim());

    console.log('🔍 Filtering rows for selected branches:', selectedBranches);

    if (selectedBranches.length === 0 || selectedBranches.includes("all")) {
        document.querySelectorAll('#airtable-data tbody tr, #feild-data tbody tr').forEach(row => {
            row.style.display = "";
        });
        console.log('✅ Showing all rows (All selected or none selected)');
        return;
    }

    const tables = [
        { table: document.querySelector('#airtable-data tbody'), h2: document.querySelector('#main-content h2') },
        { table: document.querySelector('#feild-data tbody'), h2: document.querySelector('#secoundary-content h2') }
    ];

    tables.forEach(({ table, h2 }) => {
        if (!table) return;

        const tableRows = table.querySelectorAll('tr');
        let visibleRows = 0;

        tableRows.forEach(row => {
            const fieldTechColumn = row.querySelector('td:nth-child(3)');
            if (!fieldTechColumn) return;

            const fieldTech = fieldTechColumn.textContent.toLowerCase().trim();
            const isVisible = selectedBranches.some(branch => fieldTech.includes(branch));

            row.style.display = isVisible ? "" : "none";

            if (isVisible) visibleRows++;
        });

        console.log(`📄 Table "${h2?.textContent}": ${visibleRows} rows visible`);

        if (visibleRows === 0) {
            if (h2) h2.style.display = 'none';
            table.closest('table').querySelector('thead').style.display = 'none';
        } else {
            if (h2) h2.style.display = '';
            table.closest('table').querySelector('thead').style.display = '';
        }
    });
}

// ✅ Function to extract Field Techs from the table dynamically
function getFieldTechsFromTable() {
    const fieldTechsInTable = new Set();
    
    const tableRows1 = document.querySelectorAll('#airtable-data tbody tr');
    const tableRows2 = document.querySelectorAll('#feild-data tbody tr');

    function extractFieldTechs(rows) {
        rows.forEach(row => {
            if (row.style.display === "none") return; // ✅ Ignore hidden rows

            const fieldTechColumn = row.querySelector('td:nth-child(1)'); // Ensure correct column
            if (fieldTechColumn && fieldTechColumn.textContent.trim() !== '') {
                fieldTechColumn.textContent
                    .split(',')
                    .map(name => name.trim()) // Trim whitespace
                    .filter(name => name !== '') // Remove empty values
                    .forEach(name => fieldTechsInTable.add(name));
            }
        });
    }

    extractFieldTechs(tableRows1);
    extractFieldTechs(tableRows2);

    return Array.from(fieldTechsInTable).sort();
}

function waitForElements(callback) {
    const checkInterval = setInterval(() => {
        const checkboxes = document.querySelectorAll('#filter-branch input[name="branch"]');
        if (checkboxes.length > 0) {
            clearInterval(checkInterval);
            callback();
        }
    }, 300); // ✅ Check every 300ms until checkboxes exist
}

// ✅ Save selected checkboxes to `localStorage`
function saveFiltersToLocalStorage() {
    const selected = Array.from(document.querySelectorAll('.filter-checkbox:checked'))
        .map(cb => cb.value);
    localStorage.setItem('selectedFilters', JSON.stringify(selected));
}


// ✅ Load selected checkboxes from `localStorage`
function loadFiltersFromLocalStorage() {
    const storedRaw = localStorage.getItem('selectedFilters') || '[]';
    let stored;

    try {
        stored = JSON.parse(storedRaw);
    } catch (e) {
        console.error("❌ Failed to parse selectedFilters from localStorage:", storedRaw);
        stored = [];
    }

    console.log("📦 Loaded selectedFilters from localStorage:", stored);

    const checkboxes = document.querySelectorAll('.filter-checkbox');

    checkboxes.forEach(cb => {
        const normalizedCbValue = cb.value.replace(/\s+/g, ' ').trim();
        const isChecked = stored.includes(normalizedCbValue);

        cb.checked = isChecked;

        console.log(`🔘 Checkbox "${cb.value}" normalized to "${normalizedCbValue}" → checked: ${isChecked}`);
    });

    // ⏳ Defer filtering until table rows are ready
    waitForTableData(() => {
        console.log("⏳ Tables now loaded — applying filters...");
        applyFilters();
    });
}

function applyFilters() {
    const selectedTechs = Array.from(document.querySelectorAll('.filter-checkbox:checked'))
        .map(cb => cb.value.trim().replace(/\s+/g, ' ')); // Normalize

    const isAll = selectedTechs.includes('All') || selectedTechs.length === 0;

    ['#airtable-data', '#feild-data'].forEach(selector => {
        const rows = document.querySelectorAll(`${selector} tbody tr`);
        let visibleCount = 0;
    
        rows.forEach(row => {
            const techCell = row.cells[0]; // ✅ Column 1 (Field Tech)
            const rawText = techCell ? techCell.textContent.trim() : '';
            const normalized = rawText.replace(/\s+/g, ' ');
            const techNames = normalized.split(',').map(name => name.trim());
    
            const isVisible = isAll || selectedTechs.some(name => techNames.includes(name));
            row.style.display = isVisible ? '' : 'none';
            if (isVisible) visibleCount++;
        });
    
        const table = document.querySelector(selector);
        const thead = table.querySelector('thead');
        const h2 = table.closest('.scrollable-div')?.previousElementSibling;
    
        table.style.display = visibleCount > 0 ? 'table' : 'none';
        if (thead) thead.style.display = visibleCount > 0 ? 'table-header-group' : 'none';
        if (h2) h2.style.display = visibleCount > 0 ? 'block' : 'none';
    
        console.log(`🧮 ${visibleCount} rows visible in ${selector}`);
    });  
}

// ✅ Function to ensure table data is loaded before filtering
function waitForTableData(callback) {
    const tableCheckInterval = setInterval(() => {
        const tableRows = document.querySelectorAll('#airtable-data tbody tr, #feild-data tbody tr');
        if (tableRows.length > 0) {
            clearInterval(tableCheckInterval);
            callback();
        } else {
        }
    }, 300); // ✅ Check every 300ms until table has rows
}

function handleCheckboxChange(event) {
    const checkbox = event.target;
    const checkboxes = document.querySelectorAll('#filter-branch input[name="branch"]');
    const allCheckbox = document.querySelector('#filter-branch input[value="All"]');

    if (checkbox.value === "All" && checkbox.checked) {
        checkboxes.forEach(cb => {
            if (cb !== allCheckbox) cb.checked = false;
        });
    } else if (checkbox !== allCheckbox) {
        allCheckbox.checked = false;
    }

    saveFiltersToLocalStorage();
    filterRows();
}

function attachCheckboxListeners() {
    const checkboxes = document.querySelectorAll('.filter-checkbox');
    const allCheckbox = [...checkboxes].find(cb => cb.value === "All");

    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            console.log(`🧩 Checkbox changed: "${checkbox.value}" → ${checkbox.checked}`);

            const selected = Array.from(checkboxes)
                .filter(cb => cb.checked && cb.value !== "All")
                .map(cb => cb.value.replace(/\s+/g, ' ').trim());

            console.log("🔍 Currently selected (excluding All):", selected);

            if (selected.length > 0) {
                const normalized = selected[0];
                localStorage.setItem("userName", normalized);
                console.log(`💾 Saved userName to localStorage: "${normalized}"`);
            } else {
                console.log("🗑️ No tech selected, userName not saved.");
            }

            if (checkbox.value === "All" && checkbox.checked) {
                console.log("🧼 'All' selected — deselecting others...");
                checkboxes.forEach(cb => {
                    if (cb !== allCheckbox) cb.checked = false;
                });
            } else {
                allCheckbox.checked = false;
            }

            saveFiltersToLocalStorage();
            console.log("📦 Saved selected filters to localStorage.");
            updateURLWithFilters(selected);

            applyFilters();
            console.log("🎯 Applied filters to the table.");
        });
    });

    console.log("✅ Checkbox listeners attached.");
}

function updateURLWithFilters(selected) {
    const params = new URLSearchParams(window.location.search);
    if (selected.length > 0) {
        params.set('techs', selected.join(','));
    } else {
        params.delete('techs');
    }
    const newURL = `${window.location.pathname}?${params.toString()}`;
    history.replaceState(null, '', newURL);
}


document.querySelectorAll('table tbody tr').forEach((row, index) => {
    if (row.cells.length !== 2) {
      console.warn(`⚠️ Row ${index + 1} has ${row.cells.length} cells (should be 2)`, row.innerHTML);
    }
  });
  