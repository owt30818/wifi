# WiFi Admin Portal (V0.8.1)

A web-based administration portal for managing a FreeRADIUS server. Administrators can easily manage users, devices, and view network statistics through a modern dashboard.

## Features

- **Dashboard**: Real-time network statistics (Online users, Device distribution, etc.)
- **Advanced Device Search**:
    - Segmentation by MAC Address, Alias, or Group
    - Automatic MAC address formatting for precise filtering
- **Device Management**:
    - Register/Block/Unblock devices
    - Bulk Upload (CSV/Text)
    - Group management
    - Export to CSV
- **User Management**: Manage portal admin users
- **Access Points**: View AP status and active client counts
- **UI/UX**:
    - Modern Glassmorphism design
    - Responsive Footer with API status and versioning
    - Sticky footer across all administrative pages

## Technology Stack

- **Frontend**: React (Vite), Custom CSS, Chart.js, Lucide Icons
- **Backend**: Node.js (Express)
- **Database**: MySQL (FreeRADIUS Schema)
- **Authentication**: JWT (jsonwebtoken), bcrypt

## Installation

### Prerequisites
- Node.js (v18+)
- MySQL Server (with FreeRADIUS schema installed)

### 1. Backend Setup
Navigate to the `backend` directory and install dependencies:

```bash
cd backend
npm install
```

Create a `.env` file in the `backend` directory:

```env
PORT=3000
DB_HOST=localhost
DB_USER=radius
DB_PASSWORD=radiuspass
DB_NAME=radius
JWT_SECRET=your_secure_random_secret_key
```

> ⚠️ **Important**: Use a strong, random JWT_SECRET in production. Generate one with: `openssl rand -base64 32`

Start the backend server:

```bash
node server.js
```

### 2. Frontend Setup
Navigate to the `frontend` directory and install dependencies:

```bash
cd frontend
npm install
```

Build for production:

```bash
npm run build
```

The backend server is configured to serve the frontend static files from `frontend/dist`.

## Usage
Access the portal at `http://your-server-ip:3000`.

Default admin credentials should be set up in the `portal_admins` table with a bcrypt-hashed password.

## Changelog

### v0.8.1
- Added **Advanced Device Search** with MAC, Alias, and Group segmentation
- Added **Portal Footer** with API status and version tracking
- Improved UI consistency for **Access Points** page
- Fixed **Pagination bug** in the Devices list
- Enabled automatic `created_at` refresh on device edits

### v0.8
- Security hardening: Helmet middleware and Rate limiting
- Protection against brute-force login attacks
- Configurable CORS origins

### v0.6
- Implemented proper JWT verification middleware
- Applied authentication to all protected API routes
- Added auto-logout on token expiration (401 response)

### v0.5
- Initial release

## License
MIT
