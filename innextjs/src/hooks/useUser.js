import { useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import { useRouter } from 'next/router';

export default function useUser() {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem('token');
        
        if (token) {
            try {
                const decoded = jwtDecode(token);
                if (decoded.exp * 1000 < Date.now()) {
                    localStorage.removeItem('token');
                    setUser(null);
                    window.location.href = '/login';
                } else {
                    setUser(decoded);
                    // Verify signature with backend
                    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || '/api/v1'}/auth/verify`, {
                        headers: { Authorization: `Bearer ${token}` }
                    }).then(res => {
                        if (!res.ok) {
                            console.error("Token signature invalid");
                            localStorage.removeItem('token');
                            setUser(null);
                            window.location.href = '/login';
                        }
                    }).catch(console.error);
                }
            } catch (error) {
                console.error("Invalid token", error);
                localStorage.removeItem('token');
                setUser(null);
                window.location.href = '/login';
            }
        } else {
            setUser(null);
            window.location.href = '/login';
        }
        setIsLoading(false);
    }, [router.pathname]);

    const hasPermission = (moduleKey, action = 'can_read') => {
        if (!user) return false;
        if (user.role === 'super_admin') return true;

        const permissions = user.security_role?.permissions || [];
        const modulePerm = permissions.find(p => p.module_key === moduleKey);
        
        return modulePerm ? !!modulePerm[action] : false;
    };

    const login = (token, userData) => {
        localStorage.setItem('token', token);
        setUser(userData);
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
        window.location.href = '/login';
    };

    return {
        user,
        isLoading,
        hasPermission,
        login,
        logout
    };
}
