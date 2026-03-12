import { useState, useEffect } from 'react';
import axios from 'axios';
import { UserPlus, Shield, Trash2, Key } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Invitations from './Invitations';

const Admin = () => {
    const { isSuperAdmin } = useAuth();
    const [activeTab, setActiveTab] = useState(isSuperAdmin() ? 'admins' : 'invitations');

    // Admin Managment States
    const [admins, setAdmins] = useState([]);
    const [showAdminModal, setShowAdminModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [adminForm, setAdminForm] = useState({ username: '', password: '', role: 'super_admin', allowed_groups: '', allowed_ssids: '' });
    const [passwordForm, setPasswordForm] = useState({ id: null, username: '', newPassword: '', confirmPassword: '' });

    // Fetch Admins
    const fetchAdmins = async () => {
        if (!isSuperAdmin()) return;
        try {
            const res = await axios.get('/api/users');
            setAdmins(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        if (activeTab === 'admins') {
            fetchAdmins();
        }
    }, [activeTab]);

    // Handlers
    const handleAddAdmin = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/api/users', adminForm);
            setAdminForm({ username: '', password: '', role: 'super_admin', allowed_groups: '', allowed_ssids: '' });
            setShowAdminModal(false);
            fetchAdmins();
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to add admin');
        }
    };

    const handleDeleteAdmin = async (id) => {
        if (!confirm('Are you sure you want to delete this admin user?')) return;
        try {
            await axios.delete(`/api/users/${id}`);
            fetchAdmins();
        } catch (err) {
            console.error(err);
            alert('Failed to delete admin');
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            return alert('Passwords do not match!');
        }
        try {
            await axios.put(`/api/users/${passwordForm.id}/password`, { password: passwordForm.newPassword });
            setShowPasswordModal(false);
            setPasswordForm({ id: null, username: '', newPassword: '', confirmPassword: '' });
            alert('Password updated successfully');
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to update password');
        }
    };

    const openPasswordModal = (user) => {
        setPasswordForm({ id: user.id, username: user.username, newPassword: '', confirmPassword: '' });
        setShowPasswordModal(true);
    };

    return (
        <div>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                {isSuperAdmin() && (
                    <button
                        onClick={() => setActiveTab('admins')}
                        style={{
                            padding: '1rem',
                            background: 'none',
                            border: 'none',
                            borderBottom: activeTab === 'admins' ? '2px solid #38bdf8' : '2px solid transparent',
                            color: activeTab === 'admins' ? '#38bdf8' : '#94a3b8',
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '8px',
                            fontSize: '1rem', fontWeight: 500
                        }}
                    >
                        <Shield size={18} />
                        관리자 계정 관리
                    </button>
                )}
                <button
                    onClick={() => setActiveTab('invitations')}
                    style={{
                        padding: '1rem',
                        background: 'none',
                        border: 'none',
                        borderBottom: activeTab === 'invitations' ? '2px solid #38bdf8' : '2px solid transparent',
                        color: activeTab === 'invitations' ? '#38bdf8' : '#94a3b8',
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '8px',
                        fontSize: '1rem', fontWeight: 500
                    }}
                >
                    <UserPlus size={18} />
                    초대 관리
                </button>
            </div>

            {/* Content */}
            {activeTab === 'admins' && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h1>관리자 및 권한 설정</h1>
                        <button className="glass-button" style={{ display: 'flex', gap: '8px', alignItems: 'center' }} onClick={() => setShowAdminModal(true)}>
                            <UserPlus size={20} /> 관리자 추가
                        </button>
                    </div>

                    <div className="glass-panel" style={{ overflow: 'hidden' }}>
                        <table className="glass-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>아이디</th>
                                    <th>권한</th>
                                    <th>생성일</th>
                                    <th>관리</th>
                                </tr>
                            </thead>
                            <tbody>
                                {admins.map(user => (
                                    <tr key={user.id}>
                                        <td>{user.id}</td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <Shield size={16} color="#38bdf8" />
                                                {user.username}
                                            </div>
                                        </td>
                                        <td>
                                            <span style={{
                                                background: user.role === 'super_admin' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(148, 163, 184, 0.2)',
                                                color: user.role === 'super_admin' ? '#38bdf8' : '#94a3b8',
                                                padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem'
                                            }}>
                                                {user.role === 'super_admin' ? '최고 관리자' : '부관리자'}
                                            </span>
                                        </td>
                                        <td>{new Date(user.created_at).toLocaleDateString()}</td>
                                        <td>
                                            <button
                                                className="glass-button secondary"
                                                style={{ padding: '6px', marginRight: '8px' }}
                                                onClick={() => openPasswordModal(user)}
                                                title="비밀번호 변경"
                                            >
                                                <Key size={16} />
                                            </button>
                                            {user.username !== 'admin' && (
                                                <button
                                                    className="glass-button danger"
                                                    style={{ padding: '6px' }}
                                                    onClick={() => handleDeleteAdmin(user.id)}
                                                    title="관리자 삭제"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'invitations' && <Invitations />}

            {/* Admin Create Modal */}
            {showAdminModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <div className="glass-panel" style={{ width: '400px', padding: '2rem', background: '#0f172a' }}>
                        <h2 style={{ marginTop: 0 }}>관리자 추가</h2>
                        <form onSubmit={handleAddAdmin}>
                            <div style={{ marginBottom: '1rem' }}>
                                <label>아이디</label>
                                <input className="glass-input" required value={adminForm.username} onChange={e => setAdminForm({ ...adminForm, username: e.target.value })} />
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label>비밀번호</label>
                                <input className="glass-input" type="password" required value={adminForm.password} onChange={e => setAdminForm({ ...adminForm, password: e.target.value })} />
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label>권한</label>
                                <select className="glass-input" value={adminForm.role} onChange={e => setAdminForm({ ...adminForm, role: e.target.value })}>
                                    <option value="super_admin">최고 관리자 (모든 권한)</option>
                                    <option value="sub_admin">부관리자 (제한적)</option>
                                </select>
                            </div>
                            {adminForm.role === 'sub_admin' && (
                                <div style={{ marginBottom: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>
                                    <p style={{ fontSize: '0.9em', color: '#94a3b8', marginTop: 0 }}>부관리자는 제한된 그룹/SSID만 관리할 수 있습니다. (추후 구현 예정)</p>
                                </div>
                            )}
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
                                <button type="button" className="glass-button secondary" onClick={() => setShowAdminModal(false)}>취소</button>
                                <button type="submit" className="glass-button">생성</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Change Password Modal */}
            {showPasswordModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <div className="glass-panel" style={{ width: '400px', padding: '2rem', background: '#0f172a' }}>
                        <h2 style={{ marginTop: 0 }}>비밀번호 변경</h2>
                        <p style={{ color: '#94a3b8' }}>대상: <strong>{passwordForm.username}</strong></p>
                        <form onSubmit={handleChangePassword}>
                            <div style={{ marginBottom: '1rem' }}>
                                <label>새 비밀번호</label>
                                <input className="glass-input" type="password" required value={passwordForm.newPassword} onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} />
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label>비밀번호 확인</label>
                                <input className="glass-input" type="password" required value={passwordForm.confirmPassword} onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
                                <button type="button" className="glass-button secondary" onClick={() => setShowPasswordModal(false)}>취소</button>
                                <button type="submit" className="glass-button">변경</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Admin;
