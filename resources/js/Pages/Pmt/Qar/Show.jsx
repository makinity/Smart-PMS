import { useState, useEffect } from 'react';
import { router, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { useToast } from '@/Components/Snackbar';
import { useConfirm } from '@/Components/ConfirmDialog';
import { avatarSrc as resolveAvatar, onAvatarError } from '@/Components/defaultAvatar';

function useBreakpoint() {
    const [w, setW] = useState(() => typeof window !== 'undefined' ? window.innerWidth : 1200);
    useEffect(() => { const h = () => setW(window.innerWidth); window.addEventListener('resize', h); return () => window.removeEventListener('resize', h); }, []);
    return w >= 1024 ? 'desktop' : w >= 640 ? 'tablet' : 'mobile';
}

function StatusBadge({ status }) {
    const map = {
        submitted:   { label: 'Submitted',    bg: 'rgba(59,130,246,0.15)',  color: 'var(--admin-accent)', border: 'rgba(59,130,246,0.3)' },
        pmt_approved:{ label: 'PMT Approved', bg: 'rgba(74,222,128,0.15)', color: '#22c55e',             border: 'rgba(74,222,128,0.3)' },
        returned:    { label: 'Returned',     bg: 'rgba(239,68,68,0.15)',  color: '#f87171',             border: 'rgba(239,68,68,0.3)' },
    };
    const c = map[status] ?? { label: status, bg: 'rgba(100,100,100,0.12)', color: 'var(--admin-text-muted)', border: 'rgba(100,100,100,0.2)' };
    return <span style={{ padding: '0.22rem 0.7rem', borderRadius: 99, fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>{c.label}</span>;
}

function Avatar({ name, src, size = 36 }) {
    return <img src={resolveAvatar(src)} alt={name} onError={onAvatarError} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid var(--admin-border)' }} />;
}

function AnnexTable({ rows }) {
    const th = { padding: '0.55rem 0.75rem', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--admin-text-muted)', textAlign: 'left', borderBottom: '2px solid var(--admin-border)', whiteSpace: 'nowrap', background: 'var(--admin-bg-secondary)' };
    const td = { padding: '0.65rem 0.75rem', fontSize: '0.83rem', borderBottom: '1px solid var(--admin-border)', verticalAlign: 'top' };
    const sticky = { position: 'sticky', left: 0, zIndex: 1 };

    if (rows.length === 0) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: '0.85rem' }}>No Annex I rows.</div>;

    return (
        <div style={{ overflowX: 'auto', borderRadius: 'var(--admin-radius)', border: '1px solid var(--admin-border-strong)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 820 }}>
                <thead>
                    <tr>
                        <th style={{ ...th, width: 70 }}>PPA Code</th>
                        <th style={{ ...th, minWidth: 160, ...sticky }}>MFO / PPA</th>
                        <th style={{ ...th, minWidth: 200 }}>Performance Indicator</th>
                        <th style={{ ...th, minWidth: 120 }}>Target</th>
                        <th style={{ ...th, textAlign: 'right', width: 110 }}>Actual</th>
                        <th style={{ ...th, textAlign: 'right', width: 90 }}>Variance</th>
                        <th style={{ ...th, minWidth: 130 }}>Remarks</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, i) => {
                        const vc = row.variance === null ? 'var(--admin-text-muted)' : row.variance < 0 ? '#f87171' : '#22c55e';
                        return (
                            <tr key={i} onMouseEnter={e => e.currentTarget.style.background='var(--admin-bg-secondary)'} onMouseLeave={e => e.currentTarget.style.background=''}>
                                <td style={{ ...td, fontSize: '0.75rem', color: 'var(--admin-text-muted)', fontFamily: 'monospace' }}>{row.ppa_code}</td>
                                <td style={{ ...td, fontWeight: 600, color: 'var(--admin-text-primary)', ...sticky, background: 'var(--admin-card)' }}>{row.mfo_title}</td>
                                <td style={{ ...td, color: 'var(--admin-text-secondary)' }}>{row.indicator_text}</td>
                                <td style={{ ...td, fontSize: '0.78rem', color: 'var(--admin-text-muted)' }}>
                                    {row.target_quantity != null ? <strong>{row.target_quantity}</strong> : '—'}
                                    {row.target_timeline ? <span style={{ display: 'block', fontSize: '0.72rem' }}>{row.target_timeline}</span> : null}
                                </td>
                                <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: 'var(--admin-accent)' }}>{row.actual_performance}</td>
                                <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: vc }}>{row.variance !== null ? (row.variance >= 0 ? `+${row.variance}` : row.variance) : '—'}</td>
                                <td style={{ ...td, fontSize: '0.75rem', color: 'var(--admin-text-muted)', fontStyle: 'italic' }}>{row.remarks}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

function AnnexCards({ rows }) {
    if (rows.length === 0) return <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: '0.85rem' }}>No Annex I rows.</div>;
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
            {rows.map((row, i) => {
                const vc = row.variance === null ? 'var(--admin-text-muted)' : row.variance < 0 ? '#f87171' : '#22c55e';
                return (
                    <div key={i} style={{ background: 'var(--admin-bg-secondary)', borderRadius: 'var(--admin-radius)', padding: '0.85rem 1rem', border: '1px solid var(--admin-border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.4rem' }}>
                            <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--admin-text-primary)', flex: 1 }}>{row.mfo_title}</span>
                            <span style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: 'var(--admin-text-muted)', flexShrink: 0 }}>#{row.ppa_code}</span>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--admin-text-secondary)', marginBottom: '0.5rem' }}>{row.indicator_text}</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.4rem' }}>
                            {[['TARGET', row.target_quantity ?? '—', 'var(--admin-text-primary)'], ['ACTUAL', row.actual_performance, 'var(--admin-accent)'], ['VARIANCE', row.variance !== null ? (row.variance >= 0 ? `+${row.variance}` : row.variance) : '—', vc]].map(([l, v, c]) => (
                                <div key={l} style={{ textAlign: 'center', background: 'var(--admin-card)', borderRadius: 8, padding: '0.4rem' }}>
                                    <div style={{ fontSize: '0.6rem', color: 'var(--admin-text-muted)', marginBottom: '0.15rem' }}>{l}</div>
                                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: c }}>{v}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ── Return Modal ──────────────────────────────────────────────────────────────
function ReturnModal({ onClose, onConfirm, loading }) {
    const [remarks, setRemarks] = useState('');
    return (
        <>
            {/* Backdrop */}
            <div onClick={onClose} style={{
                position: 'fixed', inset: 0, zIndex: 1100,
                background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)',
            }} />
            {/* Panel */}
            <div style={{
                position: 'fixed', top: '50%', left: '50%',
                transform: 'translate(-50%,-50%)', zIndex: 1101,
                background: 'var(--admin-card)', borderRadius: 'var(--admin-radius)',
                border: '1px solid var(--admin-border-strong)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
                width: '90%', maxWidth: 480,
            }}>
                {/* Header */}
                <div style={{ padding: '1.25rem 1.25rem 0.75rem', borderBottom: '1px solid var(--admin-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                            background: 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5">
                                <polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/>
                            </svg>
                        </div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--admin-text-primary)' }}>
                                Return to Dept Head
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)', marginTop: 1 }}>
                                The Department Head will be notified to revise and resubmit the QAR.
                            </div>
                        </div>
                        <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none',
                            cursor: 'pointer', color: 'var(--admin-text-muted)', fontSize: '1rem', padding: '0.2rem', lineHeight: 1 }}>
                            <i className="bi bi-x-lg" />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div style={{ padding: '1rem 1.25rem' }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--admin-text-muted)',
                        display: 'block', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Remarks <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
                    </label>
                    <textarea
                        value={remarks}
                        onChange={e => setRemarks(e.target.value)}
                        placeholder="Provide a reason for returning this QAR..."
                        maxLength={2000}
                        rows={4}
                        style={{ width: '100%', boxSizing: 'border-box', padding: '0.65rem 0.85rem',
                            borderRadius: 10, border: '1px solid var(--admin-border-strong)',
                            background: 'var(--admin-bg-secondary)', color: 'var(--admin-text-primary)',
                            fontSize: '0.85rem', resize: 'vertical', outline: 'none',
                            fontFamily: 'inherit', lineHeight: 1.55, transition: 'border-color 0.15s' }}
                        onFocus={e => e.target.style.borderColor = '#f87171'}
                        onBlur={e => e.target.style.borderColor = 'var(--admin-border-strong)'}
                    />
                    <div style={{ textAlign: 'right', fontSize: '0.65rem', color: 'var(--admin-text-muted)', marginTop: 3 }}>
                        {remarks.length}/2000
                    </div>
                </div>

                {/* Footer */}
                <div style={{ padding: '0.75rem 1.25rem 1.25rem', display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
                    <button onClick={onClose} style={{ ...btnSecondary }}>
                        Cancel
                    </button>
                    <button onClick={() => onConfirm(remarks)} disabled={!!loading}
                        style={{ ...btnDanger, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
                        {loading === 'return' ? (
                            <><i className="bi bi-hourglass-split" /> Returning…</>
                        ) : (
                            <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/>
                            </svg> Confirm Return</>
                        )}
                    </button>
                </div>
            </div>
        </>
    );
}

function ActionPanel({ qar }) {
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [loading, setLoading]                = useState(null);
    const toast   = useToast();
    const confirm = useConfirm();
    const bp      = useBreakpoint();

    function post(action, data = {}) {
        setLoading(action);
        router.post(`/pmt/qar/${qar.id}/${action}`, data, {
            preserveScroll: true,
            onSuccess: () => {
                toast(action === 'approve' ? 'QAR approved.' : 'QAR returned to Dept Head.', action === 'return' ? 'error' : 'submitted');
                if (action === 'return') setShowReturnModal(false);
            },
            onError:  () => toast('Action failed.', 'error'),
            onFinish: () => setLoading(null),
        });
    }

    if (qar.status === 'pmt_approved') {
        return (
            <div style={{ ...actionCard, borderLeft: '3px solid #22c55e' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <StatusBadge status="pmt_approved" />
                    {qar.validated_at && <span style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)' }}>Validated by {qar.validated_by} · {qar.validated_at}</span>}
                </div>
            </div>
        );
    }

    if (qar.status === 'returned') {
        return (
            <div style={{ ...actionCard, borderLeft: '3px solid #ef4444' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <StatusBadge status="returned" />
                    {qar.return_remarks && <span style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)' }}>"{qar.return_remarks}"</span>}
                </div>
            </div>
        );
    }

    // submitted — right-aligned actions
    return (
        <>
            <div style={{ ...actionCard, borderLeft: '3px solid var(--admin-accent)' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <button onClick={() => setShowReturnModal(true)} disabled={!!loading}
                        style={{ ...btnDanger, opacity: loading ? 0.7 : 1 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/>
                        </svg>
                        {bp === 'mobile' ? 'Return' : 'Return to Dept Head'}
                    </button>
                    <button onClick={async () => { if (await confirm('Approve this QAR?')) post('approve'); }}
                        disabled={!!loading} style={{ ...btnPrimary, opacity: loading ? 0.7 : 1 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        {loading === 'approve' ? 'Approving…' : 'Approve QAR'}
                    </button>
                </div>
            </div>

            {showReturnModal && (
                <ReturnModal
                    onClose={() => !loading && setShowReturnModal(false)}
                    onConfirm={(remarks) => post('return', { return_remarks: remarks })}
                    loading={loading}
                />
            )}
        </>
    );
}

export default function Show() {
    const { qar, office, deptHead, annexRows, mpors } = usePage().props;
    const bp = useBreakpoint();
    const isMobile = bp === 'mobile';
    const [search, setSearch] = useState('');
    const [monthFilter, setMonthFilter] = useState('all');

    // Derive unique months from the mpors list (already sorted by the server)
    const uniqueMonths = [...new Map(mpors.map(m => [m.month, m.month_label])).entries()];

    const filteredMpors = mpors.filter(m =>
        m.employee.name.toLowerCase().includes(search.toLowerCase()) &&
        (monthFilter === 'all' || m.month === monthFilter)
    );

    return (
        <AppLayout title={`QAR — ${office?.name}`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

                {/* Header */}
                <div style={card}>
                    <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <a href="/pmt/qar" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--admin-text-muted)', textDecoration: 'none', fontWeight: 600 }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
                            Back to QAR List
                        </a>
                        <a href={`/stage-two/forms/qar-export?qar=${qar.id}`} style={{ ...btnExport, border: '1px solid #16a34a', color: '#16a34a' }} title="Export Excel">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                            {bp === 'desktop' && 'Export Excel'}
                        </a>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                            <Avatar name={deptHead?.name ?? office?.name} src={deptHead?.avatar} size={isMobile ? 44 : 52} />
                            <div>
                                <p style={statLabel}>QAR Review</p>
                                <h1 style={{ fontWeight: 700, fontSize: isMobile ? '1.1rem' : '1.3rem', color: 'var(--admin-text-primary)', lineHeight: 1.15 }}>{office?.name}</h1>
                                <div style={{ fontSize: '0.78rem', color: 'var(--admin-text-muted)' }}>{deptHead?.name} · {deptHead?.position ?? 'Department Head'}</div>
                            </div>
                        </div>
                        <div style={{ padding: '0.2rem 0.6rem', borderRadius: 8, border: '1px solid var(--admin-border-strong)', background: 'var(--admin-bg-secondary)', fontSize: '0.78rem', fontWeight: 700, color: 'var(--admin-accent)', whiteSpace: 'nowrap' }}>{qar.quarter_key}</div>
                    </div>
                </div>

                {/* Returned banner */}
                {qar.status === 'returned' && qar.return_remarks && (
                    <div style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.25)', borderLeft: '4px solid #ef4444', borderRadius: 'var(--admin-radius)', padding: '0.85rem 1.25rem', fontSize: '0.85rem', color: '#f87171' }}>
                        <strong>Returned:</strong> {qar.return_remarks}
                    </div>
                )}

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)', gap: '0.65rem' }}>
                    <div style={card}><p style={statLabel}>Included MPORs</p><div style={{ fontSize: '1.7rem', fontWeight: 800, color: 'var(--admin-text-primary)', lineHeight: 1 }}>{mpors.length}</div></div>
                    <div style={card}><p style={statLabel}>Annex I Rows</p><div style={{ fontSize: '1.7rem', fontWeight: 800, color: 'var(--admin-accent)', lineHeight: 1 }}>{annexRows.length}</div></div>
                    <div style={{ ...card, gridColumn: isMobile ? 'span 2' : 'auto' }}>
                        <p style={statLabel}>Submitted</p>
                        <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--admin-text-primary)', marginTop: '0.2rem' }}>{qar.submitted_at ?? '—'}</div>
                    </div>
                </div>

                {/* Included MPORs */}
                <div style={card}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <p style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--admin-text-primary)', margin: 0 }}>Included MPORs</p>
                    </div>
                    {mpors.length > 0 && (
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                            <div style={{ position: 'relative', flex: '1 1 180px', minWidth: 0 }}>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--admin-text-muted)" strokeWidth="2" style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employee…" style={{ width: '100%', paddingLeft: '2rem', paddingRight: '0.65rem', paddingTop: '0.4rem', paddingBottom: '0.4rem', borderRadius: 8, border: '1px solid var(--admin-border-strong)', background: 'var(--admin-bg-secondary)', color: 'var(--admin-text-primary)', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box' }} />
                            </div>
                            <div style={{ display: 'flex', gap: '0.3rem', flexShrink: 0 }}>
                                {[{ value: 'all', label: 'All' }, ...uniqueMonths.map(([v, l]) => ({ value: v, label: new Date(v + '-02').toLocaleString('default', { month: 'short' }) }))].map(opt => (
                                    <button key={opt.value} onClick={() => setMonthFilter(opt.value)} style={{ padding: '0.38rem 0.65rem', borderRadius: 7, border: `1px solid ${monthFilter === opt.value ? 'var(--admin-accent)' : 'var(--admin-border-strong)'}`, background: monthFilter === opt.value ? 'rgba(59,130,246,0.12)' : 'var(--admin-bg-secondary)', color: monthFilter === opt.value ? 'var(--admin-accent)' : 'var(--admin-text-muted)', fontWeight: monthFilter === opt.value ? 700 : 500, fontSize: '0.78rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    {mpors.length === 0 ? (
                        <div style={{ fontSize: '0.85rem', color: 'var(--admin-text-muted)', fontStyle: 'italic' }}>No MPORs linked.</div>
                    ) : isMobile ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                            {filteredMpors.length === 0 ? (
                                <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: '0.85rem' }}>No MPORs match your filter.</div>
                            ) : filteredMpors.map(m => (
                                <div key={m.id} style={{ background: 'var(--admin-bg-secondary)', borderRadius: 'var(--admin-radius)', padding: '0.85rem 1rem', border: '1px solid var(--admin-border)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.6rem' }}>
                                        <Avatar name={m.employee.name} src={m.employee.avatar} />
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--admin-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.employee.name}</div>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)' }}>{m.employee.position}</div>
                                        </div>
                                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--admin-accent)' }}>{m.month_label}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                        <a href={`/pmt/qar/${qar.id}/mpor/${m.id}`} style={btnView}>View MPOR <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg></a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ borderRadius: 'var(--admin-radius)', border: '1px solid var(--admin-border-strong)', overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: 'var(--admin-bg-secondary)' }}>
                                        {['Employee', 'Month', 'Approved', ''].map((h, i) => (
                                            <th key={i} style={{ padding: '0.55rem 0.85rem', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--admin-text-muted)', textAlign: i===3?'right':'left', borderBottom: '1px solid var(--admin-border)', whiteSpace: 'nowrap' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredMpors.length === 0 ? (
                                        <tr><td colSpan={4} style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: '0.85rem' }}>No MPORs match your filter.</td></tr>
                                    ) : filteredMpors.map(m => (
                                        <tr key={m.id} onMouseEnter={e => e.currentTarget.style.background='var(--admin-bg-secondary)'} onMouseLeave={e => e.currentTarget.style.background=''}>
                                            <td style={tdS}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                                    <Avatar name={m.employee.name} src={m.employee.avatar} />
                                                    <div>
                                                        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--admin-text-primary)' }}>{m.employee.name}</div>
                                                        <div style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)' }}>{m.employee.position}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={tdS}><span style={{ fontWeight: 700, color: 'var(--admin-accent)' }}>{m.month_label}</span></td>
                                            <td style={tdS}><span style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)' }}>{m.approved_at ?? '—'}</span></td>
                                            <td style={{ ...tdS, textAlign: 'right' }}>
                                                <a href={`/pmt/qar/${qar.id}/mpor/${m.id}`} style={btnView}>View MPOR <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg></a>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Annex I */}
                <div style={card}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <p style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--admin-text-primary)' }}>Annex I — Quarterly Performance Summary</p>
                        <span style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)' }}>QUARTERLY PHYSICAL REPORT OF OPERATIONS · {qar.quarter_key}</span>
                    </div>
                    {isMobile ? <AnnexCards rows={annexRows} /> : <AnnexTable rows={annexRows} />}
                    {annexRows.length > 0 && (
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '0.65rem', marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--admin-border)' }}>
                            <div>
                                <p style={{ ...statLabel, marginBottom: '0.4rem' }}>Prepared by</p>
                                <div style={{ fontWeight: 700, color: 'var(--admin-text-primary)', fontSize: '0.9rem' }}>{deptHead?.name ?? '—'}</div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)' }}>{deptHead?.position ?? 'Department Head'}</div>
                                {qar.submitted_at && <div style={{ fontSize: '0.7rem', color: '#a78bfa', marginTop: '0.2rem' }}>Submitted {qar.submitted_at}</div>}
                            </div>
                            <div>
                                <p style={{ ...statLabel, marginBottom: '0.4rem' }}>PMT Validation</p>
                                {qar.status === 'pmt_approved' ? (
                                    <div style={{ fontWeight: 600, color: '#22c55e', fontSize: '0.88rem' }}>✓ Validated by {qar.validated_by}</div>
                                ) : qar.status === 'returned' ? (
                                    <div style={{ fontWeight: 600, color: '#f87171', fontSize: '0.88rem' }}>Returned by PMT</div>
                                ) : (
                                    <div style={{ fontSize: '0.82rem', color: 'var(--admin-text-muted)', fontStyle: 'italic' }}>Pending validation</div>
                                )}
                                {qar.validated_at && <div style={{ fontSize: '0.7rem', color: 'var(--admin-text-muted)', marginTop: '0.1rem' }}>{qar.validated_at}</div>}
                            </div>
                        </div>
                    )}
                </div>

                {/* Action panel */}
                <ActionPanel qar={qar} />

            </div>
        </AppLayout>
    );
}

const card       = { background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)', borderRadius: 'var(--admin-radius)', padding: '1.25rem 1.5rem', boxShadow: 'var(--admin-shadow)' };
const actionCard = { background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)', borderRadius: 'var(--admin-radius)', padding: '1.25rem 1.5rem', boxShadow: 'var(--admin-shadow)' };
const statLabel  = { fontSize: '0.72rem', fontWeight: 600, color: 'var(--admin-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.15rem' };
const panelLabel = { fontSize: '0.72rem', fontWeight: 600, color: 'var(--admin-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.75rem' };
const tdS        = { padding: '0.7rem 0.85rem', borderBottom: '1px solid var(--admin-border)', verticalAlign: 'middle' };
const btnView    = { display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.35rem 0.75rem', borderRadius: 7, border: '1px solid var(--admin-border-strong)', background: 'transparent', color: 'var(--admin-text-primary)', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', textDecoration: 'none', whiteSpace: 'nowrap' };
const btnPrimary = { display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1.15rem', borderRadius: 10, border: 'none', background: 'var(--admin-accent)', color: '#fff', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' };
const btnDanger  = { display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1.15rem', borderRadius: 10, border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.08)', color: '#f87171', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' };
const btnSecondary = { display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1.1rem', borderRadius: 10, border: '1px solid var(--admin-border-strong)', background: 'transparent', color: 'var(--admin-text-primary)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' };
const btnExport  = { display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.95rem', borderRadius: 10, border: '1px solid var(--admin-border-strong)', background: 'var(--admin-bg-secondary)', color: 'var(--admin-text-primary)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', textDecoration: 'none' };
