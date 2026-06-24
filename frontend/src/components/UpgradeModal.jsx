import { useNavigate } from 'react-router-dom';

export default function UpgradeModal({ onClose }) {
  const navigate = useNavigate();

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#fff', borderRadius: 18, padding: '2.5rem 2rem', maxWidth: 420, width: '100%', boxShadow: '0 24px 64px rgba(0,0,0,0.2)', textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🚀</div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 10px' }}>You've hit your plan limit</h2>
        <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.7, margin: '0 0 24px' }}>
          Your free plan allows <strong>200 API calls per month</strong>. Upgrade to Growth for 5,000 calls, or Scale for unlimited access.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          <div style={{ background: '#f5f3ff', border: '2px solid #6d28d9', borderRadius: 12, padding: '1rem 1.25rem', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#6d28d9' }}>Growth</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>5,000 API calls/month</div>
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>₦50,000<span style={{ fontSize: 11, fontWeight: 400, color: '#94a3b8' }}>/mo</span></div>
            </div>
          </div>
          <div style={{ background: '#f0fdf4', border: '1.5px solid #16a34a', borderRadius: 12, padding: '1rem 1.25rem', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#16a34a' }}>Scale</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Unlimited API calls</div>
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>₦200,000<span style={{ fontSize: 11, fontWeight: 400, color: '#94a3b8' }}>/mo</span></div>
            </div>
          </div>
        </div>

        <button
          onClick={() => { navigate('/pricing'); onClose(); }}
          style={{ width: '100%', padding: '12px', background: '#6d28d9', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer', marginBottom: 10 }}
        >
          View all plans →
        </button>
        <button onClick={onClose} style={{ width: '100%', padding: '10px', background: 'none', border: 'none', fontSize: 13, color: '#94a3b8', cursor: 'pointer' }}>
          Maybe later
        </button>
      </div>
    </div>
  );
}
