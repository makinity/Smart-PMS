import React, { useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { Head } from '@inertiajs/react';

const PILLAR_CFG = {
    rsp: { label: 'RSP', full: 'Recruitment, Selection & Placement', icon: 'bi-people-fill', color: '#3b82f6', desc: 'Employee records sync from HRIS/HMS' },
    pms: { label: 'PMS', full: 'Performance Management System',     icon: 'bi-bar-chart-fill', color: '#10b981', desc: 'UWP → OPCR → IPCR → MPOR → QAR' },
    rnr: { label: 'RNR', full: 'Rewards & Recognition',              icon: 'bi-award-fill',    color: '#f59e0b', desc: 'Awards and recognition tracking' },
    ld:  { label: 'L&D', full: 'Learning & Development',              icon: 'bi-book-fill',     color: '#8b5cf6', desc: 'Training and development programs' },
};

function SidePanel({ pillar, connection, onClose }) {
    const cfg = PILLAR_CFG[pillar];
    const [form, setForm] = useState({ base_url: connection?.base_url || '', token: '' });
    const [loading, setLoading] = useState(false);
    const [testing, setTesting] = useState(false);
    const [message, setMessage] = useState(null);
    const isConnected = connection?.status === 'connected';
    const isBuiltIn   = connection?.status === 'built_in';
    const isPending   = connection?.status === 'pending_acceptance';
    const isRejected  = connection?.status === 'rejected';

    function handleConnect(e) {
        e.preventDefault();
        setLoading(true);
        setMessage(null);
        router.post('/administrator/hrmo-hub/connect', { pillar, ...form }, {
            preserveScroll: true,
            onSuccess: () => { setMessage({ type: 'success', text: `${cfg.label} connected successfully!` }); },
            onError: (errors) => setMessage({ type: 'error', text: Object.values(errors).flat().join(', ') }),
            onFinish: () => setLoading(false),
        });
    }

    function handleDisconnect() {
        router.post('/administrator/hrmo-hub/disconnect', { pillar }, {
            preserveScroll: true,
            onSuccess: () => { setMessage({ type: 'success', text: `${cfg.label} disconnected.` }); setForm({ base_url: '', token: '' }); },
        });
    }

    function handleTest() {
        setTesting(true);
        router.post('/administrator/hrmo-hub/test', { pillar }, {
            preserveScroll: true,
            onSuccess: () => setMessage({ type: 'success', text: 'Connection test passed!' }),
            onError: (errors) => setMessage({ type: 'error', text: Object.values(errors).flat().join(', ') }),
            onFinish: () => setTesting(false),
        });
    }

    function handleSync(e) {
        e.preventDefault();
        setLoading(true);
        setMessage(null);
        router.post('/administrator/hris/sync', { pillar, base_url: form.base_url, token: form.token }, {
            preserveScroll: true,
            onSuccess: () => setMessage({ type: 'success', text: 'Sync completed!' }),
            onError: (errors) => setMessage({ type: 'error', text: Object.values(errors).flat().join(', ') }),
            onFinish: () => setLoading(false),
        });
    }

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }}>
            {/* Backdrop */}
            <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(2px)' }} />

            {/* Panel */}
            <div style={{
                position: 'relative', width: '100%', maxWidth: 440, height: '100%',
                background: 'var(--admin-card)', borderLeft: '1px solid var(--admin-border-strong)',
                boxShadow: '-8px 0 30px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column',
                animation: 'slideIn 0.2s ease-out',
            }}>
                {/* Header */}
                <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--admin-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: `${cfg.color}12`, border: `1px solid ${cfg.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: cfg.color }}>
                            <i className={`bi ${cfg.icon}`} style={{ fontSize: '1.1rem' }} />
                        </div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--admin-text-primary)' }}>{cfg.full}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)', marginTop: 2 }}>{cfg.desc}</div>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-muted)', fontSize: '1.3rem', padding: 4, lineHeight: 1 }}>×</button>
                </div>

                {/* Body */}
                <div style={{ flex: 1, overflow: 'auto', padding: '1.25rem 1.5rem' }}>
                    {/* Status */}
                    {isBuiltIn ? (
                        <div style={{ padding: '1rem', borderRadius: 12, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)', marginBottom: '1.25rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.85rem', color: '#22c55e' }}>
                                <i className="bi bi-check-circle-fill" /> Built-in System
                            </div>
                            <p style={{ fontSize: '0.78rem', color: 'var(--admin-text-muted)', marginTop: '0.5rem', lineHeight: 1.5 }}>
                                This is the core PMS module. No external connection needed — it runs directly within Smart PMS.
                            </p>
                            <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--admin-text-secondary)', lineHeight: 1.6 }}>
                                <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Workflow:</div>
                                <div>UWP → OPCR → IPCR → MPOR → QAR</div>
                            </div>
                        </div>
                    ) : isConnected ? (
                        <div style={{ padding: '1rem', borderRadius: 12, background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', marginBottom: '1.25rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.85rem', color: 'var(--admin-accent)' }}>
                                <i className="bi bi-check-circle-fill" /> Connected
                            </div>
                            {connection?.last_sync_at && (
                                <div style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)', marginTop: '0.35rem' }}>
                                    Last sync: {connection.last_sync_at}
                                </div>
                            )}
                        </div>
                    ) : isPending ? (
                        <div style={{ padding: '1rem', borderRadius: 12, background: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.25)', marginBottom: '1.25rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.85rem', color: '#ca8a04' }}>
                                <i className="bi bi-hourglass-split" /> Pending Acceptance
                            </div>
                            <p style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)', marginTop: '0.35rem', lineHeight: 1.5 }}>
                                Connection request sent. Waiting for the {cfg.label} admin to accept in their Hub.
                            </p>
                            <p style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)', marginTop: '0.35rem' }}>
                                You can resend the request below if it was not received.
                            </p>
                        </div>
                    ) : isRejected ? (
                        <div style={{ padding: '1rem', borderRadius: 12, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', marginBottom: '1.25rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.85rem', color: '#f87171' }}>
                                <i className="bi bi-x-circle-fill" /> Connection Rejected
                            </div>
                            <p style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)', marginTop: '0.35rem', lineHeight: 1.5 }}>
                                The {cfg.label} admin rejected the connection request. You can submit a new request below.
                            </p>
                        </div>
                    ) : (
                        <div style={{ padding: '1rem', borderRadius: 12, background: 'rgba(100,100,100,0.05)', border: '1px solid var(--admin-border)', marginBottom: '1.25rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.85rem', color: 'var(--admin-text-muted)' }}>
                                <i className="bi bi-plug" /> Not Connected
                            </div>
                            <p style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)', marginTop: '0.35rem' }}>
                                Configure the connection settings below to link this system.
                            </p>
                        </div>
                    )}

                    {message && (
                        <div style={{ padding: '0.65rem 0.85rem', borderRadius: 10, marginBottom: '1rem', fontSize: '0.78rem', fontWeight: 600,
                            background: message.type === 'success' ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                            border: `1px solid ${message.type === 'success' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
                            color: message.type === 'success' ? '#22c55e' : '#f87171' }}>
                            {message.text}
                        </div>
                    )}

                    {/* Connection Form */}
                    {!isBuiltIn && (
                        <form onSubmit={pillar === 'rsp' ? handleSync : handleConnect}>

                            {/* Current saved config — shown when base_url is already set */}
                            {pillar === 'ld' && connection?.base_url && (
                                <div style={{ padding: '0.85rem 1rem', borderRadius: 10, background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.12)', marginBottom: '1.25rem' }}>
                                    <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--admin-text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '0.6rem' }}>
                                        <i className="bi bi-hdd-network-fill" style={{ marginRight: '0.35rem' }} />
                                        Current Configuration
                                    </div>
                                    <div style={{ marginBottom: '0.4rem' }}>
                                        <span style={{ fontSize: '0.68rem', color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Base URL</span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                                            <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--admin-text-primary)', wordBreak: 'break-all', flex: 1 }}>{connection.base_url}</span>
                                            <button type="button" onClick={() => navigator.clipboard.writeText(connection.base_url)}
                                                style={{ flexShrink: 0, width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, border: '1px solid var(--admin-border)', background: 'var(--admin-bg-secondary)', color: 'var(--admin-text-muted)', cursor: 'pointer', fontSize: '0.75rem' }}
                                                title="Copy Base URL">
                                                <i className="bi bi-clipboard" />
                                            </button>
                                        </div>
                                    </div>
                                    <div style={{ marginTop: '0.4rem' }}>
                                        <span style={{ fontSize: '0.68rem', color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Token</span>
                                        <div style={{ fontSize: '0.78rem', color: connection.has_token ? '#22c55e' : 'var(--admin-text-muted)', marginTop: '0.2rem' }}>
                                            {connection.has_token
                                                ? <><i className="bi bi-check-circle-fill" style={{ marginRight: '0.3rem' }} />Token saved — enter a new one below to update</>
                                                : <><i className="bi bi-exclamation-circle" style={{ marginRight: '0.3rem' }} />No token saved yet</>}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div style={{ marginBottom: '1rem' }}>
                                <label style={labelStyle}>Base URL</label>
                                <input value={form.base_url} onChange={e => setForm(f => ({ ...f, base_url: e.target.value }))}
                                    placeholder={`https://${cfg.label.toLowerCase()}.example.gov/api`}
                                    style={inputStyle} />
                                <span style={hintStyle}>Example: https://hris.example.gov/api</span>
                            </div>

                            <div style={{ marginBottom: '1.25rem' }}>
                                <label style={labelStyle}>Access Token</label>
                                <input value={form.token} onChange={e => setForm(f => ({ ...f, token: e.target.value }))}
                                    type="password" placeholder="Paste token"
                                    style={inputStyle} />
                                <span style={hintStyle}>Keep this token confidential. It is used only for the sync request.</span>
                            </div>

                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                {isConnected && (
                                    <button type="button" onClick={handleTest} disabled={testing}
                                        style={{ ...btnOutline, cursor: testing ? 'not-allowed' : 'pointer' }}>
                                        {testing ? 'Testing…' : 'Test Connection'}
                                    </button>
                                )}
                                {isConnected && (
                                    <button type="button" onClick={handleDisconnect}
                                        style={{ ...btnOutline, borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.06)', color: '#f87171' }}>
                                        Disconnect
                                    </button>
                                )}
                                <button type="submit" disabled={loading || !form.base_url}
                                    style={{ ...btnPrimary, opacity: loading || !form.base_url ? 0.5 : 1, cursor: loading || !form.base_url ? 'not-allowed' : 'pointer', marginLeft: 'auto' }}>
                                    {loading ? 'Processing…' : isConnected ? 'Update & Reconnect' : pillar === 'rsp' ? 'Run Sync' : 'Connect'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>

            <style>{`@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
        </div>
    );
}

export default function Index() {
    const { connections = [] } = usePage().props;
    const [selectedPillar, setSelectedPillar] = useState(null);

    const connectionMap = {};
    connections.forEach(c => { connectionMap[c.pillar] = c; });

    // Auto-refresh every 5 seconds while any pillar is pending_acceptance
    // so the page reflects when L&D accepts the connection request
    const hasPending = connections.some(c => c.status === 'pending_acceptance');
    React.useEffect(() => {
        if (!hasPending) return;
        const id = setInterval(() => {
            router.reload({ only: ['connections'], preserveScroll: true });
        }, 5000);
        return () => clearInterval(id);
    }, [hasPending]);

    return (
        <AppLayout title="HRMO Hub">
            <Head title="HRMO Hub" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {/* Header */}
                <div style={card}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                        <div style={{ ...iconBox, width: 42, height: 42 }}>
                            <i className="bi bi-grid-3x3-gap-fill" style={{ fontSize: '1.1rem' }} />
                        </div>
                        <div>
                            <p style={statLabel}>System Integration</p>
                            <h1 style={{ ...cardHeader, fontSize: '1.6rem', marginBottom: 0 }}>HRMO Hub</h1>
                        </div>
                    </div>
                    <p style={{ ...statCaption, marginTop: '0.75rem', maxWidth: 760 }}>
                        Connect and manage the four pillars of HRMO. Click a pillar to view details and configure its connection.
                    </p>
                </div>

                {/* Horizontal Pillar List */}
                <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
                    {Object.entries(PILLAR_CFG).map(([key, cfg], idx) => {
                        const conn = connectionMap[key];
                        const isConnected = conn?.status === 'connected';
                        const isBuiltIn   = conn?.status === 'built_in';
                        const isPending   = conn?.status === 'pending_acceptance';
                        const isRejected  = conn?.status === 'rejected';
                        const isLast = idx === Object.keys(PILLAR_CFG).length - 1;

                        return (
                            <div key={key}
                                onClick={() => setSelectedPillar(key)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '1rem',
                                    padding: '1rem 1.25rem', cursor: 'pointer',
                                    borderBottom: isLast ? 'none' : '1px solid var(--admin-border)',
                                    transition: 'background 0.15s',
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = 'var(--admin-bg-secondary)'}
                                onMouseLeave={e => e.currentTarget.style.background = ''}>
                                {/* Icon */}
                                <div style={{ width: 40, height: 40, borderRadius: 10, background: `${cfg.color}10`, border: `1px solid ${cfg.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: cfg.color, flexShrink: 0 }}>
                                    <i className={`bi ${cfg.icon}`} style={{ fontSize: '1.1rem' }} />
                                </div>

                                {/* Info */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--admin-text-primary)' }}>{cfg.label}</div>
                                    <div style={{ fontSize: '0.73rem', color: 'var(--admin-text-muted)', marginTop: 1 }}>{cfg.full}</div>
                                </div>

                                {/* Status Badge */}
                                {isBuiltIn ? (
                                    <span style={badgeGreen}>Built-in</span>
                                ) : isConnected ? (
                                    <span style={badgeBlue}>Connected</span>
                                ) : isPending ? (
                                    <span style={badgeYellow}>Pending</span>
                                ) : isRejected ? (
                                    <span style={badgeRed}>Rejected</span>
                                ) : (
                                    <span style={badgeGray}>Not Connected</span>
                                )}

                                {/* Arrow */}
                                <i className="bi bi-chevron-right" style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)', flexShrink: 0 }} />
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Side Panel */}
            {selectedPillar && (
                <SidePanel pillar={selectedPillar} connection={connectionMap[selectedPillar]} onClose={() => setSelectedPillar(null)} />
            )}
        </AppLayout>
    );
}

const card = { background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)', borderRadius: 'var(--admin-radius)', padding: '1.25rem 1.5rem', boxShadow: 'var(--admin-shadow)' };
const statLabel = { fontSize: '0.72rem', fontWeight: 600, color: 'var(--admin-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.25rem' };
const statCaption = { fontSize: '0.75rem', color: 'var(--admin-text-secondary)', marginTop: '0.1rem' };
const cardHeader = { fontWeight: 700, fontSize: '0.9rem', color: 'var(--admin-text-primary)', marginBottom: '0.75rem' };
const iconBox = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 10, border: '1px solid var(--admin-border)', background: 'rgba(59,130,246,0.08)', color: 'var(--admin-accent)', flexShrink: 0 };

const labelStyle = { display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--admin-text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.35rem' };
const hintStyle = { fontSize: '0.7rem', color: 'var(--admin-text-muted)', marginTop: '0.25rem', display: 'block' };
const inputStyle = { width: '100%', boxSizing: 'border-box', padding: '0.6rem 0.85rem', borderRadius: 10, border: '1px solid var(--admin-border-strong)', background: 'var(--admin-bg-secondary)', color: 'var(--admin-text-primary)', fontSize: '0.85rem', outline: 'none' };

const badgeGreen  = { padding: '0.2rem 0.7rem', borderRadius: 99, fontSize: '0.67rem', fontWeight: 700, background: 'rgba(34,197,94,0.1)',  color: '#22c55e',              border: '1px solid rgba(34,197,94,0.2)',  whiteSpace: 'nowrap' };
const badgeBlue   = { padding: '0.2rem 0.7rem', borderRadius: 99, fontSize: '0.67rem', fontWeight: 700, background: 'rgba(59,130,246,0.1)',  color: 'var(--admin-accent)',  border: '1px solid rgba(59,130,246,0.2)', whiteSpace: 'nowrap' };
const badgeYellow = { padding: '0.2rem 0.7rem', borderRadius: 99, fontSize: '0.67rem', fontWeight: 700, background: 'rgba(234,179,8,0.1)',   color: '#ca8a04',              border: '1px solid rgba(234,179,8,0.25)', whiteSpace: 'nowrap' };
const badgeRed    = { padding: '0.2rem 0.7rem', borderRadius: 99, fontSize: '0.67rem', fontWeight: 700, background: 'rgba(239,68,68,0.1)',   color: '#f87171',              border: '1px solid rgba(239,68,68,0.2)',  whiteSpace: 'nowrap' };
const badgeGray   = { padding: '0.2rem 0.7rem', borderRadius: 99, fontSize: '0.67rem', fontWeight: 700, background: 'rgba(100,100,100,0.08)', color: 'var(--admin-text-muted)', border: '1px solid var(--admin-border)', whiteSpace: 'nowrap' };

const btnPrimary = { padding: '0.55rem 1.25rem', borderRadius: 8, border: 'none', background: 'var(--admin-accent)', color: '#fff', fontSize: '0.8rem', fontWeight: 700, fontFamily: 'inherit' };
const btnOutline = { padding: '0.55rem 1rem', borderRadius: 8, border: '1px solid var(--admin-border-strong)', background: 'transparent', color: 'var(--admin-text-primary)', fontSize: '0.8rem', fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' };
