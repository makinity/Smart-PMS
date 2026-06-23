import { useState, useRef, useEffect, useCallback } from 'react';
import { useForm, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { useToast } from '@/Components/Snackbar';
import axios from 'axios';

function useBreakpoint() {
    const [w, setW] = useState(() => window.innerWidth);
    useEffect(() => {
        const h = () => setW(window.innerWidth);
        window.addEventListener('resize', h);
        return () => window.removeEventListener('resize', h);
    }, []);
    return w >= 1024 ? 'desktop' : w >= 640 ? 'tablet' : 'mobile';
}

const STATUS_CFG = {
    success: { label: 'Success', bg: 'rgba(16,185,129,0.12)', color: '#10b981', border: 'rgba(16,185,129,0.3)' },
    failed:  { label: 'Failed',  bg: 'rgba(239,68,68,0.12)',  color: '#f87171', border: 'rgba(239,68,68,0.3)' },
    running: { label: 'Running', bg: 'rgba(59,130,246,0.12)', color: 'var(--admin-accent)', border: 'rgba(59,130,246,0.3)' },
};

function StatusPill({ status }) {
    const c = STATUS_CFG[status] ?? STATUS_CFG.running;
    return (
        <span style={{ padding: '0.2rem 0.65rem', borderRadius: 99, fontSize: '0.68rem', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.05em',
            background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>
            {c.label}
        </span>
    );
}

export default function Index({ logs: initialLogs, modelExists, lastTrained, rowCount, mlUrl: initialMlUrl }) {
    const toast   = useToast();
    const bp      = useBreakpoint();
    const isMobile = bp === 'mobile';
    const [tab, setTab]   = useState('train');
    const [logs, setLogs] = useState(initialLogs ?? []);
    const [headerStatus, setHeaderStatus] = useState(modelExists ? 'success' : 'failed');
    const [headerLastTrained, setHeaderLastTrained] = useState(lastTrained);
    const [headerRowCount, setHeaderRowCount]       = useState(rowCount);
    const [sqlLoading, setSqlLoading] = useState(false);
    const [dragging, setDragging]     = useState(false);
    const fileRef = useRef(null);

    const urlForm = useForm({ url: initialMlUrl ?? '' });
    function handleUrlSave(e) {
        e.preventDefault();
        urlForm.post('/administrator/ml/settings', {
            onSuccess: () => toast('ML API URL updated.', 'success'),
            onError:   () => toast('Invalid URL.', 'error'),
        });
    }

    const csvForm = useForm({ file: null });
    const pollLogs = useCallback(async () => {
        try {
            const { data } = await axios.get('/administrator/ml/logs');
            setLogs(data);
            // Sync header stats from logs
            const running = data.find(l => l.status === 'running');
            const latest  = data.find(l => l.status === 'success');
            if (running) {
                setHeaderStatus('running');
            } else if (latest) {
                setHeaderStatus('success');
                if (latest.trained_at) setHeaderLastTrained(latest.trained_at);
                if (latest.row_count)  setHeaderRowCount(latest.row_count);
            } else if (data.length > 0 && data[0].status === 'failed') {
                setHeaderStatus('failed');
            }
        } catch {}
    }, []);

    useEffect(() => {
        const hasRunning = logs.some(l => l.status === 'running');
        if (!hasRunning) return;
        const t = setInterval(pollLogs, 5000);
        return () => clearInterval(t);
    }, [logs, pollLogs]);

    function handleSqlTrain() {
        setSqlLoading(true);
        axios.post('/administrator/ml/train-sql')
            .then(() => { toast('SQL training started in background.', 'success'); pollLogs(); })
            .catch(() => toast('Failed to trigger SQL training.', 'error'))
            .finally(() => setSqlLoading(false));
    }

    function handleCsvSubmit(e) {
        e.preventDefault();
        if (!csvForm.data.file) return toast('Please select a CSV file.', 'error');
        csvForm.post('/administrator/ml/train-csv', {
            forceFormData: true,
            onSuccess: () => { toast('CSV training started in background.', 'success'); csvForm.reset(); pollLogs(); },
            onError:   () => toast('Failed to trigger CSV training.', 'error'),
        });
    }

    function handleDrop(e) {
        e.preventDefault(); setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file?.name.endsWith('.csv')) csvForm.setData('file', file);
        else toast('Only .csv files are accepted.', 'error');
    }

    const card = { background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)', borderRadius: 'var(--admin-radius)', padding: '1.25rem', boxShadow: 'var(--admin-shadow)' };
    const label = { fontSize: '0.7rem', color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.2rem' };
    const btnPrimary = { display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1.1rem', borderRadius: 10, border: 'none', background: 'var(--admin-accent)', color: '#fff', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' };
    const btnOutline = { ...btnPrimary, background: 'transparent', border: '1px solid var(--admin-border-strong)', color: 'var(--admin-text-primary)' };

    return (
        <AppLayout title="ML Control Center">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: '2rem' }}>

                {/* ── Header status bar ── */}
                <div style={{ ...card, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(59,130,246,0.1)', border: '1px solid var(--admin-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--admin-accent)', fontSize: '1.2rem', flexShrink: 0 }}>
                            <i className="bi bi-cpu-fill" />
                        </div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--admin-text-primary)' }}>ML Control Center</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>Random Forest · employee_performance_snapshots</div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        <div>
                            <div style={label}>Model Status</div>
                            <StatusPill status={headerStatus} />
                        </div>
                        <div>
                            <div style={label}>Last Trained</div>
                            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--admin-text-primary)' }}>
                                {headerLastTrained ? new Date(headerLastTrained).toLocaleString() : '—'}
                            </div>
                        </div>
                        <div>
                            <div style={label}>Dataset Rows</div>
                            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--admin-accent)' }}>{headerRowCount?.toLocaleString() ?? '—'}</div>
                        </div>
                    </div>
                </div>

                {/* ── ML API URL ── */}
                <div style={card}>
                    <form onSubmit={handleUrlSave} style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.6rem' }}>
                        <i className="bi bi-link-45deg" style={{ color: 'var(--admin-accent)', fontSize: '1rem', flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 220 }}>
                            <div style={{ ...label, marginBottom: '0.25rem' }}>ML API URL</div>
                            <input
                                type="url"
                                value={urlForm.data.url}
                                onChange={e => urlForm.setData('url', e.target.value)}
                                placeholder="http://127.0.0.1:8000"
                                style={{
                                    width: '100%', padding: '0.45rem 0.75rem', borderRadius: 8,
                                    border: '1px solid var(--admin-border-strong)',
                                    background: 'var(--admin-bg-secondary)',
                                    color: 'var(--admin-text-primary)', fontSize: '0.85rem',
                                    fontFamily: 'monospace',
                                }}
                            />
                            {urlForm.errors.url && <div style={{ color: '#f87171', fontSize: '0.75rem', marginTop: '0.25rem' }}>{urlForm.errors.url}</div>}
                        </div>
                        <button type="submit" disabled={urlForm.processing} style={{ ...btnPrimary, alignSelf: 'flex-end', marginLeft: 'auto', opacity: urlForm.processing ? 0.7 : 1 }}>
                            <i className="bi bi-floppy-fill" /> Save
                        </button>
                    </form>
                </div>

                {/* ── Tabs ── */}
                <div style={{ display: 'flex', gap: '0.35rem', borderBottom: '1px solid var(--admin-border)' }}>
                    {[['train', 'bi-lightning-charge-fill', 'Train Model'], ['logs', 'bi-clock-history', 'Training Logs']].map(([key, icon, lbl]) => (
                        <button key={key} onClick={() => setTab(key)} style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                            padding: '0.6rem 1rem', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
                            background: 'none', border: 'none', borderBottom: `2px solid ${tab === key ? 'var(--admin-accent)' : 'transparent'}`,
                            color: tab === key ? 'var(--admin-accent)' : 'var(--admin-text-muted)',
                            marginBottom: '-1px', transition: 'color 0.15s',
                        }}>
                            <i className={`bi ${icon}`} />
                            {!isMobile && lbl}
                        </button>
                    ))}
                </div>

                {/* ── Tab: Train ── */}
                {tab === 'train' && (
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1rem' }}>

                        {/* SQL Sync card */}
                        <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--admin-accent)', flexShrink: 0 }}>
                                    <i className="bi bi-database-fill" />
                                </div>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--admin-text-primary)' }}>Live SQL Sync</div>
                                    <div style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)' }}>Pull from employee_performance_snapshots</div>
                                </div>
                            </div>
                            <div style={{ background: 'var(--admin-bg-secondary)', borderRadius: 8, padding: '0.75rem 1rem', fontSize: '0.8rem', color: 'var(--admin-text-secondary)' }}>
                                Will use all <strong style={{ color: 'var(--admin-accent)' }}>{rowCount?.toLocaleString()}</strong> rows from the live production dataset. No upload required.
                            </div>
                            <button onClick={handleSqlTrain} disabled={sqlLoading} style={{ ...btnPrimary, justifyContent: 'center', opacity: sqlLoading ? 0.7 : 1 }}>
                                {sqlLoading
                                    ? <><i className="bi bi-arrow-repeat" style={{ animation: 'ml-spin 0.7s linear infinite' }} /> Training…</>
                                    : <><i className="bi bi-lightning-charge-fill" /> Pull & Retrain</>}
                            </button>
                        </div>

                        {/* CSV Upload card */}
                        <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', flexShrink: 0 }}>
                                    <i className="bi bi-file-earmark-spreadsheet-fill" />
                                </div>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--admin-text-primary)' }}>CSV Upload</div>
                                    <div style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)' }}>Upload a custom dataset for retraining</div>
                                </div>
                            </div>
                            <form onSubmit={handleCsvSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <div
                                    onDragOver={e => { e.preventDefault(); setDragging(true); }}
                                    onDragLeave={() => setDragging(false)}
                                    onDrop={handleDrop}
                                    onClick={() => fileRef.current?.click()}
                                    style={{
                                        border: `2px dashed ${dragging ? 'var(--admin-accent)' : 'var(--admin-border-strong)'}`,
                                        borderRadius: 10, padding: '1.5rem 1rem', textAlign: 'center',
                                        cursor: 'pointer', transition: 'border-color 0.15s',
                                        background: dragging ? 'rgba(59,130,246,0.05)' : 'var(--admin-bg-secondary)',
                                    }}>
                                    <i className="bi bi-cloud-upload" style={{ fontSize: '1.5rem', color: 'var(--admin-text-muted)', display: 'block', marginBottom: '0.4rem' }} />
                                    <div style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)' }}>
                                        {csvForm.data.file
                                            ? <span style={{ color: 'var(--admin-accent)', fontWeight: 600 }}>{csvForm.data.file.name}</span>
                                            : <><strong>Click or drag</strong> a .csv file here</>}
                                    </div>
                                    <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }}
                                        onChange={e => csvForm.setData('file', e.target.files[0])} />
                                </div>
                                <button type="submit" disabled={csvForm.processing || !csvForm.data.file}
                                    style={{ ...btnPrimary, justifyContent: 'center', background: '#10b981', opacity: (csvForm.processing || !csvForm.data.file) ? 0.6 : 1 }}>
                                    {csvForm.processing
                                        ? <><i className="bi bi-arrow-repeat" style={{ animation: 'ml-spin 0.7s linear infinite' }} /> Uploading…</>
                                        : <><i className="bi bi-upload" /> Upload & Retrain</>}
                                </button>
            </form>
                        </div>
                    </div>
                )}

                {/* ── Tab: Logs ── */}
                {tab === 'logs' && (
                    <div style={card}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--admin-text-primary)' }}>Training History</div>
                            <button onClick={pollLogs} style={{ ...btnOutline, padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}>
                                <i className="bi bi-arrow-clockwise" /> Refresh
                            </button>
                        </div>

                        {logs.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--admin-text-muted)', fontSize: '0.85rem' }}>
                                <i className="bi bi-clock-history" style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.5rem', opacity: 0.4 }} />
                                No training runs yet.
                            </div>
                        ) : isMobile ? (
                            /* Mobile: card list */
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                                {logs.map(log => (
                                    <div key={log.id} style={{ background: 'var(--admin-bg-secondary)', borderRadius: 10, padding: '0.85rem 1rem', border: '1px solid var(--admin-border)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                                            <StatusPill status={log.status} />
                                            <span style={{ fontSize: '0.7rem', color: 'var(--admin-text-muted)' }}>{log.trained_at ? new Date(log.trained_at).toLocaleString() : '—'}</span>
                                        </div>
                                        <div style={{ fontSize: '0.82rem', color: 'var(--admin-text-primary)', fontWeight: 600 }}>
                                            {log.source_type === 'sql' ? '🗄 SQL Sync' : '📄 CSV Upload'}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)', marginTop: '0.2rem' }}>
                                            {log.row_count ? `${log.row_count.toLocaleString()} rows` : '—'}
                                            {log.target_column && ` · target: ${log.target_column}`}
                                        </div>
                                        {log.error_message && (
                                            <div style={{ fontSize: '0.72rem', color: '#f87171', marginTop: '0.35rem', background: 'rgba(239,68,68,0.08)', borderRadius: 6, padding: '0.35rem 0.5rem' }}>{log.error_message}</div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            /* Desktop/tablet: table */
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                                            {['Date / Time', 'Source', 'Status', 'Rows', 'Target Column', 'Error'].map(h => (
                                                <th key={h} style={{ padding: '0.5rem 0.75rem', textAlign: 'left', fontSize: '0.68rem', fontWeight: 700, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {logs.map(log => (
                                            <tr key={log.id} style={{ borderBottom: '1px solid var(--admin-border)' }}>
                                                <td style={{ padding: '0.65rem 0.75rem', color: 'var(--admin-text-secondary)', whiteSpace: 'nowrap' }}>{log.trained_at ? new Date(log.trained_at).toLocaleString() : '—'}</td>
                                                <td style={{ padding: '0.65rem 0.75rem', fontWeight: 600, color: 'var(--admin-text-primary)' }}>{log.source_type === 'sql' ? '🗄 SQL Sync' : '📄 CSV Upload'}</td>
                                                <td style={{ padding: '0.65rem 0.75rem' }}><StatusPill status={log.status} /></td>
                                                <td style={{ padding: '0.65rem 0.75rem', color: 'var(--admin-accent)' }}>{log.row_count?.toLocaleString() ?? '—'}</td>
                                                <td style={{ padding: '0.65rem 0.75rem', color: 'var(--admin-text-muted)', fontFamily: 'monospace', fontSize: '0.75rem' }}>{log.target_column ?? '—'}</td>
                                                <td style={{ padding: '0.65rem 0.75rem', color: '#f87171', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.error_message ?? ''}>{log.error_message ?? '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <style>{`@keyframes ml-spin { to { transform: rotate(360deg); } }`}</style>
        </AppLayout>
    );
}
