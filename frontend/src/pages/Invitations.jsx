import { useEffect, useState } from 'react';
import axios from 'axios';
import { Trash2, Plus, Copy, Link, ToggleLeft, ToggleRight, Settings, RefreshCw } from 'lucide-react';

const Invitations = () => {
    const [invitations, setInvitations] = useState([]);
    const [settings, setSettings] = useState({ public_signup_enabled: 'false' });
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({
        name: '',
        group_name: '',
        allowed_ssids: '',
        max_uses: '',
        expires_days: ''
    });
    const [groupOptions, setGroupOptions] = useState([]);
    const [ssidOptions, setSsidOptions] = useState([]);

    const fetchInvitations = async () => {
        try {
            const res = await axios.get('/api/invitations');
            setInvitations(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchSettings = async () => {
        try {
            const res = await axios.get('/api/invitations/settings');
            setSettings(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchInvitations();
        fetchSettings();
        // Fetch dropdown options
        axios.get('/api/settings/groups').then(res => setGroupOptions(res.data)).catch(() => { });
        axios.get('/api/settings/ssids').then(res => setSsidOptions(res.data)).catch(() => { });
    }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                name: form.name || null,
                group_name: form.group_name || null,
                allowed_ssids: form.allowed_ssids || null,
                max_uses: form.max_uses ? parseInt(form.max_uses) : null,
                expires_at: form.expires_days ? new Date(Date.now() + parseInt(form.expires_days) * 24 * 60 * 60 * 1000).toISOString() : null
            };
            await axios.post('/api/invitations', payload);
            setForm({ name: '', group_name: '', allowed_ssids: '', max_uses: '', expires_days: '' });
            setShowModal(false);
            fetchInvitations();
        } catch (err) {
            alert('Failed to create invitation');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('이 초대 링크를 삭제하시겠습니까?')) return;
        try {
            await axios.delete(`/api/invitations/${id}`);
            fetchInvitations();
        } catch (err) {
            console.error(err);
        }
    };

    const handleToggle = async (id) => {
        try {
            await axios.put(`/api/invitations/${id}/toggle`);
            fetchInvitations();
        } catch (err) {
            console.error(err);
        }
    };

    const handleReset = async (id) => {
        if (!confirm('이 초대 링크의 사용 횟수를 초기화하시겠습니까?')) return;
        try {
            await axios.put(`/api/invitations/${id}/reset`);
            fetchInvitations();
        } catch (err) {
            console.error(err);
        }
    };

    const togglePublicSignup = async () => {
        const newValue = settings.public_signup_enabled === 'true' ? 'false' : 'true';
        try {
            await axios.put('/api/invitations/settings', { key_name: 'public_signup_enabled', value: newValue });
            setSettings({ ...settings, public_signup_enabled: newValue });
        } catch (err) {
            console.error(err);
        }
    };

    const copyLink = (code) => {
        const url = `${window.location.origin}/signup?code=${code}`;

        // Fallback for HTTP environments where clipboard API is not available
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url).then(() => {
                alert('링크가 복사되었습니다!');
            }).catch(() => {
                fallbackCopy(url);
            });
        } else {
            fallbackCopy(url);
        }
    };

    const fallbackCopy = (text) => {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            alert('링크가 복사되었습니다!');
        } catch (err) {
            alert(`링크: ${text}`);
        }
        document.body.removeChild(textArea);
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '무제한';
        return new Date(dateStr).toLocaleDateString('ko-KR');
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1>초대 관리</h1>
                <button className="glass-button" style={{ display: 'flex', gap: '8px', alignItems: 'center' }} onClick={() => setShowModal(true)}>
                    <Plus size={20} /> 새 초대 생성
                </button>
            </div>

            {/* Settings Panel */}
            <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Settings size={20} color="#94a3b8" />
                        <div>
                            <div style={{ fontWeight: 500 }}>공개 회원가입</div>
                            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                비활성화 시 초대 코드가 있어야만 가입 가능
                            </div>
                        </div>
                    </div>
                    <button
                        className={`glass-button ${settings.public_signup_enabled === 'true' ? '' : 'secondary'}`}
                        onClick={togglePublicSignup}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        {settings.public_signup_enabled === 'true' ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                        {settings.public_signup_enabled === 'true' ? '활성화됨' : '비활성화됨'}
                    </button>
                </div>
            </div>

            {/* Invitations Table */}
            <div className="glass-panel" style={{ overflow: 'hidden' }}>
                <table className="glass-table">
                    <thead>
                        <tr>
                            <th>이름</th>
                            <th>그룹</th>
                            <th>SSID</th>
                            <th>사용/제한</th>
                            <th>클릭수</th>
                            <th>만료일</th>
                            <th>상태</th>
                            <th>관리</th>
                        </tr>
                    </thead>
                    <tbody>
                        {invitations.map(inv => (
                            <tr key={inv.id} style={{ opacity: inv.is_active ? 1 : 0.5 }}>
                                <td style={{ fontWeight: 500 }}>{inv.name || '-'}</td>
                                <td style={{ color: '#94a3b8' }}>{inv.group_name || '-'}</td>
                                <td>
                                    {inv.allowed_ssids ? (
                                        <span style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>
                                            {inv.allowed_ssids}
                                        </span>
                                    ) : <span style={{ color: '#64748b' }}>전체</span>}
                                </td>
                                <td>
                                    <span style={{ color: inv.max_uses && inv.used_count >= inv.max_uses ? '#ef4444' : '#4ade80' }}>
                                        {inv.used_count} / {inv.max_uses || '∞'}
                                    </span>
                                </td>
                                <td style={{ color: '#94a3b8' }}>{inv.click_count}</td>
                                <td style={{ color: inv.expires_at && new Date(inv.expires_at) < new Date() ? '#ef4444' : '#94a3b8' }}>
                                    {formatDate(inv.expires_at)}
                                </td>
                                <td>
                                    <span className={`status-badge ${inv.is_active ? 'status-allowed' : 'status-blocked'}`} style={{ padding: '2px 8px', fontSize: '0.8rem' }}>
                                        {inv.is_active ? '활성' : '비활성'}
                                    </span>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                        <button className="glass-button secondary" style={{ padding: '6px' }} onClick={() => copyLink(inv.code)} title="링크 복사">
                                            <Copy size={14} />
                                        </button>
                                        <button className="glass-button secondary" style={{ padding: '6px' }} onClick={() => handleReset(inv.id)} title="사용횟수 초기화">
                                            <RefreshCw size={14} />
                                        </button>
                                        <button className="glass-button secondary" style={{ padding: '6px' }} onClick={() => handleToggle(inv.id)} title="활성화 토글">
                                            <Link size={14} />
                                        </button>
                                        <button className="glass-button danger" style={{ padding: '6px' }} onClick={() => handleDelete(inv.id)} title="삭제">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {invitations.length === 0 && (
                            <tr>
                                <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                                    생성된 초대 링크가 없습니다.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Create Modal */}
            {showModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <div className="glass-panel" style={{ width: '450px', padding: '2rem', background: '#0f172a' }}>
                        <h2 style={{ marginTop: 0 }}>새 초대 링크 생성</h2>
                        <form onSubmit={handleCreate}>
                            <div style={{ marginBottom: '1rem' }}>
                                <label>이름 (설명)</label>
                                <input className="glass-input" placeholder="예: 1학년 신입생"
                                    value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label>그룹 (자동 할당)</label>
                                <select className="glass-input" value={form.group_name} onChange={e => setForm({ ...form, group_name: e.target.value })}>
                                    <option value="">선택 안함</option>
                                    {groupOptions.map(g => <option key={g} value={g}>{g}</option>)}
                                </select>
                                <input className="glass-input" style={{ marginTop: '8px' }} placeholder="또는 새 그룹명 입력"
                                    value={groupOptions.includes(form.group_name) ? '' : form.group_name}
                                    onChange={e => setForm({ ...form, group_name: e.target.value })} />
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label>허용 SSID (자동 할당)</label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                                    {ssidOptions.map(ssid => (
                                        <label key={ssid} style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', padding: '4px 10px', background: form.allowed_ssids.split(',').map(s => s.trim()).includes(ssid) ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255,255,255,0.05)', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                            <input type="checkbox" checked={form.allowed_ssids.split(',').map(s => s.trim()).includes(ssid)}
                                                onChange={e => {
                                                    const current = form.allowed_ssids.split(',').map(s => s.trim()).filter(s => s);
                                                    if (e.target.checked) {
                                                        setForm({ ...form, allowed_ssids: [...current, ssid].join(',') });
                                                    } else {
                                                        setForm({ ...form, allowed_ssids: current.filter(s => s !== ssid).join(',') });
                                                    }
                                                }}
                                            />
                                            {ssid}
                                        </label>
                                    ))}
                                </div>
                                <input className="glass-input" style={{ marginTop: '8px' }} placeholder="또는 직접 입력 (쉼표로 구분)"
                                    value={form.allowed_ssids.split(',').filter(s => s.trim() && !ssidOptions.includes(s.trim())).join(', ')}
                                    onChange={e => {
                                        const manual = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                                        const selected = form.allowed_ssids.split(',').map(s => s.trim()).filter(s => ssidOptions.includes(s));
                                        setForm({ ...form, allowed_ssids: [...selected, ...manual].join(',') });
                                    }}
                                />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                                <div>
                                    <label>최대 사용 횟수</label>
                                    <input type="number" className="glass-input" placeholder="비움 = 무제한"
                                        value={form.max_uses} onChange={e => setForm({ ...form, max_uses: e.target.value })} />
                                </div>
                                <div>
                                    <label>유효 기간 (일)</label>
                                    <input type="number" className="glass-input" placeholder="비움 = 무기한"
                                        value={form.expires_days} onChange={e => setForm({ ...form, expires_days: e.target.value })} />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                                <button type="button" className="glass-button secondary" onClick={() => setShowModal(false)}>취소</button>
                                <button type="submit" className="glass-button">생성</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Invitations;
