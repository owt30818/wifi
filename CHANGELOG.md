# Changelog

All notable changes to WiFi Admin Portal will be documented in this file.

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
