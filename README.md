# WiFi Admin Portal (V0.5)

This project is a web-based administration portal for managing a FreeRADIUS server. It allows administrators to easily manage users, devices, and view network statistics through a modern dashboard.

## Features

-   **Dashboard**: Real-time network statistics (Online users, Device distribution, etc.)
-   **Device Management**:
    -   Register/Block/Unblock devices (MAC Address)
    -   Bulk Upload (CSV/Text)
    -   Group management
-   **User Management**: Manage radius users
-   **Access Points**: View AP status (derived from accounting data)

## Technology Stack

-   **Frontend**: React (Vite), Tailwind-like CSS, Chart.js, Lucide Icons
-   **Backend**: Node.js (Express)
-   **Database**: MySQL (FreeRADIUS Schema)

## Installation

### Prerequisites
-   Node.js (v18+)
-   MySQL Server (with FreeRADIUS schema installed)

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
JWT_SECRET=your_jwt_secret
```

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

## License
MIT
