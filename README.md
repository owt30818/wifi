# WiFi Admin Portal (v0.8.9)

A web-based administration portal for managing a FreeRADIUS server. Administrators can easily manage users, devices, and view network statistics through a modern dashboard.

## Features

- **Dashboard**: Real-time network statistics (Online users, Device distribution, etc.) with 30s caching.
- **Online Users**: Real-time active session monitoring with AP/SSID details and server-side pagination.
- **Device Management**:
    - **Advanced Search**: Filter by MAC, Alias, or Group (Server-side).
    - **Auto-Formatting**: Automatic MAC address input formatting.
    - Register/Block/Unblock devices.
    - Bulk Upload (CSV/Text) with loading indicators.
    - Group management and CSV Export.
- **User Management**: Manage portal admin users.
- **Access Points**: View AP status and connected client counts.
- **Performance & Scalability**:
    - **Node.js Clustering**: Multi-process support for multi-core CPUs.
    - **HTTP Compression**: Gzip/Brotli support for faster loading.
    - **DB Optimization**: Indexed FreeRADIUS tables and expanded connection pool (50).
- **Security**:
    - JWT-based authentication with auto-logout.
    - Rate limiting and security headers (Helmet).
    - Configurable CORS origins.
- **UI/UX**: Modern glassmorphism design with a persistent status footer.

## Technology Stack

- **Frontend**: React (Vite), Vanilla CSS, Chart.js, Lucide Icons
- **Backend**: Node.js (Express)
- **Database**: MySQL (FreeRADIUS Schema)
- **Authentication**: JWT, bcrypt

## Installation

### Prerequisites
- Node.js (v18+)
- MySQL Server (with FreeRADIUS schema)

### 1. Backend Setup
Navigate to the `backend` directory and install dependencies:

```bash
cd backend
npm install
```

Create a `.env` file:

```env
PORT=3000
DB_HOST=localhost
DB_USER=radius
DB_PASSWORD=radiuspass
DB_NAME=radius
JWT_SECRET=your_secure_random_secret_key
CORS_ORIGINS=http://localhost:3000
```

Start the server: `node server.js`

### 2. Frontend Setup
Navigate to the `frontend` directory and install dependencies:

```bash
cd frontend
npm install
npm run build
```

## Changelog

### v0.8.9
- **Performance Optimization**:
    - **Node.js Clustering**: Multi-core CPU utilization for high traffic.
    - **HTTP Compression**: Gzip compression for faster data transfer.
    - **DB Indexing**: Added critical indexes to FreeRADIUS tables.
    - **Connection Pool**: Increased DB concurrent connections to 50.
- **Server-side Processing**:
    - **Pagination**: Efficiently handle thousands of devices and sessions.
    - **Sorting & Searching**: Offloaded sorting/filtering to the database.
- **Caching**: 30-second in-memory cache for dashboard statistics.

### v0.8.2
- **Restored Online Users**: Standalone page for real-time session monitoring.
- **SQL Fix**: Resolved collation mismatch in cross-table joins.

### v0.8.1
- **Advanced Search**: Category-based device searching.
- **Footer**: Added persistent system status and version info.
- **UI Alignment**: Consistent styling across all management pages.

### v0.8
- **Security Hardening**: Added Helmet, Rate Limiting, and CORS configuration.

### v0.7
- **UX Improvements**: Better Bulk Add modal with loading states and auto-close.

### v0.6
- **JWT Protection**: Implemented secure authentication across all routes.

## License
MIT
