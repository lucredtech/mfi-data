import { useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

const BASE_URL = window.location.origin;

export default function Referral() {
  const [data, setData] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.get('/api/auth/referral').then(({ data }) => setData(data)).catch(() => {});
  }, []);

  const referralLink = data?.referralCode ? `${BASE_URL}/register?ref=${data.referralCode}` : '';

  const copy = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopied(true);
      toast.success('Link copied!');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={{ maxWidth: 600 }}>
      <h1 style={s.h1}>Refer an MFI</h1>
      <p style={s.sub}>Share your invite link with other microfinance institutions. Every referral helps grow the Lucred network.</p>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div style={s.statCard}>
          <div style={{ fontSize: 36, fontWeight: 800, color: '#6d28d9' }}>{data?.referralCount ?? '—'}</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginTop: 4 }}>MFIs referred</div>
        </div>
        <div style={s.statCard}>
          <div style={{ fontSize: 36, fontWeight: 800, color: '#0ea5e9' }}>{data?.referralCode ?? '—'}</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginTop: 4 }}>Your referral code</div>
        </div>
      </div>

      {/* Invite link */}
      <div style={s.card}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>Your invite link</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            readOnly
            value={referralLink}
            style={{ flex: 1, padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, color: '#334155', background: '#f8fafc', outline: 'none' }}
          />
          <button
            onClick={copy}
            style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: copied ? '#16a34a' : '#0f172a', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', flexShrink: 0, transition: 'background 0.2s' }}
          >{copied ? '✓ Copied' : 'Copy link'}</button>
        </div>
      </div>

      {/* How it works */}
      <div style={s.card}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>How it works</div>
        {[
          ['Share your link', 'Send your unique invite link to another MFI or lending business.'],
          ['They sign up', 'When they register using your link, they\'re automatically linked to you.'],
          ['Track referrals', 'Your referral count updates here in real time.'],
        ].map(([title, desc], i) => (
          <div key={i} style={{ display: 'flex', gap: 14, marginBottom: i < 2 ? 16 : 0 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#6d28d9', color: '#fff', fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 2 }}>{title}</div>
              <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>{desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const s = {
  h1: { fontSize: 24, fontWeight: 700, color: '#0f172a', margin: 0 },
  sub: { color: '#64748b', fontSize: 14, marginTop: 4, marginBottom: 24 },
  statCard: { background: '#fff', borderRadius: 12, padding: '1.25rem 1.5rem', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' },
  card: { background: '#fff', borderRadius: 12, padding: '1.5rem', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', marginBottom: 20 },
};
