import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('client');
    if (stored) setClient(JSON.parse(stored));
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/api/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('client', JSON.stringify(data.client));
    setClient(data.client);
    return data;
  };

  const register = async (payload) => {
    const { data } = await api.post('/api/auth/register', payload);
    localStorage.setItem('token', data.token);
    localStorage.setItem('client', JSON.stringify(data.client));
    if (data.apiKey) localStorage.setItem('apiKey', data.apiKey);
    setClient(data.client);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('client');
    setClient(null);
  };

  return (
    <AuthContext.Provider value={{ client, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
