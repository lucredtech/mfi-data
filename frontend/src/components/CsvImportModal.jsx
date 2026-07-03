import { API_BASE as API } from '../services/api';
import { useState, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

function authHeaders() { return { Authorization: `Bearer ${localStorage.getItem('token')}` }; }

const TEMPLATE = `name,email,phone,bvn,address
Jane Doe,jane@example.com,08012345678,22152536730,15 Broad Street Lagos
John Smith,john@example.com,08098765432,,`;

export default function CsvImportModal({ onClose, onImported }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const fileRef = useRef();

  function handleFile(f) {
    if (!f) return;
    setFile(f);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const lines = e.target.result.split(/\r?\n/).filter(l => l.trim()).slice(0, 6);
      setPreview(lines);
    };
    reader.readAsText(f);
  }

  async function doImport() {
    if (!file) return;
    setImporting(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const { data } = await axios.post(`${API}/api/customers/import`, form, {
        headers: { ...authHeaders(), 'Content-Type': 'multipart/form-data' },
      });
      setResult(data);
      if (data.created > 0) {
        toast.success(`Imported ${data.created} customer${data.created > 1 ? 's' : ''}`);
        onImported?.();
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Import failed');
    } finally { setImporting(false); }
  }

  function downloadTemplate() {
    const blob = new Blob([TEMPLATE], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'lucred_import_template.csv';
    a.click();
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '2rem', width: '100%', maxWidth: 520, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0 }}>Import Customers from CSV</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, color: '#94a3b8', cursor: 'pointer', lineHeight: 1 }}>✕</button>
        </div>

        {!result ? (
          <>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16, lineHeight: 1.7 }}>
              Upload a CSV with columns: <strong>name</strong> (required), email, phone, bvn, address.
              <button onClick={downloadTemplate} style={{ background: 'none', border: 'none', color: '#0ea5e9', cursor: 'pointer', fontSize: 13, fontWeight: 600, marginLeft: 6 }}>
                ↓ Download template
              </button>
            </p>

            <div
              onClick={() => fileRef.current.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
              style={{
                border: `2px dashed ${file ? '#0ea5e9' : '#e2e8f0'}`,
                borderRadius: 12, padding: '2rem', textAlign: 'center', cursor: 'pointer',
                background: file ? '#f0f9ff' : '#f8fafc', marginBottom: 16, transition: 'all 0.15s',
              }}
            >
              <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }}
                onChange={e => handleFile(e.target.files[0])} />
              {file ? (
                <>
                  <div style={{ fontSize: 24, marginBottom: 6 }}>📄</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#0ea5e9' }}>{file.name}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{(file.size / 1024).toFixed(1)} KB</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 24, marginBottom: 6 }}>📁</div>
                  <div style={{ fontSize: 14, color: '#64748b' }}>Click to select or drag & drop a CSV file</div>
                </>
              )}
            </div>

            {preview && (
              <div style={{ marginBottom: 16, overflowX: 'auto' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Preview</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <tbody>
                    {preview.slice(0, 5).map((row, i) => (
                      <tr key={i} style={{ background: i === 0 ? '#f1f5f9' : 'transparent' }}>
                        {row.split(',').map((cell, j) => (
                          <td key={j} style={{ padding: '4px 8px', border: '1px solid #e2e8f0', color: i === 0 ? '#475569' : '#334155', fontWeight: i === 0 ? 700 : 400 }}>{cell.trim()}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {preview.length > 5 && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>…and more rows</div>}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={onClose} style={{ padding: '9px 18px', background: '#f1f5f9', color: '#334155', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={doImport} disabled={!file || importing}
                style={{ padding: '9px 18px', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: (!file || importing) ? 0.6 : 1 }}>
                {importing ? 'Importing…' : 'Import'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
              {[['Created', result.created, '#16a34a', '#dcfce7'], ['Skipped', result.skipped, '#f59e0b', '#fef9c3'], ['Errors', result.errors, '#dc2626', '#fee2e2']].map(([label, val, fg, bg]) => (
                <div key={label} style={{ flex: 1, background: bg, borderRadius: 10, padding: '12px 16px', textAlign: 'center', minWidth: 80 }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: fg }}>{val}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: fg }}>{label}</div>
                </div>
              ))}
            </div>

            {result.details?.skipped?.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b', marginBottom: 4 }}>Skipped (duplicates):</div>
                {result.details.skipped.map((r, i) => <div key={i} style={{ fontSize: 12, color: '#64748b' }}>Row {r.row}: {r.name}</div>)}
              </div>
            )}

            {result.details?.errors?.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#dc2626', marginBottom: 4 }}>Errors:</div>
                {result.details.errors.map((r, i) => <div key={i} style={{ fontSize: 12, color: '#64748b' }}>Row {r.row}: {r.reason}</div>)}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
              <button onClick={onClose} style={{ padding: '9px 18px', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Done</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
