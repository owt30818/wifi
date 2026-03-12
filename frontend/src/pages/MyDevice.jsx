import { useState, useEffect } from 'react';
import axios from 'axios';
import { Wifi, Info, CheckCircle, AlertCircle, Smartphone } from 'lucide-react';
import { formatMac } from '../utils/macUtils';

const MyDevice = () => {
    const [device, setDevice] = useState(null);
    const [loading, setLoading] = useState(true);
    const [macInput, setMacInput] = useState('');
    const [aliasInput, setAliasInput] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const fetchDevice = async () => {
        try {
            const res = await axios.get('/api/devices');
            // API returns { data: [], pagination: ... }
            if (res.data.data && res.data.data.length > 0) {
                setDevice(res.data.data[0]);
            }
        } catch (err) {
            console.error('Failed to fetch device:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDevice();
    }, []);

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        // Basic MAC Validation
        const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$|^([0-9A-Fa-f]{12})$/;
        if (!macRegex.test(macInput)) {
            return setError('올바른 MAC 주소 형식이 아닙니다. (예: AA:BB:CC:DD:EE:FF 또는 AABBCCDDEEFF)');
        }

        try {
            await axios.post('/api/devices', {
                mac_address: macInput,
                alias: aliasInput || '내 기기'
            });
            setSuccess('기기가 성공적으로 등록되었습니다!');
            fetchDevice();
        } catch (err) {
            setError(err.response?.data?.error || '기기 등록에 실패했습니다.');
        }
    };

    if (loading) return <div style={{ color: 'white', padding: '50px', textAlign: 'center' }}>로딩 중...</div>;

    return (
        <div style={{ maxWidth: '800px', margin: '40px auto', padding: '0 20px' }}>
            <h1 style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Wifi size={32} color="#38bdf8" /> 내 기기 관리
            </h1>

            {device ? (
                <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
                    <div style={{ background: 'rgba(56, 189, 248, 0.1)', padding: '24px', borderRadius: '50%', width: 'fit-content', margin: '0 auto 2rem auto', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                        <Smartphone size={56} color="#38bdf8" />
                    </div>
                    <h2 style={{ marginBottom: '1rem', color: 'white', fontSize: '1.8rem' }}>기기 등록 현황</h2>
                    <p style={{ color: '#94a3b8', marginBottom: '3rem' }}>현재 아래 기기가 Wi-Fi 접속용으로 등록되어 있습니다.</p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'left', maxWidth: '450px', margin: '0 auto' }}>
                        <div className="glass-panel" style={{ padding: '1.8rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <label style={{ fontSize: '0.85rem', color: '#64748b', display: 'block', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>기기 이름</label>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white' }}>{device.alias}</div>
                        </div>
                        <div className="glass-panel" style={{ padding: '1.8rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <label style={{ fontSize: '0.85rem', color: '#64748b', display: 'block', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>MAC 주소</label>
                            <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: '#38bdf8', fontFamily: 'monospace', letterSpacing: '1.5px' }}>{device.mac_address}</div>
                        </div>
                    </div>

                    <div style={{ marginTop: '4rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', display: 'inline-block', fontSize: '0.9rem', color: '#94a3b8' }}>
                        ※ 기기 정보 변경이 필요하신 경우 반드시 <strong>관리자</strong>에게 문의해 주세요.
                    </div>
                </div>
            ) : (
                <div className="glass-panel" style={{ padding: '2.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', color: '#fbbf24', marginBottom: '2.5rem', background: 'rgba(251, 191, 36, 0.08)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(251, 191, 36, 0.2)' }}>
                        <AlertCircle size={32} />
                        <div style={{ fontSize: '0.95rem', lineHeight: '1.6' }}>
                            <strong>입력 주의:</strong> 기기는 1인당 1대만 등록 가능하며, <strong>직접 수정이 불가능</strong>합니다.<br />
                            본인의 기기가 맞는지, MAC 주소가 정확한지 반드시 확인 후 진행해 주세요.
                        </div>
                    </div>

                    {error && (
                        <div style={{ background: 'rgba(244, 63, 94, 0.15)', color: '#fb7185', padding: '15px', borderRadius: '10px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid rgba(244, 63, 94, 0.2)' }}>
                            <AlertCircle size={20} /> {error}
                        </div>
                    )}
                    {success && (
                        <div style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', padding: '15px', borderRadius: '10px', marginBottom: '1.5rem', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                            {success}
                        </div>
                    )}

                    <form onSubmit={handleRegister}>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8' }}>기기 이름 (예: 내 노트북, 갤럭시 S24)</label>
                            <input
                                type="text"
                                className="glass-input"
                                value={aliasInput}
                                onChange={(e) => setAliasInput(e.target.value)}
                                placeholder="기기를 식별할 수 있는 이름을 적어주세요."
                            />
                        </div>

                        <div style={{ marginBottom: '2rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8' }}>MAC 주소</label>
                            <input
                                type="text"
                                className="glass-input"
                                value={macInput}
                                onChange={(e) => setMacInput(formatMac(e.target.value))}
                                style={{ fontFamily: 'monospace', letterSpacing: '1px' }}
                                placeholder="AA:BB:CC:DD:EE:FF"
                                required
                            />
                            <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#64748b' }}>
                                설정 &gt; 기기 정보 &gt; 상태 또는 Wi-Fi 설정에서 확인할 수 있습니다.
                            </p>
                        </div>

                        <button type="submit" className="glass-button" style={{ width: '100%', padding: '15px', fontSize: '1.1rem' }}>
                            기기 등록하기
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default MyDevice;
