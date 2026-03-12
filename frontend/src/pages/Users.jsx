import { useEffect, useState } from 'react';
import axios from 'axios';
import { Trash2, Wifi, Search, ChevronDown, ChevronUp, ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatStudentInfo } from '../utils/format';

const Users = () => {
    const [portalUsers, setPortalUsers] = useState([]);

    // UI States
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);
    const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
    const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });

    // Modal States
    const [showSsidModal, setShowSsidModal] = useState(false);
    const [ssidForm, setSsidForm] = useState({ id: null, username: '', allowed_ssids: '' });
    const [deleteUser, setDeleteUser] = useState(null);
    const [deleteDevices, setDeleteDevices] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    // Fetch Data
    const fetchPortalUsers = async (page = currentPage, limit = itemsPerPage) => {
        try {
            const res = await axios.get('/api/users/portal', {
                params: {
                    page,
                    limit,
                    search: searchTerm,
                    sortKey: sortConfig.key,
                    sortDir: sortConfig.direction
                }
            });
            setPortalUsers(res.data.data);
            setPagination(res.data.pagination);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchPortalUsers();
    }, [currentPage, itemsPerPage, searchTerm, sortConfig]);

    // Handlers
    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
        setCurrentPage(1);
    };

    const handlePageChange = (page) => {
        if (page >= 1 && page <= pagination.totalPages) {
            setCurrentPage(page);
        }
    };

    const handleDeletePortalClick = (user) => {
        setDeleteUser(user);
        setDeleteDevices(false);
        setShowDeleteModal(true);
    };

    const handleDeletePortalConfirm = async () => {
        if (!deleteUser) return;
        try {
            await axios.delete(`/api/users/portal/${deleteUser.id}?delete_devices=${deleteDevices}`);
            setShowDeleteModal(false);
            setDeleteUser(null);
            fetchPortalUsers();
        } catch (err) {
            console.error(err);
            alert('Failed to delete user');
        }
    };

    const handleUpdateSsids = async (e) => {
        e.preventDefault();
        try {
            await axios.put(`/api/users/portal/${ssidForm.id}/ssids`, { allowed_ssids: ssidForm.allowed_ssids });
            setShowSsidModal(false);
            fetchPortalUsers();
            alert('SSID settings updated');
        } catch (err) {
            alert('Failed to update SSIDs');
        }
    };

    const openSsidModal = (user) => {
        setSsidForm({ id: user.id, username: user.username, allowed_ssids: user.allowed_ssids || '' });
        setShowSsidModal(true);
    };

    // Render Sort Icon
    const SortIcon = ({ columnKey }) => {
        if (sortConfig.key !== columnKey) return <div style={{ width: '16px' }} />;
        return sortConfig.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />;
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Header & Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <h1 style={{ margin: 0 }}>사용자 관리</h1>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div className="glass-panel" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Search size={18} color="#94a3b8" />
                        <input
                            style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none', width: '200px' }}
                            placeholder="이름, 아이디, 그룹 검색..."
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                        />
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="glass-panel" style={{ overflow: 'hidden', padding: 0 }}>
                <table className="glass-table">
                    <thead>
                        <tr>
                            <th onClick={() => handleSort('id')} style={{ cursor: 'pointer' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>ID <SortIcon columnKey="id" /></div>
                            </th>
                            <th onClick={() => handleSort('grade')} style={{ cursor: 'pointer' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>학년/반/번호 <SortIcon columnKey="grade" /></div>
                            </th>
                            <th onClick={() => handleSort('real_name')} style={{ cursor: 'pointer' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>이름 <SortIcon columnKey="real_name" /></div>
                            </th>
                            <th onClick={() => handleSort('username')} style={{ cursor: 'pointer' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>아이디 <SortIcon columnKey="username" /></div>
                            </th>
                            <th onClick={() => handleSort('group_name')} style={{ cursor: 'pointer' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>그룹 <SortIcon columnKey="group_name" /></div>
                            </th>
                            <th>허용 SSID</th>
                            <th onClick={() => handleSort('created_at')} style={{ cursor: 'pointer' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>가입일 <SortIcon columnKey="created_at" /></div>
                            </th>
                            <th>관리</th>
                        </tr>
                    </thead>
                    <tbody>
                        {portalUsers.map(user => (
                            <tr key={user.id}>
                                <td>{user.id}</td>
                                <td>
                                    <span style={{ fontWeight: 500, color: '#e2e8f0' }}>
                                        {formatStudentInfo(user.grade, user.class, user.number)}
                                    </span>
                                </td>
                                <td>{user.real_name}</td>
                                <td style={{ color: '#94a3b8' }}>{user.username}</td>
                                <td>
                                    {user.group_name ? (
                                        <span style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '2px 8px', borderRadius: '4px', fontSize: '0.85rem' }}>
                                            {user.group_name}
                                        </span>
                                    ) : (
                                        <span style={{ color: '#64748b' }}>-</span>
                                    )}
                                </td>
                                <td>
                                    {user.allowed_ssids ? (
                                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                            {user.allowed_ssids.split(',').map(ssid => (
                                                <span key={ssid} style={{ fontSize: '0.8rem', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>
                                                    {ssid.trim()}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>전체 허용</span>
                                    )}
                                </td>
                                <td>{new Date(user.created_at).toLocaleDateString()}</td>
                                <td>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            className="glass-button secondary"
                                            style={{ padding: '6px' }}
                                            onClick={() => openSsidModal(user)}
                                            title="SSID 제한 설정"
                                        >
                                            <Wifi size={16} />
                                        </button>
                                        <button
                                            className="glass-button danger"
                                            style={{ padding: '6px' }}
                                            onClick={() => handleDeletePortalClick(user)}
                                            title="사용자 삭제"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {portalUsers.length === 0 && (
                            <tr>
                                <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                                    데이터가 없습니다.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem' }}>
                <button
                    className="glass-button secondary"
                    disabled={currentPage === 1}
                    onClick={() => handlePageChange(1)}
                    style={{ padding: '8px' }}
                >
                    <ChevronsLeft size={18} />
                </button>
                <button
                    className="glass-button secondary"
                    disabled={currentPage === 1}
                    onClick={() => handlePageChange(currentPage - 1)}
                    style={{ padding: '8px' }}
                >
                    <ChevronLeft size={18} />
                </button>

                <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                    Page <strong style={{ color: '#f1f5f9' }}>{currentPage}</strong> of <strong>{pagination.totalPages}</strong>
                </span>

                <button
                    className="glass-button secondary"
                    disabled={currentPage === pagination.totalPages}
                    onClick={() => handlePageChange(currentPage + 1)}
                    style={{ padding: '8px' }}
                >
                    <ChevronRight size={18} />
                </button>
                <button
                    className="glass-button secondary"
                    disabled={currentPage === pagination.totalPages}
                    onClick={() => handlePageChange(pagination.totalPages)}
                    style={{ padding: '8px' }}
                >
                    <ChevronsRight size={18} />
                </button>

                <select
                    className="glass-input"
                    style={{ width: 'auto', padding: '6px 12px' }}
                    value={itemsPerPage}
                    onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                >
                    <option value={10}>10개씩</option>
                    <option value={20}>20개씩</option>
                    <option value={50}>50개씩</option>
                    <option value={100}>100개씩</option>
                </select>
            </div>

            {/* Set SSID Modal */}
            {showSsidModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <div className="glass-panel" style={{ width: '400px', padding: '2rem', background: '#0f172a' }}>
                        <h2 style={{ marginTop: 0 }}>SSID 제한 설정</h2>
                        <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>사용자: <strong>{ssidForm.username}</strong></p>
                        <form onSubmit={handleUpdateSsids}>
                            <div style={{ marginBottom: '2rem' }}>
                                <label style={{ display: 'block', marginBottom: '8px' }}>허용할 SSID (쉼표로 구분)</label>
                                <input className="glass-input" placeholder="예: Staff_WiFi, IoT_Net (비워두면 모두 허용)"
                                    value={ssidForm.allowed_ssids} onChange={e => setSsidForm({ ...ssidForm, allowed_ssids: e.target.value })}
                                />
                                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '8px' }}>
                                    설정 시 해당 사용자가 등록한 모든 기기에 즉시 적용됩니다.
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                                <button type="button" className="glass-button secondary" onClick={() => setShowSsidModal(false)}>취소</button>
                                <button type="submit" className="glass-button">저장 및 동기화</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {showDeleteModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <div className="glass-panel" style={{ width: '400px', padding: '2rem', background: '#0f172a', border: '1px solid #ef4444' }}>
                        <h2 style={{ marginTop: 0, color: '#ef4444' }}>사용자 삭제</h2>
                        <p style={{ color: '#cbd5e1' }}>
                            사용자 <strong>{deleteUser?.username}</strong>을(를) 정말 삭제하시겠습니까?
                        </p>

                        <div style={{ margin: '1.5rem 0', padding: '1rem', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '8px', border: '1px solid #334155' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none' }}>
                                <input
                                    type="checkbox"
                                    checked={deleteDevices}
                                    onChange={e => setDeleteDevices(e.target.checked)}
                                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                />
                                <span style={{ color: '#cbd5e1' }}>등록된 모든 기기도 함께 삭제</span>
                            </label>
                            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '8px', paddingLeft: '28px' }}>
                                {deleteDevices
                                    ? '사용자와 함께 등록된 기기들이 영구적으로 삭제됩니다.'
                                    : '기기 정보는 유지되지만 소유자 정보가 초기화됩니다.'
                                }
                            </p>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                            <button className="glass-button secondary" onClick={() => setShowDeleteModal(false)}>취소</button>
                            <button className="glass-button danger" onClick={handleDeletePortalConfirm}>
                                <Trash2 size={16} style={{ marginRight: '8px' }} />
                                삭제하기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Users;
