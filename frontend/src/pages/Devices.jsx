import { useEffect, useState } from 'react';
import axios from 'axios';
import { Trash2, Lock, Unlock, Plus, Search, Upload, Edit2 } from 'lucide-react';
import { formatMac } from '../utils/macUtils';

const Devices = () => {
    const [devices, setDevices] = useState([]);
    const [form, setForm] = useState({ mac_address: '', alias: '', group_name: '', allowed_ssids: '' });
    const [showModal, setShowModal] = useState(false);

    const [editMode, setEditMode] = useState(false);
    const [editId, setEditId] = useState(null);
    const [showBulkModal, setShowBulkModal] = useState(false);
    // Bulk States
    const [bulkStep, setBulkStep] = useState('input'); // input | preview
    const [bulkText, setBulkText] = useState('');
    const [bulkParsed, setBulkParsed] = useState([]);
    const [selectedIndices, setSelectedIndices] = useState([]);
    const [bulkSsidInput, setBulkSsidInput] = useState('');
    const [knownSsids, setKnownSsids] = useState([]);
    const [bulkErrors, setBulkErrors] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [searchTerm, setSearchTerm] = useState('');
    const [searchType, setSearchType] = useState('all'); // all | mac | alias | group

    // Pagination & Selection
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(30);
    const [selectedDeviceIds, setSelectedDeviceIds] = useState([]);

    // Sorting: { key: 'mac_address' | 'alias' | 'group_name' | 'status' | 'created_at', direction: 'asc' | 'desc' | null }
    const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });

    // ... existing fetch logic ...

    const [showGroupModal, setShowGroupModal] = useState(false);
    const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 30, totalPages: 0 });

    const handleBulkGroupUpdate = async (e) => {
        e.preventDefault();
        if (selectedDeviceIds.length === 0) return;
        try {
            await axios.put('/api/devices/bulk/group', { ids: selectedDeviceIds, group_name: bulkGenericGroup });
            fetchDevices();
            setSelectedDeviceIds([]);
            setShowGroupModal(false);
            setBulkGenericGroup('');
            alert('Group updated successfully');
        } catch (err) {
            alert('Failed to update group');
        }
    };

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
        setSelectedDeviceIds([]); // Clear selection on sort
        setCurrentPage(1); // Reset to first page on sort
    };

    const fetchDevices = async (page = currentPage, limit = itemsPerPage) => {
        try {
            const res = await axios.get('/api/devices', {
                params: {
                    page,
                    limit,
                    search: searchTerm,
                    searchType: searchType,
                    sortKey: sortConfig.key,
                    sortDir: sortConfig.direction
                }
            });
            setDevices(res.data.data);
            setPagination(res.data.pagination);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchSsids = async () => {
        try {
            const res = await axios.get('/api/devices/ssids');
            setKnownSsids(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleBulkStatus = async (status) => {
        if (selectedDeviceIds.length === 0) return;
        try {
            await axios.put('/api/devices/bulk/status', { ids: selectedDeviceIds, status });
            fetchDevices();
        } catch (err) {
            alert('Bulk update failed');
        }
    };

    useEffect(() => {
        fetchDevices();
    }, [currentPage, itemsPerPage, searchTerm, searchType, sortConfig]);

    useEffect(() => {
        fetchSsids();
    }, []);

    const currentItems = devices;
    const totalPages = pagination.totalPages;

    const handlePageChange = (page) => {
        setCurrentPage(page);
        setSelectedDeviceIds([]);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            if (editMode) {
                await axios.put(`/api/devices/${editId}`, form);
            } else {
                await axios.post('/api/devices', form);
            }
            setForm({ mac_address: '', alias: '', group_name: '', allowed_ssids: '' });
            setShowModal(false);
            setEditMode(false);
            setEditId(null);
            fetchDevices();
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to save device');
        }
    };

    const openAddModal = () => {
        setEditMode(false);
        setEditId(null);
        setForm({ mac_address: '', alias: '', group_name: '', allowed_ssids: '' });
        setShowModal(true);
    };

    const openEditModal = (device) => {
        setEditMode(true);
        setEditId(device.id);
        setForm({
            mac_address: device.mac_address,
            alias: device.alias,
            group_name: device.group_name || '',
            allowed_ssids: device.allowed_ssids || ''
        });
        setShowModal(true);
    };

    const toggleStatus = async (id, currentStatus) => {
        const newStatus = currentStatus === 'allowed' ? 'blocked' : 'allowed';
        try {
            await axios.put(`/api/devices/${id}/status`, { status: newStatus });
            fetchDevices();
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this device?')) return;
        try {
            await axios.delete(`/api/devices/${id}`);
            fetchDevices();
        } catch (err) {
            console.error(err);
        }
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target.result;
            // Append or replace? Let's replace if empty, or append if exists. 
            // Usually upload replaces or user expects it to fill.
            // Let's just set it for now, or append with newline.
            setBulkText(prev => prev ? prev + '\n' + content : content);
        };
        reader.readAsText(file);
        // Reset input so same file can be selected again if needed
        e.target.value = '';
    };

    const handleExport = () => {
        if (devices.length === 0) {
            alert('No devices to export');
            return;
        }

        // CSV Header
        const headers = ['MAC Address,Alias,Group,Allowed SSIDs,Status,Added Date'];

        // CSV Rows
        const rows = devices.map(d => {
            const mac = d.mac_address;
            const alias = `"${(d.alias || '').replace(/"/g, '""')}"`;
            const group = `"${(d.group_name || '').replace(/"/g, '""')}"`;
            const ssids = `"${(d.allowed_ssids || '').replace(/"/g, '""')}"`;
            const status = d.status;
            const date = new Date(d.created_at).toISOString().split('T')[0];
            return `${mac},${alias},${group},${ssids},${status},${date}`;
        });

        const csvContent = [headers, ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `devices_export_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleBulkParse = (e) => {
        e.preventDefault();
        const lines = bulkText.split('\n');
        const parsed = lines.map((line, idx) => {
            // Support CSV: MAC, Alias, Group
            const parts = line.split(',');
            const mac = parts[0];
            if (!mac || !mac.trim()) return null;

            const alias = parts[1] ? parts[1].trim() : '';
            const group = parts[2] ? parts[2].trim() : '';

            return {
                original: line,
                mac_address: mac.trim(),
                alias,
                group_name: group,
                allowed_ssids: ''
            };
        }).filter(Boolean);

        if (parsed.length === 0) {
            alert('No valid lines found');
            return;
        }

        // Auto format MACs
        parsed.forEach(p => p.mac_address = formatMac(p.mac_address));

        setBulkParsed(parsed);
        // Default select all
        setSelectedIndices(parsed.map((_, i) => i));
        setBulkStep('preview');
    };

    const toggleSelectAll = () => {
        if (selectedIndices.length === bulkParsed.length) {
            setSelectedIndices([]);
        } else {
            setSelectedIndices(bulkParsed.map((_, i) => i));
        }
    };

    const toggleSelectIndex = (idx) => {
        if (selectedIndices.includes(idx)) {
            setSelectedIndices(selectedIndices.filter(i => i !== idx));
        } else {
            setSelectedIndices([...selectedIndices, idx]);
        }
    };

    const applyBulkSsid = () => {
        if (selectedIndices.length === 0) return;

        const updated = [...bulkParsed];
        selectedIndices.forEach(idx => {
            updated[idx].allowed_ssids = bulkSsidInput;
        });
        setBulkParsed(updated);
    };

    const submitBulk = async () => {
        setIsSubmitting(true);
        try {
            const devicesToAdd = bulkParsed.map(p => ({
                mac_address: p.mac_address,
                alias: p.alias,
                group_name: p.group_name,
                allowed_ssids: p.allowed_ssids || null
            }));

            const res = await axios.post('/api/devices/bulk', { devices: devicesToAdd });
            const { success, failed, added, errors } = res.data.results;

            if (failed === 0) {
                // All success - close modal and show notification
                closeBulk();
                fetchDevices();
                alert(`Successfully added ${success} devices.`);
            } else {
                // Partial failure logic
                const successfulMacs = new Set(added.map(d => d.mac));
                const remainingLines = [];
                bulkParsed.forEach(p => {
                    if (!successfulMacs.has(p.mac_address)) {
                        remainingLines.push(p.original);
                    }
                });
                setBulkText(remainingLines.join('\n'));
                setBulkErrors(errors || []);
                setBulkStep('input');
                fetchDevices();
                alert(`Processed ${devicesToAdd.length} devices.\nSuccess: ${success}\nFailed: ${failed}\nPlease fix the errors and try again.`);
            }
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to process bulk upload');
        } finally {
            setIsSubmitting(false);
        }
    };

    const openBulkModal = () => {
        // Reset all bulk states
        setBulkStep('input');
        setBulkText('');
        setBulkParsed([]);
        setSelectedIndices([]);
        setBulkSsidInput('');
        setBulkErrors([]);
        setIsSubmitting(false);
        setShowBulkModal(true);
    };

    const closeBulk = () => {
        setBulkStep('input');
        setShowBulkModal(false);
    };

    // Selection Logic
    const toggleSelectDevice = (id) => {
        if (selectedDeviceIds.includes(id)) {
            setSelectedDeviceIds(selectedDeviceIds.filter(itemId => itemId !== id));
        } else {
            setSelectedDeviceIds([...selectedDeviceIds, id]);
        }
    };

    const toggleSelectAllPage = () => {
        const pageIds = currentItems.map(d => d.id);
        const allSelected = pageIds.every(id => selectedDeviceIds.includes(id));

        if (allSelected) {
            // Deselect all on this page
            setSelectedDeviceIds(selectedDeviceIds.filter(id => !pageIds.includes(id)));
        } else {
            // Select all on this page (merge uniqueness)
            const unique = new Set([...selectedDeviceIds, ...pageIds]);
            setSelectedDeviceIds(Array.from(unique));
        }
    };

    const handleBulkDelete = async () => {
        if (selectedDeviceIds.length === 0) return;
        if (!confirm(`Delete ${selectedDeviceIds.length} devices? This cannot be undone.`)) return;

        try {
            await axios.delete('/api/devices/bulk', { data: { ids: selectedDeviceIds } });
            setSelectedDeviceIds([]);
            fetchDevices();
        } catch (err) {
            alert('Bulk delete failed');
        }
    };

    const handleDeleteAll = async () => {
        // Since backend API for "Delete All" wasn't explicitly asked for backend-side optimization,
        // we can filter IDs from frontend or implementation plan suggested looping if backend didn't have /all.
        // Actually, let's use the bulk delete endpoint with ALL IDs from filteredDevices.
        // This honours the user's "View List" -> "Delete All" context usually implies deleting what is visible or all?
        // User asked for "Delete All" and "Delete Selected".
        // Let's implement Delete All as "Delete All currently matching search" or just "Delete Everything"?
        // Safe bet: Delete ALL Registered Devices.

        if (!confirm('DANGER: This will delete ALL devices in the system. Are you sure?')) return;

        // Pass all IDs
        const allIds = devices.map(d => d.id);
        try {
            await axios.delete('/api/devices/bulk', { data: { ids: allIds } });
            setSelectedDeviceIds([]);
            fetchDevices();
        } catch (err) {
            alert('Delete all failed');
        }
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1>Managed Devices</h1>
                <button className="glass-button" style={{ display: 'flex', gap: '8px', alignItems: 'center' }} onClick={openAddModal}>
                    <Plus size={20} /> Add Device
                </button>
                <button className="glass-button secondary" style={{ display: 'flex', gap: '8px', alignItems: 'center', marginLeft: '12px' }} onClick={openBulkModal}>
                    <Upload size={20} /> Bulk Add
                </button>
                <button className="glass-button secondary" style={{ display: 'flex', gap: '8px', alignItems: 'center', marginLeft: '12px' }} onClick={handleExport}>
                    <Upload size={20} style={{ transform: 'rotate(180deg)' }} /> Export CSV
                </button>
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
                                setSelectedDeviceIds([]);
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
                                style={{ width: '100px', padding: '8px' }}
                                value={searchType}
                                onChange={e => { setSearchType(e.target.value); setSearchTerm(''); setCurrentPage(1); }}
                            >
                                <option value="all">All</option>
                                <option value="mac">MAC</option>
                                <option value="alias">Alias</option>
                                <option value="group">Group</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px' }}>Search</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '0 12px' }}>
                                <Search size={18} color="#94a3b8" />
                                <input
                                    placeholder={searchType === 'mac' ? "AA-BB-CC..." : "Search..."}
                                    style={{ border: 'none', background: 'transparent', padding: '10px 0', color: 'white', outline: 'none', width: '200px' }}
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

                {/* Bulk Actions */}
                <div style={{ display: 'flex', gap: '1rem' }}>
                    {selectedDeviceIds.length > 0 && (
                        <>
                            <button className="glass-button secondary" onClick={() => handleBulkStatus('allowed')} style={{ color: '#86efac', borderColor: 'rgba(34, 197, 94, 0.3)' }}>
                                <Unlock size={16} /> Allow ({selectedDeviceIds.length})
                            </button>
                            <button className="glass-button secondary" onClick={() => handleBulkStatus('blocked')} style={{ color: '#fca5a5', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
                                <Lock size={16} /> Block ({selectedDeviceIds.length})
                            </button>
                            <button className="glass-button secondary" onClick={handleBulkDelete} style={{ color: '#fca5a5', borderColor: 'rgba(239,68,68,0.3)' }}>
                                <Trash2 size={16} /> Delete ({selectedDeviceIds.length})
                            </button>
                            <button className="glass-button secondary" onClick={() => setShowGroupModal(true)}>
                                <Edit2 size={16} /> Group ({selectedDeviceIds.length})
                            </button>
                        </>
                    )}
                    <button className="glass-button danger" onClick={handleDeleteAll}>
                        Delete All
                    </button>
                </div>
            </div>

            <div className="glass-panel" style={{ overflow: 'hidden' }}>
                <table className="glass-table" style={{ borderCollapse: 'separate', borderSpacing: '0 2px' }}>
                    <thead>
                        <tr style={{ fontSize: '0.85rem' }}>
                            <th style={{ width: '40px', paddingLeft: '1rem', padding: '0.5rem' }}>
                                <input
                                    type="checkbox"
                                    checked={currentItems.length > 0 && currentItems.every(d => selectedDeviceIds.includes(d.id))}
                                    onChange={toggleSelectAllPage}
                                />
                            </th>
                            <th style={{ padding: '0.5rem 0.8rem', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('mac_address')}>
                                MAC Address {sortConfig.key === 'mac_address' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                            </th>
                            <th style={{ padding: '0.5rem 0.8rem', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('alias')}>
                                Alias {sortConfig.key === 'alias' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                            </th>
                            <th style={{ padding: '0.5rem 0.8rem', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('group_name')}>
                                Group {sortConfig.key === 'group_name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                            </th>
                            <th style={{ padding: '0.5rem 0.8rem' }}>Allowed SSIDs</th>
                            <th style={{ padding: '0.5rem 0.8rem', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('status')}>
                                Status {sortConfig.key === 'status' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                            </th>
                            <th style={{ padding: '0.5rem 0.8rem', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('created_at')}>
                                Added Date {sortConfig.key === 'created_at' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                            </th>
                            <th style={{ padding: '0.5rem 0.8rem' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody style={{ fontSize: '0.9rem' }}>
                        {currentItems.map(device => (
                            <tr key={device.id} style={{ background: selectedDeviceIds.includes(device.id) ? 'rgba(56, 189, 248, 0.05)' : 'transparent' }}>
                                <td style={{ paddingLeft: '1rem', padding: '0.2rem 0.5rem' }}>
                                    <input
                                        type="checkbox"
                                        checked={selectedDeviceIds.includes(device.id)}
                                        onChange={() => toggleSelectDevice(device.id)}
                                    />
                                </td>
                                <td style={{ fontFamily: 'monospace', letterSpacing: '1px', padding: '0.2rem 0.8rem' }}>{device.mac_address}</td>
                                <td style={{ padding: '0.2rem 0.8rem', fontWeight: '500' }}>{device.alias || '-'}</td>
                                <td style={{ padding: '0.2rem 0.8rem', color: '#94a3b8' }}>{device.group_name || '-'}</td>
                                <td style={{ fontSize: '0.9em', color: '#94a3b8', padding: '0.2rem 0.8rem' }}>
                                    {device.allowed_ssids ? device.allowed_ssids.split(',').map((s, i) => (
                                        <span key={i} style={{
                                            background: '#334155', padding: '1px 5px', borderRadius: '3px', margin: '0 4px 0 0', display: 'inline-block', fontSize: '0.85em'
                                        }}>
                                            {s.trim()}
                                        </span>
                                    )) : <span style={{ opacity: 0.5 }}>All</span>}
                                </td>
                                <td style={{ padding: '0.2rem 0.8rem' }}>
                                    <span className={`status-badge ${device.status === 'blocked' ? 'status-blocked' : 'status-allowed'}`} style={{ padding: '2px 8px', fontSize: '0.85em' }}>
                                        {device.status.toUpperCase()}
                                    </span>
                                </td>
                                <td style={{ padding: '0.2rem 0.8rem', color: '#94a3b8', fontSize: '0.85em' }}>{new Date(device.created_at).toLocaleDateString()}</td>
                                <td style={{ padding: '0.2rem 0.8rem' }}>
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                        <button
                                            className={`glass-button secondary`}
                                            style={{ padding: '4px', borderRadius: '4px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                            onClick={() => toggleStatus(device.id, device.status)}
                                            title={device.status === 'allowed' ? 'Block Device' : 'Unblock Device'}
                                        >
                                            {device.status === 'allowed' ? <Lock size={14} /> : <Unlock size={14} />}
                                        </button>
                                        <button
                                            className="glass-button secondary"
                                            style={{ padding: '4px', borderRadius: '4px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                            onClick={() => openEditModal(device)}
                                        >
                                            <Edit2 size={14} />
                                        </button>
                                        <button
                                            className="glass-button danger"
                                            style={{ padding: '4px', borderRadius: '4px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                            onClick={() => handleDelete(device.id)}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {currentItems.length === 0 && (
                            <tr>
                                <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                                    No devices found
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

                        {/* Page Numbers - Simplified range */}
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

            {/* Bulk Group Modal */}
            {showGroupModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <div className="glass-panel" style={{ width: '400px', padding: '2rem', background: '#0f172a' }}>
                        <h2 style={{ marginTop: 0 }}>Change Group for {selectedDeviceIds.length} Devices</h2>
                        <form onSubmit={handleBulkGroupUpdate}>
                            <div style={{ marginBottom: '2rem' }}>
                                <label>New Group Name</label>
                                <input
                                    className="glass-input"
                                    placeholder="e.g. Office, Lab"
                                    value={bulkGenericGroup}
                                    onChange={e => setBulkGenericGroup(e.target.value)}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                                <button type="button" className="glass-button secondary" onClick={() => setShowGroupModal(false)}>Cancel</button>
                                <button type="submit" className="glass-button">Update Group</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Simple Modal */}
            {showModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <div className="glass-panel" style={{ width: '400px', padding: '2rem', background: '#0f172a' }}>
                        <h2 style={{ marginTop: 0 }}>{editMode ? 'Edit Device' : 'Add New Device'}</h2>
                        <form onSubmit={handleSave}>
                            <div style={{ marginBottom: '1rem' }}>
                                <label>MAC Address</label>
                                <input
                                    className="glass-input"
                                    placeholder="AA-BB-CC-DD-EE-FF"
                                    required
                                    value={form.mac_address}
                                    onChange={e => setForm({ ...form, mac_address: formatMac(e.target.value) })}
                                />
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label>Alias (Friendly Name)</label>
                                <input className="glass-input" placeholder="Living Room TV"
                                    value={form.alias} onChange={e => setForm({ ...form, alias: e.target.value })}
                                />
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label>Group Name (Optional)</label>
                                <input className="glass-input" placeholder="Office, Guest, etc."
                                    value={form.group_name} onChange={e => setForm({ ...form, group_name: e.target.value })}
                                />
                            </div>
                            <div style={{ marginBottom: '2rem' }}>
                                <label>Allowed SSIDs (Optional)</label>
                                <input className="glass-input" placeholder="Staff_WiFi, Guest (Leave empty for All)"
                                    value={form.allowed_ssids} onChange={e => setForm({ ...form, allowed_ssids: e.target.value })}
                                />
                                <div style={{ fontSize: '0.8em', color: '#64748b', marginTop: '4px' }}>
                                    Comma separated. If set, device can ONLY connect to these SSIDs.
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                                <button type="button" className="glass-button secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="glass-button">Save Device</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Bulk Modal */}
            {showBulkModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <div className="glass-panel" style={{ width: bulkStep === 'preview' ? '800px' : '500px', padding: '2rem', background: '#0f172a', maxHeight: '90vh', overflowY: 'auto', transition: 'width 0.3s' }}>
                        <h2 style={{ marginTop: 0 }}>Bulk Add Devices</h2>

                        {bulkStep === 'input' ? (
                            <form onSubmit={handleBulkParse}>
                                {bulkErrors.length > 0 && (
                                    <div style={{
                                        background: 'rgba(239, 68, 68, 0.2)',
                                        border: '1px solid rgba(239, 68, 68, 0.5)',
                                        color: '#fca5a5',
                                        padding: '1rem',
                                        borderRadius: '8px',
                                        marginBottom: '1rem',
                                        fontSize: '0.9rem',
                                        maxHeight: '150px',
                                        overflowY: 'auto'
                                    }}>
                                        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Previous Errors:</div>
                                        {bulkErrors.map((e, i) => <div key={i}>{e}</div>)}
                                    </div>
                                )}
                                <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                                    Enter one device per line: <code>MAC, ALIAS, [GROUP]</code><br />
                                    Example: <code>AA-BB-CC-DD-EE-FF, Bedroom TV, Home</code>
                                </p>

                                <div style={{ marginBottom: '1rem' }}>
                                    <input
                                        type="file"
                                        accept=".txt,.csv"
                                        id="bulk-file-upload"
                                        style={{ display: 'none' }}
                                        onChange={handleFileUpload}
                                    />
                                    <button
                                        type="button"
                                        className="glass-button secondary"
                                        onClick={() => document.getElementById('bulk-file-upload').click()}
                                        style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', padding: '6px 12px' }}
                                    >
                                        <Upload size={16} /> Upload .txt / .csv
                                    </button>
                                </div>

                                <div style={{ marginBottom: '2rem' }}>
                                    <textarea
                                        className="glass-input"
                                        rows="10"
                                        placeholder="11-22-33-44-55-66, Device 1&#10;AA:BB:CC:DD:EE:FF, Device 2, Office"
                                        value={bulkText}
                                        onChange={e => setBulkText(e.target.value)}
                                        style={{ fontFamily: 'monospace' }}
                                        required
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                                    <button type="button" className="glass-button secondary" onClick={closeBulk}>Cancel</button>
                                    <button type="submit" className="glass-button">Next: Configure SSIDs</button>
                                </div>
                            </form>
                        ) : (
                            <div>
                                <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1rem' }}>
                                    Select devices and assign allowed SSIDs. Leave empty to allow all.
                                </p>

                                {/* Bulk Action Bar */}
                                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px', marginBottom: '1rem', display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Assign SSID to Selected ({selectedIndices.length})</label>
                                        <input
                                            className="glass-input"
                                            placeholder="Type SSID or select..."
                                            list="ssid-suggestions"
                                            value={bulkSsidInput}
                                            onChange={e => setBulkSsidInput(e.target.value)}
                                            style={{ marginTop: '4px' }}
                                        />
                                        <datalist id="ssid-suggestions">
                                            {knownSsids.map((s, i) => <option key={i} value={s} />)}
                                        </datalist>
                                    </div>
                                    <button className="glass-button secondary" onClick={applyBulkSsid} disabled={selectedIndices.length === 0}>
                                        Apply
                                    </button>
                                </div>

                                {/* Preview Table */}
                                <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', marginBottom: '2rem' }}>
                                    <table className="glass-table" style={{ margin: 0 }}>
                                        <thead style={{ position: 'sticky', top: 0, background: '#0f172a', zIndex: 1 }}>
                                            <tr>
                                                <th style={{ width: '40px' }}><input type="checkbox" checked={selectedIndices.length === bulkParsed.length && bulkParsed.length > 0} onChange={toggleSelectAll} /></th>
                                                <th>MAC Address</th>
                                                <th>Alias</th>
                                                <th>Group</th>
                                                <th>Allowed SSIDs</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {bulkParsed.map((dev, idx) => (
                                                <tr key={idx} style={{ background: selectedIndices.includes(idx) ? 'rgba(56, 189, 248, 0.1)' : 'transparent' }}>
                                                    <td><input type="checkbox" checked={selectedIndices.includes(idx)} onChange={() => toggleSelectIndex(idx)} /></td>
                                                    <td style={{ fontFamily: 'monospace' }}>{dev.mac_address}</td>
                                                    <td>{dev.alias}</td>
                                                    <td>{dev.group_name}</td>
                                                    <td>
                                                        {dev.allowed_ssids ? (
                                                            <span style={{ background: '#334155', padding: '2px 6px', borderRadius: '4px', fontSize: '0.9em' }}>
                                                                {dev.allowed_ssids}
                                                            </span>
                                                        ) : <span style={{ opacity: 0.3 }}>All</span>}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'space-between' }}>
                                    <button className="glass-button secondary" onClick={() => setBulkStep('input')} disabled={isSubmitting}>Back to Input</button>
                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                        <button className="glass-button secondary" onClick={closeBulk} disabled={isSubmitting}>Cancel</button>
                                        <button className="glass-button" onClick={submitBulk} disabled={isSubmitting}>
                                            {isSubmitting ? 'Registering...' : `Register ${bulkParsed.length} Devices`}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Devices;
