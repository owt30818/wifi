import { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null); // { username, token, role }
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const username = localStorage.getItem('username');
        const role = localStorage.getItem('role');
        const allowed_groups = localStorage.getItem('allowed_groups');
        const allowed_ssids = localStorage.getItem('allowed_ssids');

        if (token && username && role) {
            setUser({ username, token, role, allowed_groups, allowed_ssids });
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }
        setLoading(false);

        // Axios Interceptor for 401
        const interceptor = axios.interceptors.response.use(
            response => response,
            error => {
                if (error.response && error.response.status === 401) {
                    logout();
                }
                return Promise.reject(error);
            }
        );

        return () => {
            axios.interceptors.response.eject(interceptor);
        };
    }, []);

    const login = async (username, password) => {
        try {
            const res = await axios.post('/api/auth/login', { username, password });
            const { token, username: userN, role, allowed_groups, allowed_ssids } = res.data;

            localStorage.setItem('token', token);
            localStorage.setItem('username', userN);
            localStorage.setItem('role', role);
            if (allowed_groups) localStorage.setItem('allowed_groups', allowed_groups);
            if (allowed_ssids) localStorage.setItem('allowed_ssids', allowed_ssids);

            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            setUser({ username: userN, token, role, allowed_groups, allowed_ssids });
            return { success: true };
        } catch (err) {
            console.error(err);
            return { success: false, error: err.response?.data?.error || 'Login failed' };
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        localStorage.removeItem('role');
        localStorage.removeItem('allowed_groups');
        localStorage.removeItem('allowed_ssids');
        setUser(null);
    };

    // Generic Admin check (includes super_admin, admin, sub_admin)
    const isAdmin = () => {
        console.log("[AuthContext] role check:", user?.role);
        return ['admin', 'super_admin', 'sub_admin'].includes(user?.role);
    };

    // Strict Super Admin check
    const isSuperAdmin = () => ['admin', 'super_admin'].includes(user?.role);

    // Check if Sub Admin
    const isSubAdmin = () => user?.role === 'sub_admin';

    return (
        <AuthContext.Provider value={{ user, login, logout, loading, isAdmin, isSuperAdmin, isSubAdmin }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
