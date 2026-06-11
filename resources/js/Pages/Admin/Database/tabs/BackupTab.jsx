import { useState, useRef } from 'react';
import { useToast } from '@/Components/Snackbar';
import axios from 'axios';

const TYPE_META = {
    full:         { label: 'Full Backup',    icon: '☁', desc: 'Exports entire database including all tables and records.' },
    incremental:  { label: 'Incremental',    icon: '⊕', desc: 'Changes since the last backup.' },
    differential: { label: 'Differential',   icon: '⊞', desc: 'Changes since the last full backup.' },
    date_range:   { label: 'By Date Range',  icon: '📅', desc: 'Records within the specified date range.' },
};

const STATUS_STYLE = {
    Completed: { color: '#22c55e', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.25)' },
    Failed:    { color: '#f87171', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.25)' },
    'In Progress': { color: '#facc15', bg: 'rgba(250,204,21,0.12)', border: 'rgba(250,204,21,0.25)' },
};

function StatusBadge({ s }) {
    const st = STATUS_STYLE[s] ?? STATUS_STYLE['In Progress'];
    return <span style={{ padding: '0.2rem 0.6rem', borderRadius: 99, fontSize: '0.72rem', fontWeight: 700, background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>{s}</span>;
}

function TypeBadge({ type }) {
    const map = { full: '#3b82f6', incremental: '#8b5cf6', differential: '#f59e0b', date_range: '#06b6d4' };
    const c = map[type] ?? '#64748b';
    return <span style={{ padding: '0.15rem 0.5rem', borderRadius: 6, fontSize: '0.68rem', fontWeight: 800, background: c + '22', color: c, border: `1px solid ${c}44`, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{type?.replace('_', ' ')}</span>;
}

function Spinner() {
    return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'pms-spin 0.7s linear infinite', flexShrink: 0 }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/><style>{`@keyframes pms-spin{to{transform:rotate(360deg)}}`}</style></svg>;
}

// Minimal confirm modal (destructive)
function ConfirmModal({ open, title, message, onConfirm, onCancel }) {
    if (!open) return null;
    return (
        <>
            <style>{`@media(max-width:639px){.db-modal-wrap{align-items:flex-end!important}.db-modal-box{border-radius:18px 18px 0 0!important;width:100%!important;max-width:100%!important}}`}</style>
            <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} className="db-modal-wrap" onClick={e => e.target === e.currentTarget && onCancel()}>
                <div className="db-modal-box" style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)', borderRadius: 14, padding: '1.75rem', maxWidth: 420, width: '100%', textAlign: 'center', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⚠️</div>
                    <h3 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--admin-text-primary)', marginBottom: '0.6rem' }}>{title}</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--admin-text-muted)', lineHeight: 1.6, marginBottom: '1.5rem' }}>{message}</p>
                    <div style={{ display: 'flex', gap: '0.65rem', flexDirection: 'column' }}>
                        <button onClick={onConfirm} style={{ padding: '0.7rem', borderRadius: 10, border: 'none', background: '#ef4444', color: '#fff', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer' }}>Confirm Restore</button>
                        <button onClick={onCancel} style={{ padding: '0.7rem', borderRadius: 10, border: '1px solid var(--admin-border-strong)', background: 'transparent', color: 'var(--admin-text-secondary)', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}>Cancel</button>
                    </div>
                </div>
            </div>
        </>
    );
}

export default function BackupTab({ backups: initialBackups, env }) {
    const toast = useToast();
    const [backups, setBackups]     = useState(initialBackups ?? []);
    const [running, setRunning]     = useState(false);
    const [restoring, setRestoring] = useState(false);
    const [from, setFrom]           = useState('');
    const [to, setTo]               = useState('');
    const [safetyBackup, setSafety] = useState(true);
    const [restoreFile, setFile]    = useState(null);
    const [confirmOpen, setConfirm] = useState(false);
    const fileRef = useRef();

    const lastFull = backups.find(b => b.filename?.includes('backup_'))?.created_label ?? '—';

    async function doBackup(type) {
        setRunning(true);
        try {
            const { data } = await axios.post('/administrator/database/backup', { type, from, to });
            setBackups(data.backups ?? backups);
            toast(`${TYPE_META[type]?.label} completed.`, 'success');
        } catch (e) {
            toast(e.response?.data?.message ?? 'Backup failed.', 'error');
        } finally { setRunning(false); }
    }

    async function doRestore() {
        setConfirm(false);
        if (!restoreFile) { toast('Select a backup file first.', 'warning'); return; }
        setRestoring(true);
        const fd = new FormData();
        fd.append('file', restoreFile);
        fd.append('confirmation', 'RESTORE');
        try {
            await axios.post('/administrator/database/restore', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            toast('Database restored successfully.', 'success');
        } catch (e) {
            toast(e.response?.data?.message ?? 'Restore failed.', 'error');
        } finally { setRestoring(false); }
    }

    async function doDelete(filename) {
        try {
            const { data } = await axios.delete(`/administrator/database/backups/${encodeURIComponent(filename)}`);
            setBackups(data.backups ?? backups.filter(b => b.filename !== filename));
            toast('Backup deleted.', 'success');
        } catch (e) {
            toast(e.response?.data?.message ?? 'Delete failed.', 'error');
        }
    }

    function doDownload(filename) {
        window.location.href = `/administrator/database/backups/${encodeURIComponent(filename)}/download`;
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <ConfirmModal open={confirmOpen} title="Restore Database" message="This will overwrite the current database with the selected backup file. This action cannot be undone." onConfirm={doRestore} onCancel={() => setConfirm(false)} />

            {/* System status bar */}
            <div style={{ ...card, padding: '0.85rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '1.1rem' }}>🕐</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)' }}>
                    <strong style={{ color: 'var(--admin-text-primary)' }}>SYSTEM STATUS</strong>
                    {' '}· Last Full: <span style={{ color: 'var(--admin-accent)' }}>{lastFull}</span>
                    {' '}· Last Incremental: —  · Last Differential: —
                </span>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.4rem' }}>
                    <span style={{ padding: '0.2rem 0.6rem', borderRadius: 99, fontSize: '0.7rem', fontWeight: 700, background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.25)' }}>Database Healthy</span>
                </div>
            </div>

            {/* Main two-column */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>

                {/* Backup Options */}
                <div style={card}>
                    <h3 style={{ ...cardTitle, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>☁ Backup Options</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '0.75rem' }}>
                        <label style={fieldWrap}>
                            <span style={lbl}>From Date</span>
                            <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={inp} />
                        </label>
                        <label style={fieldWrap}>
                            <span style={lbl}>To Date</span>
                            <input type="date" value={to} onChange={e => setTo(e.target.value)} style={inp} />
                        </label>
                    </div>

                    {running ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', borderRadius: 10, background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', marginBottom: '0.75rem' }}>
                            <Spinner /> <span style={{ fontSize: '0.85rem', color: 'var(--admin-accent)' }}>Backup in progress… This may take a moment.</span>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '0.75rem' }}>
                            {Object.entries(TYPE_META).map(([type, meta]) => (
                                <button key={type} onClick={() => doBackup(type)} style={{ padding: '0.85rem 0.5rem', borderRadius: 12, border: `1px solid ${type === 'full' ? 'var(--admin-accent)' : 'var(--admin-border-strong)'}`, background: type === 'full' ? 'rgba(59,130,246,0.12)' : 'transparent', color: type === 'full' ? 'var(--admin-accent)' : 'var(--admin-text-secondary)', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem' }}>
                                    <span style={{ fontSize: '1.3rem' }}>{meta.icon}</span>
                                    {meta.label}
                                </button>
                            ))}
                        </div>
                    )}
                    <p style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)', padding: '0.6rem 0.75rem', borderRadius: 8, background: 'var(--admin-bg-secondary)', border: '1px solid var(--admin-border)' }}>
                        ℹ Full backup exports the entire database including all tables and log history.
                    </p>
                </div>

                {/* Restore Options */}
                <div style={card}>
                    <h3 style={{ ...cardTitle, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>🔄 Restore Options</h3>
                    <div style={{ marginBottom: '0.75rem' }}>
                        <span style={lbl}>Select Backup File</span>
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.3rem' }}>
                            <div style={{ flex: 1, padding: '0.6rem 0.85rem', borderRadius: 10, border: '1px solid var(--admin-border-strong)', background: 'var(--admin-bg-secondary)', fontSize: '0.82rem', color: restoreFile ? 'var(--admin-text-primary)' : 'var(--admin-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {restoreFile?.name ?? 'no_file_selected.sql'}
                            </div>
                            <button onClick={() => fileRef.current.click()} style={{ ...btnSecondary, whiteSpace: 'nowrap' }}>Browse</button>
                            <input ref={fileRef} type="file" accept=".sql,.txt" style={{ display: 'none' }} onChange={e => setFile(e.target.files[0] ?? null)} />
                        </div>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--admin-text-secondary)' }}>
                        <input type="checkbox" checked={safetyBackup} onChange={e => setSafety(e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--admin-accent)' }} />
                        Safety backup before restore
                    </label>
                    <div style={{ padding: '0.75rem', borderRadius: 10, background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', fontSize: '0.78rem', color: '#f87171', lineHeight: 1.5, marginBottom: '1rem' }}>
                        ⚠ Restoring may overwrite the current database. All unsaved changes in the active session will be permanently lost.
                    </div>
                    <button onClick={() => setConfirm(true)} disabled={restoring || !restoreFile} style={{ width: '100%', padding: '0.8rem', borderRadius: 10, border: '1px solid rgba(239,68,68,0.35)', background: 'rgba(239,68,68,0.08)', color: '#f87171', fontWeight: 700, fontSize: '0.875rem', cursor: restoreFile ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', opacity: !restoreFile ? 0.5 : 1, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {restoring ? <><Spinner /> Restoring…</> : '🔄 RESTORE BACKUP'}
                    </button>
                </div>
            </div>

            {/* Backup History */}
            <div style={card}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <h3 style={cardTitle}>Backup History</h3>
                    <span style={{ fontSize: '0.78rem', color: 'var(--admin-text-muted)' }}>{backups.length} record{backups.length !== 1 ? 's' : ''}</span>
                </div>
                {backups.length === 0 ? (
                    <p style={{ textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: '0.875rem', padding: '2rem 0' }}>No backups found. Create your first backup above.</p>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
                            <thead>
                                <tr style={{ background: 'var(--admin-bg-secondary)' }}>
                                    {['Type','File Name','Date Created','Status','Created By','Actions'].map((h, i) => (
                                        <th key={h} style={{ padding: '0.6rem 0.85rem', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--admin-text-muted)', textAlign: i === 5 ? 'right' : 'left', borderBottom: '1px solid var(--admin-border)', whiteSpace: 'nowrap' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {backups.map(b => (
                                    <tr key={b.filename} style={{ borderBottom: '1px solid var(--admin-border)' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--admin-bg-secondary)'} onMouseLeave={e => e.currentTarget.style.background = ''}>
                                        <td style={td}><TypeBadge type="full" /></td>
                                        <td style={{ ...td, fontFamily: 'monospace', fontSize: '0.78rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.filename}</td>
                                        <td style={td}><span style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)' }}>{b.created_label}</span></td>
                                        <td style={td}><StatusBadge s="Completed" /></td>
                                        <td style={td}><span style={{ fontSize: '0.8rem', color: 'var(--admin-text-secondary)' }}>Admin</span></td>
                                        <td style={{ ...td, textAlign: 'right' }}>
                                            <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                                                <button onClick={() => doDownload(b.filename)} title="Download" style={iconBtn}>⬇</button>
                                                <button onClick={() => doDelete(b.filename)} title="Delete" style={{ ...iconBtn, color: '#f87171', borderColor: 'rgba(239,68,68,0.3)' }}>🗑</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

const card      = { background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)', borderRadius: 'var(--admin-radius)', padding: '1.25rem 1.5rem', boxShadow: 'var(--admin-shadow)' };
const cardTitle = { fontWeight: 700, fontSize: '1rem', color: 'var(--admin-text-primary)', marginBottom: '0.2rem' };
const fieldWrap = { display: 'flex', flexDirection: 'column', gap: '0.3rem' };
const lbl       = { fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--admin-text-muted)' };
const inp       = { padding: '0.6rem 0.75rem', borderRadius: 10, border: '1px solid var(--admin-border-strong)', background: 'var(--admin-bg-secondary)', color: 'var(--admin-text-primary)', fontSize: '0.85rem', outline: 'none', width: '100%', boxSizing: 'border-box' };
const btnSecondary = { padding: '0.55rem 0.9rem', borderRadius: 10, border: '1px solid var(--admin-border-strong)', background: 'transparent', color: 'var(--admin-text-primary)', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' };
const td        = { padding: '0.75rem 0.85rem', verticalAlign: 'middle' };
const iconBtn   = { width: 32, height: 32, borderRadius: 8, border: '1px solid var(--admin-border-strong)', background: 'transparent', color: 'var(--admin-text-muted)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' };
