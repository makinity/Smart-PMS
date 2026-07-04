import { useState, useEffect } from 'react';
import { router, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { useToast } from '@/Components/Snackbar';
import { useConfirm } from '@/Components/ConfirmDialog';
import { avatarSrc as resolveAvatar, onAvatarError } from '@/Components/defaultAvatar';

function useBreakpoint() {
    const [w, setW] = useState(() => typeof window !== 'undefined' ? window.innerWidth : 1200);
    useEffect(() => {
        const h = () => setW(window.innerWidth);
        window.addEventListener('resize', h);
        return () => window.removeEventListener('resize', h);
    }, []);
    return w >= 1024 ? 'desktop' : w >= 640 ? 'tablet' : 'mobile';
}

function StatusBadge({ status }) {
    const map = {
        submitted: { label: 'Submitted', bg: 'rgba(59,130,246,0.15)',  color: 'var(--admin-accent)', border: 'rgba(59,130,246,0.3)' },
        approved:  { label: 'Approved',  bg: 'rgba(74,222,128,0.15)', color: '#22c55e',             border: 'rgba(74,222,128,0.3)' },
        returned:  { label: 'Returned',  bg: 'rgba(239,68,68,0.15)',  color: '#f87171',             border: 'rgba(239,68,68,0.3)' },
    };
    const c = map[status] ?? { label: status, bg: 'rgba(100,100,100,0.12)', color: 'var(--admin-text-muted)', border: 'rgba(100,100,100,0.2)' };
    return (
        <span style={{ padding: '0.22rem 0.7rem', borderRadius: 99, fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>
            {c.label}
        </span>
    );
}

function Avatar({ name, src, size = 44 }) {
    return <img src={resolveAvatar(src)} alt={name} onError={onAvatarError} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid var(--admin-border)' }} />;
}

function ZeroOrValue({ v }) {
    if (!v) return <span style={{ color: 'var(--admin-text-muted)', opacity: 0.3 }}>0</span>;
    return <span>{v}</span>;
}

function MporTable({ sections, grandQty, grandQualAvg, grandTimeAvg, grandQtyTotal }) {
    const W = [1, 2, 3, 4];
    const th = { padding: '0.55rem 0.4rem', fontSize: '0.63rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--admin-text-muted)', textAlign: 'center', borderBottom: '1px solid var(--admin-border)', whiteSpace: 'nowrap' };
    const td = { padding: '0.5rem 0.4rem', textAlign: 'center', fontSize: '0.8rem', borderBottom: '1px solid var(--admin-border)' };
    const sticky = { position: 'sticky', left: 0, zIndex: 1 };

    return (
        <div style={{ overflowX: 'auto', borderRadius: 'var(--admin-radius)', border: '1px solid var(--admin-border-strong)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 880 }}>
                <thead>
                    <tr style={{ background: 'var(--admin-bg-secondary)' }}>
                        <th style={{ ...th, textAlign: 'left', minWidth: 220, ...sticky, background: 'var(--admin-bg-secondary)' }}>OUTPUT / TASK</th>
                        <th colSpan={5} style={{ ...th, color: 'var(--admin-accent)', borderLeft: '1px solid var(--admin-border)' }}>QUANTITY / EFFICIENCY</th>
                        <th colSpan={5} style={{ ...th, color: '#22c55e', borderLeft: '1px solid var(--admin-border)' }}>QUALITY / EFFECTIVENESS</th>
                        <th colSpan={5} style={{ ...th, color: '#f59e0b', borderLeft: '1px solid var(--admin-border)' }}>TIMELINESS</th>
                    </tr>
                    <tr style={{ background: 'var(--admin-bg-secondary)' }}>
                        <th style={{ ...th, textAlign: 'left', ...sticky, background: 'var(--admin-bg-secondary)' }}></th>
                        {[...W.map(w=>`W${w}`),'TOTAL',...W.map(w=>`W${w}`),'AVG',...W.map(w=>`W${w}`),'AVG'].map((h, i) => (
                            <th key={i} style={{ ...th, borderLeft: [0,5,10].includes(i) ? '1px solid var(--admin-border)' : undefined }}>{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {sections.map(sec => (
                        <>
                            <tr key={sec.key}>
                                <td colSpan={16} style={{ padding: '0.4rem 0.75rem', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--admin-text-muted)', textTransform: 'uppercase', background: 'var(--admin-bg-secondary)', ...sticky }}>
                                    {sec.label} ({sec.weight}%)
                                </td>
                            </tr>
                            {sec.rows.length === 0 && (
                                <tr>
                                    <td colSpan={16} style={{ ...td, color: 'var(--admin-text-muted)', fontSize: '0.75rem', fontStyle: 'italic', textAlign: 'left', paddingLeft: '1rem' }}>
                                        No rated entries for this section.
                                    </td>
                                </tr>
                            )}
                            {sec.rows.map((row, ri) => (
                                <tr key={ri}>
                                    <td style={{ ...td, textAlign: 'left', fontWeight: 500, color: 'var(--admin-text-primary)', ...sticky, background: 'var(--admin-card)', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {row.title}
                                    </td>
                                    {W.map(w => <td key={w} style={{ ...td, borderLeft: w===1?'1px solid var(--admin-border)':undefined }}><ZeroOrValue v={row.qty[w]} /></td>)}
                                    <td style={{ ...td, fontWeight: 700, color: 'var(--admin-accent)' }}>{row.qty_total}</td>
                                    {W.map(w => <td key={w} style={{ ...td, borderLeft: w===1?'1px solid var(--admin-border)':undefined }}><ZeroOrValue v={row.quality[w]} /></td>)}
                                    <td style={{ ...td, fontWeight: 700, color: '#22c55e' }}>{row.qual_avg || '—'}</td>
                                    {W.map(w => <td key={w} style={{ ...td, borderLeft: w===1?'1px solid var(--admin-border)':undefined }}><ZeroOrValue v={row.timeliness[w]} /></td>)}
                                    <td style={{ ...td, fontWeight: 700, color: '#f59e0b' }}>{row.time_avg || '—'}</td>
                                </tr>
                            ))}
                        </>
                    ))}
                    <tr style={{ background: 'rgba(59,130,246,0.06)', borderTop: '2px solid var(--admin-accent)' }}>
                        <td style={{ ...td, textAlign: 'left', fontWeight: 700, fontSize: '0.72rem', color: 'var(--admin-accent)', textTransform: 'uppercase', ...sticky, background: 'rgba(59,130,246,0.06)' }}>
                            Grand Totals / Monthly Averages
                        </td>
                        {W.map(w => <td key={w} style={{ ...td, fontWeight: 600, borderLeft: w===1?'1px solid var(--admin-border)':undefined }}>{grandQty[w]||0}</td>)}
                        <td style={{ ...td, fontWeight: 800, color: 'var(--admin-accent)', background: 'rgba(59,130,246,0.15)' }}>{grandQtyTotal}</td>
                        <td colSpan={4} style={{ ...td, borderLeft: '1px solid var(--admin-border)', fontSize: '0.68rem', color: 'var(--admin-text-muted)' }}>Quality Score:</td>
                        <td style={{ ...td, fontWeight: 700, color: '#22c55e' }}>{grandQualAvg||'—'}</td>
                        <td colSpan={4} style={{ ...td, borderLeft: '1px solid var(--admin-border)', fontSize: '0.68rem', color: 'var(--admin-text-muted)' }}>Timeliness Score:</td>
                        <td style={{ ...td, fontWeight: 700, color: '#f59e0b' }}>{grandTimeAvg||'—'}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}

function MobileCards({ sections, metric, setMetric }) {
    const metricColor = { qty: 'var(--admin-accent)', quality: '#22c55e', timeliness: '#f59e0b' };
    return (
        <>
            <div style={{ display: 'flex', borderBottom: '1px solid var(--admin-border)', marginBottom: '1rem' }}>
                {['qty','quality','timeliness'].map(m => (
                    <button key={m} onClick={() => setMetric(m)} style={{ flex: 1, padding: '0.6rem', background: 'none', border: 'none', borderBottom: metric===m ? `2px solid var(--admin-accent)` : '2px solid transparent', cursor: 'pointer', fontSize: '0.78rem', fontWeight: metric===m ? 700 : 500, color: metric===m ? 'var(--admin-accent)' : 'var(--admin-text-muted)' }}>
                        {m === 'qty' ? 'Quantity' : m === 'quality' ? 'Quality' : 'Timeliness'}
                    </button>
                ))}
            </div>
            {sections.map(sec => (
                <div key={sec.key}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--admin-text-muted)', textTransform: 'uppercase', margin: '0.5rem 0 0.35rem', paddingLeft: '0.2rem' }}>
                        {sec.label} ({sec.weight}%)
                    </div>
                    {sec.rows.length === 0 && (
                        <div style={{ padding: '0.75rem 1rem', fontSize: '0.78rem', color: 'var(--admin-text-muted)', fontStyle: 'italic', border: '1px dashed var(--admin-border)', borderRadius: 'var(--admin-radius)', marginBottom: '0.5rem' }}>
                            No rated entries.
                        </div>
                    )}
                    {sec.rows.map((row, i) => {
                        const data = metric==='qty' ? row.qty : metric==='quality' ? row.quality : row.timeliness;
                        const avg  = metric==='qty' ? row.qty_total : metric==='quality' ? row.qual_avg : row.time_avg;
                        const color = metricColor[metric];
                        return (
                            <div key={i} style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)', borderRadius: 'var(--admin-radius)', padding: '0.9rem 1rem', marginBottom: '0.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.65rem' }}>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--admin-text-primary)', flex: 1, marginRight: '0.5rem' }}>{row.title}</span>
                                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color, background: `${color}22`, border: `1px solid ${color}44`, borderRadius: 99, padding: '0.15rem 0.6rem', whiteSpace: 'nowrap' }}>
                                        {metric==='qty' ? `Total: ${avg}` : `Avg: ${avg}`}
                                    </span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.4rem' }}>
                                    {[1,2,3,4].map(w => (
                                        <div key={w} style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: '0.63rem', color: 'var(--admin-text-muted)', marginBottom: '0.1rem' }}>W{w}</div>
                                            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: (data[w]||0) > 0 ? 'var(--admin-text-primary)' : 'var(--admin-text-muted)', opacity: (data[w]||0) > 0 ? 1 : 0.3 }}>
                                                {data[w] ?? 0}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ))}
        </>
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
                            background: 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center',
                            justifyContent: 'center' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5">
                                <polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/>
                            </svg>
                        </div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--admin-text-primary)' }}>
                                Return
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)', marginTop: 1 }}>
                                The employee will be notified and can revise their MPOR.
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
                        placeholder="Provide a reason for returning this MPOR..."
                        maxLength={2000}
                        rows={4}
                        style={{ width: '100%', boxSizing: 'border-box', padding: '0.65rem 0.85rem',
                            borderRadius: 10, border: '1px solid var(--admin-border-strong)',
                            background: 'var(--admin-bg-secondary)', color: 'var(--admin-text-primary)',
                            fontSize: '0.85rem', resize: 'vertical', outline: 'none',
                            fontFamily: 'inherit', lineHeight: 1.55,
                            transition: 'border-color 0.15s' }}
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

// ── Action Panel ──────────────────────────────────────────────────────────────
function ActionPanel({ mpor }) {
    const [loading, setLoading]       = useState(null); // 'approve'|'return'
    const [showReturnModal, setShowReturnModal] = useState(false);
    const toast   = useToast();
    const confirm = useConfirm();

    function post(action, data = {}) {
        setLoading(action);
        router.post(`/supervisor/mpor/${mpor.id}/${action}`, data, {
            preserveScroll: true,
            onSuccess: () => {
                toast(action === 'approve' ? 'MPOR approved.' : 'MPOR returned to employee.', action === 'return' ? 'error' : 'submitted');
                if (action === 'return') setShowReturnModal(false);
            },
            onError:  () => toast('Action failed. Please try again.', 'error'),
            onFinish: () => setLoading(null),
        });
    }

    async function handleApprove() {
        if (!await confirm('Approve this MPOR? The employee will be notified.')) return;
        post('approve');
    }

    if (mpor.status === 'returned') {
        return (
            <div style={{ ...actionCard, borderLeft: '3px solid #ef4444' }}>
                <p style={panelLabel}>Status</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.35rem' }}>
                    <StatusBadge status="returned" />
                    <span style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)' }}>Returned by {mpor.returned_by} · {mpor.returned_at}</span>
                </div>
                {mpor.return_remarks && <div style={{ marginTop: '0.65rem', padding: '0.6rem 0.85rem', borderRadius: 8, background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', fontSize: '0.82rem', color: 'var(--admin-text-secondary)' }}>"{mpor.return_remarks}"</div>}
            </div>
        );
    }

    if (mpor.status === 'approved') {
        return (
            <div style={{ ...actionCard, borderLeft: '3px solid #22c55e' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <StatusBadge status="approved" />
                    <span style={{ fontSize: '0.78rem', color: 'var(--admin-text-muted)' }}>Approved {mpor.approved_at}</span>
                    <span style={{ fontSize: '0.8rem', color: '#22c55e', marginLeft: 4 }}>✓ Included in Dept Head QAR</span>
                </div>
            </div>
        );
    }

    // submitted — show right-aligned action buttons
    return (
        <>
            <div style={{ ...actionCard, borderLeft: '3px solid var(--admin-accent)' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <button onClick={() => setShowReturnModal(true)} disabled={!!loading}
                        style={{ ...btnDanger, opacity: loading ? 0.7 : 1 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/>
                        </svg>
                        Return
                    </button>
                    <button onClick={handleApprove} disabled={!!loading}
                        style={{ ...btnPrimary, opacity: loading ? 0.7 : 1 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        {loading === 'approve' ? 'Approving…' : 'Approve'}
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

// ── Main component ─────────────────────────────────────────────────────────────
export default function Show() {
    const { mpor, employee, sections, grandQty, grandQualAvg, grandTimeAvg, grandQtyTotal } = usePage().props;
    const bp      = useBreakpoint();
    const [metric, setMetric] = useState('qty');
    const isMobile = bp === 'mobile';

    const monthLabel = (() => {
        try { return new Date(mpor.month + '-02').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }); }
        catch { return mpor.month; }
    })();

    // Timeline steps
    const timeline = [
        { key: 'submitted', label: 'Submitted',  at: mpor.submitted_at,  active: ['submitted','approved','returned'].includes(mpor.status) },
        { key: 'approved',  label: 'Approved',   at: mpor.approved_at,   active: mpor.status === 'approved' },
    ];

    return (
        <AppLayout title={`MPOR — ${employee?.name}`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

                {/* Back + Header */}
                <div style={card}>
                    <div style={{ marginBottom: '1rem' }}>
                        <a href="/supervisor/mpor" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--admin-text-muted)', textDecoration: 'none', fontWeight: 600 }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
                            Back to MPOR List
                        </a>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
                        {/* Employee info */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                            <Avatar name={employee?.name} src={employee?.avatar} size={isMobile ? 44 : 52} />
                            <div>
                                <p style={statLabel}>MPOR Review</p>
                                <h1 style={{ fontWeight: 700, fontSize: isMobile ? '1.1rem' : '1.3rem', color: 'var(--admin-text-primary)', lineHeight: 1.15 }}>{employee?.name}</h1>
                                <div style={{ fontSize: '0.78rem', color: 'var(--admin-text-muted)' }}>{employee?.position}</div>
                            </div>
                        </div>
                        <div style={{ padding: '0.2rem 0.6rem', borderRadius: 8, border: '1px solid var(--admin-border-strong)', background: 'var(--admin-bg-secondary)', fontSize: '0.78rem', fontWeight: 700, color: 'var(--admin-text-primary)', whiteSpace: 'nowrap', alignSelf: 'flex-start' }}>
                            {monthLabel}
                        </div>
                    </div>

                    {/* Timeline */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginTop: '1.25rem', overflowX: 'auto', paddingBottom: '0.1rem' }}>
                        {timeline.map((step, i) => (
                            <div key={step.key} style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: step.active ? 'var(--admin-accent)' : 'var(--admin-bg-secondary)', border: `2px solid ${step.active ? 'var(--admin-accent)' : 'var(--admin-border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        {step.active && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                                    </div>
                                    <div style={{ fontSize: '0.65rem', fontWeight: step.active ? 700 : 500, color: step.active ? 'var(--admin-accent)' : 'var(--admin-text-muted)', marginTop: '0.3rem', textAlign: 'center', whiteSpace: 'nowrap' }}>{step.label}</div>
                                    {step.at && <div style={{ fontSize: '0.6rem', color: 'var(--admin-text-muted)', marginTop: '0.1rem', textAlign: 'center' }}>{step.at}</div>}
                                </div>
                                {i < timeline.length - 1 && (
                                    <div style={{ height: 2, flex: 1, background: timeline[i+1].active ? 'var(--admin-accent)' : 'var(--admin-border)', margin: '0 0.25rem', marginBottom: '1.5rem', flexShrink: 1, minWidth: 20 }} />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Return banner */}
                {mpor.status === 'returned' && (
                    <div style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.25)', borderLeft: '4px solid #ef4444', borderRadius: 'var(--admin-radius)', padding: '0.85rem 1.25rem' }}>
                        <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-start' }}>
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" style={{ flexShrink: 0, marginTop: 2 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                            <div>
                                <div style={{ fontWeight: 700, color: '#f87171', fontSize: '0.85rem' }}>Returned to Employee</div>
                                {mpor.return_remarks && <div style={{ color: 'var(--admin-text-secondary)', fontSize: '0.82rem', marginTop: '0.15rem' }}>"{mpor.return_remarks}"</div>}
                            </div>
                        </div>
                    </div>
                )}

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)', gap: '0.65rem' }}>
                    <div style={card}>
                        <p style={statLabel}>Total Outputs</p>
                        <div style={{ fontSize: '1.7rem', fontWeight: 800, color: 'var(--admin-text-primary)', lineHeight: 1 }}>{grandQtyTotal}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)', marginTop: '0.2rem' }}>Rated entries</div>
                    </div>
                    <div style={card}>
                        <p style={statLabel}>Quality Score</p>
                        <div style={{ fontSize: '1.7rem', fontWeight: 800, color: '#22c55e', lineHeight: 1 }}>{grandQualAvg || '—'}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)', marginTop: '0.2rem' }}>Monthly avg</div>
                    </div>
                    <div style={{ ...card, gridColumn: isMobile ? 'span 2' : 'auto' }}>
                        <p style={statLabel}>Timeliness Score</p>
                        <div style={{ fontSize: '1.7rem', fontWeight: 800, color: '#f59e0b', lineHeight: 1 }}>{grandTimeAvg || '—'}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)', marginTop: '0.2rem' }}>Monthly avg</div>
                    </div>
                </div>

                {/* Data table / mobile cards */}
                <div style={card}>
                    <p style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--admin-text-primary)', marginBottom: '1rem', letterSpacing: '-0.01em' }}>Monthly Performance Records</p>
                    {grandQtyTotal === 0 ? (
                        <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--admin-text-muted)' }}>
                            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.25, margin: '0 auto 0.65rem', display: 'block' }}>
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                            </svg>
                            <p style={{ fontSize: '0.88rem' }}>No rated ORS entries for {monthLabel}.</p>
                        </div>
                    ) : isMobile ? (
                        <MobileCards sections={sections} metric={metric} setMetric={setMetric} />
                    ) : (
                        <MporTable sections={sections} grandQty={grandQty} grandQualAvg={grandQualAvg} grandTimeAvg={grandTimeAvg} grandQtyTotal={grandQtyTotal} />
                    )}
                </div>

                {/* Action panel */}
                <ActionPanel mpor={mpor} />

                {/* Signature footer */}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '0.65rem' }}>
                    <div style={card}>
                        <p style={statLabel}>Submitted By</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
                            <Avatar name={employee?.name} src={employee?.avatar} size={40} />
                            <div>
                                <div style={{ fontWeight: 700, color: 'var(--admin-text-primary)', fontSize: '0.88rem' }}>{employee?.name}</div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)' }}>{employee?.position}</div>
                                {mpor.submitted_at && <div style={{ fontSize: '0.7rem', color: 'var(--admin-accent)', marginTop: '0.1rem' }}>{mpor.submitted_at}</div>}
                            </div>
                        </div>
                    </div>
                    <div style={{ ...card, borderLeft: mpor.status === 'approved' ? '3px solid #22c55e' : mpor.status === 'returned' ? '3px solid #ef4444' : '3px solid var(--admin-border-strong)' }}>
                        <p style={statLabel}>Reviewed By</p>
                        <div style={{ fontSize: '0.82rem', color: 'var(--admin-text-muted)', marginTop: '0.5rem' }}>
                            {mpor.approved_by ? (
                                <span style={{ color: 'var(--admin-text-primary)', fontWeight: 600 }}>{mpor.approved_by}</span>
                            ) : (
                                <span style={{ fontStyle: 'italic' }}>Pending review</span>
                            )}
                        </div>
                        {mpor.approved_at && <div style={{ fontSize: '0.7rem', color: '#22c55e', marginTop: '0.2rem' }}>✓ Approved {mpor.approved_at}</div>}
                        {mpor.approved_at && <div style={{ fontSize: '0.7rem', color: '#22c55e', marginTop: '0.1rem' }}>✓ Approved — included in Dept Head QAR</div>}
                    </div>
                </div>

            </div>
        </AppLayout>
    );
}

const card        = { background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)', borderRadius: 'var(--admin-radius)', padding: '1.25rem 1.5rem', boxShadow: 'var(--admin-shadow)' };
const actionCard  = { background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)', borderRadius: 'var(--admin-radius)', padding: '1.25rem 1.5rem', boxShadow: 'var(--admin-shadow)' };
const statLabel   = { fontSize: '0.72rem', fontWeight: 600, color: 'var(--admin-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.15rem' };
const panelLabel  = { fontSize: '0.72rem', fontWeight: 600, color: 'var(--admin-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.75rem' };
const btnPrimary  = { display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1.15rem', borderRadius: 10, border: 'none', background: 'var(--admin-accent)', color: '#fff', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' };
const btnDanger   = { display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1.15rem', borderRadius: 10, border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.08)', color: '#f87171', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' };
const btnSecondary = { display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1.1rem', borderRadius: 10, border: '1px solid var(--admin-border-strong)', background: 'transparent', color: 'var(--admin-text-primary)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' };
