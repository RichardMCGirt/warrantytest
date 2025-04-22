
# 🛠️ Vanir Job Details Interface

This application allows field technicians to manage job details, upload images to Dropbox, and update job records in Airtable. It includes subcontractor handling, dynamic UI updates based on job status, and integration with Dropbox API and Google Maps.

## 🚀 Features

- 🔄 **Load Job Data** via Airtable using `Warranty Record ID` or Airtable Record ID
- 🗺️ **Smart Address Navigation**:
  - Opens **Apple Maps** on iOS
  - Opens **Google Maps** on Android
  - Modal options for **Google Maps** / **Waze** on desktop
- 📸 **Image Upload to Dropbox**:
  - Supports issue and completed pictures
  - Handles Dropbox token refresh
  - Automatically stores Dropbox links in Airtable
- 🧾 **Job Form**:
  - Dynamic subcontractor dropdown populated based on branch (`b`)
  - Checkbox for "Subcontractor Not Needed" disables dropdown
  - Billable/Non-Billable toggle buttons
  - Smart date/time formatting (local to UTC and vice versa)
- 🔐 **Field Validation**:
  - Prevents saving without required fields (e.g. Warranty ID)
- 🔄 **Airtable Record Sync**:
  - Fetches updated data after save
  - Automatically redirects if job moves to "Material Purchase Needed"
- 🖼️ **Image Preview and Deletion**:
  - Inline preview of uploaded images
  - Select & delete images with UI updates
- 📦 **Toast Notification System**:
  - Success and error messaging for users

## ✅ Usage

1. Serve `job-details.html` from a static web server.
2. The page automatically fetches the job using `?id=recXXXXXX` in the URL.
3. All form fields will be populated and editable depending on job status.
4. Technicians can upload photos, adjust details, and save the job.
5. If status becomes `Material Purchase Needed`, it redirects to job list.

## 🧠 Developer Notes

- Use `getWarrantyId()` to consistently reference the record ID.
- The app uses `MutationObserver` to detect image DOM changes and update delete buttons accordingly.
- Computed fields like `Warranty Record ID` are filtered out before sending data to Airtable.
- File uploads to Dropbox automatically generate a shared link and update Airtable with direct download links.

## 🧪 Debugging Tips

- Enable console logging in DevTools to view verbose logs prefixed with icons like `📡`, `✅`, `❌`.
- Use `testFetchImages()` to check if Dropbox images are loaded correctly.
- Check for missing fields like `field tech` or `StartDate` if the UI doesn’t behave as expected.

