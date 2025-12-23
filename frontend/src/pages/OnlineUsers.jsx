import { useEffect, useState } from 'react';
import axios from 'axios';
import { Search, Wifi, Eye, Activity, MapPin, Globe } from 'lucide-react';

const OnlineUsers = () => {
    const [sessions, setSessions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 30, totalPages: 0 });

    const fetchSessions = async (silent = false, page = pagination.page) => {
        if (!silent) setIsLoading(true);
        try {
            const res = await axios.get(`/api/dashboard/online-users?page=${page}&limit=${pagination.limit}`);
            setSessions(res.data.data);
            setPagination(res.data.pagination);
        } catch (err) {
            console.error('Failed to fetch online sessions', err);
        } finally {
            if (!silent) setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSessions(false, currentPage);
        const interval = setInterval(() => fetchSessions(true, currentPage), 15000);
        return () => clearInterval(interval);
    }, [currentPage]);

    // Simple local filter for the current page (or we could implement server-side search)
    const filteredSessions = sessions.filter(s => {
        const term = searchTerm.toLowerCase();
        return (
            (s.mac_address && s.mac_address.toLowerCase().includes(term)) ||
            (s.username && s.username.toLowerCase().includes(term)) ||
            (s.alias && s.alias.toLowerCase().includes(term)) ||
            (s.ip_address && s.ip_address.toLowerCase().includes(term)) ||
            (s.ap_name && s.ap_name.toLowerCase().includes(term))
        );
    });

    const totalPages = pagination.totalPages;
    const currentSessions = filteredSessions; // Locally filtered chunk

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Activity color="#10b981" /> Online Users
                    </h1>
                    <p style={{ color: '#94a3b8', margin: '8px 0 0 0' }}>Real-time active sessions across all Access Points</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '0 1rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <Search size={18} color="#94a3b8" />
                    <input
                        placeholder="Search by MAC, IP, Name..."
                        style={{ background: 'transparent', border: 'none', padding: '12px 0', color: 'white', outline: 'none', width: '300px' }}
                        value={searchTerm}
                        onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    />
                </div>
            </div>

            <div className="glass-panel" style={{ overflow: 'hidden' }}>
                <table className="glass-table">
                    <thead>
                        <tr>
                            <th style={{ width: '40px' }}></th>
                            <th>Name / Alias</th>
                            <th>MAC Address</th>
                            <th>IP Address</th>
                            <th>AP / SSID</th>
                            <th>Status</th>
                            <th>Connected Since</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentSessions.map((session, idx) => (
                            <tr key={idx}>
                                <td>
                                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px rgba(16, 185, 129, 0.5)', margin: '0 auto' }}></div>
                                </td>
                                <td style={{ fontWeight: '500' }}>{session.alias || session.username}</td>
                                <td style={{ fontFamily: 'monospace', letterSpacing: '0.5px' }}>{session.mac_address}</td>
                                <td style={{ color: '#38bdf8' }}>{session.ip_address}</td>
                                <td>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: '0.9rem' }}>{session.ap_name}</span>
                                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>SSID: {session.ssid}</span>
                                    </div>
                                </td>
                                <td>
                                    <span className={`status-badge ${session.status === 'blocked' ? 'status-blocked' : 'status-allowed'}`}>
                                        {session.status ? session.status.toUpperCase() : 'UNKNOWN'}
                                    </span>
                                </td>
                                <td style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                                    {new Date(session.start_time).toLocaleString()}
                                </td>
                                <td>
                                    <a href={`/devices?view=registered&search=${session.mac_address}`} className="glass-button secondary" style={{ padding: '6px', borderRadius: '8px' }} title="View Device Details">
                                        <Eye size={16} />
                                    </a>
                                </td>
                            </tr>
                        ))}
                        {currentSessions.length === 0 && (
                            <tr>
                                <td colSpan="8" style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>
                                    <div style={{ opacity: 0.5, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                                        <Wifi size={48} />
                                        <span>No active sessions found</span>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {totalPages > 1 && (
                    <div style={{ padding: '1.5rem', display: 'flex', justifyContent: 'center', gap: '12px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        <button className="glass-button secondary" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Previous</button>
                        <span style={{ display: 'flex', alignItems: 'center', padding: '0 1rem', color: '#94a3b8' }}>Page {currentPage} of {totalPages}</span>
                        <button className="glass-button secondary" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>Next</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OnlineUsers;
