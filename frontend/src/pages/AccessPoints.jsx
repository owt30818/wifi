import { useEffect, useState } from 'react';
import axios from 'axios';
import { Router, Server, MapPin, Edit2, Trash2, Plus } from 'lucide-react';
import { formatMac } from '../utils/macUtils';

const AccessPoints = () => {
    const [aps, setAps] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ id: null, mac_address: '', name: '', location: '' });
    const [isEdit, setIsEdit] = useState(false);
    const [error, setError] = useState('');

    const fetchAps = async () => {
        try {
            setIsLoading(true);
            const res = await axios.get('/api/access-points');
            setAps(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error(err);
            setAps([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAps();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            if (isEdit) {
                await axios.put(`/api/access-points/${form.id}`, form);
            } else {
                await axios.post('/api/access-points', form);
            }
            setShowModal(false);
            setForm({ id: null, mac_address: '', name: '', location: '' });
            fetchAps();
        } catch (err) {
            // Display error inline instead of alert
            setError(err.response?.data?.error || 'Operation failed');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure?')) return;
        try {
            await axios.delete(`/api/access-points/${id}`);
            fetchAps();
        } catch (err) {
            console.error(err);
        }
    };

    const openEdit = (ap) => {
        setForm({ ...ap });
        setIsEdit(true);
        setError('');
        setShowModal(true);
    };

    const openAdd = (presetMac = '') => {
        setForm({ id: null, mac_address: presetMac, name: '', location: '' });
        setIsEdit(false);
        setError('');
        setShowModal(true);
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1>Access Points</h1>
                <button className="glass-button" onClick={() => openAdd()}>
                    <Plus size={20} style={{ marginRight: '8px' }} /> Add AP
                </button>
            </div>

            <div className="glass-panel">
                <table className="glass-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>MAC Address</th>
                            <th>Location</th>
                            <th>Active Clients</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {aps.map((ap, idx) => (
                            <tr key={idx}>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Router size={16} color={ap.id ? "#10b981" : "#94a3b8"} />
                                        <span style={{ fontWeight: ap.id ? '600' : 'normal' }}>{ap.name}</span>
                                        {!ap.id && <span style={{ fontSize: '0.8em', color: '#f59e0b', background: 'rgba(245,158,11,0.1)', padding: '2px 6px', borderRadius: '4px' }}>New</span>}
                                    </div>
                                </td>
                                <td style={{ fontFamily: 'monospace' }}>{ap.mac_address}</td>
                                <td>
                                    {ap.location && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#94a3b8' }}>
                                            <MapPin size={14} /> {ap.location}
                                        </div>
                                    )}
                                </td>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{
                                            display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%',
                                            background: ap.active_clients > 0 ? '#10b981' : '#334155'
                                        }}></span>
                                        {ap.active_clients}
                                    </div>
                                </td>
                                <td>
                                    {ap.id ? (
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button className="glass-button secondary p-2" onClick={() => openEdit(ap)}>
                                                <Edit2 size={16} />
                                            </button>
                                            <button className="glass-button danger p-2" onClick={() => handleDelete(ap.id)}>
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ) : (
                                        <button className="glass-button secondary" style={{ fontSize: '0.9em', padding: '4px 8px' }} onClick={() => openAdd(ap.mac_address)}>
                                            Register
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {!isLoading && aps.length === 0 && <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No APs found</div>}
                {isLoading && <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Loading...</div>}
            </div>

            {/* Modal */}
            {
                showModal && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                        <div className="glass-panel" style={{ width: '450px', padding: '2rem', background: '#0f172a' }}>
                            <h2 style={{ marginTop: 0 }}>{isEdit ? 'Edit AP' : 'Register AP'}</h2>
                            {error && (
                                <div style={{
                                    background: 'rgba(239, 68, 68, 0.2)',
                                    border: '1px solid rgba(239, 68, 68, 0.5)',
                                    color: '#fca5a5',
                                    padding: '1rem',
                                    borderRadius: '8px',
                                    marginBottom: '1rem',
                                    fontSize: '0.9rem'
                                }}>
                                    ⚠️ {error}
                                </div>
                            )}
                            <form onSubmit={handleSubmit}>
                                <div style={{ marginBottom: '1rem' }}>
                                    <label>Friendly Name (Group)</label>
                                    <input className="glass-input" required placeholder="e.g. Conference Room"
                                        value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                                    />
                                    <div style={{ fontSize: '0.8em', color: '#64748b', marginTop: '4px' }}>
                                        APs with the same name will be grouped in Dashboard stats.
                                    </div>
                                </div>
                                <div style={{ marginBottom: '1rem' }}>
                                    <label>MAC Address</label>
                                    <input className="glass-input" required placeholder="AA-BB-CC-DD-EE-FF" readOnly={isEdit}
                                        value={form.mac_address} onChange={e => setForm({ ...form, mac_address: formatMac(e.target.value) })}
                                    />
                                </div>
                                <div style={{ marginBottom: '2rem' }}>
                                    <label>Location / Remarks</label>
                                    <input className="glass-input" placeholder="e.g. 2nd Floor, Northeast Corner"
                                        value={form.location} onChange={e => setForm({ ...form, location: e.target.value })}
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                                    <button type="button" className="glass-button secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                    <button type="submit" className="glass-button">Save</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default AccessPoints;
