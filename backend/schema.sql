-- Admin users for the web portal
CREATE TABLE IF NOT EXISTS portal_admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Managed devices metadata (linked to FreeRADIUS via mac_address)
-- Actual blocking/allowing happens in radcheck, but this stores friendly info
CREATE TABLE IF NOT EXISTS managed_devices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mac_address VARCHAR(17) NOT NULL UNIQUE, -- FORMAT: AA-BB-CC-DD-EE-FF
    alias VARCHAR(100),
    allowed_ssids VARCHAR(255) DEFAULT NULL, -- Comma separated list of allowed SSIDs. NULL = All allowed.
    status ENUM('allowed', 'blocked') DEFAULT 'allowed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- AP Names mapping for Dashboard
CREATE TABLE IF NOT EXISTS access_points (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mac_address VARCHAR(17) NOT NULL UNIQUE, -- FORMAT: AA-BB-CC-DD-EE-FF
    name VARCHAR(100) NOT NULL,
    location VARCHAR(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Initial admin user (password: admin123) - using bcrypt hash placeholder
-- You should change this in production!
INSERT IGNORE INTO portal_admins (username, password_hash) 
VALUES ('admin', '$2a$10$YourHashedPasswordHere');
