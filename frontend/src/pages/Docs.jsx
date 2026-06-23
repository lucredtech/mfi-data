import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Docs() {
  const navigate = useNavigate();
  useEffect(() => { window.open('/docs', '_blank'); navigate('/dashboard'); }, []);
  return null;
}
