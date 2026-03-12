import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';

const Signup = () => {
    const appName = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_APP_NAME) || 'WIFI Admin Portal';
    const [searchParams] = useSearchParams();
    const invitationCode = searchParams.get('code');

    const [formData, setFormData] = useState({
        username: '',
        password: '',
        confirmPassword: '',
        grade: '',
        class: '',
        number: '',
        real_name: '',
        mac_address: ''
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [invitationInfo, setInvitationInfo] = useState(null);
    const [loading, setLoading] = useState(!!invitationCode);
    const navigate = useNavigate();

    // Validate invitation code on mount
    useEffect(() => {
        if (invitationCode) {
            axios.get(`/api/invitations/validate/${invitationCode}`)
                .then(res => {
                    setInvitationInfo(res.data);
                    setLoading(false);
                })
                .catch(err => {
                    setError(err.response?.data?.error || '초대 코드 검증에 실패했습니다.');
                    setLoading(false);
                });
        }
    }, [invitationCode]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.confirmPassword) {
            return setError('비밀번호가 일치하지 않습니다.');
        }

        try {
            await axios.post('/api/auth/signup', {
                username: formData.username,
                password: formData.password,
                grade: parseInt(formData.grade),
                class: parseInt(formData.class),
                number: parseInt(formData.number),
                real_name: formData.real_name,
                mac_address: formData.mac_address || undefined,
                invitation_code: invitationCode || undefined
            });
            setSuccess(true);
            setTimeout(() => navigate('/login'), 2000);
        } catch (err) {
            setError(err.response?.data?.error || '회원가입에 실패했습니다.');
        }
    };

    // Show loading while validating invitation
    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
                <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
                    <p style={{ color: '#94a3b8' }}>초대 코드 확인 중...</p>
                </div>
            </div>
        );
    }

    // Show error if invitation code is invalid (and no public signup)
    if (invitationCode && !invitationInfo && error) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
                <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', maxWidth: '400px' }}>
                    <h2 style={{ color: '#f87171', marginBottom: '1rem' }}>접근 불가</h2>
                    <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>{error}</p>
                    <Link to="/login" className="glass-button">로그인 페이지로</Link>
                </div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', width: '100%', padding: '20px' }}>
            <div className="glass-panel" style={{ padding: '2.5rem', width: '100%', maxWidth: '450px' }}>
                <h2 style={{ textAlign: 'center', marginBottom: '1.5rem', color: 'white' }}>{appName} - 회원가입</h2>

                {invitationInfo && (
                    <div style={{ background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)', color: '#38bdf8', padding: '12px', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                        <div style={{ fontWeight: 500, marginBottom: '4px' }}>📨 {invitationInfo.name || '초대 링크'}</div>
                        {invitationInfo.group_name && <div>그룹: {invitationInfo.group_name}</div>}
                        {invitationInfo.allowed_ssids && <div>SSID: {invitationInfo.allowed_ssids}</div>}
                    </div>
                )}

                <p style={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', marginBottom: '1.5rem' }}>
                    서비스 이용을 위해 학생 정보를 정확히 입력해주세요.
                </p>

                {error && (
                    <div style={{ background: 'rgba(244, 63, 94, 0.2)', color: '#fb7185', padding: '10px', borderRadius: '8px', marginBottom: '1rem', border: '1px solid rgba(244, 63, 94, 0.3)', fontSize: '0.9rem' }}>
                        {error}
                    </div>
                )}

                {success && (
                    <div style={{ background: 'rgba(34, 197, 94, 0.2)', color: '#4ade80', padding: '10px', borderRadius: '8px', marginBottom: '1rem', border: '1px solid rgba(34, 197, 94, 0.3)', fontSize: '0.9rem' }}>
                        회원가입 성공! 로그인 페이지로 이동합니다...
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                    <div style={{ gridColumn: 'span 3', marginBottom: '10px' }}>
                        <label className="form-label">아이디</label>
                        <input type="text" name="username" className="glass-input" value={formData.username} onChange={handleChange} required placeholder="로그인용 ID" />
                    </div>

                    <div style={{ gridColumn: 'span 3', marginBottom: '10px' }}>
                        <label className="form-label">이름</label>
                        <input type="text" name="real_name" className="glass-input" value={formData.real_name} onChange={handleChange} required placeholder="실명 입력" />
                    </div>

                    <div style={{ marginBottom: '10px' }}>
                        <label className="form-label">학년</label>
                        <select name="grade" className="glass-input" value={formData.grade} onChange={handleChange} required>
                            <option value="">선택</option>
                            <option value="1">1학년</option>
                            <option value="2">2학년</option>
                            <option value="3">3학년</option>
                        </select>
                    </div>
                    <div style={{ marginBottom: '10px' }}>
                        <label className="form-label">반</label>
                        <select name="class" className="glass-input" value={formData.class} onChange={handleChange} required>
                            <option value="">선택</option>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => <option key={n} value={n}>{n}반</option>)}
                        </select>
                    </div>
                    <div style={{ marginBottom: '10px' }}>
                        <label className="form-label">번호</label>
                        <select name="number" className="glass-input" value={formData.number} onChange={handleChange} required>
                            <option value="">선택</option>
                            {Array.from({ length: 30 }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}번</option>)}
                        </select>
                    </div>

                    <div style={{ gridColumn: 'span 3', marginBottom: '10px' }}>
                        <label className="form-label">기기 MAC 주소 (선택)</label>
                        <input type="text" name="mac_address" className="glass-input" value={formData.mac_address} onChange={handleChange} placeholder="예: AA-BB-CC-DD-EE-FF" />
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>입력 시 자동으로 기기가 등록됩니다</div>
                    </div>

                    <div style={{ gridColumn: 'span 3', marginBottom: '10px' }}>
                        <label className="form-label">비밀번호</label>
                        <input type="password" name="password" className="glass-input" value={formData.password} onChange={handleChange} required />
                    </div>

                    <div style={{ gridColumn: 'span 3', marginBottom: '1.5rem' }}>
                        <label className="form-label">비밀번호 확인</label>
                        <input type="password" name="confirmPassword" className="glass-input" value={formData.confirmPassword} onChange={handleChange} required />
                    </div>

                    <button type="submit" className="glass-button" style={{ gridColumn: 'span 3', width: '100%', padding: '12px' }} disabled={success}>
                        가입 완료
                    </button>

                    <div style={{ gridColumn: 'span 3', marginTop: '1.5rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
                        이미 계정이 있으신가요? <Link to="/login" style={{ color: '#3b82f6', textDecoration: 'none' }}>로그인</Link>
                    </div>
                </form>
            </div>
            <style>{`
                .form-label { display: block; margin-bottom: 0.5rem; color: #94a3b8; font-size: 0.85rem; }
            `}</style>
        </div>
    );
};

export default Signup;
