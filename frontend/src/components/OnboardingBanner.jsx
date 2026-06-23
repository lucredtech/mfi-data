import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'https://mfi-data-production.up.railway.app';
function authHeaders() { return { Authorization: `Bearer ${localStorage.getItem('token')}` }; }

const STEPS = [
  { key: 'customer',  label: 'Add your first customer',     path: '/dashboard/customers',     cta: 'Add Customer' },
  { key: 'bvn',       label: 'Run a BVN verification',       path: '/dashboard/bvn',           cta: 'Verify BVN' },
  { key: 'bureau',    label: 'Pull a credit bureau report',  path: '/dashboard/credit-bureau', cta: 'Check Bureau' },
  { key: 'statement', label: 'Analyse a bank statement',     path: '/dashboard/statement',     cta: 'Upload Statement' },
  { key: 'apikey',    label: 'Generate your API key',        path: '/dashboard/api-keys',      cta: 'Get API Key' },
];

export default function OnboardingBanner({ stats }) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(() => localStorage.getItem('onboarding_dismissed') === 'true');

  if (dismissed) return null;

  const completed = {
    customer:  (stats?.customers ?? 0) > 0,
    bvn:       (stats?.bvn ?? 0) > 0,
    bureau:    (stats?.bureau ?? 0) > 0,
    statement: (stats?.statements ?? 0) > 0,
    apikey:    !!localStorage.getItem('apiKey'),
  };

  const doneCount = Object.values(completed).filter(Boolean).length;
  const allDone = doneCount === STEPS.length;

  function dismiss() {
    localStorage.setItem('onboarding_dismissed', 'true');
    setDismissed(true);
  }

  return (
    <div style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)', borderRadius: 14, padding: '1.5rem', marginBottom: 28, color: '#fff', position: 'relative' }}>
      <button onClick={dismiss} style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', color: '#64748b', fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>✕</button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>
            {allDone ? '🎉 You\'re all set!' : `Get started — ${doneCount}/${STEPS.length} complete`}
          </div>
          <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 3 }}>
            {allDone ? 'Your account is fully set up. You\'re ready to lend smarter.' : 'Complete these steps to get the most out of Lucred.'}
          </div>
        </div>
        {/* Progress bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 140, height: 6, background: '#1e3a5f', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: `${(doneCount / STEPS.length) * 100}%`, height: '100%', background: '#38bdf8', borderRadius: 3, transition: 'width 0.4s ease' }} />
          </div>
          <span style={{ fontSize: 12, color: '#38bdf8', fontWeight: 700 }}>{Math.round((doneCount / STEPS.length) * 100)}%</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {STEPS.map((step, i) => {
          const done = completed[step.key];
          return (
            <div
              key={step.key}
              onClick={() => !done && navigate(step.path)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: done ? 'rgba(56,189,248,0.08)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${done ? '#38bdf8' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 10, padding: '10px 14px',
                cursor: done ? 'default' : 'pointer',
                flex: '1 1 180px', minWidth: 180,
                transition: 'background 0.15s',
              }}
            >
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: done ? '#38bdf8' : '#1e293b', border: `2px solid ${done ? '#38bdf8' : '#334155'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 12, fontWeight: 700, color: done ? '#0f172a' : '#64748b' }}>
                {done ? '✓' : i + 1}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: done ? '#e2e8f0' : '#94a3b8' }}>{step.label}</div>
                {!done && <div style={{ fontSize: 11, color: '#38bdf8', marginTop: 2 }}>{step.cta} →</div>}
              </div>
            </div>
          );
        })}
      </div>

      {allDone && (
        <button onClick={dismiss} style={{ marginTop: 14, fontSize: 13, fontWeight: 600, color: '#38bdf8', background: 'none', border: '1px solid #38bdf8', borderRadius: 8, padding: '6px 16px', cursor: 'pointer' }}>
          Dismiss
        </button>
      )}
    </div>
  );
}
