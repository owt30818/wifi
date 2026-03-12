-- Admin users for the web portal
CREATE TABLE IF NOT EXISTS portal_admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('super_admin', 'sub_admin') DEFAULT 'super_admin',
    allowed_groups TEXT, -- Comma separated list of allowed groups for sub_admin
    allowed_ssids TEXT, -- Comma separated list of allowed SSIDs for sub_admin
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Regular users for the portal
CREATE TABLE IF NOT EXISTS portal_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    grade INT,
    class INT,
    number INT,
    real_name VARCHAR(50),
    group_name VARCHAR(50),
    allowed_ssids VARCHAR(255) DEFAULT NULL, -- Policy: Forced SSIDs for this user
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Signup Invitations
CREATE TABLE IF NOT EXISTS signup_invitations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100), -- Description
    group_name VARCHAR(50) DEFAULT 'Student',
    allowed_ssids VARCHAR(255) DEFAULT NULL,
    used_count INT DEFAULT 0,
    max_uses INT DEFAULT 0, -- 0 = Unlimited
    expires_at DATETIME DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Managed devices metadata (linked to FreeRADIUS via mac_address)
CREATE TABLE IF NOT EXISTS managed_devices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mac_address VARCHAR(17) NOT NULL UNIQUE, -- FORMAT: AA-BB-CC-DD-EE-FF
    alias VARCHAR(100),
    group_name VARCHAR(100),
    user_id INT DEFAULT NULL, -- Link to portal_users. NULL = Admin registered or unassigned.
    allowed_ssids VARCHAR(255) DEFAULT NULL, -- Comma separated list of allowed SSIDs. NULL = All allowed.
    status ENUM('allowed', 'blocked') DEFAULT 'allowed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES portal_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- AP Names mapping for Dashboard
CREATE TABLE IF NOT EXISTS access_points (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mac_address VARCHAR(17) NOT NULL UNIQUE, -- FORMAT: AA-BB-CC-DD-EE-FF
    name VARCHAR(100) NOT NULL,
    location VARCHAR(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Initial admin user (password: admin123)
-- You should change this in production!
INSERT IGNORE INTO portal_admins (username, password_hash) 
VALUES ('admin', '$2a$10$YourHashedPasswordHere');
