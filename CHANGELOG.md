# Changelog

All notable changes to WiFi Admin Portal will be documented in this file.

## [1.0.1] - 2025-12-26

### Fixed
- **Browser Title Substitution**: Fixed a bug where `%VITE_APP_NAME%` was shown in the browser tab instead of the actual application name.
- **Static Fallsback**: Added "WIFI Admin Portal" as a static fallback in `index.html`.

### Improved
- **Dynamic Title Management**: Implemented `useEffect` in `App.jsx` to dynamically update the document title from environment variables.

---

## [1.0.0] - 2025-12-26

### Added
- **Configurable Application Name**: The portal name can now be changed via the `VITE_APP_NAME` environment variable.
- **Environment Variable Templates**: Added `.env.example` files to both frontend and backend.

### Improved
- **Production Version**: Officially reaching v1.0.0 with stability and security enhancements from previous iterations.
- **Build Process Cleaner**: Optimized frontend build with configurable branding.

---

## [0.8.2] - 2025-12-22

### Added
- **Online Users Tab/Page**: Restored the standalone Online Users page for real-time monitoring.

### Fixed
- **Database Collation Mismatch**: Resolved "Illegal mix of collations" errors in the Online Users query when joining across tables with different encoding (utf8mb4_general_ci vs utf8mb4_unicode_ci).
- **Online Users Rendering**: Fixed a bug where the Online Users page appeared blank due to missing backend routes and potential null crashes.

---

## [0.8.1] - 2025-12-22

### Added
- New **Footer** component displaying copyright, version v0.8.1, and API connection status.
- **Advanced Device Search**: Category-based search (MAC, Alias, Group) with selection dropdown.
- **Auto-MAC Formatting** in device search for precise filtering.

### Improved
- **Added Date Refresh**: The `created_at` timestamp now updates whenever a device is edited.
- **Access Points UI**: Aligned table layout, spacing, and glassmorphism styling with the Devices page.

### Fixed
- **Pagination Bug**: Resolved an issue where pagination buttons on the Devices page were non-functional.

---

## [0.8] - 2025-12-18

### Added
- Helmet middleware for security headers (HSTS, X-Frame-Options, etc.)
- Rate limiting: 10 login attempts per 15 minutes, 100 API requests per minute
- Configurable CORS origins via `CORS_ORIGINS` environment variable

### Security
- Protection against brute-force login attacks
- XSS protection headers
- Clickjacking protection

---

## [0.7] - 2025-12-18

### Improved
- Bulk Add modal now resets state when opened
- Added loading indicator during bulk device registration
- Buttons disabled during submission to prevent duplicate requests
- Modal auto-closes after successful registration

---

## [0.6] - 2025-12-18

### Added
- JWT verification middleware (`backend/middleware/auth.js`)
- Authentication protection on all API routes (devices, dashboard, users, access-points)
- Axios interceptor for automatic logout on 401 Unauthorized
- React Router v7 future flags for forward compatibility
- Security section in README

### Fixed
- Missing `db` import in `routes/devices.js` and `routes/dashboard.js`
- Authorization header not set after login
- Console warnings from React Router

### Security
- All protected routes now properly verify JWT tokens
- Invalid/expired tokens are rejected with 401 status
- Changing JWT_SECRET immediately invalidates all existing sessions

---

## [0.5] - 2025-12-17

### Added
- Initial release
- Dashboard with real-time statistics (online users, device distribution)
- Device management (register, block/unblock, bulk upload, group management)
- User management for portal admins
- Access Points view with client count
- JWT-based authentication
- bcrypt password hashing
