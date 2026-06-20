import { useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.code}>404</div>
        <div style={s.title}>Page not found</div>
        <p style={s.sub}>The page you're looking for doesn't exist or has been moved.</p>
        <div style={s.actions}>
          <button style={s.btnPrimary} onClick={() => navigate('/')}>Go to Homepage</button>
          <button style={s.btnOutline} onClick={() => navigate(-1)}>Go Back</button>
        </div>
      </div>
    </div>
  );
}

const s = {
  page: {
    minHeight: '100vh',
    background: '#f8fafc',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
  },
  card: {
    background: '#fff',
    borderRadius: 16,
    padding: '3rem 2.5rem',
    textAlign: 'center',
    maxWidth: 420,
    width: '100%',
    boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
    border: '1px solid #e2e8f0',
  },
  code: {
    fontSize: 80,
    fontWeight: 900,
    color: '#e2e8f0',
    lineHeight: 1,
    marginBottom: 16,
    letterSpacing: -4,
  },
  title: {
    fontSize: 22,
    fontWeight: 800,
    color: '#0f172a',
    marginBottom: 10,
  },
  sub: {
    fontSize: 14,
    color: '#64748b',
    margin: '0 0 28px',
    lineHeight: 1.6,
  },
  actions: {
    display: 'flex',
    gap: 12,
    justifyContent: 'center',
  },
  btnPrimary: {
    background: '#0ea5e9',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '10px 22px',
    fontWeight: 700,
    fontSize: 14,
    cursor: 'pointer',
  },
  btnOutline: {
    background: '#fff',
    color: '#334155',
    border: '1.5px solid #e2e8f0',
    borderRadius: 8,
    padding: '10px 22px',
    fontWeight: 600,
    fontSize: 14,
    cursor: 'pointer',
  },
};
