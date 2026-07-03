import { API_BASE as API } from '../services/api';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';


const SECTION = {
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: 10,
  padding: '24px 28px',
  marginBottom: 20,
};

const HEADING = { fontSize: 15, fontWeight: 600, color: '#0f172a', marginBottom: 14 };
const ROW = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px solid #e2e8f0' };
const LABEL = { fontSize: 13, color: '#334155', fontWeight: 500 };
const VALUE = { fontSize: 13, color: '#64748b', textAlign: 'right', maxWidth: 320 };

export default function Privacy() {
  const { client, logout } = useAuth();
  const navigate = useNavigate();
  const [showDelete, setShowDelete] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  async function handleExport() {
    setExporting(true);
    try {
      const res = await axios.get(`${API}/api/customers/export/all`, { headers, responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `lucred-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Data exported successfully');
    } catch {
      toast.error('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  }

  async function handleDeleteAccount() {
    if (!deletePassword) return toast.error('Enter your password to confirm');
    setDeleting(true);
    try {
      await axios.delete(`${API}/api/auth/account`, {
        headers,
        data: { password: deletePassword },
      });
      toast.success('Account deleted. All data has been permanently erased.');
      logout();
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Deletion failed. Please try again.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 24px', fontFamily: 'Inter, sans-serif' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>Privacy & Data</h1>
      <p style={{ fontSize: 14, color: '#64748b', marginBottom: 32 }}>
        How Lucred Credit Engine stores, protects, and handles your customers' data.
      </p>

      {/* What we store */}
      <div style={SECTION}>
        <div style={HEADING}>What we store</div>
        {[
          ['Customer profiles', 'Name, email, phone, BVN, NIN — stored until you delete the customer or your account.'],
          ['BVN verification results', 'Identity fields returned by NIBSS via Dojah. Biometric face images are never stored. Auto-deleted after 90 days.'],
          ['NIN verification results', 'Identity fields from NIMC. Biometric photos are never stored. Auto-deleted after 90 days.'],
          ['Credit bureau reports', 'XScore credit reports from FirstCentral. Auto-deleted after 180 days.'],
          ['Bank statement analysis', 'Risk scores and cash flow analysis. Auto-deleted after 1 year.'],
          ['API usage logs', 'Endpoint, timestamp, response time and status. No request body stored. Retained for 1 year.'],
        ].map(([label, value]) => (
          <div key={label} style={{ ...ROW, ...(label === 'API usage logs' ? { borderBottom: 'none' } : {}) }}>
            <span style={LABEL}>{label}</span>
            <span style={VALUE}>{value}</span>
          </div>
        ))}
      </div>

      {/* What we never store */}
      <div style={SECTION}>
        <div style={HEADING}>What we never store</div>
        {[
          ['Biometric face images', 'BVN and NIN photo/image fields are returned to your application in real-time but are never written to our database.'],
          ['Passwords', 'Customer passwords are not handled by Lucred Credit Engine. MFI account passwords are stored as bcrypt hashes (cost 10).'],
          ['Card or bank account numbers', 'No financial account credentials are processed or stored.'],
          ['Raw statement transaction data', 'Only the analysis output (scores, categories, summary) is stored — not the raw transaction list.'],
        ].map(([label, value]) => (
          <div key={label} style={{ ...ROW, ...(label === 'Raw statement transaction data' ? { borderBottom: 'none' } : {}) }}>
            <span style={LABEL}>{label}</span>
            <span style={VALUE}>{value}</span>
          </div>
        ))}
      </div>

      {/* Security measures */}
      <div style={SECTION}>
        <div style={HEADING}>Security measures</div>
        {[
          ['Data in transit', 'All communication is encrypted via TLS 1.2+. HSTS is enforced.'],
          ['Data at rest', 'MongoDB Atlas with encryption at rest enabled on all clusters.'],
          ['Data isolation', 'Every query is scoped to your organisation ID. Your customers cannot be accessed by other MFIs.'],
          ['API key authentication', 'B2B endpoints require a secret API key. Keys are never logged.'],
          ['Rate limiting', 'Login attempts are limited to 20 per 15 minutes per IP. API calls are limited to 60 per minute per key.'],
          ['Security headers', 'Helmet middleware enforces X-Frame-Options, Content-Security-Policy, X-Content-Type-Options, and more.'],
        ].map(([label, value]) => (
          <div key={label} style={{ ...ROW, ...(label === 'Security headers' ? { borderBottom: 'none' } : {}) }}>
            <span style={LABEL}>{label}</span>
            <span style={VALUE}>{value}</span>
          </div>
        ))}
      </div>

      {/* Your rights */}
      <div style={SECTION}>
        <div style={HEADING}>Your rights under NDPR</div>
        <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16, lineHeight: 1.6 }}>
          As an MFI operating in Nigeria, Lucred Credit Engine processes personal data on your behalf as a data processor under the Nigeria Data Protection Regulation (NDPR). You retain ownership of your customers' data and may exercise the following rights at any time.
        </p>
        {[
          ['Right of access', 'Download all your data at any time using the export button below.'],
          ['Right to erasure', 'Delete individual customers from the Customers page. Their records and all analysis history are permanently removed. To erase all data, delete your account below.'],
          ['Right to portability', 'Your export includes all customer profiles and analysis results in standard JSON format.'],
        ].map(([label, value]) => (
          <div key={label} style={{ ...ROW, ...(label === 'Right to portability' ? { borderBottom: 'none' } : {}) }}>
            <span style={LABEL}>{label}</span>
            <span style={VALUE}>{value}</span>
          </div>
        ))}
      </div>

      {/* Data actions */}
      <div style={SECTION}>
        <div style={HEADING}>Data actions</div>

        <div style={{ display: 'flex', gap: 12, marginBottom: showDelete ? 24 : 0, flexWrap: 'wrap' }}>
          <button
            onClick={handleExport}
            disabled={exporting}
            style={{
              padding: '9px 18px', borderRadius: 7, border: '1px solid #cbd5e1',
              background: '#fff', color: '#334155', fontWeight: 500, fontSize: 13,
              cursor: exporting ? 'not-allowed' : 'pointer', opacity: exporting ? 0.6 : 1,
            }}
          >
            {exporting ? 'Exporting...' : 'Export all data'}
          </button>

          <button
            onClick={() => setShowDelete((v) => !v)}
            style={{
              padding: '9px 18px', borderRadius: 7, border: '1px solid #fca5a5',
              background: '#fff', color: '#dc2626', fontWeight: 500, fontSize: 13, cursor: 'pointer',
            }}
          >
            Delete account
          </button>
        </div>

        {showDelete && (
          <div style={{ background: '#fff5f5', border: '1px solid #fca5a5', borderRadius: 8, padding: '20px 24px' }}>
            <p style={{ fontSize: 13, color: '#7f1d1d', fontWeight: 600, marginBottom: 6 }}>
              This action is permanent and cannot be undone.
            </p>
            <p style={{ fontSize: 13, color: '#991b1b', marginBottom: 16, lineHeight: 1.5 }}>
              Deleting your account will permanently erase: your organisation profile, all customer records, all BVN / NIN / bureau / statement analysis results, all API keys, and all usage logs. Enter your password to confirm.
            </p>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="password"
                placeholder="Your password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                style={{
                  padding: '8px 12px', borderRadius: 6, border: '1px solid #fca5a5',
                  fontSize: 13, width: 220, outline: 'none',
                }}
              />
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                style={{
                  padding: '9px 18px', borderRadius: 7, border: 'none',
                  background: '#dc2626', color: '#fff', fontWeight: 600, fontSize: 13,
                  cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.6 : 1,
                }}
              >
                {deleting ? 'Deleting...' : 'Permanently delete account'}
              </button>
              <button
                onClick={() => { setShowDelete(false); setDeletePassword(''); }}
                style={{ padding: '9px 18px', borderRadius: 7, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 13, cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 8 }}>
        For data protection inquiries, contact privacy@lucred.co
      </p>
    </div>
  );
}
