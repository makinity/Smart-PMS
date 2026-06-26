import { useState, useEffect } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { useToast } from '@/Components/Snackbar';
import { useConfirm } from '@/Components/ConfirmDialog';
import { avatarSrc as resolveAvatar, onAvatarError } from '@/Components/defaultAvatar';
import ValidationModal from '@/Components/ValidationModal';

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
        draft:               { label: 'Draft',         bg: 'rgba(234,179,8,0.15)',   color: '#ca8a04', border: 'rgba(234,179,8,0.3)' },
        dept_head_endorsed:  { label: 'Submitted',     bg: 'rgba(59,130,246,0.15)',  color: 'var(--admin-accent)', border: 'rgba(59,130,246,0.3)' },
        pmt_approved:        { label: 'PMT Approved',  bg: 'rgba(74,222,128,0.15)',  color: '#22c55e', border: 'rgba(74,222,128,0.3)' },
        returned:            { label: 'Returned',      bg: 'rgba(239,68,68,0.15)',   color: '#f87171', border: 'rgba(239,68,68,0.3)' },
        endorsed:            { label: 'Endorsed',      bg: 'rgba(59,130,246,0.15)',  color: 'var(--admin-accent)', border: 'rgba(59,130,246,0.3)' },

    };
    const c = map[status] ?? { label: status, bg: 'rgba(100,100,100,0.12)', color: 'var(--admin-text-muted)', border: 'rgba(100,100,100,0.2)' };
    return (
        <span style={{ padding: '0.2rem 0.65rem', borderRadius: 99, fontSize: '0.67rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', background: c.bg, color: c.color, border: `1px solid ${c.border}`, whiteSpace: 'nowrap' }}>
            {c.label}
        </span>
    );
}

function Avatar({ name, src, size = 36 }) {
    return <img src={resolveAvatar(src)} alt={name} onError={onAvatarError} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid var(--admin-border)' }} />;
}

// ── Annex I Table ─────────────────────────────────────────────────────────────
function AnnexTable({ rows }) {
    if (rows.length === 0) {
        return (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--admin-text-muted)' }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.2, display: 'block', margin: '0 auto 0.75rem' }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                <p style={{ fontSize: '0.88rem' }}>No data yet. Approved MPORs for this quarter will appear here.</p>
            </div>
        );
    }

    const th = { padding: '0.55rem 0.75rem', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--admin-text-muted)', textAlign: 'left', borderBottom: '2px solid var(--admin-border)', whiteSpace: 'nowrap', background: 'var(--admin-bg-secondary)' };
    const td = { padding: '0.65rem 0.75rem', fontSize: '0.83rem', borderBottom: '1px solid var(--admin-border)', verticalAlign: 'top' };
    const sticky = { position: 'sticky', left: 0, zIndex: 1 };

    return (
        <div style={{ overflowX: 'auto', borderRadius: 'var(--admin-radius)', border: '1px solid var(--admin-border-strong)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 820 }}>
                <thead>
                    <tr>
                        <th style={{ ...th, width: 70 }}>PPA Code</th>
                        <th style={{ ...th, minWidth: 160, ...sticky }}>MFO / PPA</th>
                        <th style={{ ...th, minWidth: 200 }}>Performance Indicator</th>
                        <th style={{ ...th, minWidth: 130 }}>Target / Timeline</th>
                        <th style={{ ...th, textAlign: 'right', width: 110 }}>Actual Performance</th>
                        <th style={{ ...th, textAlign: 'right', width: 90 }}>Variance</th>
                        <th style={{ ...th, minWidth: 140 }}>Remarks</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, i) => {
                        const variance = row.variance;
                        const varColor = variance === null ? 'var(--admin-text-muted)' : variance < 0 ? '#f87171' : '#22c55e';
                        return (
                            <tr key={i} onMouseEnter={e => e.currentTarget.style.background = 'var(--admin-bg-secondary)'} onMouseLeave={e => e.currentTarget.style.background = ''}>
                                <td style={{ ...td, fontSize: '0.75rem', color: 'var(--admin-text-muted)', fontFamily: 'monospace' }}>{row.ppa_code}</td>
                                <td style={{ ...td, fontWeight: 600, color: 'var(--admin-text-primary)', ...sticky, background: 'var(--admin-card)' }}>{row.mfo_title}</td>
                                <td style={{ ...td, color: 'var(--admin-text-secondary)' }}>{row.indicator_text}</td>
                                <td style={{ ...td, fontSize: '0.78rem', color: 'var(--admin-text-muted)' }}>
                                    {row.target_quantity != null ? <strong>{row.target_quantity}</strong> : '—'}
                                    {row.target_timeline ? <span style={{ display: 'block', fontSize: '0.72rem', marginTop: '0.1rem' }}>{row.target_timeline}</span> : null}
                                </td>
                                <td style={{ ...td, textAlign: 'right', fontWeight: 700, fontSize: '0.9rem', color: 'var(--admin-accent)' }}>{row.actual_performance}</td>
                                <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: varColor }}>
                                    {variance !== null ? (variance >= 0 ? `+${variance}` : variance) : '—'}
                                </td>
                                <td style={{ ...td, fontSize: '0.75rem', color: 'var(--admin-text-muted)', fontStyle: 'italic' }}>{row.remarks}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

// ── Annex Mobile Cards ────────────────────────────────────────────────────────
function AnnexCards({ rows }) {
    if (rows.length === 0) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: '0.88rem' }}>No data for this quarter.</div>;
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {rows.map((row, i) => {
                const variance = row.variance;
                const varColor = variance === null ? 'var(--admin-text-muted)' : variance < 0 ? '#f87171' : '#22c55e';
                return (
                    <div key={i} style={{ background: 'var(--admin-bg-secondary)', borderRadius: 'var(--admin-radius)', padding: '0.85rem 1rem', border: '1px solid var(--admin-border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.4rem' }}>
                            <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--admin-text-primary)', flex: 1 }}>{row.mfo_title}</span>
                            <span style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: 'var(--admin-text-muted)', flexShrink: 0 }}>#{row.ppa_code}</span>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--admin-text-secondary)', marginBottom: '0.5rem' }}>{row.indicator_text}</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.4rem' }}>
                            <div style={{ textAlign: 'center', background: 'var(--admin-card)', borderRadius: 8, padding: '0.4rem' }}>
                                <div style={{ fontSize: '0.6rem', color: 'var(--admin-text-muted)', marginBottom: '0.15rem' }}>TARGET</div>
                                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--admin-text-primary)' }}>{row.target_quantity ?? '—'}</div>
                            </div>
                            <div style={{ textAlign: 'center', background: 'var(--admin-card)', borderRadius: 8, padding: '0.4rem' }}>
                                <div style={{ fontSize: '0.6rem', color: 'var(--admin-text-muted)', marginBottom: '0.15rem' }}>ACTUAL</div>
                                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--admin-accent)' }}>{row.actual_performance}</div>
                            </div>
                            <div style={{ textAlign: 'center', background: 'var(--admin-card)', borderRadius: 8, padding: '0.4rem' }}>
                                <div style={{ fontSize: '0.6rem', color: 'var(--admin-text-muted)', marginBottom: '0.15rem' }}>VARIANCE</div>
                                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: varColor }}>{variance !== null ? (variance >= 0 ? `+${variance}` : variance) : '—'}</div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Index() {
    const { period, q, quarterKey, quarterMonths, coveredMonths, annexRows, mpors, qarHeader, deptHead } = usePage().props;

    const bp       = useBreakpoint();
    const isMobile = bp === 'mobile';
    const [endorsing, setEndorsing] = useState(false);
    const [validationError, setValidationError] = useState(null);
    const [search, setSearch] = useState('');
    const [monthFilter, setMonthFilter] = useState('all');
    const toast   = useToast();
    const confirm = useConfirm();

    const filteredMpors = mpors.filter(m => {
        const matchSearch = m.employee.name.toLowerCase().includes(search.toLowerCase());
        const matchMonth  = monthFilter === 'all' || m.month === monthFilter;
        return matchSearch && matchMonth;
    });

    const canSubmit = annexRows.length > 0 && (!qarHeader || (qarHeader.status !== 'submitted' && qarHeader.status !== 'pmt_approved'));

    function navQ(newQ) {
        router.get('/dept-head/qar', { q: newQ }, { preserveState: false });
    }

    async function handleSubmit() {
        if (!await confirm(`Submit QAR for ${quarterKey} to PMT? This will save all Annex I rows and notify PMT.`)) return;
        setEndorsing(true);
        router.post('/dept-head/qar/submit', { q }, {
            preserveScroll: true,
            onSuccess: () => toast('QAR submitted to PMT successfully.', 'submitted'),
            onError: (errors) => {
                const missingRaw = errors?.missing_mpors;
                if (missingRaw) {
                    try {
                        const items = JSON.parse(missingRaw).map(m => ({
                            name:   m.name,
                            sub:    m.position,
                            avatar: m.avatar,
                            reason: m.reason,
                            notifyPayload: { employee_id: m.employee_id, context: 'qar_missing_mpor', month: m.month },
                        }));
                        setValidationError({
                            title: 'Cannot Submit QAR',
                            description: `All months in ${quarterKey} must have approved MPORs before submitting to PMT.`,
                            items,
                        });
                    } catch {
                        toast(errors?.message ?? 'Failed to submit QAR.', 'error');
                    }
                } else {
                    toast(errors?.message ?? Object.values(errors ?? {})[0] ?? 'Failed to submit QAR.', 'error');
                }
            },
            onFinish: () => setEndorsing(false),
        });
    }

    const quarterLabels = { 1: 'Q1 Jan–Mar', 2: 'Q2 Apr–Jun' };
    const monthsCovered = coveredMonths?.length ?? 0;

    return (
        <>
        <AppLayout title="QAR">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

                {/* Header */}
                <div style={card}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                        <h1 style={{ fontWeight: 700, fontSize: '1.35rem', color: 'var(--admin-text-primary)', lineHeight: 1.1, margin: 0, flex: 1, minWidth: 0 }}>
                            QAR — {period?.name ?? 'No Active Period'}
                        </h1>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 }}>
                            {qarHeader && <StatusBadge status={qarHeader.status} />}
                            {annexRows.length > 0 && (
                                <a href={`/stage-two/forms/qar-export?q=${q}`} style={{ ...btnExport, border: '1px solid #16a34a', color: '#16a34a' }} title="Export Excel">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                    {bp === 'desktop' && 'Export Excel'}
                                </a>
                            )}
                            {canSubmit && (
                                <button onClick={handleSubmit} disabled={endorsing} style={{ ...btnPrimary, background: 'var(--admin-accent)', opacity: endorsing ? 0.7 : 1 }} title="Submit QAR to PMT">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                                    {bp === 'desktop' && (endorsing ? 'Submitting…' : 'Submit QAR to PMT')}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Quarter tabs */}
                    {period && (
                        <div style={{ display: 'flex', gap: '0.4rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
                            {[1,2].map(n => (
                                <button key={n} onClick={() => navQ(n)} style={{
                                    padding: '0.45rem 1rem', borderRadius: 8, border: `1px solid ${q===n ? 'var(--admin-accent)' : 'var(--admin-border-strong)'}`,
                                    background: q===n ? 'rgba(59,130,246,0.12)' : 'var(--admin-bg-secondary)',
                                    color: q===n ? 'var(--admin-accent)' : 'var(--admin-text-muted)',
                                    fontWeight: q===n ? 700 : 500, fontSize: '0.82rem', cursor: 'pointer',
                                }}>
                                    {quarterLabels[n]}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* No period warning */}
                {!period && (
                    <div style={{ ...card, background: 'rgba(234,179,8,0.07)', border: '1px solid rgba(234,179,8,0.25)', color: '#ca8a04', fontSize: '0.85rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                        No active performance period. Contact PMT to activate one.
                    </div>
                )}

                {/* Summary stats */}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '0.65rem' }}>
                    {[
                        { label: 'Included MPORs',   value: mpors.length,    color: 'var(--admin-text-primary)' },
                        { label: 'Employees',         value: [...new Set(mpors.map(m => m.employee.name))].length, color: 'var(--admin-text-primary)' },
                        { label: 'Months Covered',    value: `${monthsCovered} / 3`, color: monthsCovered === 3 ? '#22c55e' : monthsCovered > 0 ? '#f59e0b' : 'var(--admin-text-muted)' },
                        { label: 'Annex I Rows',      value: annexRows.length, color: 'var(--admin-accent)' },
                    ].map((s, i) => (
                        <div key={i} style={card}>
                            <p style={statLabel}>{s.label}</p>
                            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: s.color, lineHeight: 1, marginTop: '0.2rem' }}>{s.value}</div>
                        </div>
                    ))}
                </div>

                {/* Included MPORs */}
                <div style={card}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <p style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--admin-text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--admin-text-muted)" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                            Included MPORs
                        </p>
                        <span style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--admin-text-muted)' }}>Auto-populated from endorsed MPORs</span>
                    </div>
                    {/* Search + Month filters */}
                    {mpors.length > 0 && (
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                            <div style={{ position: 'relative', flex: '1 1 180px', minWidth: 0 }}>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--admin-text-muted)" strokeWidth="2" style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                                <input
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="Search employee…"
                                    style={{ width: '100%', paddingLeft: '2rem', paddingRight: '0.65rem', paddingTop: '0.4rem', paddingBottom: '0.4rem', borderRadius: 8, border: '1px solid var(--admin-border-strong)', background: 'var(--admin-bg-secondary)', color: 'var(--admin-text-primary)', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box' }}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '0.3rem', flexShrink: 0 }}>
                                {[{ value: 'all', label: 'All' }, ...quarterMonths.map(m => ({ value: m, label: new Date(m + '-02').toLocaleString('default', { month: 'short' }) }))].map(opt => (
                                    <button key={opt.value} onClick={() => setMonthFilter(opt.value)} style={{ padding: '0.38rem 0.65rem', borderRadius: 7, border: `1px solid ${monthFilter === opt.value ? 'var(--admin-accent)' : 'var(--admin-border-strong)'}`, background: monthFilter === opt.value ? 'rgba(59,130,246,0.12)' : 'var(--admin-bg-secondary)', color: monthFilter === opt.value ? 'var(--admin-accent)' : 'var(--admin-text-muted)', fontWeight: monthFilter === opt.value ? 700 : 500, fontSize: '0.78rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    {mpors.length === 0 ? (
                        <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: '0.85rem', border: '1px dashed var(--admin-border)', borderRadius: 'var(--admin-radius)' }}>
                            No endorsed MPORs for {quarterLabels[q]}.
                        </div>
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
                                        <StatusBadge status={m.status} />
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--admin-text-primary)' }}>{m.month_label}</span>
                                            {m.approved_at && <span style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)', marginLeft: '0.5rem' }}>{m.approved_at}</span>}
                                        </div>
                                        <Link href={`/dept-head/qar/mpor/${m.id}?q=${q}`} style={btnView}>
                                            View <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ maxHeight: 320, overflowY: 'auto', borderRadius: 'var(--admin-radius)', border: '1px solid var(--admin-border-strong)' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                                    <tr style={{ background: 'var(--admin-bg-secondary)' }}>
                                        {['Employee', 'Month', 'Approved', 'Status', ''].map((h, i) => (
                                            <th key={i} style={{ padding: '0.55rem 0.85rem', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--admin-text-muted)', textAlign: i===4?'right':'left', borderBottom: '1px solid var(--admin-border)', whiteSpace: 'nowrap' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredMpors.length === 0 ? (
                                        <tr><td colSpan={5} style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: '0.85rem' }}>No MPORs match your filter.</td></tr>
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
                                            <td style={tdS}><span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--admin-text-primary)' }}>{m.month_label}</span></td>
                                            <td style={tdS}><span style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)' }}>{m.approved_at ?? '—'}</span></td>
                                            <td style={tdS}><StatusBadge status={m.status} /></td>
                                            <td style={{ ...tdS, textAlign: 'right' }}>
                                                <Link href={`/dept-head/qar/mpor/${m.id}?q=${q}`} style={btnView}>
                                                    View <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                                                </Link>
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
                        <p style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--admin-text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--admin-text-muted)" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/></svg>
                            Annex I — Quarterly Performance Summary
                        </p>
                        <span style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)' }}>
                            QUARTERLY PHYSICAL REPORT OF OPERATIONS · {quarterLabels[q]}
                        </span>
                    </div>
                    {isMobile ? <AnnexCards rows={annexRows} /> : <AnnexTable rows={annexRows} />}

                    {/* Signature footer */}
                    {annexRows.length > 0 && (
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '0.65rem', marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--admin-border)' }}>
                            <div>
                                <p style={{ ...statLabel, marginBottom: '0.4rem' }}>Prepared by</p>
                                <div style={{ fontWeight: 700, color: 'var(--admin-text-primary)', fontSize: '0.9rem' }}>{deptHead?.name}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>{deptHead?.position ?? 'Department Head'}</div>
                                {qarHeader?.approved_at && <div style={{ fontSize: '0.72rem', color: 'var(--admin-accent)', marginTop: '0.2rem' }}>Submitted {qarHeader.approved_at}</div>}
                            </div>
                            <div>
                                <p style={{ ...statLabel, marginBottom: '0.4rem' }}>PMT Validation</p>
                                {qarHeader?.pmt_status === 'validated' ? (
                                    <div style={{ fontWeight: 600, color: '#22c55e', fontSize: '0.88rem' }}>✓ Validated by PMT</div>
                                ) : qarHeader?.pmt_status === 'returned' ? (
                                    <div style={{ fontWeight: 600, color: '#f87171', fontSize: '0.88rem' }}>Returned by PMT</div>
                                ) : (
                                    <div style={{ fontSize: '0.82rem', color: 'var(--admin-text-muted)', fontStyle: 'italic' }}>Pending PMT validation</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </AppLayout>
        {validationError && (
            <ValidationModal
                title={validationError.title}
                description={validationError.description}
                items={validationError.items}
                onClose={() => setValidationError(null)}
            />
        )}
        </>
    );
}

const card      = { background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)', borderRadius: 'var(--admin-radius)', padding: '1.25rem 1.5rem', boxShadow: 'var(--admin-shadow)' };
const iconBox   = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 42, height: 42, borderRadius: 12, border: '1px solid var(--admin-border)', background: 'rgba(139,92,246,0.08)', color: 'var(--admin-accent)', flexShrink: 0 };
const statLabel = { fontSize: '0.72rem', fontWeight: 600, color: 'var(--admin-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.15rem' };
const tdS       = { padding: '0.7rem 0.85rem', borderBottom: '1px solid var(--admin-border)', verticalAlign: 'middle' };
const btnView   = { display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.35rem 0.75rem', borderRadius: 7, border: '1px solid var(--admin-border-strong)', background: 'transparent', color: 'var(--admin-text-primary)', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', textDecoration: 'none', whiteSpace: 'nowrap' };
const btnPrimary = { display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1.15rem', borderRadius: 10, border: 'none', color: '#fff', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' };
const btnExport  = { display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', borderRadius: 10, border: '1px solid var(--admin-border-strong)', background: 'var(--admin-bg-secondary)', color: 'var(--admin-text-primary)', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', textDecoration: 'none' };
