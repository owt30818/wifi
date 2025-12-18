import { useEffect, useState } from 'react';
import axios from 'axios';
import { Trash2, UserPlus, Shield, Key } from 'lucide-react';

const Users = () => {
    const [users, setUsers] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [form, setForm] = useState({ username: '', password: '' });
    const [passwordForm, setPasswordForm] = useState({ id: null, username: '', newPassword: '', confirmPassword: '' });

    const fetchUsers = async () => {
        try {
            const res = await axios.get('/api/users');
            setUsers(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleAdd = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/api/users', form);
            setForm({ username: '', password: '' });
            setShowModal(false);
            fetchUsers();
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to add user');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this user?')) return;
        try {
            await axios.delete(`/api/users/${id}`);
            fetchUsers();
        } catch (err) {
            console.error(err);
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
            setPasswordForm({ id: null, username: '', newPassword: '' });
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1>Admin Users</h1>
                <button className="glass-button" style={{ display: 'flex', gap: '8px', alignItems: 'center' }} onClick={() => setShowModal(true)}>
                    <UserPlus size={20} /> Add User
                </button>
            </div>

            <div className="glass-panel" style={{ overflow: 'hidden' }}>
                <table className="glass-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Username</th>
                            <th>Created At</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id}>
                                <td>{user.id}</td>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Shield size={16} color="#38bdf8" />
                                        {user.username}
                                    </div>
                                </td>
                                <td>{new Date(user.created_at).toLocaleDateString()}</td>
                                <td>
                                    <button
                                        className="glass-button secondary"
                                        style={{ padding: '6px', marginRight: '8px' }}
                                        onClick={() => openPasswordModal(user)}
                                        title="Change Password"
                                    >
                                        <Key size={16} />
                                    </button>
                                    {user.username !== 'admin' && (
                                        <button
                                            className="glass-button danger"
                                            style={{ padding: '6px' }}
                                            onClick={() => handleDelete(user.id)}
                                            title="Delete User"
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

            {/* Add User Modal */}
            {showModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <div className="glass-panel" style={{ width: '400px', padding: '2rem', background: '#0f172a' }}>
                        <h2 style={{ marginTop: 0 }}>Create Admin User</h2>
                        <form onSubmit={handleAdd}>
                            <div style={{ marginBottom: '1rem' }}>
                                <label>Username</label>
                                <input className="glass-input" required
                                    value={form.username} onChange={e => setForm({ ...form, username: e.target.value })}
                                />
                            </div>
                            <div style={{ marginBottom: '2rem' }}>
                                <label>Password</label>
                                <input type="password" className="glass-input" required
                                    value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                                <button type="button" className="glass-button secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="glass-button">Create User</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Change Password Modal */}
            {showPasswordModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <div className="glass-panel" style={{ width: '400px', padding: '2rem', background: '#0f172a' }}>
                        <h2 style={{ marginTop: 0 }}>Change Password</h2>
                        <p style={{ color: '#94a3b8' }}>User: <strong>{passwordForm.username}</strong></p>
                        <form onSubmit={handleChangePassword}>
                            <div style={{ marginBottom: '1rem' }}>
                                <label>New Password</label>
                                <input type="password" className="glass-input" required
                                    value={passwordForm.newPassword} onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                                />
                            </div>
                            <div style={{ marginBottom: '2rem' }}>
                                <label>Confirm Password</label>
                                <input type="password" className="glass-input" required
                                    value={passwordForm.confirmPassword} onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                                <button type="button" className="glass-button secondary" onClick={() => setShowPasswordModal(false)}>Cancel</button>
                                <button type="submit" className="glass-button">Update Password</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Users;
