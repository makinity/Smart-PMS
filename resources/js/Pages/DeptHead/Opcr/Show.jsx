import { useState } from 'react';
import { usePage, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import ReturnRemarksBanner from '@/Components/ReturnRemarksBanner';
import { useToast } from '@/Components/Snackbar';

const STATUS = {
    draft:     { bg: 'rgba(100,116,139,0.15)', color: '#94a3b8', border: 'rgba(100,116,139,0.3)', icon: '●', label: 'Draft' },
    submitted: { bg: 'rgba(37,99,235,0.12)',   color: '#60a5fa', border: 'rgba(37,99,235,0.3)',   icon: '↑', label: 'Submitted' },
    approved:  { bg: 'rgba(5,150,105,0.12)',   color: '#34d399', border: 'rgba(5,150,105,0.3)',   icon: '✓', label: 'Approved' },
};

const COLORS = ['#3b82f6','#8b5cf6','#ec4899','#f59e0b','#10b981','#ef4444','#06b6d4'];
const colorFor = name => COLORS[(name ?? '').charCodeAt(0) % COLORS.length];
const initials = name => name ? name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() : '?';

export default function Show() {
    const { opcr, uwps = [], functions: fns = [] } = usePage().props;
    const sc = STATUS[opcr?.status] ?? STATUS.draft;
    const toast = useToast();
    const [status, setStatus] = useState(opcr?.status ?? 'draft');

    const [activeFnId,  setActiveFnId]  = useState(fns?.[0]?.id ?? null);
    const [activeMfoId, setActiveMfoId] = useState(fns?.[0]?.mfos?.[0]?.id ?? null);
    const [activeUwpId, setActiveUwpId] = useState(null); // null = show all
    const [submitting,  setSubmitting]  = useState(false);

    const activeFn = fns?.find(f => f.id === activeFnId);

    const allApproved   = uwps.length > 0 && uwps.every(u => u.status === 'approved');
    const approvedCount = uwps.filter(u => u.status === 'approved').length;
    const canSubmit     = opcr?.status === 'draft' && allApproved;

    function handleSubmit() {
        setSubmitting(true);
        router.patch(`/dept-head/opcr/${opcr.id}/submit`, {}, {
            onSuccess: () => { setStatus('submitted'); toast('OPCR submitted to PMT.', 'success'); },
            onError:   () => toast('Failed to submit OPCR.', 'error'),
            onFinish:  () => setSubmitting(false),
        });
    }

    // Filter SIs by selected UWP if any
    const visibleFns = activeFn ? [{
        ...activeFn,
        mfos: activeFn.mfos
            .filter(mfo => !activeMfoId || mfo.id === activeMfoId)
            .map(mfo => ({
                ...mfo,
                successIndicators: mfo.successIndicators.filter(
                    si => !activeUwpId || si.supervisor === uwps.find(u => u.id === activeUwpId)?.supervisor
                ),
            }))
            .filter(mfo => mfo.successIndicators.length > 0),
    }] : [];

    return (
        <AppLayout title="OPCR">
            <style>{css}</style>

            {/* ── Top bar ── */}
            <div style={s.topbar}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button onClick={() => router.visit('/dept-head/opcr')} style={s.backBtn}>&#8592;</button>
                    <div style={s.divider} />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={s.period}>{opcr?.period}</span>
                        <span style={s.office}>{opcr?.office}</span>
                    </div>
                    <div style={{ ...s.statusPill, background: STATUS[status]?.bg ?? sc.bg, color: STATUS[status]?.color ?? sc.color, border: `1px solid ${STATUS[status]?.border ?? sc.border}` }}>
                        <span>{sc.icon}</span><span>{sc.label}</span>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <a href={`/stage-one/forms/opcr-excel?opcr_id=${opcr?.id}`} style={s.exportBtn}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                        Export Excel
                    </a>
                    {canSubmit && (
                        <button style={s.submitBtn} onClick={handleSubmit} disabled={submitting}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                            {submitting ? 'Submitting…' : 'Submit to PMT'}
                        </button>
                    )}
                    {!allApproved && opcr?.status === 'draft' && (
                        <div style={s.warnPill}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                            {approvedCount}/{uwps.length} UWPs approved
                        </div>
                    )}
                </div>
            </div>

            {/* ── Return remarks banner ── */}
            {status === 'returned' && <ReturnRemarksBanner remarks={opcr?.return_remarks} label="Returned by PMT" />}

            {/* ── Layout ── */}
            <div style={s.layout} className="opcr-layout">

                {/* Left panel — Contributing UWPs */}
                <aside style={s.leftPanel} className="opcr-left">
                    <div style={s.panelLabel}>Contributing UWPs</div>
                    {uwps.map(u => (
                        <button
                            key={u.id}
                            style={{ ...s.uwpItem, ...(activeUwpId === u.id ? s.uwpItemActive : {}) }}
                            onClick={() => setActiveUwpId(activeUwpId === u.id ? null : u.id)}
                        >
                            <div style={{ ...s.avatar, background: colorFor(u.supervisor) }}>
                                {initials(u.supervisor)}
                            </div>
                            <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--admin-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.supervisor}</div>
                                {u.mfo_labels && <div style={{ fontSize: '0.7rem', color: 'var(--admin-text-muted)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.mfo_labels}</div>}
                            </div>
                            <span style={u.status === 'approved'
                                ? { fontSize: '0.65rem', fontWeight: 700, color: '#34d399', background: 'rgba(5,150,105,0.12)', border: '1px solid rgba(5,150,105,0.3)', padding: '0.15rem 0.5rem', borderRadius: 999 }
                                : { fontSize: '0.65rem', fontWeight: 700, color: '#f87171', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', padding: '0.15rem 0.5rem', borderRadius: 999 }
                            }>
                                {u.status === 'approved' ? '✓' : '✗'}
                            </span>
                        </button>
                    ))}
                    <div style={s.uwpSummary}>
                        <span style={{ color: allApproved ? '#34d399' : '#facc15' }}>
                            {approvedCount} of {uwps.length} UWPs approved
                        </span>
                    </div>

                    <div style={{ borderTop: '1px solid var(--admin-border)', margin: '0.75rem 0' }} />
                    <div style={s.panelLabel}>MFOs / PPAs</div>
                    {fns?.map(fn => (
                        <div key={fn.id}>
                            <button
                                style={{ ...s.fnItem, ...(activeFnId === fn.id ? s.fnItemActive : {}) }}
                                onClick={() => { setActiveFnId(fn.id); setActiveMfoId(fn.mfos?.[0]?.id ?? null); }}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                                <span style={{ flex: 1, textAlign: 'left' }}>{fn.name}</span>
                            </button>
                            {activeFnId === fn.id && fn.mfos?.map(mfo => (
                                <button key={mfo.id}
                                    style={{ ...s.mfoItem, ...(activeMfoId === mfo.id ? s.mfoItemActive : {}) }}
                                    onClick={() => setActiveMfoId(mfo.id)}
                                >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
                                    <span style={{ flex: 1, textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{mfo.title}</span>
                                </button>
                            ))}
                        </div>
                    ))}
                </aside>

                {/* Center panel */}
                <main style={s.centerPanel} className="opcr-center">
                    {visibleFns.map(fn => (
                        <div key={fn.id}>
                            {fn.mfos.map(mfo => (
                                <section key={mfo.id} style={s.mfoGroup}>
                                    <div style={s.mfoHeader}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <span style={s.mfoIcon}>
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
                                            </span>
                                            <span style={s.mfoTitle}>{mfo.title}</span>
                                        </div>
                                        <span style={s.countBadge}>{mfo.successIndicators.length} Indicator{mfo.successIndicators.length !== 1 ? 's' : ''}</span>
                                    </div>
                                    {mfo.successIndicators.map((si, idx) => (
                                        <SiCard key={si.id} si={si} index={idx + 1} />
                                    ))}
                                </section>
                            ))}
                        </div>
                    ))}
                    {!activeFn && <p style={{ ...s.empty, padding: '4rem' }}>Select a function to view its indicators.</p>}
                </main>
            </div>
        </AppLayout>
    );
}

function SiCard({ si, index }) {
    const [qetOpen, setQetOpen] = useState(false);
    return (
        <div style={s.siCard} className="si-card">
            <div style={s.siHeader}>
                <span style={s.siIndex}>{index}</span>
                <h4 style={s.siTitle}>{si.indicator_text ?? '—'}</h4>
            </div>
            <div style={{ paddingLeft: '2.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {(si.target_quantity || si.target_timeline) && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <span style={s.detailLabel}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>
                            Target
                        </span>
                        <span style={{ fontSize: '0.85rem', color: 'var(--admin-text-primary)', fontWeight: 500 }}>
                            {si.target_quantity && <strong>{si.target_quantity} </strong>}{si.target_timeline}
                        </span>
                    </div>
                )}
                {si.assignments?.length > 0 && <AssigneeStack assignees={si.assignments} />}
                {si.qetStandards?.length > 0 && (
                    <div>
                        <button style={s.qetToggle} onClick={() => setQetOpen(v => !v)}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                            QET Standards ({si.qetStandards.length})
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: 'auto', transform: qetOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9"/></svg>
                        </button>
                        {qetOpen && (
                            <div style={s.qetTable}>
                                <div style={s.qetHead}><span>Dimension</span><span style={{ textAlign: 'center' }}>Rating</span><span>Standard</span></div>
                                {si.qetStandards.map(q => (
                                    <div key={q.id} style={s.qetRow}>
                                        <span style={s.qetDim}>{q.dimension}</span>
                                        <span style={s.qetRating}>{q.rating}</span>
                                        <span style={s.qetText}>{q.standard_text}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function AssigneeStack({ assignees }) {
    const [open, setOpen] = useState(false);
    const MAX_VISIBLE = 5;
    const visible  = assignees.slice(0, MAX_VISIBLE);
    const extra    = assignees.length - MAX_VISIBLE;

    return (
        <>
            <div style={{ paddingLeft: '2.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
                onClick={() => setOpen(true)} title="View assigned employees">
                <div style={{ display: 'flex' }}>
                    {visible.map((a, i) => (
                        <div key={i} style={{ ...sm.avatar, background: colorFor(a.employee?.name), marginLeft: i === 0 ? 0 : -8, zIndex: MAX_VISIBLE - i }}>
                            {initials(a.employee?.name)}
                        </div>
                    ))}
                    {extra > 0 && (
                        <div style={{ ...sm.avatar, background: 'var(--admin-bg-secondary)', color: 'var(--admin-text-muted)', border: '2px solid var(--admin-border)', marginLeft: -8, fontSize: '0.6rem', fontWeight: 700 }}>
                            +{extra}
                        </div>
                    )}
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)', fontWeight: 500 }}>{assignees.length} assigned</span>
            </div>

            {open && (
                <div style={sm.overlay} onClick={() => setOpen(false)}>
                    <div style={sm.modal} onClick={e => e.stopPropagation()}>
                        <div style={sm.header}>
                            <span style={sm.title}>Assigned Employees</span>
                            <button style={sm.closeBtn} onClick={() => setOpen(false)}>✕</button>
                        </div>
                        <div style={sm.list}>
                            {assignees.map((a, i) => (
                                <div key={i} style={sm.row}>
                                    <div style={{ ...sm.bigAvatar, background: colorFor(a.employee?.name) }}>
                                        {initials(a.employee?.name)}
                                    </div>
                                    <div>
                                        <div style={sm.empName}>{a.employee?.name ?? '—'}</div>
                                        {a.employee?.position && <div style={sm.empPos}>{a.employee.position}</div>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

const sm = {
    avatar:    { width: 30, height: 30, borderRadius: '50%', color: '#fff', fontSize: '0.62rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--admin-card)', flexShrink: 0, overflow: 'hidden' },
    overlay:   { position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    modal:     { background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)', borderRadius: 14, width: 360, maxHeight: '70vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' },
    header:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: '1px solid var(--admin-border)' },
    title:     { fontWeight: 700, fontSize: '0.95rem', color: 'var(--admin-text-primary)' },
    closeBtn:  { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-muted)', fontSize: '1rem' },
    list:      { overflowY: 'auto', padding: '0.75rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' },
    row:       { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.75rem', borderRadius: 8, background: 'var(--admin-bg-secondary)', border: '1px solid var(--admin-border)' },
    bigAvatar: { width: 38, height: 38, borderRadius: '50%', color: '#fff', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    empName:   { fontSize: '0.88rem', fontWeight: 600, color: 'var(--admin-text-primary)' },
    empPos:    { fontSize: '0.75rem', color: 'var(--admin-text-muted)', marginTop: 2 },
};

const s = {
    topbar:      { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', gap: '0.75rem', flexWrap: 'wrap' },
    backBtn:     { background: 'none', border: 'none', color: 'var(--admin-text-primary)', fontSize: '1.4rem', cursor: 'pointer', padding: '0 0.25rem', lineHeight: 1 },
    divider:     { width: 1, height: 32, background: 'var(--admin-border-strong)' },
    period:      { fontSize: '0.9rem', fontWeight: 700, color: 'var(--admin-text-primary)', lineHeight: 1.2 },
    office:      { fontSize: '0.75rem', color: 'var(--admin-text-muted)' },
    statusPill:  { display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.3rem 0.85rem', borderRadius: 999, fontSize: '0.78rem', fontWeight: 700 },
    submitBtn:   { display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.5rem 1.1rem', borderRadius: 8, border: 'none', background: 'rgba(37,99,235,0.9)', color: '#fff', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' },
    exportBtn:   { display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.5rem 1.1rem', borderRadius: 8, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.28)', color: '#4ade80', fontSize: '0.82rem', fontWeight: 600, textDecoration: 'none' },
    warnPill:    { display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.85rem', borderRadius: 999, fontSize: '0.78rem', fontWeight: 600, background: 'rgba(234,179,8,0.12)', border: '1px solid rgba(234,179,8,0.3)', color: '#facc15' },
    layout:      { display: 'flex', borderRadius: 'var(--admin-radius)', border: '1px solid var(--admin-border-strong)', background: 'var(--admin-card)', boxShadow: 'var(--admin-shadow)', overflow: 'hidden', minHeight: 600 },
    leftPanel:   { width: 270, minWidth: 270, borderRight: '1px solid var(--admin-border)', background: 'var(--admin-sidebar)', flexShrink: 0, padding: '1.25rem 0', overflowY: 'auto' },
    panelLabel:  { padding: '0 1rem 0.65rem', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.09em', color: 'var(--admin-text-muted)', textTransform: 'uppercase' },
    uwpItem:     { width: '100%', display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.55rem 1rem', background: 'none', border: 'none', cursor: 'pointer', borderLeft: '2px solid transparent' },
    uwpItemActive:{ background: 'rgba(59,130,246,0.07)', borderLeftColor: 'var(--admin-accent)' },
    avatar:      { width: 28, height: 28, borderRadius: '50%', color: '#fff', fontSize: '0.6rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    uwpSummary:  { padding: '0.5rem 1rem', fontSize: '0.75rem', fontWeight: 600 },
    fnItem:      { width: '100%', display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 1rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-muted)', textAlign: 'left', borderLeft: '2px solid transparent', fontSize: '0.82rem' },
    fnItemActive:{ color: 'var(--admin-accent)', background: 'rgba(59,130,246,0.07)', borderLeftColor: 'var(--admin-accent)', fontWeight: 600 },
    mfoItem:     { width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.45rem 1rem 0.45rem 2rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-muted)', textAlign: 'left', borderLeft: '2px solid transparent', fontSize: '0.76rem' },
    mfoItemActive:{ color: 'var(--admin-text-primary)', background: 'rgba(255,255,255,0.04)', borderLeftColor: 'var(--admin-border-strong)', fontWeight: 500 },
    centerPanel: { flex: 1, overflowY: 'auto', padding: '1.5rem', minWidth: 0 },
    empty:       { color: 'var(--admin-text-muted)', fontSize: '0.82rem', fontStyle: 'italic' },
    mfoGroup:    { marginBottom: '2.5rem' },
    mfoHeader:   { display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid var(--admin-border)', marginBottom: '1rem' },
    mfoIcon:     { color: 'var(--admin-accent)', display: 'flex', alignItems: 'center' },
    mfoTitle:    { fontWeight: 700, fontSize: '0.95rem', color: 'var(--admin-text-primary)' },
    countBadge:  { padding: '0.2rem 0.75rem', borderRadius: 999, background: 'var(--admin-bg-secondary)', border: '1px solid var(--admin-border)', fontSize: '0.72rem', color: 'var(--admin-text-muted)', whiteSpace: 'nowrap' },
    siCard:      { background: 'rgba(255,255,255,0.02)', border: '1px solid var(--admin-border)', borderRadius: 12, padding: '1.25rem 1.5rem', marginBottom: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' },
    siHeader:    { display: 'flex', gap: '0.75rem', alignItems: 'flex-start' },
    siIndex:     { flexShrink: 0, width: 24, height: 24, borderRadius: '50%', background: 'rgba(59,130,246,0.15)', color: 'var(--admin-accent)', fontSize: '0.7rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
    siTitle:     { fontSize: '1rem', fontWeight: 600, color: 'var(--admin-text-primary)', lineHeight: 1.5, margin: 0 },
    detailLabel: { display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--admin-text-muted)', textTransform: 'uppercase' },
    qetToggle:   { display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'none', border: '1px solid var(--admin-border)', borderRadius: 6, padding: '0.35rem 0.75rem', color: '#4ade80', fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer', width: '100%' },
    qetTable:    { marginTop: '0.5rem', border: '1px solid var(--admin-border)', borderRadius: 8, overflow: 'hidden' },
    qetHead:     { display: 'grid', gridTemplateColumns: '110px 70px 1fr', padding: '0.45rem 0.75rem', background: 'var(--admin-bg-secondary)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--admin-text-muted)', textTransform: 'uppercase', borderBottom: '1px solid var(--admin-border)' },
    qetRow:      { display: 'grid', gridTemplateColumns: '110px 70px 1fr', padding: '0.55rem 0.75rem', borderBottom: '1px solid var(--admin-border)', fontSize: '0.82rem', alignItems: 'start' },
    qetDim:      { color: 'var(--admin-text-secondary)', fontWeight: 600, textTransform: 'capitalize', paddingRight: '0.5rem' },
    qetRating:   { color: 'var(--admin-accent)', fontWeight: 700, textAlign: 'center' },
    qetText:     { color: 'var(--admin-text-secondary)', lineHeight: 1.5 },
};

const css = `
.si-card:hover { border-color: rgba(59,130,246,0.3) !important; }
button:hover:not(:disabled) { opacity: 0.85; }
@media (max-width: 768px) {
    .opcr-layout { flex-direction: column !important; }
    .opcr-left { width: 100% !important; min-width: unset !important; border-right: none !important; border-bottom: 1px solid var(--admin-border) !important; }
    .opcr-center { padding: 1rem !important; }
}`;
