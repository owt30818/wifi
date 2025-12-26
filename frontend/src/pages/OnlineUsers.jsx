import { useEffect, useState } from 'react';
import axios from 'axios';
import { Search, Wifi, Eye, Activity } from 'lucide-react';
import { formatMac } from '../utils/macUtils';

const OnlineUsers = () => {
    const [sessions, setSessions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchType, setSearchType] = useState('all'); // all | mac | alias | ip | group
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(30);
    const [sortConfig, setSortConfig] = useState({ key: 'start_time', direction: 'desc' });
    const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 30, totalPages: 0 });

    const fetchSessions = async (silent = false, page = currentPage, limit = itemsPerPage) => {
        if (!silent) setIsLoading(true);
        try {
            const res = await axios.get('/api/dashboard/online-users', {
                params: {
                    page,
                    limit,
                    search: searchTerm,
                    searchType: searchType,
                    sortKey: sortConfig.key,
                    sortDir: sortConfig.direction
                }
            });
            setSessions(res.data.data);
            setPagination(res.data.pagination);
        } catch (err) {
            console.error('Failed to fetch online sessions', err);
        } finally {
            if (!silent) setIsLoading(false);
        }
    };

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
        setCurrentPage(1);
    };

    useEffect(() => {
        fetchSessions(false, currentPage, itemsPerPage);
        // We only want the interval to run if the user is not actively searching or on a specific page?
        // Actually, silent refresh is fine as long as it respects current params.
        const interval = setInterval(() => fetchSessions(true, currentPage, itemsPerPage), 15000);
        return () => clearInterval(interval);
    }, [currentPage, itemsPerPage, searchTerm, searchType, sortConfig]);

    const totalPages = pagination.totalPages;

    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Activity color="#10b981" /> Online Users
                    </h1>
                    <p style={{ color: '#94a3b8', margin: '8px 0 0 0' }}>Real-time active sessions across all Access Points</p>
                </div>
            </div>

            {/* Controls Bar */}
            <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>

                    {/* Items Per Page */}
                    <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px' }}>Show</label>
                        <select
                            className="glass-input"
                            style={{ width: '80px', padding: '8px' }}
                            value={itemsPerPage}
                            onChange={e => {
                                setItemsPerPage(Number(e.target.value));
                                setCurrentPage(1);
                            }}
                        >
                            <option value={10}>10</option>
                            <option value={30}>30</option>
                            <option value={50}>50</option>
                        </select>
                    </div>

                    {/* Search */}
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px' }}>Search Type</label>
                            <select
                                className="glass-input"
                                style={{ width: '120px', padding: '8px' }}
                                value={searchType}
                                onChange={e => { setSearchType(e.target.value); setSearchTerm(''); setCurrentPage(1); }}
                            >
                                <option value="all">All Fields</option>
                                <option value="mac">MAC Address</option>
                                <option value="alias">Name/Alias</option>
                                <option value="ip">IP Address</option>
                                <option value="group">Group</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px' }}>Search</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '0 12px' }}>
                                <Search size={18} color="#94a3b8" />
                                <input
                                    placeholder={searchType === 'mac' ? "AA-BB-CC..." : "Search..."}
                                    style={{ border: 'none', background: 'transparent', padding: '10px 0', color: 'white', outline: 'none', width: '250px' }}
                                    value={searchTerm}
                                    onChange={e => {
                                        let val = e.target.value;
                                        if (searchType === 'mac') val = formatMac(val);
                                        setSearchTerm(val);
                                        setCurrentPage(1);
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="glass-panel" style={{ overflow: 'hidden' }}>
                <table className="glass-table" style={{ borderCollapse: 'separate', borderSpacing: '0 2px' }}>
                    <thead>
                        <tr style={{ fontSize: '0.85rem' }}>
                            <th style={{ width: '40px', paddingLeft: '1rem' }}></th>
                            <th style={{ padding: '0.5rem 0.8rem', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('alias')}>
                                Name / Alias {sortConfig.key === 'alias' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                            </th>
                            <th style={{ padding: '0.5rem 0.8rem', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('mac_address')}>
                                MAC Address {sortConfig.key === 'mac_address' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                            </th>
                            <th style={{ padding: '0.5rem 0.8rem', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('ip_address')}>
                                IP Address {sortConfig.key === 'ip_address' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                            </th>
                            <th style={{ padding: '0.5rem 0.8rem', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('ap_name')}>
                                AP / SSID {sortConfig.key === 'ap_name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                            </th>
                            <th style={{ padding: '0.5rem 0.8rem', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('status')}>
                                Status {sortConfig.key === 'status' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                            </th>
                            <th style={{ padding: '0.5rem 0.8rem', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('start_time')}>
                                Connected Since {sortConfig.key === 'start_time' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                            </th>
                            <th style={{ padding: '0.5rem 0.8rem' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody style={{ fontSize: '0.9rem' }}>
                        {sessions.map((session, idx) => (
                            <tr key={idx}>
                                <td style={{ paddingLeft: '1rem' }}>
                                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px rgba(16, 185, 129, 0.5)', margin: '0 auto' }}></div>
                                </td>
                                <td style={{ padding: '0.4rem 0.8rem', fontWeight: '500' }}>{session.alias || session.username}</td>
                                <td style={{ padding: '0.4rem 0.8rem', fontFamily: 'monospace', letterSpacing: '0.5px' }}>{session.mac_address}</td>
                                <td style={{ padding: '0.4rem 0.8rem', color: '#38bdf8' }}>{session.ip_address}</td>
                                <td style={{ padding: '0.4rem 0.8rem' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: '0.9rem' }}>{session.ap_name || 'Unknown AP'}</span>
                                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>SSID: {session.ssid}</span>
                                    </div>
                                </td>
                                <td style={{ padding: '0.4rem 0.8rem' }}>
                                    <span className={`status-badge ${session.status === 'blocked' ? 'status-blocked' : 'status-allowed'}`} style={{ padding: '2px 8px', fontSize: '0.85em' }}>
                                        {session.status ? session.status.toUpperCase() : 'UNKNOWN'}
                                    </span>
                                </td>
                                <td style={{ padding: '0.4rem 0.8rem', color: '#94a3b8', fontSize: '0.85em' }}>
                                    {new Date(session.start_time).toLocaleString()}
                                </td>
                                <td style={{ padding: '0.4rem 0.8rem' }}>
                                    <a href={`/devices?search=${session.mac_address}&searchType=mac`} className="glass-button secondary" style={{ padding: '6px', borderRadius: '8px', display: 'inline-flex' }} title="View Device Details">
                                        <Eye size={16} />
                                    </a>
                                </td>
                            </tr>
                        ))}
                        {sessions.length === 0 && (
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

                {/* Pagination Footer */}
                {totalPages > 1 && (
                    <div style={{ padding: '1.5rem', display: 'flex', justifyContent: 'center', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        <button
                            className="glass-button secondary"
                            disabled={currentPage === 1}
                            onClick={() => handlePageChange(currentPage - 1)}
                        >
                            Previous
                        </button>

                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter(p => p === 1 || p === totalPages || (p >= currentPage - 2 && p <= currentPage + 2))
                            .map((p, i, arr) => (
                                <div key={p} style={{ display: 'flex' }}>
                                    {i > 0 && p !== arr[i - 1] + 1 && <span style={{ padding: '0 8px', color: '#64748b' }}>...</span>}
                                    <button
                                        className={`glass-button ${currentPage === p ? 'primary' : 'secondary'}`}
                                        style={{ minWidth: '36px', background: currentPage === p ? '#3b82f6' : '' }}
                                        onClick={() => handlePageChange(p)}
                                    >
                                        {p}
                                    </button>
                                </div>
                            ))
                        }

                        <button
                            className="glass-button secondary"
                            disabled={currentPage === totalPages}
                            onClick={() => handlePageChange(currentPage + 1)}
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OnlineUsers;
