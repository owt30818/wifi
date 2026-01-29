# CSV Export Fix Implementation Plan

## Problem
The user reported that exporting CSV from `/devices` results in an incomplete download. This was because the export function was only exporting the *current page* of devices (limited to 30 items by default) instead of all devices matching the current filter.

## Solution
1.  **Backend (`backend/routes/devices.js`)**:
    -   Modified `GET /api/devices` to accept an optional query parameter `all=true`.
    -   If `all=true` is present, the pagination (`LIMIT` and `OFFSET`) clauses are skipped, returning *all* matching records.
    -   Sort order and filtering logic remain active to ensure the export matches the user's view context (e.g., search results).

2.  **Frontend (`frontend/src/pages/Devices.jsx`)**:
    -   Updated `handleExport` function to be asynchronous.
    -   Instead of using the local `devices` state (which only holds the current page), it now makes a fresh API call to `/api/devices` with `all=true` and the current search/sort parameters.
    -   Generates the CSV from the full dataset returned by the API.

## Verification
-   **CSV Content**: The exported CSV should now contain all devices that match the current search criteria, not just the visible page.
-   **Filters**: Searching for a specific MAC or Group and then clicking Export should export all matches, not just the first 30.
-   **Performance**: For very large datasets, the download might take a moment, but it will be complete. (If dataset grows to >10k, streaming response or server-side generation might be needed later, but for now this is sufficient).

## Files Modified
-   `backend/routes/devices.js`
-   `frontend/src/pages/Devices.jsx`
