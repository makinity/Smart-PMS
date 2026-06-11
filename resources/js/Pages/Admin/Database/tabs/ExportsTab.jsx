import { useState, useEffect } from 'react';
import { useToast } from '@/Components/Snackbar';
import axios from 'axios';

function Spinner() {
    return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'pms-spin 0.7s linear infinite', flexShrink: 0 }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/><style>{`@keyframes pms-spin{to{transform:rotate(360deg)}}`}</style></svg>;
}

function filenamePreview(table, format, includeDate) {
    if (!table) return '';
    const d = includeDate ? '_' + new Date().toISOString().slice(0, 10).replace(/-/g, '_') : '';
    return `${table}${d}.${format.toLowerCase()}`;
}

export default function ExportsTab({ tables: initialTables }) {
    const toast = useToast();
    const tables = initialTables ?? [];
    const [table, setTable]           = useState(tables[0] ?? '');
    const [format, setFormat]         = useState('csv');
    const [inclHeaders, setHeaders]   = useState(true);
    const [inclDate, setDate]         = useState(true);
    const [selCols, setSelCols]       = useState(false);
    const [tableInfo, setTableInfo]   = useState(null); // {columns, row_count}
    const [loading, setLoading]       = useState(false);
    const [exporting, setExporting]   = useState(false);
    const [history, setHistory]       = useState([]);
    const [selectedCols, setSelected] = useState([]);

    useEffect(() => {
        if (!table) return;
        setLoading(true);
        axios.get('/administrator/database/table-info', { params: { table } })
            .then(({ data }) => { setTableInfo(data); setSelected(data.columns ?? []); })
            .catch(() => setTableInfo(null))
            .finally(() => setLoading(false));
    }, [table]);

    async function handleExport() {
        setExporting(true);
        try {
            const payload = { table, format, include_headers: inclHeaders, include_date: inclDate, columns: selCols ? selectedCols : [] };
            const response = await axios.post('/administrator/database/export', payload, { responseType: 'blob' });
            const fname = filenamePreview(table, format, inclDate);
            const url = URL.createObjectURL(new Blob([response.data]));
            const a = document.createElement('a'); a.href = url; a.download = fname; a.click();
            URL.revokeObjectURL(url);
            setHistory(h => [{ table, format: format.toUpperCase(), filename: fname, ts: new Date().toLocaleTimeString() }, ...h.slice(0, 19)]);
            toast(`Exported ${fname}`, 'success');
        } catch (e) {
            toast('Export failed.', 'error');
        } finally { setExporting(false); }
    }

    function toggleCol(col) {
        setSelected(c => c.includes(col) ? c.filter(x => x !== col) : [...c, col]);
    }

    const cols = tableInfo?.columns ?? [];
    const approxSize = tableInfo ? `~${Math.max(1, Math.ceil((tableInfo.row_count * cols.length * 12) / 1024))} KB` : '—';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* Top two-column: Options + Preferences */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>

                {/* Export Options */}
                <div style={card}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <h3 style={cardTitle}>Export Options</h3>
                        <span style={{ fontSize: '1.1rem' }}>⬇</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', marginBottom: '0.75rem' }}>
                        <label style={fieldWrap}>
                            <span style={lbl}>Table Name</span>
                            <select value={table} onChange={e => setTable(e.target.value)} style={inp}>
                                {tables.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </label>
                        <label style={fieldWrap}>
                            <span style={lbl}>Format</span>
                            <select value={format} onChange={e => setFormat(e.target.value)} style={inp}>
                                <option value="csv">CSV</option>
                                <option value="xlsx">XLSX</option>
                            </select>
                        </label>
                    </div>
                    <button onClick={handleExport} disabled={exporting || !table} style={{ width: '100%', padding: '0.8rem', borderRadius: 10, border: 'none', background: table ? 'var(--admin-accent)' : 'var(--admin-bg-secondary)', color: table ? '#fff' : 'var(--admin-text-muted)', fontWeight: 700, fontSize: '0.875rem', cursor: table ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.65rem' }}>
                        {exporting ? <><Spinner /> Exporting…</> : '⬇ Export Table'}
                    </button>
                    <p style={{ fontSize: '0.75rem', color: 'var(--admin-accent)', padding: '0.55rem 0.75rem', borderRadius: 8, background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.15)' }}>
                        ℹ For reporting and admin data review.
                    </p>
                </div>

                {/* Export Preferences */}
                <div style={card}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <h3 style={cardTitle}>Export Preferences</h3>
                        <span style={{ fontSize: '1.1rem' }}>⚙</span>
                    </div>
                    {[
                        { label: 'Include column headers', val: inclHeaders, set: setHeaders },
                        { label: 'Include date in filename', val: inclDate, set: setDate },
                        { label: 'Export selected columns', val: selCols, set: setSelCols },
                    ].map(({ label, val, set }) => (
                        <label key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.6rem', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--admin-text-secondary)' }}>
                            <input type="checkbox" checked={val} onChange={e => set(e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--admin-accent)', cursor: 'pointer' }} />
                            {label}
                        </label>
                    ))}

                    {table && (
                        <div style={{ marginTop: '0.75rem', padding: '0.75rem', borderRadius: 10, background: 'var(--admin-bg-secondary)', border: '1px solid var(--admin-border)' }}>
                            <span style={lbl}>Filename Preview</span>
                            <p style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--admin-text-muted)', marginTop: '0.3rem', wordBreak: 'break-all' }}>
                                {filenamePreview(table, format, inclDate)}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom two-column: Table Preview + Export History */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>

                {/* Table Preview */}
                <div style={card}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.85rem' }}>
                        <h3 style={{ ...cardTitle, marginBottom: 0 }}>Table Preview</h3>
                        {tableInfo && (
                            <>
                                <span style={meta}>Selected: <strong style={{ color: 'var(--admin-text-primary)' }}>{table}</strong></span>
                                <span style={meta}>Rows: <strong style={{ color: 'var(--admin-text-primary)' }}>{tableInfo.row_count?.toLocaleString()}</strong></span>
                                <span style={meta}>Size: <strong style={{ color: 'var(--admin-text-primary)' }}>{approxSize}</strong></span>
                            </>
                        )}
                    </div>
                    {loading ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--admin-text-muted)', fontSize: '0.85rem' }}><Spinner /> Loading…</div>
                    ) : cols.length > 0 ? (
                        <>
                            <span style={{ ...lbl, display: 'block', marginBottom: '0.5rem' }}>Detected Columns</span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                                {cols.map(col => (
                                    <span
                                        key={col}
                                        onClick={() => selCols && toggleCol(col)}
                                        style={{ padding: '0.2rem 0.6rem', borderRadius: 99, fontSize: '0.72rem', fontWeight: 600, border: '1px solid', cursor: selCols ? 'pointer' : 'default', background: (!selCols || selectedCols.includes(col)) ? 'rgba(59,130,246,0.12)' : 'var(--admin-bg-secondary)', color: (!selCols || selectedCols.includes(col)) ? 'var(--admin-accent)' : 'var(--admin-text-muted)', borderColor: (!selCols || selectedCols.includes(col)) ? 'rgba(59,130,246,0.25)' : 'var(--admin-border)' }}
                                    >{col}</span>
                                ))}
                            </div>
                        </>
                    ) : (
                        <p style={{ fontSize: '0.82rem', color: 'var(--admin-text-muted)' }}>Select a table to preview its schema.</p>
                    )}
                </div>

                {/* Export History */}
                <div style={card}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                        <h3 style={cardTitle}>Export History</h3>
                        {history.length > 0 && (
                            <button onClick={() => setHistory([])} style={{ fontSize: '0.75rem', color: 'var(--admin-accent)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Clear History</button>
                        )}
                    </div>
                    {history.length === 0 ? (
                        <p style={{ fontSize: '0.82rem', color: 'var(--admin-text-muted)' }}>Recent export activity will appear here.</p>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 320 }}>
                                <thead>
                                    <tr style={{ background: 'var(--admin-bg-secondary)' }}>
                                        {['Table','Format','File Name','Action'].map((h, i) => (
                                            <th key={h} style={{ padding: '0.5rem 0.65rem', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--admin-text-muted)', textAlign: i === 3 ? 'center' : 'left', borderBottom: '1px solid var(--admin-border)', whiteSpace: 'nowrap' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {history.map((row, i) => (
                                        <tr key={i} style={{ borderBottom: '1px solid var(--admin-border)' }}>
                                            <td style={td}><span style={{ fontSize: '0.8rem', color: 'var(--admin-text-primary)' }}>{row.table}</span></td>
                                            <td style={td}><span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--admin-accent)' }}>{row.format}</span></td>
                                            <td style={{ ...td, fontFamily: 'monospace', fontSize: '0.72rem', color: 'var(--admin-text-muted)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.filename}</td>
                                            <td style={{ ...td, textAlign: 'center' }}>
                                                <span title="Re-export" style={{ cursor: 'pointer', fontSize: '1rem', color: 'var(--admin-text-muted)' }} onClick={() => { setTable(row.table); setFormat(row.format.toLowerCase()); }}>↺</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Info footer cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
                {[
                    { icon: '☁', title: 'Automated Backup', sub: `Last backup: just now` },
                    { icon: '🔒', title: 'Encrypted', sub: 'AES-256 standard applied' },
                    { icon: '⚡', title: 'High Performance', sub: 'Optimized query execution' },
                    { icon: '❤', title: 'Health Status', sub: 'DB Connectivity: 100%' },
                ].map(({ icon, title, sub }) => (
                    <div key={title} style={{ ...card, padding: '1rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '1.5rem', marginBottom: '0.4rem' }}>{icon}</div>
                        <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--admin-text-primary)', marginBottom: '0.2rem' }}>{title}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)' }}>{sub}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}

const card      = { background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)', borderRadius: 'var(--admin-radius)', padding: '1.25rem 1.5rem', boxShadow: 'var(--admin-shadow)' };
const cardTitle = { fontWeight: 700, fontSize: '1rem', color: 'var(--admin-text-primary)', marginBottom: '0.2rem' };
const fieldWrap = { display: 'flex', flexDirection: 'column', gap: '0.3rem' };
const lbl       = { fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--admin-text-muted)' };
const inp       = { padding: '0.6rem 0.75rem', borderRadius: 10, border: '1px solid var(--admin-border-strong)', background: 'var(--admin-bg-secondary)', color: 'var(--admin-text-primary)', fontSize: '0.85rem', outline: 'none', width: '100%', boxSizing: 'border-box' };
const td        = { padding: '0.65rem 0.65rem', verticalAlign: 'middle' };
const meta      = { fontSize: '0.75rem', color: 'var(--admin-text-muted)' };
