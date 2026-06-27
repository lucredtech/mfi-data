import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

const STEPS = [
  { key: 'emailVerified', label: 'Verify your email',       path: '/dashboard/settings', cta: 'Verify email',      resend: true },
  { key: 'hasApiKey',     label: 'Create an API key',        path: '/dashboard/api-keys', cta: 'Create key' },
  { key: 'hasCustomer',   label: 'Add your first borrower',  path: '/dashboard/customers', cta: 'Add customer' },
  { key: 'hasRun',        label: 'Run your first check',     path: '/dashboard/bvn',      cta: 'Run a check' },
];

export default function OnboardingBanner() {
  const navigate = useNavigate();
  const [onboarding, setOnboarding] = useState(null);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem('onboarding_dismissed') === 'true');
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (dismissed) return;
    api.get('/api/auth/me').then(({ data }) => setOnboarding(data.onboarding)).catch(() => {});
  }, [dismissed]);

  if (dismissed || !onboarding) return null;

  const doneCount = STEPS.filter(s => onboarding[s.key]).length;
  if (doneCount === STEPS.length) return null;

  function dismiss() {
    localStorage.setItem('onboarding_dismissed', 'true');
    setDismissed(true);
  }

  async function resendVerification() {
    setResending(true);
    try {
      await api.post('/api/auth/resend-verification');
      toast.success('Verification email sent — check your inbox.');
    } catch { toast.error('Failed to resend. Try again later.'); }
    finally { setResending(false); }
  }

  return (
    <div style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)', borderRadius: 14, padding: '1.5rem', marginBottom: 28, color: '#fff', position: 'relative' }}>
      <button onClick={dismiss} style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', color: '#64748b', fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>✕</button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>Get started — {doneCount}/{STEPS.length} complete</div>
          <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 3 }}>Complete these steps to unlock full platform access.</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 140, height: 6, background: '#1e3a5f', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: `${(doneCount / STEPS.length) * 100}%`, height: '100%', background: '#38bdf8', borderRadius: 3, transition: 'width 0.4s ease' }} />
          </div>
          <span style={{ fontSize: 12, color: '#38bdf8', fontWeight: 700 }}>{Math.round((doneCount / STEPS.length) * 100)}%</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {STEPS.map((step, i) => {
          const done = !!onboarding[step.key];
          return (
            <div
              key={step.key}
              onClick={() => !done && !step.resend && navigate(step.path)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: done ? 'rgba(56,189,248,0.08)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${done ? '#38bdf8' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 10, padding: '10px 14px',
                cursor: done ? 'default' : step.resend ? 'default' : 'pointer',
                flex: '1 1 180px', minWidth: 180,
              }}
            >
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: done ? '#38bdf8' : '#1e293b', border: `2px solid ${done ? '#38bdf8' : '#334155'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 12, fontWeight: 700, color: done ? '#0f172a' : '#64748b' }}>
                {done ? '✓' : i + 1}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: done ? '#e2e8f0' : '#94a3b8' }}>{step.label}</div>
                {!done && (
                  step.resend
                    ? <button onClick={resendVerification} disabled={resending} style={{ fontSize: 11, color: '#38bdf8', background: 'none', border: 'none', padding: 0, cursor: 'pointer', marginTop: 2, fontWeight: 700 }}>
                        {resending ? 'Sending…' : 'Resend email →'}
                      </button>
                    : <div style={{ fontSize: 11, color: '#38bdf8', marginTop: 2 }}>{step.cta} →</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
