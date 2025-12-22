import React, { useState, useEffect } from 'react';
import { ShieldCheck, Server, Zap } from 'lucide-react';

const Footer = () => {
    const [isApiHealthy, setIsApiHealthy] = useState(true);
    const currentYear = new Date().getFullYear();
    const version = "v0.8.2";

    // Simple heartbeat/health check could be implemented here
    // For now, we'll assume it's connected if the app is running

    return (
        <footer className="portal-footer">
            <div className="footer-content">
                <div className="footer-section copyright">
                    <span>&copy; {currentYear} WiFi Admin Portal. All rights reserved.</span>
                </div>

                <div className="footer-section version">
                    <div className="version-badge">
                        <Zap size={14} className="badge-icon" />
                        <span>{version}</span>
                    </div>
                </div>

                <div className="footer-section status">
                    <div className={`status-indicator ${isApiHealthy ? 'healthy' : 'error'}`}>
                        {isApiHealthy ? (
                            <>
                                <ShieldCheck size={14} className="status-icon" />
                                <span>API Connected</span>
                            </>
                        ) : (
                            <>
                                <Server size={14} className="status-icon" />
                                <span>API Disconnected</span>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
