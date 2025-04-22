let dropboxRefreshToken = null;


function openMapApp() {
    const addressInput = document.getElementById("address");

    if (!addressInput || !addressInput.value) {
        alert("⚠️ No address available.");
        return;
    }

    const address = encodeURIComponent(addressInput.value.trim());
    const userAgent = navigator.userAgent.toLowerCase();

    // Automatically open Apple Maps on iOS
    if (userAgent.match(/(iphone|ipad|ipod)/i)) {
        window.location.href = `maps://maps.apple.com/?q=${address}`;
        return;
    }

    // Automatically open Google Maps on Android
    if (userAgent.match(/android/i)) {
        window.location.href = `geo:0,0?q=${address}`;
        return;
    }

    // Create a modal for other devices (Desktop, etc.)
    const modal = document.createElement("div");
    modal.id = "mapModal";
    modal.style.position = "fixed";
    modal.style.top = "50%";
    modal.style.left = "50%";
    modal.style.transform = "translate(-50%, -50%)";
    modal.style.background = "#fff";
    modal.style.padding = "20px";
    modal.style.borderRadius = "10px";
    modal.style.boxShadow = "0px 4px 6px rgba(0,0,0,0.1)";
    modal.style.zIndex = "1000";
    modal.style.textAlign = "center";

    // Modal content
    modal.innerHTML = `
        <h3>Select Navigation App</h3>
        <button id="googleMapsBtn" style="padding:10px; margin:5px; background:#4285F4; color:white; border:none; border-radius:5px; cursor:pointer;">Google Maps</button>
        <button id="wazeBtn" style="padding:10px; margin:5px; background:#1DA1F2; color:white; border:none; border-radius:5px; cursor:pointer;">Waze</button>
        <button id="closeModalBtn" style="padding:10px; margin:5px; background:#d9534f; color:white; border:none; border-radius:5px; cursor:pointer;">Close</button>
    `;

    document.body.appendChild(modal);

    // Event listeners for buttons
    document.getElementById("googleMapsBtn").addEventListener("click", function () {
        window.location.href = `https://www.google.com/maps/search/?api=1&query=${address}`;
    });

    document.getElementById("wazeBtn").addEventListener("click", function () {
        window.location.href = `https://waze.com/ul?q=${address}`;
    });

    document.getElementById("closeModalBtn").addEventListener("click", function () {
        document.body.removeChild(modal);
    });
}




document.addEventListener("DOMContentLoaded", async function () {
    console.log("🚀 Page Loaded: JavaScript execution started!");
    let primaryData = null; // <-- Declare it globally within this function


    // ✅ Extract URL Parameters
    const params = new URLSearchParams(window.location.search);
    let recordId = params.get("id");

    if (!recordId || recordId.trim() === "") {
        console.error("❌ ERROR: No record ID found in URL!");
        alert("No job selected. Redirecting to job list.");
        window.location.href = "index.html"; // Redirect to job list
        return;
    }

    console.log("✅ Record ID retrieved:", recordId);

    // ✅ Fetch Airtable API keys from environment
    const airtableApiKey = window.env?.AIRTABLE_API_KEY || "Missing API Key";
    const airtableBaseId = window.env?.AIRTABLE_BASE_ID || "Missing Base ID";
    const airtableTableName = window.env?.AIRTABLE_TABLE_NAME || "Missing Table Name";

    console.log("🔑 Airtable Credentials:", {
        API_Key: airtableApiKey ? "Loaded" : "Not Found",
        Base_ID: airtableBaseId,
        Table_Name: airtableTableName,
    });
    dropboxAccessToken = await fetchDropboxToken();
    

    if (!airtableApiKey || !airtableBaseId || !airtableTableName) {
        console.error("❌ Missing Airtable credentials! Please check your environment variables.");
        alert("Configuration error: Missing Airtable credentials.");
        return;
    }

    try {
        console.log("✅ Fetching Job Details...");
        primaryData = await fetchAirtableRecord(airtableTableName, recordId); // ✅ Assign it here

        // ✅ Fetch Primary Job Details
        console.log("📋 Primary Data Fetched:", primaryData);

     

        // ✅ Populate UI with Primary Fields
        populatePrimaryFields(primaryData.fields);
        const lotName = primaryData.fields["Lot Number and Community/Neighborhood"];
        const status = primaryData.fields["Status"];
        const warrantyId = primaryData.fields["Warranty Record ID"];

        await loadImagesForLot(warrantyId, status).then(() => {
                    checkAndHideDeleteButton();
        });
        
        // ✅ Fetch Subcontractors Based on `b` Value and Populate Dropdown
        let resolvedRecordId = recordId;

if (!recordId.startsWith("rec")) {
    resolvedRecordId = await getRecordIdByWarrantyId(recordId);
    if (!resolvedRecordId) {
        console.error("❌ Could not resolve Record ID for:", recordId);
        return;
    }
}

await fetchAndPopulateSubcontractors(resolvedRecordId);

        /** ✅ Subcontractor Handling Logic **/
        console.log("✅ Setting up subcontractor logic...");

        const subcontractorCheckbox = document.querySelector("#sub-not-needed");
        const subcontractorDropdown = document.querySelector("#subcontractor-dropdown");
        const saveButton = document.querySelector("#save-job");
 // Ensure the delete button exists before referencing it
 const deleteButton = document.getElementById("delete-images-btn");

 
 if (!deleteButton) {
     console.warn("⚠️ Warning: Delete button not found in the DOM. Skipping event listener setup.");
     return; // Exit to prevent errors
 }
        if (!subcontractorCheckbox || !subcontractorDropdown || !saveButton) {
            console.warn("⚠️ Subcontractor checkbox, dropdown, or save button not found in the DOM!");
            return;
        }

        console.log("✅ Found elements:", {
            checkbox: subcontractorCheckbox,
            dropdown: subcontractorDropdown,
            saveButton: saveButton
        });

        // Function to handle checkbox toggle
        function toggleSubcontractorField() {
            const input = document.getElementById("subcontractor-dropdown");
            const datalist = document.getElementById("subcontractor-options");
            const checkbox = document.getElementById("sub-not-needed");
        
            if (!input || !checkbox || !datalist) return;
        
            if (checkbox.checked) {
                input.value = "Sub Not Needed";
                input.setAttribute("readonly", "true");
                input.style.pointerEvents = "none";
                input.style.background = "#e9ecef";
        
                // 🔁 Add "Sub Not Needed" to datalist if missing
                const exists = Array.from(datalist.options).some(opt => opt.value === "Sub Not Needed");
                if (!exists) {
                    const option = document.createElement("option");
                    option.value = "Sub Not Needed";
                    option.label = "Sub Not Needed (Manual Entry)";
                    datalist.appendChild(option);
                }
        
            } else {
                input.value = "";
                input.removeAttribute("readonly");
                input.style.pointerEvents = "auto";
                input.style.background = "";
            }
        }
        
        function checkImagesVisibility() {
            const images = document.querySelectorAll(".image-container img"); // Adjust selector if needed
            if (images.length > 0) {
                deleteButton.style.display = "block"; // Show button if images exist
            } else {
                deleteButton.style.display = "none"; // Hide button if no images
            }
        }
    
        // Optional: Run check when images are dynamically added/removed
        const observer = new MutationObserver(checkImagesVisibility);
        observer.observe(document.body, { childList: true, subtree: true });
    
        // Handle delete button click (assuming you have logic to delete images)
        deleteButton.addEventListener("click", function () {
            document.querySelectorAll(".image-container img.selected").forEach(img => img.remove());
            checkImagesVisibility(); // Re-check visibility after deletion
        });

        // Initialize subcontractor checkbox and dropdown state from job data
        function setInputValue(fieldId, value) {
            const inputElement = document.getElementById(fieldId);
            if (inputElement) {
                if (inputElement.type === "checkbox") {
                    inputElement.checked = !!value;
                } else {
                    inputElement.value = value;
                }
            }
        }

        // Set initial checkbox state from job data
        setCheckboxValue("sub-not-needed", primaryData.fields["Subcontractor Not Needed"]);

        // Apply subcontractor logic on load
        toggleSubcontractorField();

        // Event listener for subcontractor checkbox
        subcontractorCheckbox.addEventListener("change", () => {
            toggleSubcontractorField();
        
            const status = document.getElementById("field-status")?.value || "";
            const normalizedStatus = status.toLowerCase().trim();
        
            console.log("📦 Subcontractor checkbox changed");
            console.log("🔍 Raw status:", status);
            console.log("🔍 Normalized status:", normalizedStatus);
        
            if (
                normalizedStatus === "scheduled- awaiting field" ||
                normalizedStatus === "scheduled awaiting field"
            ) {
                console.log("🚫 Status requires hiding completed fields. Hiding now...");
        
                [
                    "completed-pictures",
                    "upload-completed-picture",
                    "completed-pictures-heading",
                    "job-completed-container",
                    "job-completed",
                    "job-completed-check"
                ].forEach(id => {
                    console.log(`🔒 Hiding element with ID: ${id}`);
                    hideElementById(id);
                });
            } else {
                console.log("✅ Status does not require hiding completed fields.");
            }
        });
        
        
        console.log("🎯 Subcontractor logic fully integrated!");
        
        /** ✅ Add Event Listener for Save Button **/
        saveButton.addEventListener("click", async function () {
            console.log("💾 Save button clicked!");
            const warrantyId = getWarrantyId(); // <-- ensure this is defined BELOW getWarrantyId()
            if (!warrantyId) {
                alert("Warranty ID missing!");
                return;
              }
            const lotName = document.getElementById("job-name")?.value?.trim();
            if (!lotName) {
                return;
            }
        
            try {

                // 🔄 Get the original record from Airtable to compare datetime values
                const recordData = await fetchAirtableRecord(window.env.AIRTABLE_TABLE_NAME, warrantyId);

                if (!recordData || !recordData.fields) {
                    alert("❌ Could not load record data. Try again.");
                    return;
                }
        
                const originalStartUTC = recordData.fields["StartDate"];
                const originalEndUTC = recordData.fields["EndDate"];
                const currentStartLocal = document.getElementById("StartDate")?.value;
                const currentEndLocal = document.getElementById("EndDate")?.value;
        
                const convertedStartUTC = currentStartLocal ? new Date(currentStartLocal).toISOString() : null;
                const convertedEndUTC = currentEndLocal ? new Date(currentEndLocal).toISOString() : null;
                const updatedFields = {}; // add this above all field assignments

                const selectedBillable = document.querySelector('input[name="billable-status"]:checked');
                if (!selectedBillable) {
                    return;
                }
                
                const value = selectedBillable?.value?.trim();
                
                if (value === "Billable" || value === "Non Billable") {
                    updatedFields["Billable/ Non Billable"] = value.trim();
                } else {
                    console.warn("⚠️ Invalid Billable value. Not updating field:", value);
                }
                                let jobData = {
                    "DOW to be Completed": document.getElementById("dow-completed").value,
                    "Subcontractor Not Needed": subcontractorCheckbox.checked,
                    "Billable/ Non Billable": selectedBillable ? selectedBillable.value : undefined,
                    "Homeowner Builder pay": document.getElementById("homeowner-builder").value,
                    "Billable Reason (If Billable)": document.getElementById("billable-reason").value,
                    "Field Review Not Needed": document.getElementById("field-review-needed").checked,
                    "Field Review Needed": document.getElementById("field-review-not-needed").checked,
                    "Subcontractor Payment": parseFloat(document.getElementById("subcontractor-payment").value) || 0,
                    "Materials Needed": document.getElementById("materials-needed").value,
                    "Field Tech Reviewed": document.getElementById("field-tech-reviewed").checked,
                    "Job Completed": document.getElementById("job-completed").checked
                };
        
                // ✅ Add dates only if they changed
                if (convertedStartUTC !== originalStartUTC) {
                    jobData["StartDate"] = convertedStartUTC;
                    console.log("🕓 Updated StartDate:", convertedStartUTC);
                } else {
                    console.log("⏸ No change in StartDate.");
                }
        
                if (convertedEndUTC !== originalEndUTC) {
                    jobData["EndDate"] = convertedEndUTC;
                    console.log("🕓 Updated EndDate:", convertedEndUTC);
                } else {
                    console.log("⏸ No change in EndDate.");
                }
        
                // ✅ Handle subcontractor logic
                jobData["Subcontractor"] = subcontractorCheckbox.checked
                    ? "Sub Not Needed"
                    : subcontractorDropdown.value.trim() || "";
        
                console.log("📤 Sending updated fields to Airtable:", jobData);
                console.log("🔎 Sending Billable value:", updatedFields["Billable/ Non Billable"]);

                if (!warrantyId) {
    console.error("❌ Warranty ID is missing.");
    return;
}
                // ✅ Save to Airtable
                await updateAirtableRecord(window.env.AIRTABLE_TABLE_NAME, warrantyId, jobData);
        
                // ✅ Refresh UI with new data
                const refreshed = await fetchAirtableRecord(window.env.AIRTABLE_TABLE_NAME, warrantyId);

                if (refreshed) {
                    await populatePrimaryFields(refreshed.fields);
                    showToast("✅ Job saved successfully!", "success");
                }
        
            } catch (err) {
                console.error("❌ Error saving job data:", err);
                showToast("❌ Error saving job data. Please try again.", "error");
            }
        });
            
        // ✅ Apply subcontractor logic on load
        toggleSubcontractorField();
    
        // ✅ Event listener for checkbox
        subcontractorCheckbox.addEventListener("change", () => {
            toggleSubcontractorField();
        
            const status = document.getElementById("field-status")?.value || "";
            const normalizedStatus = status.toLowerCase().trim();
        
            console.log("📦 Subcontractor checkbox changed");
            console.log("🔍 Raw status:", status);
            console.log("🔍 Normalized status:", normalizedStatus);
        
            if (
                normalizedStatus === "scheduled- awaiting field" ||
                normalizedStatus === "scheduled awaiting field"
            ) {
                console.log("🚫 Status requires hiding completed fields. Hiding now...");
        
                [
                    "completed-pictures",
                    "upload-completed-picture",
                    "completed-pictures-heading",
                    "job-completed-container",
                    "job-completed",
                    "job-completed-check"
                ].forEach(id => {
                    console.log(`🔒 Hiding element with ID: ${id}`);
                    hideElementById(id);
                });
            } else {
                console.log("✅ Status does not require hiding completed fields.");
            }
        });
        
        
        console.log("🎯 Subcontractor logic fully integrated!");
        
    
        // ✅ Fetch and Populate Subcontractor Dropdown
        await fetchAndPopulateSubcontractors(resolvedRecordId);
        
    } catch (error) {
        console.error("❌ Error occurred:", error);
    }
    
    async function ensureDropboxToken() {
        if (!dropboxAccessToken) {
            console.log("🔄 Fetching Dropbox token...");
            dropboxAccessToken = await fetchDropboxToken();
            console.log("🔐 Dropbox Access Token Retrieved:", dropboxAccessToken);
                    }
    
        if (!dropboxAccessToken) {
            console.error("❌ Dropbox Access Token could not be retrieved.");
            alert("Error: Could not retrieve Dropbox access token.");
            return false;
        }
        return true;
    }
    
    function updateDeleteButtonLabel() {
        const deleteButton = document.getElementById("delete-images-btn");
        if (!deleteButton) {
            console.warn("⚠️ Delete button not found in the DOM.");
            return;
        }
    
        const selectedImages = document.querySelectorAll(".image-checkbox:checked").length;
        console.log(`🖼️ Selected Images: ${selectedImages}`);
    
        deleteButton.textContent = selectedImages === 1 ? "Delete Selected Image" : "Delete Selected Images";
    
        // Log if the button state is changing
        if (selectedImages > 0) {
            console.log("✅ Delete button is now visible.");
            deleteButton.style.display = "block"; // Ensure the button is visible
        } else {
            console.log("🚫 No images selected. Hiding delete button.");
            deleteButton.style.display = "none";
        }
    }

    // 🔹 Listen for checkbox changes and update the button label accordingly
    document.addEventListener("change", function (event) {
        if (event.target.classList.contains("image-checkbox")) {
            console.log(`📌 Checkbox changed: ${event.target.dataset.imageId} | Checked: ${event.target.checked}`);
            checkAndHideDeleteButton();
        }
    });
    
    // 🔹 Initial check on page load to set correct delete button state
    document.addEventListener("DOMContentLoaded", function () {
        console.log("📢 Page Loaded - Checking Initial Delete Button State");
        updateDeleteButtonLabel();
    });
    
    document.getElementById("upload-issue-picture").addEventListener("change", async function (event) {
        if (await ensureDropboxToken()) {
            showToast("📤 Uploading image...", "info"); // Show upload start toast
            await uploadToDropbox(event.target.files, "Picture(s) of Issue");
            showToast("✅ Image uploaded successfully!", "success"); // Show success toast
        } else {
            showToast("❌ Failed to authenticate Dropbox!", "error"); // Show error toast
        }
    });
    
    document.getElementById("upload-completed-picture").addEventListener("change", async function (event) {
        if (await ensureDropboxToken()) {
            showToast("📤 Uploading image...", "info"); // Show upload start toast
            await uploadToDropbox(event.target.files, "Completed  Pictures");
            showToast("✅ Image uploaded successfully!", "success"); // Show success toast
        } else {
            showToast("❌ Failed to authenticate Dropbox!", "error"); // Show error toast
        }
    });

    const labels = document.querySelectorAll('.billable-label');
    let lastSelectedBillable = null;
    
    labels.forEach(label => {
        const input = label.querySelector('input');
    
        label.addEventListener('click', (e) => {
            e.preventDefault(); // prevent default radio behavior
    
            const isSelected = label.classList.contains('selected');
    
            // Deselect all
            labels.forEach(l => {
                l.classList.remove('selected');
                l.querySelector('input').checked = false;
            });
    
            const billableReasonDiv = document.getElementById("billable-reason-container");
            const homeownerBuilderSelect = document.getElementById("homeowner-builder");
            const homeownerBuilderContainer = homeownerBuilderSelect?.parentElement;
    
            if (isSelected) {
                // Toggle off
                lastSelectedBillable = null;
                console.log("🚫 Billable selection cleared.");
                if (billableReasonDiv) billableReasonDiv.style.display = "none";
                if (homeownerBuilderContainer) homeownerBuilderContainer.style.display = "none";
            } else {
                // Set new selection
                label.classList.add('selected');
                input.checked = true;
                lastSelectedBillable = input.value;
                console.log("✅ Billable selected:", input.value);
    
                const showExtra = input.value === "Billable";
    
                if (billableReasonDiv) {
                    billableReasonDiv.style.display = showExtra ? "block" : "none";
                    console.log(`${showExtra ? "📄 Showing" : "🙈 Hiding"} Billable Reason dropdown.`);
                }
    
                if (homeownerBuilderContainer) {
                    homeownerBuilderContainer.style.display = showExtra ? "block" : "none";
                    console.log(`${showExtra ? "👷 Showing" : "🙈 Hiding"} Homeowner/Builder select.`);
                }
            }
        });
    });
    
    
    
    
    // 🔹 Fetch Airtable Record Function
    async function fetchAirtableRecord(tableName, lotNameOrRecordId) {
        console.log("📡 Fetching record for:", lotNameOrRecordId);
    
        if (!lotNameOrRecordId) {
            console.error("❌ Lot Name or Record ID is missing. Cannot fetch record.");
            return null;
        }
    
        let recordId = lotNameOrRecordId;
    
        // ✅ Check if the given `lotNameOrRecordId` is already an Airtable record ID
        if (!recordId.startsWith("rec")) {
            console.log("🔍 Searching for Record ID using Lot Name...");
            recordId = await getRecordIdByWarrantyId(recordId);
            
            if (!recordId) {
                console.warn(`⚠️ No record found for Lot Name: "${lotNameOrRecordId}"`);
                return null;
            }
        }
    
        // ✅ Use Record ID to fetch data
        const url = `https://api.airtable.com/v0/${window.env.AIRTABLE_BASE_ID}/${tableName}/${recordId}`;
        console.log("🔗 Airtable API Request:", url);
    
        try {
            const response = await fetch(url, {
                headers: { Authorization: `Bearer ${window.env.AIRTABLE_API_KEY}` }
            });
    
            if (!response.ok) {
                console.error(`❌ Error fetching record: ${response.status} ${response.statusText}`);
                return null;
            }
    
            const data = await response.json();
            console.log("✅ Airtable Record Data:", data);
    
            if (data.fields && !data.fields["Completed  Pictures"]) {
                console.warn("⚠️ 'Completed  Pictures' field is missing. Initializing as empty array.");
                data.fields["Completed  Pictures"] = []; // Prevent undefined errors
            }
    
            return data;
        } catch (error) {
            console.error("❌ Error fetching Airtable record:", error);
            return null;
        }
    }

    async function getRecordIdByWarrantyId(warrantyId) {
        
        // Step 1️⃣ Try exact match
        const filterFormula = `{Warranty Record ID} = "${warrantyId}"`;
    const url = `https://api.airtable.com/v0/${window.env.AIRTABLE_BASE_ID}/${window.env.AIRTABLE_TABLE_NAME}?filterByFormula=${encodeURIComponent(filterFormula)}&maxRecords=1`;

    try {
        const response = await fetch(url, {
            headers: { Authorization: `Bearer ${window.env.AIRTABLE_API_KEY}` }
        });

        const data = await response.json();

        if (data.records?.length > 0) {
            console.log("✅ Found record ID by Warranty Record ID:", data.records[0].id);
            return data.records[0].id;
        }

        console.warn("❌ No record found with Warranty Record ID:", warrantyId);
        return null;
    } catch (error) {
        console.error("❌ Error fetching by Warranty Record ID:", error);
        return null;
    }
}
    
    async function updateAirtableRecord(tableName, lotNameOrRecordId, fields) {
        console.log("📡 Updating Airtable record for:", lotNameOrRecordId);
    
        const saveButton = document.getElementById("save-job");
        if (saveButton) saveButton.disabled = true;
    
        // 🚫 Check for internet connectivity before proceeding
        if (!navigator.onLine) {
            console.error("❌ No internet connection detected.");
            showToast("❌ You are offline. Please check your internet connection and try again.", "error");
            if (saveButton) saveButton.disabled = false;
            return;
        }
    
        try {
            let recordId = lotNameOrRecordId;
    
            // ✅ If not a record ID, find the corresponding record ID
            if (!recordId.startsWith("rec")) {
                console.log("🔍 Searching for Record ID using Warranty Record ID...");
                recordId = await getRecordIdByWarrantyId(lotNameOrRecordId);
                if (!recordId) {
                    console.error("❌ No record ID found for this Lot Name. Cannot update Airtable.");
                    showToast("❌ Error: No record found for this Lot Name.", "error");
                    if (saveButton) saveButton.disabled = false;
                    return;
                }
            }
    
            const url = `https://api.airtable.com/v0/${window.env.AIRTABLE_BASE_ID}/${tableName}/${recordId}`;
            console.log("📡 Sending API Request to Airtable:", url);
            console.log("🔎 Verifying field values before sending...");
            for (const [key, value] of Object.entries(fields)) {
                console.log(`• ${key}:`, value, `(${typeof value})`);
            }
                
            // ⛔️ Remove computed fields before sending to Airtable
const sanitizedFields = Object.fromEntries(
    Object.entries(fields).filter(([key]) => key !== "Warranty Record ID")
  );
  
  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${window.env.AIRTABLE_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ fields: sanitizedFields })
  });
  

            if (!response.ok) {
                const error = await response.json();
                console.error("❌ Airtable update error:", error);
            }
            
    
            if (!response.ok) {
                const errorDetails = await response.json(); // Extract error response
                showToast(`❌ Airtable error: ${errorDetails.error?.message || 'Unknown error'}`, "error");
                return;
            }
    
            console.log("✅ Airtable record updated successfully:", fields);
            showToast("✅ Record updated successfully!", "success");
    
        } catch (error) {
            console.error("❌ Error updating Airtable:", error);
        } finally {
            if (saveButton) saveButton.disabled = false;
        }
    }
    
    document.querySelectorAll(".job-link").forEach(link => {
        link.addEventListener("click", function (event) {
            event.preventDefault();
    
            const jobId = this.dataset.recordId?.trim(); // Ensure valid ID
            const jobName = this.textContent.trim(); // Lot Number / Community
    
            if (!jobId) {
                console.error("❌ ERROR: Missing job ID in the link. Check 'data-record-id' attribute.");
                alert("Error: No job ID found. Please try again.");
                return;
            }
    
            console.log("🔗 Navigating to Job:", jobId);
            console.log("🏠 Job Name:", jobName);
    
            // Construct the URL properly
            const url = new URL(window.location.origin + window.location.pathname);
            url.searchParams.set("id", jobId);
    
            console.log("🌍 Navigating to:", url.toString());
            window.location.href = url.toString();
        });
    });
    
// 🔹 Populate Primary Fields
async function populatePrimaryFields(job) {
    console.log("🧪 Populating UI with fields:", job);
    console.log("🔎 Status at page load:", job["Status"]);

    function safeValue(value) {
        return value === undefined || value === null ? "" : value;
    }
    setInputValue("warranty-id", job["Warranty Record ID"]);

    setInputValue("job-name", safeValue(job["Lot Number and Community/Neighborhood"]));
    setInputValue("field-tech", safeValue(job["field tech"]));
    setInputValue("address", safeValue(job["Address"]));
    setInputValue("homeowner-name", safeValue(job["Homeowner Name"]));
    setInputValue("contact-email", safeValue(job["Contact Email"]));
    setInputValue("description", safeValue(job["Description of Issue"]));
    setInputValue("dow-completed", safeValue(job["DOW to be Completed"])); 
    setInputValue("materials-needed", safeValue(job["Materials Needed"]));
    setInputValue("field-status", safeValue(job["Status"]));
    setCheckboxValue("sub-not-needed", job["Subcontractor Not Needed"] || false);
    setInputValue("StartDate", convertUTCToLocalInput(job["StartDate"]));
    setInputValue("EndDate", convertUTCToLocalInput(job["EndDate"]));
    setInputValue("subcontractor", safeValue(job["Subcontractor"]));

    // ✅ Set dropdown's data-selected attribute for use in dropdown population
    const subDropdown = document.getElementById("subcontractor-dropdown");
    if (subDropdown) {
        subDropdown.setAttribute("data-selected", safeValue(job["Subcontractor"]));
    }

    console.log("✅ Fields populated successfully.");
    console.log("🕓 Start Date shown in UI:", document.getElementById("StartDate").value);

    adjustTextareaSize("description");
    adjustTextareaSize("dow-completed");
    adjustTextareaSize("materials-needed");

    if (job["Status"] === "Scheduled- Awaiting Field") {
        console.log("🚨 Job is 'Scheduled - Awaiting Field' - Deleting completed images...");

        [
            "billable-status", "homeowner-builder", "subcontractor", "materials-needed", 
            "billable-reason", "field-review-not-needed", "field-review-needed", 
            "field-tech-reviewed", "additional-fields-container", "message-container", 
            "materials-needed-label", "upload-issue-picture-label", 
            "field-tech-reviewed-label" // 👈 Add this
          ].forEach(hideElementById);
          
          if (job["Status"] !== "Field Tech Review Needed") {
            hideParentFormGroup("field-tech-reviewed");
        }
        
    } else {
        console.log("✅ Status is NOT 'Scheduled- Awaiting Field' - Showing all fields.");

        showElement("job-completed");
        showElement("job-completed-label");

        const billableValue = safeValue(job["Billable/ Non Billable"]);
        document.querySelectorAll('label.billable-label').forEach(label => {
            const radio = label.querySelector('input[name="billable-status"]');
            if (!radio) return;
        
            if (radio.value === billableValue) {
                radio.checked = true;
                label.classList.add("selected");
            } else {
                label.classList.remove("selected");
                radio.checked = false;
            }
        
            // 🔄 Show or hide the Billable Reason dropdown
            const billableReasonDiv = document.getElementById("billable-reason-container");
            if (radio.checked && radio.value === "Billable") {
                billableReasonDiv.style.display = "block";
                console.log("📄 Showing Billable Reason dropdown.");
            } else if (billableReasonDiv) {
                billableReasonDiv.style.display = "none";
                console.log("🙈 Hiding Billable Reason dropdown.");
            }
        });
        

                setInputValue("homeowner-builder", safeValue(job["Homeowner Builder pay"]));
        setInputValue("billable-reason", safeValue(job["Billable Reason (If Billable)"]));
        setInputValue("subcontractor-payment", safeValue(job["Subcontractor Payment"]));
        setCheckboxValue("field-tech-reviewed", job["Field Tech Reviewed"]);
    }

    setCheckboxValue("job-completed", job["Job Completed"]);

    if (job["Status"] === "Field Tech Review Needed") {
        console.log("🚨 Field Tech Review Needed - Hiding completed job elements.");
    
        // Hide specified elements
        [
            "completed-pictures",
            "upload-completed-picture",
            "completed-pictures-heading",
            "file-input-container",
            "job-completed-container",
            "job-completed",
            "job-completed-check"
        ].forEach(hideElementById);

        if (job["Status"] !== "Field Tech Review Needed") {
            hideParentFormGroup("field-tech-reviewed");
        }
        
    } else {
        showElement("job-completed-container");
    }

    showElement("save-job");
}

function checkAndHideDeleteButton() {
    const deleteButton = document.getElementById("delete-images-btn");
    const issueContainer = document.getElementById("issue-pictures");
    const completedContainer = document.getElementById("completed-pictures");

    if (!deleteButton || !issueContainer || !completedContainer) return;

    const issueImages = issueContainer.querySelectorAll("img").length;
    const completedImages = completedContainer.querySelectorAll("img").length;
    const selectedCheckboxes = document.querySelectorAll(".image-checkbox:checked").length;

    console.log(`🔍 Issue Images: ${issueImages}, Completed Images: ${completedImages}, Checked Boxes: ${selectedCheckboxes}`);

    if (issueImages > 0 || completedImages > 0 || selectedCheckboxes > 0) {
        console.log("✅ Show delete button");
        deleteButton.style.setProperty("display", "block", "important");
    } else {
        console.log("🚫 Hide delete button");
        deleteButton.style.setProperty("display", "none", "important");
    }
}


function hideParentFormGroup(elementId) {
    const el = document.getElementById(elementId);
    if (el && el.closest(".form-group")) {
        el.closest(".form-group").style.display = "none";
    }
}




// Function to hide an element safely
function hideElementById(elementId) {
    const element = document.getElementById(elementId);
    if (!element) {
        console.warn(`⚠️ Cannot hide — Element not found: ${elementId}`);
        return;
    }
    console.log(`✅ Hiding element: ${elementId}`);
    element.style.display = "none";
    element.style.margin = "0";     // reset margin
    element.style.padding = "0";    // reset padding
    element.style.height = "0";     // if it's a block element that may take height
}



// Function to resize any textarea dynamically
function adjustTextareaSize(id) {
    const textarea = document.getElementById(id);
    if (textarea) {
        textarea.style.height = "auto"; // Reset height
        textarea.style.height = textarea.scrollHeight + "px"; // Adjust height based on content
    }
}

// Ensure resizing also happens when a user types in the textarea
document.addEventListener("input", function (event) {
    if (event.target.tagName.toLowerCase() === "textarea") {
        adjustTextareaSize(event.target.id);
    }
});

function showElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.style.display = "block";
    } else {
        console.warn(`⚠️ Element not found: ${elementId}`);
    }
}

async function displayImages(files, containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.warn(`⚠️ Container not found: ${containerId}`);
        return;
    }

    container.innerHTML = ""; // Clear existing content

    if (!files || files.length === 0) {
        console.warn(`⚠️ No files found in ${containerId}`);
        container.innerHTML = "<p></p>";
        
        // ✅ Hide delete button if both are empty
        checkAndHideDeleteButton();
        return;
    }

    console.log(`✅ Displaying files for ${containerId}:`, files);

    for (const file of files) {
        if (!file.url) {
            console.error("❌ Missing 'url' field in file object:", file);
            continue;
        }
    
        const wrapperDiv = document.createElement("div");
        wrapperDiv.classList.add("file-wrapper");
        wrapperDiv.style.display = "inline-block";
        wrapperDiv.style.margin = "10px";
        wrapperDiv.style.position = "relative";
        wrapperDiv.style.textAlign = "center";
        wrapperDiv.style.width = "200px";
    
        // ✅ Declare checkbox properly before using it
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.classList.add("file-checkbox", "image-checkbox");
        checkbox.dataset.imageId = file.id || "";
    
        // ✅ Add event listener inside the loop
        checkbox.addEventListener("change", function () {
            wrapperDiv.classList.toggle("checked", this.checked);
        });
    
        // Overlay text for "Marked for Deletion"
        const overlay = document.createElement("div");
        overlay.classList.add("marked-for-deletion");
        overlay.innerText = "Marked for Deletion";

        // Handle checkbox state changes
        checkbox.addEventListener("change", function () {
            if (this.checked) {
                wrapperDiv.classList.add("checked");
            } else {
                wrapperDiv.classList.remove("checked");
            }
        });

        // Filename label
        const fileLabel = document.createElement("p");
        fileLabel.innerText = file.filename || "Unknown File";
        fileLabel.style.fontSize = "12px";
        fileLabel.style.marginTop = "5px";
        fileLabel.style.wordBreak = "break-word"; 

        // Add this once outside the function
const previewModal = document.getElementById("previewModal");
const previewContent = document.getElementById("previewContent");
const closePreview = document.getElementById("closePreview");

closePreview.addEventListener("click", () => {
    previewModal.style.display = "none";
    previewContent.innerHTML = '<span id="closePreview" style="position:absolute; top:20px; right:30px; font-size:30px; cursor:pointer; color:white;">&times;</span>';
});


        let previewElement;

        if (file.type && file.type === "application/pdf") {
            previewElement = document.createElement("canvas");
            previewElement.style.width = "100%";
            previewElement.style.border = "1px solid #ddd";
            previewElement.style.borderRadius = "5px";
            previewElement.style.cursor = "pointer";

            previewElement.addEventListener("click", () => window.open(file.url, "_blank"));

            try {
                const pdf = await pdfjsLib.getDocument(file.url).promise;
                const page = await pdf.getPage(1);
                const scale = 1;
                const viewport = page.getViewport({ scale });
                const context = previewElement.getContext("2d");
                previewElement.height = viewport.height;
                previewElement.width = viewport.width;

                await page.render({
                    canvasContext: context,
                    viewport: viewport,
                });
            } catch (error) {
                console.error("❌ Error loading PDF preview:", error);
                previewElement = document.createElement("iframe");
                previewElement.src = file.url;
                previewElement.width = "180";
                previewElement.height = "220";
                previewElement.style.borderRadius = "10px";
                previewElement.style.border = "1px solid #ddd";
            }
        } else if (file.type && typeof file.type === "string" && file.type.startsWith("image/")) {
            previewElement = document.createElement("img");
            previewElement.src = file.url;
            previewElement.setAttribute("data-file-id", file.id || "");
            previewElement.classList.add("uploaded-file");
            previewElement.style.maxWidth = "100%";
            previewElement.style.borderRadius = "5px";
            previewElement.style.border = "1px solid #ddd";
            previewElement.style.cursor = "pointer";

            previewElement.addEventListener("click", () => window.open(file.url, "_blank"));
        } else {
            previewElement = document.createElement("a");
            previewElement.href = file.url;
            previewElement.innerText = "Download File";
            previewElement.target = "_blank";
            previewElement.style.display = "block";
            previewElement.style.padding = "5px";
            previewElement.style.background = "#f4f4f4";
            previewElement.style.borderRadius = "5px";
            previewElement.style.textDecoration = "none";
        }

        // Append elements
        wrapperDiv.appendChild(checkbox);
        wrapperDiv.appendChild(overlay);
        wrapperDiv.appendChild(previewElement);
        wrapperDiv.appendChild(fileLabel);
        container.appendChild(wrapperDiv);
    }

    container.style.display = "none";
    container.offsetHeight;
    container.style.display = "block";

    console.log(`✅ Files displayed for ${containerId}`);
    // ✅ Check if we need to show or hide delete button
    checkAndHideDeleteButton();
}
   
function checkAndHideDeleteButton() {
    const deleteButton = document.getElementById("delete-images-btn");

    if (!deleteButton) {
        console.warn("⚠️ Delete button not found.");
        return;
    }

    const issueImages = document.querySelectorAll("#issue-pictures .file-wrapper img").length;
    const completedImages = document.querySelectorAll("#completed-pictures .file-wrapper img").length;

    console.log(`📌 Checking images: Issue Images: ${issueImages}, Completed Images: ${completedImages}`);

    if (issueImages > 0 || completedImages > 0) {
        console.log("✅ Images found. Showing delete button.");
        deleteButton.style.display = "block";
    } else {
        console.log("🚫 No images found. Hiding delete button.");
        deleteButton.style.display = "none";
    }
}

document.getElementById("delete-images-btn").addEventListener("click", async function (event) {
    event.preventDefault(); // ✅ Prevents page refresh
    console.log("🗑️ Delete Images button clicked! ✅");
    const warrantyId = getWarrantyId();

    const checkboxes = document.querySelectorAll(".image-checkbox:checked");
    if (checkboxes.length === 0) {
        alert("⚠️ Please select at least one image to delete.");
        console.log("⚠️ No images selected.");
        return;
    }

 

    // 🔹 Extract selected image IDs
    const imageIdsToDelete = Array.from(checkboxes).map(cb => cb.dataset.imageId).filter(id => id);
    console.log("📌 Selected Image IDs to Delete:", imageIdsToDelete);

    if (imageIdsToDelete.length === 0) {
        console.warn("⚠️ No valid image IDs found for deletion.");
        return;
    }

    // 🔹 Delete from both "Picture(s) of Issue" and "Completed Pictures"
    await deleteImagesByLotName(warrantyId, imageIdsToDelete, "Picture(s) of Issue");
    await deleteImagesByLotName(warrantyId, imageIdsToDelete, "Completed  Pictures");

    console.log("✅ Images deleted successfully from both fields!");

    // ✅ Refresh UI to reflect changes
    await loadImagesForLot(warrantyId, document.getElementById("field-status")?.value);
});

/** ✅ Function to remove images from Airtable */
async function deleteImagesByLotName(warrantyId, imageIdsToDelete, imageField) {
    console.log(`🗑️ Attempting to delete images from '${imageField}' for Lot Name:`, warrantyId);

    // Validate input parameters
    if (!warrantyId) {
        console.error("❌ Lot Name is missing. Cannot delete images.");
        return;
    }

    if (!Array.isArray(imageIdsToDelete) || imageIdsToDelete.length === 0) {
        console.warn("⚠️ No image IDs provided for deletion. Skipping process.");
        return;
    }

    try {
        // Fetch existing images
        if (!warrantyId) {
            console.error("❌ Warranty ID is missing.");
            return;
        }
        let existingImages = await fetchCurrentImagesFromAirtable(warrantyId, targetField);
        
        if (!existingImages || existingImages.length === 0) {
            console.warn(`⚠️ No images found in '${imageField}'. Nothing to delete.`);
            return;
        }

        console.log(`📸 Current Images in '${imageField}' Before Deletion:`, existingImages);

        // Filter out images to be deleted
        const updatedImages = existingImages.filter(img => !imageIdsToDelete.includes(img.id));

        console.log("📌 Updated image list after deletion:", updatedImages);

        // Check if anything was deleted
        if (updatedImages.length === existingImages.length) {
            console.warn("⚠️ No matching images found for deletion. Skipping Airtable update.");
            return;
        }

        console.log(`📩 Sending updated image list to Airtable for '${imageField}':`, updatedImages);
        checkAndHideDeleteButton();

        // Update Airtable record
        await updateAirtableRecord(window.env.AIRTABLE_TABLE_NAME, warrantyId, {
            [imageField]: updatedImages.length > 0 ? updatedImages : []
        });

        console.log(`✅ Successfully deleted selected images from '${imageField}' for Lot: ${lotName}`);

        // ✅ **Refresh UI by reloading images dynamically**
        await loadImagesForLot(warrantyId);

    } catch (error) {
        console.error(`❌ Error deleting images from '${imageField}' in Airtable:`, error);
    }
}

async function fetchImagesByLotName(warrantyId, imageField) {
    console.log(`📡 Fetching images for Warranty ID: ${warrantyId}, field: ${imageField}`);

    if (!warrantyId) {
        console.error("❌ Warranty ID is missing. Cannot fetch images.");
        return [];
    }

    const filterFormula = `{Warranty Record ID} = "${warrantyId}"`;
    const url = `https://api.airtable.com/v0/${window.env.AIRTABLE_BASE_ID}/${window.env.AIRTABLE_TABLE_NAME}?filterByFormula=${encodeURIComponent(filterFormula)}&fields[]=${encodeURIComponent(imageField)}`;

    try {
        const response = await fetch(url, {
            headers: { Authorization: `Bearer ${window.env.AIRTABLE_API_KEY}` }
        });

        if (!response.ok) {
            console.error("❌ Error fetching record:", response.status, response.statusText);
            return [];
        }

        const data = await response.json();
        return data.records[0]?.fields?.[imageField] || [];
    } catch (error) {
        console.error("❌ Error fetching images:", error);
        return [];
    }
}


async function loadImagesForLot(warrantyId, status) {
    console.log("📡 Loading images for warrantyId:", warrantyId);

    // Get elements and ensure they exist before accessing them
    const issuePicturesSection = document.getElementById("issue-pictures");
    const completedPicturesSection = document.getElementById("completed-pictures");
    const uploadIssueInput = document.getElementById("upload-issue-picture");
    const uploadCompletedInput = document.getElementById("upload-completed-picture");

    if (!issuePicturesSection || !completedPicturesSection || !uploadIssueInput || !uploadCompletedInput) {
        console.error("❌ One or more required elements are missing from the DOM.");
        return;
    }

    // Show loading indicators while fetching images
    issuePicturesSection.innerHTML = "📡 Loading issue images...";
    completedPicturesSection.innerHTML = "📡 Loading completed images...";

    try {
        // Fetch both sets of images
        const issueImages = await fetchImagesByLotName(warrantyId, "Picture(s) of Issue");

        const completedImages = await fetchImagesByLotName(warrantyId, "Completed  Pictures");

        console.log("🖼️ Loaded Images - Issue:", issueImages);
        console.log("🖼️ Loaded Images - Completed:", completedImages);

        // Check if any images exist
        const hasIssueImages = issueImages && issueImages.length > 0;
        const hasCompletedImages = completedImages && completedImages.length > 0;

        // Show/Hide upload inputs based on images available
        uploadIssueInput.style.display = hasIssueImages ? "block" : "none";
        uploadCompletedInput.style.display = hasCompletedImages ? "block" : "none";

        // Clear loading message before inserting images
        issuePicturesSection.innerHTML = hasIssueImages ? "" : "";
        completedPicturesSection.innerHTML = hasCompletedImages ? "" : "";

        // If no images exist, hide sections and delete button
        if (!hasIssueImages && !hasCompletedImages) {
            console.warn("⚠️ No images found, hiding sections.");
            checkAndHideDeleteButton(); // Hide delete button if no images
            return;
        }

        // Display images if available
        if (hasIssueImages) {
            await displayImages(issueImages, "issue-pictures");
        }
        if (hasCompletedImages) {
            await displayImages(completedImages, "completed-pictures");
        }

        // Ensure delete button updates correctly after image load
        setTimeout(checkAndHideDeleteButton, 500);
        checkAndHideDeleteButton();


    } catch (error) {
        console.error("❌ Error loading images for lot:", lotName, error);
        issuePicturesSection.innerHTML = "❌ Error loading issue images.";
        completedPicturesSection.innerHTML = "❌ Error loading completed images.";
    }
}

    async function testFetchImages() {
        try {
            const recordData = await fetchAirtableRecord(airtableTableName, recordId);
            console.log("✅ Airtable Record Data:", recordData);
    
            if (recordData.fields["Picture(s) of Issue"]) {
                console.log("🖼️ Issue Pictures Field Data:", recordData.fields["Picture(s) of Issue"]);
                console.log("🖼️ Completed Pictures Field Data:", recordData.fields["Completed  Pictures"]);

            } else {
                console.warn("⚠️ 'Picture(s) of Issue' field is empty or missing.");
            }
        } catch (error) {
            console.error("❌ Error fetching test images from Airtable:", error);
        }
    }
    
    testFetchImages();
    document.getElementById("delete-images-btn").addEventListener("click", function () {
        console.log("🗑️ Delete Images button clicked! ✅");
    });
    
    // ✅ Save record ID in localStorage before navigating away
function saveRecordIdToLocal(recordId) {
    localStorage.setItem("currentRecordId", recordId);
}

// ✅ Retrieve record ID from localStorage on page load
function getSavedRecordId() {
    return localStorage.getItem("currentRecordId");
}
function getWarrantyId() {
    const id = document.getElementById("warranty-id")?.value?.trim();
    if (!id) {
        console.warn("⚠️ Warranty ID is missing or empty.");
        return null;
    }
    return id;
}


// ✅ Set the record ID on page load
document.addEventListener("DOMContentLoaded", () => {
    let recordId = getSavedRecordId() || new URLSearchParams(window.location.search).get("id");

    if (!recordId) {
        console.error("❌ No record ID found! Preventing redirect loop.");
        alert("No job selected.");
        return; // ✅ Prevents infinite redirects
    }

    console.log("🆔 Using saved Record ID:", recordId);
    saveRecordIdToLocal(recordId); 
    setTimeout(checkAndHideDeleteButton, 500); // slight delay if images render async

});

    document.addEventListener("DOMContentLoaded", function () {
        console.log("✅ Job Details Page Loaded.");
    
        const formElements = document.querySelectorAll(
            'input:not([disabled]), textarea:not([disabled]), select:not([disabled])'
        );
    
        formElements.forEach(element => {
            element.addEventListener("input", () => handleInputChange(element), { once: true });
            element.addEventListener("change", () => handleInputChange(element), { once: true });
        });
    
        function handleInputChange(element) {
            console.log(`📝 Field changed: ${element.id}, New Value:`, element.type === "checkbox" ? element.checked : element.value);
        }
          // ✅ 💡 Add this right here:
          setTimeout(() => {
            const input = document.getElementById("upload-completed-picture");
            const label = document.querySelector("label[for='upload-completed-picture']");
            const container = document.getElementById("file-input-container");
        
            if (input) input.style.setProperty("display", "none", "important");
            if (label) label.style.setProperty("display", "none", "important");
            if (container) container.style.setProperty("display", "none", "important");
        }, 500);
        
    });

    document.getElementById("save-job").addEventListener("click", async function () {
        console.log("🔄 Save button clicked. Collecting all field values...");
    
        const warrantyId = getWarrantyId();
    
        if (!warrantyId) {
            const warrantyElement = document.getElementById("warranty-id");
            const rawWarrantyId = warrantyElement ? warrantyElement.value : undefined;
    
            console.error("❌ Warranty ID is missing. Cannot update Airtable.");
            console.warn("🕵️ Debug Info:");
            console.warn("• DOM Element with ID 'warranty-id':", warrantyElement);
            console.warn("• Raw Value from 'warranty-id' input:", rawWarrantyId);
            console.warn("• Trimmed Value (used as Warranty ID):", rawWarrantyId ? rawWarrantyId.trim() : "❌ No value to trim");
    
            showToast("❌ Error: Warranty ID is missing or empty. Please check the field.", "error");
            alert("⚠️ Cannot save because the 'Warranty ID' is missing or invalid. Please ensure the field is filled in.");
            return;
        }
        
        console.log("🕒 Saving StartDate:", document.getElementById("StartDate").value);

        const currentRecord = await fetchAirtableRecord(airtableTableName, recordId);
        const originalStartUTC = currentRecord?.fields?.["StartDate"];
        const originalEndUTC = currentRecord?.fields?.["EndDate"];
                
        const currentStartLocal = document.getElementById("StartDate")?.value;
        const currentEndLocal = document.getElementById("EndDate")?.value;
        
        const convertedStartUTC = currentStartLocal ? new Date(currentStartLocal).toISOString() : null;
        const convertedEndUTC = currentEndLocal ? new Date(currentEndLocal).toISOString() : null;
        
        const updatedFields = {}; // begin fresh field collection
        

        if (!currentRecord || !currentRecord.fields) {
            alert("❌ Could not load original record data. Try again.");
            return;
        }
        
        // ✅ Only add StartDate if it changed
        if (convertedStartUTC !== originalStartUTC) {
            updatedFields["StartDate"] = convertedStartUTC;
        }

        // ✅ Manually handle radio buttons for Billable/Non Billable
        const selectedRadio = document.querySelector('input[name="billable-status"]:checked');
        const billableField = selectedRadio?.getAttribute("data-field") || "Billable/ Non Billable";
        
        // Handle toggle-off logic
        updatedFields[billableField] = selectedRadio ? selectedRadio.value.trim() : ""; // send empty string to Airtable
        console.log("📤 Billable Field Value:", updatedFields[billableField]);
        

        
        // ✅ Only add EndDate if it changed
        if (convertedEndUTC !== originalEndUTC) {
            updatedFields["EndDate"] = convertedEndUTC;
        }
                const inputs = document.querySelectorAll("input:not([disabled]), textarea:not([disabled]), select:not([disabled])");
    
                inputs.forEach(input => {
                    const fieldName = input.getAttribute("data-field");
                    if (!fieldName) return;
                
                    // ✅ Skip Billable radio buttons — already handled above
                    if (input.name === "billable-status") return;
                
                    let value = input.value.trim();
                
                    if (input.type === "checkbox") {
                        value = input.checked;
                    } else if (input.tagName === "SELECT") {
                        value = value === "" ? null : value;
                    }
                     else if (input.type === "number") {
                        value = value === "" ? null : parseFloat(value);
                    } else if (input.type === "date") {
                        value = formatDateToISO(value);
                    } else {
                        value = value === "" ? null : value;
                    }
                
                    updatedFields[fieldName] = value;
                });
                

        // Clean empty strings to nulls (avoid Airtable errors)
        for (let key in updatedFields) {
            const value = updatedFields[key];
        
            if (value === "") updatedFields[key] = null;
            if (typeof value === "undefined") delete updatedFields[key];
            if (typeof value === "number" && isNaN(value)) delete updatedFields[key];
        
            // ✅ NEW FIX — Remove `null` values for number fields
            if (value === null) {
                if (["Subcontractor Payment"].includes(key)) {
                    delete updatedFields[key];
                }
            }
        }
        
        
        console.log("📌 Final Fields to be Updated:", JSON.stringify(updatedFields, null, 2));
    
        if (Object.keys(updatedFields).length === 0) {
            console.warn("⚠️ No valid fields found to update.");
            alert("No changes detected.");
            return;
        }
    
        try {
            // ✅ Update Airtable with cleaned values
            await updateAirtableRecord(window.env.AIRTABLE_TABLE_NAME, warrantyId, updatedFields);
            console.log("✅ Airtable record updated successfully.");
            console.log("🕔 UTC Sent to Airtable:", new Date(document.getElementById("StartDate").value).toISOString());

            showToast("✅ Job details saved successfully!", "success");
    
           // ✅ Refresh UI after save to reflect correct date format
           await new Promise(resolve => setTimeout(resolve, 3000)); // ⏳ wait 3 seconds for automation

           console.log("🔄 Fetching updated data from Airtable...");
           const updatedData = await fetchAirtableRecord(window.env.AIRTABLE_TABLE_NAME, warrantyId);
           
           if (updatedData && updatedData.fields) {
               console.log("📩 Reloading checkboxes with updated Airtable data:", updatedData);
               await populatePrimaryFields(updatedData.fields);
           
               const status = updatedData.fields["Status"];
               const lotName = updatedData.fields["Lot Number and Community/Neighborhood"] || "This job";
           
               if (status === "Material Purchase Needed") {
                   console.log("🔁 Status changed to 'Material Purchase Needed'. Redirecting...");
                   
                   // ✅ Show toast before redirect
                   showToast(`📦 ${lotName} has moved to 'Material Purchase Needed' status. Redirecting...`, "success");
           
                   // Add a short delay so the user sees the toast
                   setTimeout(() => {
                       window.location.href = "index.html";
                   }, 2000); // 2 second delay
                   return;
               }
           }
        } catch (error) {
            console.error("❌ Error updating Airtable:", error);
            showToast("❌ Error saving job details. Please try again.", "error");
        }
    });
    
    function formatDateToISO(dateStr) {
        if (!dateStr) return ""; // If empty, return blank
    
        const dateObj = new Date(dateStr);
        if (isNaN(dateObj.getTime())) {
            console.error("❌ Invalid date format:", dateStr);
            return ""; // Return empty if invalid
        }
    
        return dateObj.toISOString().split("T")[0]; // Convert to 'YYYY-MM-DD'
    }
    
    function showToast(message, type = "success") {
        let toast = document.getElementById("toast-message");
    
        // Create toast element if it doesn’t exist
        if (!toast) {
            toast = document.createElement("div");
            toast.id = "toast-message";
            toast.className = "toast-container";
            document.body.appendChild(toast);
        }
    
        toast.textContent = message;
        toast.classList.add("show");
    
        // Add different styles for error and success
        toast.style.background = type === "error" ? "rgba(200, 0, 0, 0.85)" : "rgba(0, 128, 0, 0.85)";
    
        // Hide toast after 3 seconds
        setTimeout(() => {
            toast.classList.remove("show");
        }, 3000);
    }
     
   // 🔹 Fetch Dropbox Token from Airtable
async function fetchDropboxToken() {
    try {
        const url = `https://api.airtable.com/v0/${airtableBaseId}/tbl6EeKPsNuEvt5yJ?maxRecords=1`;

        console.log("🔄 Fetching latest Dropbox credentials from Airtable...");
        const response = await fetch(url, {
            headers: { Authorization: `Bearer ${airtableApiKey}` }
        });

        if (!response.ok) {
            throw new Error(`❌ Error fetching Dropbox token: ${response.statusText}`);
        }

        const data = await response.json();
        const record = data.records[0];

        if (!record) {
            console.error("❌ No record found in Airtable view.");
            return null;
        }

        const fields = record.fields;

        dropboxAppKey = fields["Dropbox App Key"];
        dropboxAppSecret = fields["Dropbox App Secret"];
        const token = fields["Dropbox Token"];
        const refreshToken = fields["Dropbox Refresh Token"];
        dropboxRefreshToken = fields["Dropbox Refresh Token"]; 

        if (!dropboxAppKey || !dropboxAppSecret) {
            console.error("❌ Dropbox App Key or Secret is missing.");
            return null;
        }

        // 🛠 If access token is present, use it
        if (token) {
            dropboxAccessToken = token;
            return dropboxAccessToken;
        }

        // 🛠 If no token, try to refresh it
        if (refreshToken) {
            console.log("🔄 No access token found, refreshing using refresh token...");
            return await refreshDropboxAccessToken(refreshToken, dropboxAppKey, dropboxAppSecret);
        }

        console.warn("⚠️ No Dropbox token or refresh token found.");
        return null;

    } catch (error) {
        console.error("❌ Error fetching Dropbox token:", error);
        return null;
    }
}
 
async function refreshDropboxAccessToken(refreshToken, dropboxAppKey, dropboxAppSecret) {
    console.log("🔄 Refreshing Dropbox Access Token...");
    const dropboxAuthUrl = "https://api.dropboxapi.com/oauth2/token";

    const params = new URLSearchParams();
    params.append("grant_type", "refresh_token");
    params.append("refresh_token", refreshToken);
    params.append("client_id", dropboxAppKey);
    params.append("client_secret", dropboxAppSecret);

    try {
        const response = await fetch(dropboxAuthUrl, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: params
        });

        const data = await response.json();

        if (!response.ok) {
            console.error(`❌ Error refreshing Dropbox token:`, data);
            return null;
        }

        console.log("✅ New Dropbox Access Token:", data.access_token);

        dropboxAccessToken = data.access_token;

        // ✅ Update Airtable with the new token
        const tokenUpdateUrl = `https://api.airtable.com/v0/${window.env.AIRTABLE_BASE_ID}/tbl6EeKPsNuEvt5yJ?maxRecords=1`;
        const tokenResponse = await fetch(tokenUpdateUrl, {
            headers: {
                Authorization: `Bearer ${window.env.AIRTABLE_API_KEY}`
            }
        });

        const tokenData = await tokenResponse.json();
        const recordId = tokenData.records?.[0]?.id;

        if (!recordId) {
            console.warn("⚠️ Could not find Dropbox credentials record ID to update.");
            return dropboxAccessToken;
        }

        // Update Airtable record with the new token
        const patchUrl = `https://api.airtable.com/v0/${window.env.AIRTABLE_BASE_ID}/tbl6EeKPsNuEvt5yJ/${recordId}`;
        await fetch(patchUrl, {
            method: "PATCH",
            headers: {
                Authorization: `Bearer ${window.env.AIRTABLE_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                fields: {
                    "Dropbox Token": dropboxAccessToken
                }
            })
        });

        console.log("📡 Updated Airtable with new Dropbox access token.");
        return dropboxAccessToken;

    } catch (error) {
        console.error("❌ Error refreshing Dropbox access token:", error);
        return null;
    }
}

async function fetchCurrentImagesFromAirtable(warrantyId, imageField) {
    console.log("📡 Fetching images for Warranty ID:", warrantyId);
    
    if (!warrantyId) {
        console.error("❌ Warranty ID is missing. Cannot fetch images.");
        return [];
    }

    const url = `https://api.airtable.com/v0/${window.env.AIRTABLE_BASE_ID}/${window.env.AIRTABLE_TABLE_NAME}?filterByFormula=${encodeURIComponent(`{Warranty Record ID} = '${warrantyId}'`)}&fields[]=${imageField}`;

    try {
        const response = await fetch(url, {
            headers: { Authorization: `Bearer ${window.env.AIRTABLE_API_KEY}` }
        });

        if (!response.ok) {
            console.error("❌ Error fetching record:", response.status, response.statusText);
            return [];
        }

        const data = await response.json();

        if (data.records.length === 0) {
            console.warn(`⚠️ No records found for Warranty ID: ${warrantyId}`);
            return [];
        }

        const record = data.records[0];

        if (record.fields && record.fields[imageField]) {
            console.log(`✅ Images found for '${warrantyId}' in field '${imageField}':`, record.fields[imageField]);
            return record.fields[imageField];
        } else {
            console.warn(`⚠️ No images found in field '${imageField}' for '${warrantyId}'`);
            return [];
        }
    } catch (error) {
        console.error("❌ Error fetching images by Warranty ID:", error);
        return [];
    }
}



    function convertUTCToLocalInput(utcDateString) {
        if (!utcDateString) return "";
        const utcDate = new Date(utcDateString);
        const offsetMs = utcDate.getTimezoneOffset() * 60000;
        const localDate = new Date(utcDate.getTime() - offsetMs);
        return localDate.toISOString().slice(0, 16); // "YYYY-MM-DDTHH:MM"
    }
       
    // 🔹 Dropbox Image Upload
    async function uploadToDropbox(files, targetField) {
        if (!dropboxAccessToken) {
            console.error("❌ Dropbox token is missing.");
            return;
        }
    
        console.log(`📂 Uploading ${files.length} file(s) to Dropbox for field: ${targetField}`);
    
        const warrantyId = getWarrantyId();

        let existingImages = await fetchCurrentImagesFromAirtable(warrantyId, targetField);
        const uploadedUrls = [...existingImages];
    
        for (const file of files) {
            try {
                const creds = {
                    appKey: dropboxAppKey,
                    appSecret: dropboxAppSecret,
                    refreshToken: dropboxRefreshToken
                };
        
                const dropboxUrl = await uploadFileToDropbox(file, dropboxAccessToken, creds);
        
                if (dropboxUrl) {
                    uploadedUrls.push({ url: dropboxUrl });
                }
            } catch (error) {
                console.error("❌ Error uploading to Dropbox:", error);
            }
        }
    
        console.log("✅ Final file list to save in Airtable:", uploadedUrls);
    
        if (uploadedUrls.length > 0) {
            await updateAirtableRecord(window.env.AIRTABLE_TABLE_NAME, warrantyId, { [targetField]: uploadedUrls });
    
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
            checkAndHideDeleteButton();

            await loadImagesForLot(warrantyId, document.getElementById("field-status")?.value);
            setTimeout(checkAndHideDeleteButton, 500); // ✅ Ensure delete button appears after upload
        }
    }
    
   // 🔹 Upload File to Dropbox
   async function uploadFileToDropbox(file, token, creds = {}) {
    if (!token) {
        console.error("❌ No Dropbox token provided.");
        return null;
    }

    const dropboxUploadUrl = "https://content.dropboxapi.com/2/files/upload";
    const path = `/uploads/${encodeURIComponent(file.name)}`;

    try {
        const response = await fetch(dropboxUploadUrl, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Dropbox-API-Arg": JSON.stringify({
                    path: path,
                    mode: "add",
                    autorename: true,
                    mute: false
                }),
                "Content-Type": "application/octet-stream"
            },
            body: file
        });

        if (!response.ok) {
            const errorResponse = await response.json();
            console.error("❌ Dropbox Upload Error:", errorResponse);

            const tag = errorResponse?.error?.[".tag"];
            if (tag === "expired_access_token" || errorResponse?.error_summary?.startsWith("expired_access_token")) {
                console.warn("⚠️ Dropbox token expired. Refreshing...");

                // Refresh the token
                await refreshDropboxAccessToken(creds.refreshToken, creds.appKey, creds.appSecret);
                const newToken = await fetchDropboxToken();

                if (newToken) {
                    console.log("🔄 Retrying file upload with refreshed token...");
                    return await uploadFileToDropbox(file, newToken, creds); // ✅ Recursive retry
                }
            }

            return null;
        }

        const data = await response.json();
        console.log("✅ File uploaded successfully:", data);
        return await getDropboxSharedLink(data.path_lower);

    } catch (error) {
        console.error("❌ Error during Dropbox upload:", error);
        return null;
    }
}
 
    // 🔹 Get Dropbox Shared Link
    async function getDropboxSharedLink(filePath) {
        const url = "https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings";
        try {
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${dropboxAccessToken}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    path: filePath,
                    settings: {
                        requested_visibility: "public"
                    }
                })
            });
    
            if (response.status === 409) {
                console.warn("⚠️ Shared link already exists. Fetching existing link...");
                return await getExistingDropboxLink(filePath);
            }
    
            if (!response.ok) {
                throw new Error("❌ Error creating Dropbox shared link.");
            }
    
            const data = await response.json();
            return convertToDirectLink(data.url);
        } catch (error) {
            console.error("Dropbox link error:", error);
            return null;
        }
    }

    async function fetchAndPopulateSubcontractors(resolvedRecordId) {
        console.log("🚀 Fetching branch `b` and 'Subcontractor' for record:", resolvedRecordId);
    
        const airtableBaseId = window.env.AIRTABLE_BASE_ID;
        const primaryTableId = "tbl6EeKPsNuEvt5yJ"; // Table where `b` and `Subcontractor` are stored
        const subcontractorTableId = "tbl9SgC5wUi2TQuF7"; // Subcontractor Table
    
        if (!resolvedRecordId) {
            console.error("❌ Record ID is missing.");
            return;
        }
    
        try {
            // 1️⃣ Fetch primary record
            const primaryUrl = `https://api.airtable.com/v0/${airtableBaseId}/${primaryTableId}/${resolvedRecordId}`;
            console.log(`🔗 Fetching Primary Record URL: ${primaryUrl}`);
    
            const primaryResponse = await fetch(primaryUrl, {
                headers: { Authorization: `Bearer ${window.env.AIRTABLE_API_KEY}` }
            });
    
            if (!primaryResponse.ok) {
                throw new Error(`❌ Error fetching primary record: ${primaryResponse.statusText}`);
            }
    
            const primaryData = await primaryResponse.json();
            const branchB = primaryData.fields?.b;
            const currentSubcontractor = primaryData.fields?.Subcontractor;
    
            if (!branchB) {
                console.warn("⚠️ No branch `b` found for this record.");
                return;
            }
    
            console.log(`📌 Found Branch 'b': ${branchB}`);
            console.log(`🔧 Current Subcontractor: ${currentSubcontractor || "None"}`);
    
            // 2️⃣ Fetch subcontractors for this branch
            let allSubcontractors = await fetchAllSubcontractors(airtableBaseId, subcontractorTableId, branchB);
    
            // 3️⃣ If the current subcontractor isn't in the list, add it manually
            const namesOnly = allSubcontractors.map(sub => sub.name);
            if (currentSubcontractor && !namesOnly.includes(currentSubcontractor)) {
                allSubcontractors.push({
                    name: currentSubcontractor,
                    vanirOffice: "Previously Selected"
                });
                console.log("➕ Appended missing subcontractor to the list.");
            }
    
            // 4️⃣ Populate dropdown with updated list
            populateSubcontractorDropdown(allSubcontractors, currentSubcontractor);
    
        } catch (error) {
            console.error("❌ Error fetching subcontractors:", error);
        }
    }
    
    // 🔹 Function to fetch all subcontractors (Handles offsets)
    async function fetchAllSubcontractors(baseId, tableId, branchB) {
        let allRecords = [];
        let offset = null;
    
        do {
            let url = `https://api.airtable.com/v0/${baseId}/${tableId}?filterByFormula=${encodeURIComponent(`{Vanir Branch} = '${branchB}'`)}&fields[]=Subcontractor Company Name&fields[]=Vanir Branch`;
            if (offset) {
                url += `&offset=${offset}`;
            }
    
            console.log(`🔗 Fetching Subcontractors URL: ${url}`);
    
            const response = await fetch(url, {
                headers: { Authorization: `Bearer ${window.env.AIRTABLE_API_KEY}` }
            });
    
            if (!response.ok) {
                throw new Error(`❌ Error fetching subcontractors: ${response.statusText}`);
            }
    
            const data = await response.json();
            allRecords.push(...data.records);
    
            // If Airtable returns an offset, we need to fetch more records
            offset = data.offset || null;
    
        } while (offset);
    
        console.log(`📦 Retrieved ${allRecords.length} total subcontractors from Airtable.`);
    
        return allRecords.map(record => ({
            name: record.fields['Subcontractor Company Name'] || 'Unnamed Subcontractor',
            vanirOffice: record.fields['Vanir Branch'] || 'Unknown Branch'
        }));
    }
    
    async function getExistingDropboxLink(filePath) {
        const url = "https://api.dropboxapi.com/2/sharing/list_shared_links";
        try {
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${dropboxAccessToken}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    path: filePath,
                    direct_only: true
                })
            });
    
            if (!response.ok) {
                throw new Error(`❌ Error fetching existing shared link: ${response.statusText}`);
            }
    
            const data = await response.json();
            if (data.links && data.links.length > 0) {
                return convertToDirectLink(data.links[0].url);
            } else {
                console.error("❌ No existing shared link found.");
                return null;
            }
        } catch (error) {
            console.error("Dropbox existing link fetch error:", error);
            return null;
        }
    }
    
    function convertToDirectLink(sharedUrl) {
        if (sharedUrl.includes("dropbox.com")) {
            return sharedUrl.replace("www.dropbox.com", "dl.dropboxusercontent.com").replace("?dl=0", "?raw=1");
        }
        return sharedUrl;
    }
    
    document.getElementById("subcontractor-dropdown").addEventListener("change", function () {
        console.log("📌 Subcontractor Selected:", this.value);
    });
        
    function populateSubcontractorDropdown(subcontractors, currentSelection = "") {
        console.log("📌 Populating the subcontractor dropdown...");
    
        const existing = document.getElementById("subcontractor-dropdown");
    
        const parent = existing?.parentElement;
        if (!parent) {
            console.error("❌ Subcontractor dropdown element not found.");
            return;
        }

        // Create input field
        const input = document.createElement("input");
        input.setAttribute("list", "subcontractor-options");
        input.setAttribute("id", "subcontractor-dropdown");
        input.setAttribute("placeholder", "Select or type subcontractor...");
        input.setAttribute("data-field", "Subcontractor"); // ✅ Add this line

        input.style.width = "100%";
        input.style.padding = "10px";
        input.style.borderRadius = "5px";
        input.style.border = "1px solid #ccc";
        input.value = currentSelection;
    
        parent.replaceChild(input, existing);
    
        // Create datalist
        let dataList = document.getElementById("subcontractor-options");
        if (!dataList) {
            dataList = document.createElement("datalist");
            dataList.id = "subcontractor-options";
            document.body.appendChild(dataList);
        } else {
            dataList.innerHTML = ""; // clear previous
        }
    
        // Add "Sub Not Needed" at the top
        const subNotNeeded = document.createElement("option");
        subNotNeeded.value = "Sub Not Needed";
        subNotNeeded.label = "Sub Not Needed (Manual Entry)";
        dataList.appendChild(subNotNeeded);
    
        // Sort and fill datalist with unique options
        const added = new Set();
        const sortedSubs = subcontractors
            .filter(sub => sub.name && sub.name !== "Sub Not Needed")
            .sort((a, b) => a.name.localeCompare(b.name));
    
        sortedSubs.forEach(({ name, vanirOffice }) => {
            if (added.has(name)) return;
    
            const option = document.createElement("option");
            option.value = name;
            option.label = name === currentSelection
                ? `⭐ ${name} `
                : `${name} `;
    
            dataList.appendChild(option);
            added.add(name);
        });
    }
        
    // ✅ Call this function when the page loads
    document.addEventListener('DOMContentLoaded', populateSubcontractorDropdown);

    function setInputValue(id, value) {
        const element = document.getElementById(id);
        if (!element) {
            console.warn(`⚠️ Element with ID '${id}' not found.`);
            return;
        }
    
        element.value = value || "";
    }
    
    function setCheckboxValue(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.checked = Boolean(value);
            console.log(`✅ Checkbox ${id} set to:`, element.checked);
        }
    }
    
});