import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Wifi, LogOut, LayoutDashboard, Smartphone, Users, Router, Settings } from 'lucide-react';

const Navbar = () => {
    const appName = import.meta.env.VITE_APP_NAME || 'WIFI Admin Portal';
    const { logout, user, isAdmin, isSuperAdmin } = useAuth();
    const location = useLocation();

    return (
        <nav className="glass-panel" style={{
            margin: '20px auto',
            width: 'calc(100% - 40px)',
            maxWidth: '1200px',
            padding: '1rem 2rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderRadius: '24px'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                    background: 'linear-gradient(135deg, #38bdf8, #2563eb)',
                    padding: '8px',
                    borderRadius: '12px',
                    display: 'flex'
                }}>
                    <Wifi size={24} color="white" />
                </div>
                <span style={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'white' }}>{appName}</span>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
                {isAdmin() ? (
                    <>
                        <NavLink to="/" current={location.pathname} icon={<LayoutDashboard size={18} />}>대시보드</NavLink>
                        <NavLink to="/devices" current={location.pathname} icon={<Smartphone size={18} />}>단말기 관리</NavLink>
                        <NavLink to="/online-users" current={location.pathname} icon={<Users size={18} />}>접속자 현황</NavLink>
                        <NavLink to="/users" current={location.pathname} icon={<Users size={18} />}>사용자 관리</NavLink>
                        <NavLink to="/admin" current={location.pathname} icon={<Settings size={18} />}>관리자 설정</NavLink>
                        {isSuperAdmin() && (
                            <NavLink to="/access-points" current={location.pathname} icon={<Router size={18} />}>AP 관리</NavLink>
                        )}
                    </>
                ) : (
                    <NavLink to="/" current={location.pathname} icon={<Smartphone size={18} />}>내 기기</NavLink>
                )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>{user?.username}</span>
                <button
                    onClick={logout}
                    className="glass-button danger"
                    style={{ padding: '8px 16px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                    <LogOut size={16} />
                    로그아웃
                </button>
            </div>
        </nav>
    );
};

const NavLink = ({ to, current, icon, children }) => {
    const active = current === to;
    return (
        <Link to={to} style={{
            textDecoration: 'none',
            color: active ? '#fff' : '#94a3b8',
            background: active ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
            padding: '8px 16px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: 500,
            transition: 'all 0.3s',
            fontSize: '0.9rem',
            whiteSpace: 'nowrap'
        }}>
            {icon}
            {children}
        </Link>
    )
}

export default Navbar;
