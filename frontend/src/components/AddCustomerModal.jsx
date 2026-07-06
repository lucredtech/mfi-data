import { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { parseApiError } from '../utils/apiError';

export default function AddCustomerModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', email: '', bvn: '', nin: '', phone: '', address: '', customerType: 'individual' });
  const [saving, setSaving] = useState(false);
  const [dupWarning, setDupWarning] = useState(null);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name) return toast.error('Name is required');
    setSaving(true);
    setDupWarning(null);
    try {
      const { data } = await api.post('/api/customers', form);
      if (data.duplicate) {
        setDupWarning(data.duplicate);
        toast(`Possible duplicate: ${data.duplicate.name}`, { icon: '⚠️' });
      } else {
        toast.success('Customer created');
      }
      onCreated(data.customer);
    } catch (err) {
      toast.error(parseApiError(err, { default: 'Failed to create customer. Please try again.' }));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        <div style={s.modalHeader}>
          <div style={s.modalTitle}>New Customer</div>
          <button onClick={onClose} style={s.closeBtn}>✕</button>
        </div>

        {dupWarning && (
          <div style={{ background: '#fef3c7', border: '1.5px solid #fbbf24', borderRadius: 8, padding: '10px 14px', margin: '0 0 16px', fontSize: 13 }}>
            <strong style={{ color: '#92400e' }}>⚠ Possible duplicate:</strong>{' '}
            <a href={`/dashboard/customers/${dupWarning.id}`} target="_blank" rel="noreferrer" style={{ color: '#d97706', fontWeight: 600 }}>
              {dupWarning.name}
            </a>{' '}
            <span style={{ color: '#78350f' }}>already exists with the same BVN, NIN, email, or phone.</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            {[['individual', 'Individual'], ['business', 'Business (SME)']].map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => setForm(f => ({ ...f, customerType: val }))}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer',
                  border: `2px solid ${form.customerType === val ? '#0ea5e9' : '#e2e8f0'}`,
                  background: form.customerType === val ? '#f0f9ff' : '#fff',
                  color: form.customerType === val ? '#0ea5e9' : '#64748b',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <div style={s.grid}>
            {[
              { k: 'name', label: form.customerType === 'business' ? 'Business Name *' : 'Full Name *', placeholder: form.customerType === 'business' ? 'e.g. Okeke Ventures Ltd' : 'e.g. Amaka Obi' },
              { k: 'email', label: 'Email', placeholder: 'amaka@example.com' },
              { k: 'phone', label: 'Phone', placeholder: '08012345678' },
              { k: 'bvn', label: 'BVN', placeholder: '22222222222', maxLength: 11 },
              { k: 'nin', label: 'NIN', placeholder: '12345678901', maxLength: 11 },
              { k: 'address', label: 'Address (optional)', placeholder: '12 Broad Street, Lagos', span: true },
            ].map(({ k, label, placeholder, maxLength, span }) => (
              <div key={k} style={{ ...s.field, ...(span ? { gridColumn: 'span 2' } : {}) }}>
                <label style={s.label}>{label}</label>
                <input
                  style={s.input}
                  placeholder={placeholder}
                  value={form[k]}
                  maxLength={maxLength}
                  onChange={set(k)}
                />
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            <button type="button" onClick={onClose} style={s.cancelBtn}>Cancel</button>
            <button type="submit" style={{ ...s.btn, opacity: saving ? 0.7 : 1 }} disabled={saving}>
              {saving ? 'Saving…' : 'Create Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const s = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modal: { background: '#fff', borderRadius: 16, padding: '2rem', width: 520, maxWidth: '95vw', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 18, fontWeight: 800, color: '#0f172a' },
  closeBtn: { background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#94a3b8' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
  field: { display: 'flex', flexDirection: 'column' },
  label: { fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  input: { padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14, outline: 'none', fontFamily: 'inherit' },
  cancelBtn: { background: '#f1f5f9', color: '#374151', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 600, fontSize: 14, cursor: 'pointer' },
  btn: { flex: 1, background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 700, fontSize: 14, cursor: 'pointer' },
};
