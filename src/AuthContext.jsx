// AuthContext.jsx
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const API = import.meta.env.VITE_API_BASE ;
const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser]   = useState(JSON.parse(localStorage.getItem('user') || 'null'));

  useEffect(() => {
    if (token) localStorage.setItem('token', token); else localStorage.removeItem('token');
  }, [token]);
  useEffect(() => {
    if (user) localStorage.setItem('user', JSON.stringify(user)); else localStorage.removeItem('user');
  }, [user]);

  const login = async (username, password) => {
    const r = await fetch(`${API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ username, password })
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j?.error || 'Login failed');
    setToken(j.token); setUser(j.user);
  };
  const register = async (username, password) => {
    const r = await fetch(`${API}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ username, password })
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j?.error || 'Register failed');
    // สมัครเสร็จ -> ให้ไป login
    await login(username, password);
  };
  const logout = () => { setToken(''); setUser(null); };

  const authFetch = (url, options={}) => {
    const hdrs = new Headers(options.headers || {});
    if (token) hdrs.set('Authorization', `Bearer ${token}`);
    return fetch(url, { ...options, headers: hdrs });
  };

  const value = useMemo(()=>({ token, user, login, register, logout, authFetch }), [token, user]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  return useContext(AuthCtx);
}
