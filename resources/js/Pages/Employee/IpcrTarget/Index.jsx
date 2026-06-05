import { useState } from 'react';
import { usePage, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { useToast } from '@/Components/Snackbar';

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS = {
    draft:     { bg: 'rgba(100,116,139,0.15)', color: '#94a3b8', border: 'rgba(100,116,139,0.3)', icon: '●', label: 'Draft' },
    committed: { bg: 'rgba(5,150,105,0.12)',   color: '#34d399', border: 'rgba(5,150,105,0.3)',   icon: '✓', label: 'Committed' },
};

// Function type colour bands (mirror the IPCR Excel format)
const FN_COLORS = {
    core:      { bg: 'rgba(251,191,36,0.12)',  accent: '#f59e0b', label: 'CORE FUNCTIONS' },
    strategic: { bg: 'rgba(139,92,246,0.10)', accent: '#8b5cf6', label: 'STRATEGIC OBJECTIVES' },
    support:   { bg: 'rgba(16,185,129,0.10)', accent: '#10b981', label: 'SUPPORT FUNCTIONS' },
};
const fnColor = type => FN_COLORS[type] ?? FN_COLORS.support;

const RATING_LABELS = { 5: 'Outstanding', 4: 'Very Satisfactory', 3: 'Satisfactory', 2: 'Unsatisfactory', 1: 'Poor' };
const DIM_LABELS    = { quality: 'Q — Quality', efficiency: 'E — Efficiency', timeliness: 'T — Timeliness' };

// ── QET Toggle ────────────────────────────────────────────────────────────────
function QetPanel({ qet }) {
    const [open, setOpen] = useState(false);
    const hasData = qet && Object.keys(qet).length > 0;
    if (!hasData) return null;
    return (
        <div style={{ marginTop: '0.6rem' }}>
            <button
                onClick={() => setOpen(v => !v)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--admin-accent)', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 6, padding: '0.25rem 0.65rem', cursor: 'pointer', fontWeight: 600 }}
            >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points={open ? '18 15 12 9 6 15' : '6 9 12 15 18 9'} /></svg>
                QET Standards
            </button>
            {open && (
                <div style={{ marginTop: '0.5rem', borderRadius: 8, border: '1px solid var(--admin-border)', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.73rem' }}>
                        <thead>
                            <tr style={{ background: 'var(--admin-bg-alt)' }}>
                                <th style={th}>Dimension</th>
                                {[5, 4, 3, 2, 1].map(r => (
                                    <th key={r} style={{ ...th, minWidth: 90 }}>{r} — {RATING_LABELS[r]}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(qet).map(([dim, ratings]) => (
                                <tr key={dim} style={{ borderTop: '1px solid var(--admin-border)' }}>
                                    <td style={{ ...td, fontWeight: 600, color: 'var(--admin-text-primary)', whiteSpace: 'nowrap' }}>
                                        {DIM_LABELS[dim] ?? dim}
                                    </td>
                                    {[5, 4, 3, 2, 1].map(r => (
                                        <td key={r} style={{ ...td, color: 'var(--admin-text-muted)' }}>
                                            {ratings[r] ?? '—'}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// ── MFO Accordion Block ───────────────────────────────────────────────────────
function MfoBlock({ mfo }) {
    const [open, setOpen] = useState(true);
    return (
        <div style={s.mfoBlock}>
            <button
                onClick={() => setOpen(v => !v)}
                style={s.mfoHeader}
            >
                <span style={s.mfoTitle}>{mfo.title}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {mfo.weight_percent > 0 && <span style={s.mfoWeight}>{mfo.weight_percent}%</span>}
                    <span style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)', marginLeft: 2 }}>
                        {mfo.indicators.length} indicator{mfo.indicators.length !== 1 ? 's' : ''}
                    </span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--admin-text-muted)" strokeWidth="2.5">
                        <polyline points={open ? '18 15 12 9 6 15' : '6 9 12 15 18 9'} />
                    </svg>
                </div>
            </button>
            {open && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', padding: '0.85rem 1rem' }}>
                    {mfo.indicators.map((si, i) => (
                        <IndicatorRow key={si.id} si={si} index={i} />
                    ))}
                </div>
            )}
        </div>
    );
}
function IndicatorRow({ si, index }) {
    return (
        <div style={s.indicatorRow}>
            {/* Output column */}
            <div style={s.outputCol}>
                <div style={s.outputNum}>{index + 1}</div>
                {si.reference_code && (
                    <span style={s.refCode}>{si.reference_code}</span>
                )}
            </div>

            {/* Success Indicator column */}
            <div style={s.siCol}>
                <p style={s.siText}>{si.indicator_text}</p>

                {(si.target_quantity || si.target_timeline) && (
                    <div style={s.targetRow}>
                        <span style={s.targetChip}>
                            {[si.target_quantity, si.target_timeline].filter(Boolean).join(' ')}
                        </span>
                    </div>
                )}

                <QetPanel qet={si.qet} />
            </div>
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Index() {
    const { ipcr, functions: fns = [], period, employee } = usePage().props;
    const toast   = useToast();
    const [committing, setCommitting] = useState(false);
    const [localStatus, setLocalStatus] = useState(ipcr?.status ?? 'draft');

    const sc         = STATUS[localStatus] ?? STATUS.draft;
    const canCommit  = localStatus === 'draft' && ipcr && fns.length > 0;
    const totalItems = fns.reduce((sum, fn) => sum + fn.mfos.reduce((s, m) => s + m.indicators.length, 0), 0);

    function handleCommit() {
        if (!ipcr) return;
        setCommitting(true);
        router.patch(`/employee/ipcr-target/${ipcr.id}/commit`, {}, {
            onSuccess: () => { setLocalStatus('committed'); toast('IPCR committed successfully.', 'success'); },
            onError:   () => toast('Failed to commit IPCR.', 'error'),
            onFinish:  () => setCommitting(false),
        });
    }

    // ── No active period or no OPCR ──────────────────────────────────────────
    if (!period || !ipcr) {
        return (
            <AppLayout title="IPCR Target">
                <style>{css}</style>
                <div style={s.emptyCard}>
                    <div style={s.emptyIcon}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--admin-accent)" strokeWidth="1.6"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                    </div>
                    <h4 style={s.emptyTitle}>No IPCR Available</h4>
                    <p style={s.emptyText}>
                        {!period
                            ? 'There is no active performance period at this time.'
                            : 'Your office\'s OPCR has not been approved yet. Your IPCR will be generated once the OPCR is approved.'}
                    </p>
                </div>
            </AppLayout>
        );
    }

    // ── Main view ────────────────────────────────────────────────────────────
    return (
        <AppLayout title="IPCR Target">
            <style>{css}</style>

            {/* ── Top bar ── */}
            <div style={s.topbar} className="ipcr-topbar">
                {/* Row 1: meta info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <div>
                        <div style={s.period}>{period?.name ?? 'Performance Period'}</div>
                        <div style={s.office}>{employee?.office ?? '—'}</div>
                    </div>
                    <div style={{ ...s.statusPill, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                        <span>{sc.icon}</span><span>{sc.label}</span>
                    </div>
                    <div style={s.countPill}>{totalItems} indicator{totalItems !== 1 ? 's' : ''}</div>
                </div>

                {/* Row 2: actions */}
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                    <a href="/stage-one/forms/ipcr-excel" style={s.exportBtn}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                        Export Excel
                    </a>
                    {canCommit && (
                        <button style={s.commitBtn} onClick={handleCommit} disabled={committing}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                            {committing ? 'Committing…' : 'Commit IPCR'}
                        </button>
                    )}
                    {localStatus === 'committed' && (
                        <div style={s.committedBadge}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                            Committed
                        </div>
                    )}
                </div>
            </div>

            {/* ── IPCR header block (matches official form layout) ── */}
            <div style={s.ipcrHeader} className="ipcr-header-block">
                <div style={s.ipcrHeaderTitle}>INDIVIDUAL PERFORMANCE COMMITMENT AND REVIEW (IPCR)</div>
                <div style={s.ipcrHeaderMeta}>
                    <span><strong>{employee?.name ?? '—'}</strong></span>
                    <span style={{ color: 'var(--admin-text-muted)', fontSize: '0.82rem' }}>{employee?.office ?? '—'}</span>
                    <span style={{ color: 'var(--admin-text-muted)', fontSize: '0.82rem' }}>{period?.name ?? '—'}</span>
                </div>
            </div>

            {/* ── Functions ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '2rem' }}>
                {fns.length === 0 ? (
                    <div style={s.emptyCard}>
                        <p style={s.emptyText}>No indicators have been assigned to you yet.</p>
                    </div>
                ) : fns.map((fn, fnIdx) => {
                    const col = fnColor(fn.function_type);
                    const fnLetter = String.fromCharCode(65 + fnIdx); // A, B, C...
                    return (
                        <div key={fn.id} style={{ ...s.fnSection, borderLeft: `3px solid ${col.accent}` }}>
                            {/* Function banner */}
                            <div style={{ ...s.fnBanner, background: col.bg }}>
                                <span style={{ ...s.fnLabel, color: col.accent }}>
                                    {fnLetter}. {col.label} ({fn.weight_percent}%)
                                </span>
                            </div>

                            {/* MFOs */}
                            {fn.mfos.map(mfo => <MfoBlock key={mfo.id} mfo={mfo} />)}
                        </div>
                    );
                })}
            </div>
        </AppLayout>
    );
}

// ── Inline styles ─────────────────────────────────────────────────────────────
const th = { padding: '0.45rem 0.6rem', textAlign: 'left', fontWeight: 600, color: 'var(--admin-text-muted)', verticalAlign: 'top', borderRight: '1px solid var(--admin-border)' };
const td = { padding: '0.45rem 0.6rem', verticalAlign: 'top', borderRight: '1px solid var(--admin-border)', lineHeight: 1.5 };

const s = {
    topbar: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'var(--admin-card)', borderRadius: 'var(--admin-radius)',
        border: '1px solid var(--admin-border-strong)', padding: '0.85rem 1.1rem',
        marginBottom: '1rem', gap: '0.6rem', flexWrap: 'wrap',
        boxShadow: 'var(--admin-shadow)',
    },
    divider: { width: 1, height: 32, background: 'var(--admin-border-strong)' },
    period:  { fontSize: '0.95rem', fontWeight: 700, color: 'var(--admin-text-primary)', lineHeight: 1.2 },
    office:  { fontSize: '0.78rem', color: 'var(--admin-text-muted)', marginTop: 2 },
    statusPill: {
        display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
        padding: '0.25rem 0.75rem', borderRadius: 999, fontSize: '0.75rem', fontWeight: 700,
    },
    countPill: {
        fontSize: '0.72rem', color: 'var(--admin-text-muted)', background: 'var(--admin-bg-alt)',
        border: '1px solid var(--admin-border)', borderRadius: 999, padding: '0.2rem 0.6rem',
    },
    exportBtn: {
        display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
        padding: '0.45rem 0.9rem', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600,
        background: 'var(--admin-bg-alt)', border: '1px solid var(--admin-border)',
        color: 'var(--admin-text-primary)', textDecoration: 'none', cursor: 'pointer',
    },
    commitBtn: {
        display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
        padding: '0.45rem 1rem', borderRadius: 8, fontSize: '0.8rem', fontWeight: 700,
        background: 'rgba(5,150,105,0.15)', border: '1px solid rgba(5,150,105,0.35)',
        color: '#34d399', cursor: 'pointer',
    },
    committedBadge: {
        display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
        padding: '0.35rem 0.8rem', borderRadius: 8, fontSize: '0.78rem', fontWeight: 700,
        background: 'rgba(5,150,105,0.10)', border: '1px solid rgba(5,150,105,0.25)', color: '#34d399',
    },
    ipcrHeader: {
        background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)',
        borderRadius: 'var(--admin-radius)', padding: '1rem 1.25rem', marginBottom: '1.25rem',
        boxShadow: 'var(--admin-shadow)',
    },
    ipcrHeaderTitle: {
        fontWeight: 800, fontSize: '0.95rem', color: 'var(--admin-text-primary)',
        textAlign: 'center', letterSpacing: '0.02em', marginBottom: '0.5rem',
    },
    ipcrHeaderMeta: {
        display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1.5rem', justifyContent: 'center',
        fontSize: '0.85rem', color: 'var(--admin-text-primary)',
    },
    fnSection: {
        background: 'var(--admin-card)', borderRadius: 'var(--admin-radius)',
        border: '1px solid var(--admin-border-strong)', overflow: 'hidden',
        boxShadow: 'var(--admin-shadow)',
    },
    fnBanner: {
        padding: '0.65rem 1.1rem', borderBottom: '1px solid var(--admin-border)',
    },
    fnLabel: { fontWeight: 800, fontSize: '0.85rem', letterSpacing: '0.04em', textTransform: 'uppercase' },
    mfoBlock: { borderBottom: '1px solid var(--admin-border)' },
    mfoHeader: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0.7rem 1rem', background: 'var(--admin-bg-alt)',
        borderBottom: '1px solid var(--admin-border)',
        width: '100%', border: 'none', borderBottom: '1px solid var(--admin-border)',
        cursor: 'pointer', textAlign: 'left',
    },
    mfoTitle: { fontWeight: 700, fontSize: '0.88rem', color: 'var(--admin-text-primary)' },
    mfoWeight: {
        fontSize: '0.72rem', fontWeight: 700, color: 'var(--admin-text-muted)',
        background: 'var(--admin-card)', border: '1px solid var(--admin-border)',
        borderRadius: 999, padding: '0.15rem 0.55rem',
    },
    colHeaders: {
        display: 'flex', padding: '0.4rem 1.1rem', gap: '0.75rem',
        borderBottom: '1px solid var(--admin-border)',
    },
    colHeaderCell: {
        fontSize: '0.7rem', fontWeight: 700, color: 'var(--admin-text-muted)',
        textTransform: 'uppercase', letterSpacing: '0.06em',
    },
    indicatorRow: {
        display: 'flex', gap: '0.85rem', padding: '0.9rem 1rem',
        alignItems: 'flex-start',
        background: 'var(--admin-bg)',
        border: '1px solid var(--admin-border)',
        borderRadius: 10,
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    },
    outputCol: {
        flex: '0 0 30px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem',
    },
    outputNum: {
        width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(59,130,246,0.1)', border: '1.5px solid rgba(59,130,246,0.25)',
        fontSize: '0.75rem', fontWeight: 700, color: 'var(--admin-accent)', flexShrink: 0,
    },
    refCode: {
        fontSize: '0.62rem', color: 'var(--admin-text-muted)', textAlign: 'center', wordBreak: 'break-all',
    },
    siCol: { flex: 1, minWidth: 0 },
    siText: {
        fontSize: '0.88rem', color: 'var(--admin-text-primary)', lineHeight: 1.65, margin: 0, fontWeight: 500,
    },
    targetRow: { display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.55rem' },
    targetChip: {
        display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
        fontSize: '0.73rem', fontWeight: 600, padding: '0.2rem 0.55rem', borderRadius: 6,
        background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.18)', color: 'var(--admin-accent)',
    },
    emptyCard: {
        background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)',
        borderRadius: 'var(--admin-radius)', padding: '2.5rem 2rem', textAlign: 'center',
        boxShadow: 'var(--admin-shadow)',
    },
    emptyIcon: {
        width: 52, height: 52, borderRadius: 14, background: 'rgba(59,130,246,0.10)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem',
    },
    emptyTitle: { fontWeight: 700, fontSize: '1.05rem', color: 'var(--admin-text-primary)', marginBottom: '0.4rem' },
    emptyText:  { fontSize: '0.88rem', color: 'var(--admin-text-muted)', lineHeight: 1.6, margin: 0 },
};

// ── Responsive CSS ─────────────────────────────────────────────────────────────
const css = `
    @media (max-width: 640px) {
        .ipcr-topbar { flex-direction: column; align-items: stretch !important; }
        .ipcr-topbar > div { width: 100%; }
        .ipcr-col-headers { display: none !important; }
    }
`;
