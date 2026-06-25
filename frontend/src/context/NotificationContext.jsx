import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const NotificationContext = createContext({ unread: 0, refresh: () => {} });

export function NotificationProvider({ children }) {
  const [unread, setUnread] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get('/api/notifications');
      setUnread(data.unread || 0);
    } catch {}
  }, []);

  const markAllRead = useCallback(() => setUnread(0), []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    refresh();
    const id = setInterval(refresh, 30000);
    return () => clearInterval(id);
  }, [refresh]);

  return (
    <NotificationContext.Provider value={{ unread, refresh, markAllRead }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
