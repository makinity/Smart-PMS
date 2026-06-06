import { useState, useEffect, useRef } from 'react';
import { usePage, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { useToast } from '@/Components/Snackbar';
import { useConfirm } from '@/Components/ConfirmDialog';
import ReturnRemarksBanner from '@/Components/ReturnRemarksBanner';

function useBreakpoint() {
    const [w, setW] = useState(() => window.innerWidth);
    useEffect(() => {
        const h = () => setW(window.innerWidth);
        window.addEventListener('resize', h);
        return () => window.removeEventListener('resize', h);
    }, []);
    if (w >= 1024) return 'desktop';
    if (w >= 768)  return 'tablet';
    return 'mobile';
}

const STATUS = {
    draft:     { bg: 'rgba(100,116,139,0.15)', color: '#94a3b8', border: 'rgba(100,116,139,0.3)',  icon: '●', label: 'Draft' },
    submitted: { bg: 'rgba(37,99,235,0.12)',   color: '#60a5fa', border: 'rgba(37,99,235,0.3)',    icon: '↑', label: 'Submitted' },
    approved:  { bg: 'rgba(5,150,105,0.12)',   color: '#34d399', border: 'rgba(5,150,105,0.3)',    icon: '✓', label: 'Approved' },
    returned:  { bg: 'rgba(239,68,68,0.12)',   color: '#f87171', border: 'rgba(239,68,68,0.3)',    icon: '↩', label: 'Returned' },
    rejected:  { bg: 'rgba(239,68,68,0.12)',   color: '#f87171', border: 'rgba(239,68,68,0.3)',    icon: '✕', label: 'Rejected' },
};

export default function Show() {
    const { uwp, functions: fns } = usePage().props;
    const toast   = useToast();
    const confirm = useConfirm();

    const [activeFnId,  setActiveFnId]  = useState(fns?.[0]?.id ?? null);
    const [activeMfoId, setActiveMfoId] = useState(fns?.[0]?.mfos?.[0]?.id ?? null);
    const [status, setStatus]           = useState(uwp?.status ?? 'draft');
    const [submitting, setSubmitting]   = useState(false);
    const [fnDropOpen,  setFnDropOpen]  = useState(false);
    const [mfoDropOpen, setMfoDropOpen] = useState(false);
    const fnDropRef  = useRef(null);
    const mfoDropRef = useRef(null);
    const bp = useBreakpoint();

    const allMfos = fns?.flatMap(f => f.mfos ?? []) ?? [];
    const activeFn = fns?.find(f => f.id === activeFnId);
    const activeMfo = allMfos.find(m => m.id === activeMfoId);
    const activeFnForMfo = fns?.find(f => f.mfos?.some(m => m.id === activeMfoId));
    const sc       = STATUS[status] ?? STATUS.draft;
    const canSubmit = status === 'draft' || status === 'returned';

    function handleSubmit() {
        confirm('Submit this UWP for review? You will not be able to edit it after submission.').then(ok => {
            if (!ok) return;
            setSubmitting(true);
            router.patch(`/supervisor/uwp/${uwp.id}/submit`, {}, {
                onSuccess: () => { setStatus('submitted'); toast('UWP submitted for review.', 'submitted'); },
                onError:   () => toast('Failed to submit UWP.', 'error'),
                onFinish:  () => setSubmitting(false),
            });
        });
    }

    return (
        <AppLayout title="Unit Work Plan">
            <style>{css}</style>

            {/* ── Top bar ── */}
            <div style={{ ...s.topbar, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
                    <button onClick={() => router.visit('/supervisor/uwp')} style={s.backBtn}>&#8592;</button>
                    <div style={s.divider} />
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        <span style={s.period}>{uwp?.period}</span>
                        <span style={{ ...s.office, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: bp === 'mobile' ? 160 : 'none' }}>{uwp?.office}</span>
                    </div>
                    <div style={{ ...s.statusPill, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                        <span>{sc.icon}</span>
                        <span>{sc.label}</span>
                    </div>
                </div>
                {/* Actions: in top bar on desktop+tablet; sticky bottom bar on mobile */}
                {bp !== 'mobile' && (
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
                        {canSubmit && (
                            <button style={s.submitBtn} onClick={handleSubmit} disabled={submitting}>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                                {submitting ? 'Submitting…' : 'Submit for Review'}
                            </button>
                        )}
                        <a href={`/stage-one/forms/uwp-excel?uwp_id=${uwp?.id}`} style={s.exportBtn}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                            Export Excel
                        </a>
                    </div>
                )}
            </div>

            {/* ── Return Remarks Banner ── */}
            {status === 'returned' && <ReturnRemarksBanner remarks={uwp?.return_remarks} />}

            {/* ── Tablet: Breadcrumb pills ── */}
            {bp === 'tablet' && (
                <div style={s.breadcrumbRow}>
                    <div ref={fnDropRef} style={{ position: 'relative' }}>
                        <button style={s.fnPill} onClick={() => { setFnDropOpen(v => !v); setMfoDropOpen(false); }}>
                            {activeFnForMfo?.name ?? activeFn?.name ?? 'Select Function'}
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                        </button>
                        {fnDropOpen && (() => {
                            const r = fnDropRef.current?.getBoundingClientRect();
                            return (
                                <>
                                    <div style={s.dropBackdrop} onClick={() => setFnDropOpen(false)} />
                                    <div style={{ ...s.dropdown, position: 'fixed', top: r ? r.bottom + 4 : 60, left: r ? r.left : 0 }}>
                                        {fns?.map(fn => (
                                            <button key={fn.id} style={{ ...s.dropItem, ...(activeFnId === fn.id ? s.dropItemActive : {}) }}
                                                onClick={() => { setActiveFnId(fn.id); setActiveMfoId(fn.mfos?.[0]?.id ?? null); setFnDropOpen(false); }}>
                                                {activeFnId === fn.id && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>}
                                                {fn.name}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--admin-text-muted)', flexShrink: 0 }}><polyline points="9 18 15 12 9 6"/></svg>
                    <div ref={mfoDropRef} style={{ position: 'relative' }}>
                        <button style={s.mfoPill} onClick={() => { setMfoDropOpen(v => !v); setFnDropOpen(false); }}>
                            {activeMfo?.title ?? 'Select MFO'}
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                        </button>
                        {mfoDropOpen && (() => {
                            const r = mfoDropRef.current?.getBoundingClientRect();
                            return (
                                <>
                                    <div style={s.dropBackdrop} onClick={() => setMfoDropOpen(false)} />
                                    <div style={{ ...s.dropdown, position: 'fixed', top: r ? r.bottom + 4 : 60, left: r ? r.left : 0 }}>
                                        {(activeFnForMfo ?? activeFn)?.mfos?.map(mfo => (
                                            <button key={mfo.id} style={{ ...s.dropItem, ...(activeMfoId === mfo.id ? s.dropItemActive : {}) }}
                                                onClick={() => { setActiveMfoId(mfo.id); setMfoDropOpen(false); }}>
                                                {activeMfoId === mfo.id && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>}
                                                {mfo.title}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                </div>
            )}

            {/* ── Mobile: MFO tab strip ── */}
            {bp === 'mobile' && (
                <div style={s.tabStrip}>
                    {allMfos.map(mfo => (
                        <button key={mfo.id} style={{ ...s.tab, ...(activeMfoId === mfo.id ? s.tabActive : {}) }}
                            onClick={() => {
                                setActiveMfoId(mfo.id);
                                const fn = fns?.find(f => f.mfos?.some(m => m.id === mfo.id));
                                if (fn) setActiveFnId(fn.id);
                            }}>
                            {mfo.title}
                        </button>
                    ))}
                </div>
            )}

            {/* ── Layout ── */}
            <div style={{ ...s.layout, flexDirection: bp !== 'desktop' ? 'column' : 'row' }} className="uwp-layout">

                {/* Left panel: sidebar on desktop only */}
                {bp === 'desktop' && (
                    <aside style={s.leftPanel} className="uwp-left">
                        <LeftNav fns={fns} activeFnId={activeFnId} activeMfoId={activeMfoId}
                            setActiveFnId={setActiveFnId} setActiveMfoId={setActiveMfoId} />
                    </aside>
                )}

                {/* Center panel */}
                <main style={s.centerPanel} className="uwp-center">
                    {activeFn?.mfos
                        ?.filter(mfo => bp === 'desktop' ? (!activeMfoId || mfo.id === activeMfoId) : mfo.id === activeMfoId)
                        .map(mfo => (
                        <section key={mfo.id} style={s.mfoGroup}>
                            <div style={s.mfoHeader}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <span style={s.mfoIcon}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
                                    </span>
                                    <span style={s.mfoTitle}>{mfo.title}</span>
                                </div>
                                <span style={s.countBadge}>{mfo.successIndicators?.length ?? 0} Indicator{mfo.successIndicators?.length !== 1 ? 's' : ''}</span>
                            </div>
                            {mfo.successIndicators?.map((si, idx) => (
                                <IndicatorCard key={si.id} si={si} index={idx + 1} />
                            ))}
                            {!mfo.successIndicators?.length && <p style={s.empty}>No indicators.</p>}
                        </section>
                    ))}
                    {!activeFn && <p style={{ ...s.empty, padding: '4rem' }}>Select a function to view its indicators.</p>}
                </main>
            </div>

            {/* ── Sticky bottom bar on mobile ── */}
            {bp === 'mobile' && (
                <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 99,
                    background: 'var(--admin-card)', borderTop: '1px solid var(--admin-border)',
                    padding: '0.75rem 1rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    {canSubmit && (
                        <button style={s.submitBtn} onClick={handleSubmit} disabled={submitting}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                            {submitting ? 'Submitting…' : 'Submit for Review'}
                        </button>
                    )}
                    <a href={`/stage-one/forms/uwp-excel?uwp_id=${uwp?.id}`} style={s.exportBtn}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                        Excel
                    </a>
                </div>
            )}
        </AppLayout>
    );
}

function LeftNav({ fns, activeFnId, activeMfoId, setActiveFnId, setActiveMfoId }) {
    return (
        <div style={{ padding: '0.5rem 0' }}>
            {fns?.map(fn => (
                <div key={fn.id}>
                    <button style={{ ...s.fnItem, ...(activeFnId === fn.id ? s.fnItemActive : {}) }}
                        onClick={() => { setActiveFnId(fn.id); setActiveMfoId(fn.mfos?.[0]?.id ?? null); }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                        <span style={{ flex: 1, textAlign: 'left' }}>{fn.name}</span>
                    </button>
                    {activeFnId === fn.id && fn.mfos?.map(mfo => (
                        <button key={mfo.id} style={{ ...s.mfoItem, ...(activeMfoId === mfo.id ? s.mfoItemActive : {}) }}
                            onClick={() => setActiveMfoId(mfo.id)}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
                            <span style={{ flex: 1, textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{mfo.title}</span>
                        </button>
                    ))}
                </div>
            ))}
        </div>
    );
}

function IndicatorCard({ si, index }) {
    const [qetOpen, setQetOpen] = useState(false);
    const budget     = si.allotted_budget ? parseFloat(si.allotted_budget) : 0;
    const assignees  = si.assignments ?? [];
    const hasQet     = si.qetStandards?.length > 0;

    return (
        <div style={s.siCard} className="si-card">
            {/* Header row */}
            <div style={s.siHeader}>
                <span style={s.siIndex}>{index}</span>
                <h4 style={s.siTitle}>{si.indicator_text ?? '—'}</h4>
            </div>

            {/* Details grid */}
            <div style={s.detailGrid}>
                {/* Budget */}
                <div style={s.detailCell}>
                    <span style={s.detailLabel}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
                        Budget
                    </span>
                    <span style={s.detailVal}>
                        ₱{budget.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </span>
                </div>

                {/* Target */}
                {(si.target_quantity || si.target_timeline) && (
                    <div style={{ ...s.detailCell, gridColumn: 'span 2' }}>
                        <span style={s.detailLabel}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>
                            Target
                        </span>
                        <span style={s.detailVal}>
                            {si.target_quantity && <strong>{si.target_quantity} </strong>}
                            {si.target_timeline}
                        </span>
                    </div>
                )}
            </div>

            {/* Assignees avatar stack */}
            {assignees.length > 0 && <AssigneeStack assignees={assignees} />}

            {/* QET Standards toggle */}
            {hasQet && (
                <div style={s.qetSection}>
                    <button style={s.qetToggle} onClick={() => setQetOpen(v => !v)}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                        QET Standards ({si.qetStandards.length})
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: 'auto', transform: qetOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9"/></svg>
                    </button>
                    {qetOpen && (
                        <div style={s.qetTable}>
                            <div style={s.qetHead}>
                                <span>Dimension</span><span style={{ textAlign: 'center' }}>Rating</span><span>Standard</span>
                            </div>
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
    );
}

function AssigneeStack({ assignees }) {
    const [open, setOpen] = useState(false);
    const MAX_VISIBLE = 5;
    const visible = assignees.slice(0, MAX_VISIBLE);
    const extra   = assignees.length - MAX_VISIBLE;

    // Generate a stable color per name
    const COLORS = ['#3b82f6','#8b5cf6','#ec4899','#f59e0b','#10b981','#ef4444','#06b6d4'];
    function colorFor(name) { return COLORS[(name ?? '').charCodeAt(0) % COLORS.length]; }

    return (
        <>
            {/* Avatar stack — clickable */}
            <div
                style={{ paddingLeft: '2.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
                onClick={() => setOpen(true)}
                title="View assigned employees"
            >
                <div style={{ display: 'flex' }}>
                    {visible.map((a, i) => (
                        <div key={i} style={{ ...sm.avatar, background: colorFor(a.employee?.name), marginLeft: i === 0 ? 0 : -8, zIndex: MAX_VISIBLE - i }}>
                            {a.employee?.profile_photo
                                ? <img src={a.employee.profile_photo} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} alt="" />
                                : initials(a.employee?.name)
                            }
                        </div>
                    ))}
                    {extra > 0 && (
                        <div style={{ ...sm.avatar, background: 'var(--admin-bg-secondary)', color: 'var(--admin-text-muted)', border: '2px solid var(--admin-border)', marginLeft: -8, fontSize: '0.6rem', fontWeight: 700 }}>
                            +{extra}
                        </div>
                    )}
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)', fontWeight: 500 }}>
                    {assignees.length} assigned
                </span>
            </div>

            {/* Modal */}
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
                                        {a.employee?.profile_photo
                                            ? <img src={a.employee.profile_photo} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} alt="" />
                                            : initials(a.employee?.name)
                                        }
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

function initials(name) {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

const s = {
    // Topbar
    topbar:     { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', gap: '0.75rem', flexWrap: 'wrap' },
    backBtn:    { background: 'none', border: 'none', color: 'var(--admin-text-primary)', fontSize: '1.4rem', cursor: 'pointer', padding: '0 0.25rem', lineHeight: 1 },
    divider:    { width: 1, height: 32, background: 'var(--admin-border-strong)' },
    period:     { fontSize: '0.9rem', fontWeight: 700, color: 'var(--admin-text-primary)', lineHeight: 1.2 },
    office:     { fontSize: '0.75rem', color: 'var(--admin-text-muted)' },
    statusPill: { display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.3rem 0.85rem', borderRadius: 999, fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.03em' },
    submitBtn:  { display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.5rem 1.1rem', borderRadius: 8, border: 'none', background: 'var(--admin-accent)', color: '#fff', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' },
    exportBtn:  { display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.5rem 1.1rem', borderRadius: 8, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.28)', color: '#4ade80', fontSize: '0.82rem', fontWeight: 600, textDecoration: 'none' },

    // Layout
    layout:     { display: 'flex', borderRadius: 'var(--admin-radius)', border: '1px solid var(--admin-border-strong)', background: 'var(--admin-card)', boxShadow: 'var(--admin-shadow)', overflow: 'visible', minHeight: 600 },
    leftPanel:  { width: 270, minWidth: 270, borderRight: '1px solid var(--admin-border)', background: 'var(--admin-sidebar)', flexShrink: 0, padding: '1.25rem 0', overflowY: 'auto', borderRadius: 'var(--admin-radius) 0 0 var(--admin-radius)' },
    panelLabel: { padding: '0 1rem 0.65rem', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.09em', color: 'var(--admin-text-muted)', textTransform: 'uppercase' },
    fnItem:     { width: '100%', display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 1rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-muted)', textAlign: 'left', borderLeft: '2px solid transparent', fontSize: '0.82rem' },
    fnItemActive:{ color: 'var(--admin-accent)', background: 'rgba(59,130,246,0.07)', borderLeftColor: 'var(--admin-accent)', fontWeight: 600 },
    mfoItem:    { width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.45rem 1rem 0.45rem 2rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-muted)', textAlign: 'left', borderLeft: '2px solid transparent', fontSize: '0.76rem' },
    mfoItemActive:{ color: 'var(--admin-text-primary)', background: 'rgba(255,255,255,0.04)', borderLeftColor: 'var(--admin-border-strong)', fontWeight: 500 },
    centerPanel:{ flex: 1, overflowY: 'auto', padding: '1.5rem', minWidth: 0, borderRadius: '0 var(--admin-radius) var(--admin-radius) 0' },
    empty:      { color: 'var(--admin-text-muted)', fontSize: '0.82rem', fontStyle: 'italic' },

    // Tablet breadcrumb nav
    breadcrumbRow:  { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0', marginBottom: '1rem' },
    fnPill:         { display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.85rem', borderRadius: 99, border: '1px solid var(--admin-accent)', background: 'transparent', color: 'var(--admin-accent)', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' },
    mfoPill:        { display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.85rem', borderRadius: 99, border: 'none', background: 'var(--admin-accent)', color: '#fff', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis' },
    dropdown:       { position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 300, background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)', borderRadius: 10, padding: '0.35rem', minWidth: 220, maxWidth: 320, boxShadow: '0 8px 32px rgba(0,0,0,0.35)', display: 'flex', flexDirection: 'column', gap: 2 },
    dropBackdrop:   { position: 'fixed', inset: 0, zIndex: 299 },
    dropItem:       { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-secondary)', fontSize: '0.82rem', borderRadius: 6, textAlign: 'left', width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
    dropItemActive: { color: 'var(--admin-accent)', fontWeight: 600 },

    // Mobile tab strip
    tabStrip:       { display: 'flex', overflowX: 'auto', scrollbarWidth: 'none', gap: 0, marginBottom: '1rem', borderBottom: '1px solid var(--admin-border)' },
    tab:            { flexShrink: 0, padding: '0.6rem 1rem', background: 'none', border: 'none', borderBottom: '2px solid transparent', cursor: 'pointer', color: 'var(--admin-text-muted)', fontSize: '0.78rem', fontWeight: 500, whiteSpace: 'nowrap' },
    tabActive:      { color: 'var(--admin-accent)', borderBottomColor: 'var(--admin-accent)', fontWeight: 700 },

    // MFO group
    mfoGroup:   { marginBottom: '2.5rem' },
    mfoHeader:  { display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid var(--admin-border)', marginBottom: '1rem' },
    mfoIcon:    { color: 'var(--admin-accent)', display: 'flex', alignItems: 'center' },
    mfoTitle:   { fontWeight: 700, fontSize: '0.95rem', color: 'var(--admin-text-primary)' },
    countBadge: { padding: '0.2rem 0.75rem', borderRadius: 999, background: 'var(--admin-bg-secondary)', border: '1px solid var(--admin-border)', fontSize: '0.72rem', color: 'var(--admin-text-muted)', whiteSpace: 'nowrap' },

    // Indicator card
    siCard:     { background: 'rgba(255,255,255,0.02)', border: '1px solid var(--admin-border)', borderRadius: 12, padding: '1.25rem 1.5rem', marginBottom: '0.75rem', display: 'flex', flexDirection: 'column', gap: '1rem' },
    siHeader:   { display: 'flex', gap: '0.75rem', alignItems: 'flex-start' },
    siIndex:    { flexShrink: 0, width: 24, height: 24, borderRadius: '50%', background: 'rgba(59,130,246,0.15)', color: 'var(--admin-accent)', fontSize: '0.7rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
    siTitle:    { fontSize: '1rem', fontWeight: 600, color: 'var(--admin-text-primary)', lineHeight: 1.5, margin: 0 },

    // Detail grid
    detailGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem 1rem', paddingLeft: '2.25rem' },
    detailCell: { display: 'flex', flexDirection: 'column', gap: '0.2rem' },
    detailLabel:{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--admin-text-muted)', textTransform: 'uppercase' },
    detailVal:  { fontSize: '0.85rem', color: 'var(--admin-text-primary)', fontWeight: 500 },

    // Assignees (removed - now in AssigneeStack component)

    // QET
    qetSection: { paddingLeft: '2.25rem' },
    qetToggle:  { display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'none', border: '1px solid var(--admin-border)', borderRadius: 6, padding: '0.35rem 0.75rem', color: '#4ade80', fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer', width: '100%' },
    qetTable:   { marginTop: '0.5rem', border: '1px solid var(--admin-border)', borderRadius: 8, overflow: 'hidden' },
    qetHead:    { display: 'grid', gridTemplateColumns: '110px 70px 1fr', gap: 0, padding: '0.45rem 0.75rem', background: 'var(--admin-bg-secondary)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--admin-text-muted)', textTransform: 'uppercase', borderBottom: '1px solid var(--admin-border)' },
    qetRow:     { display: 'grid', gridTemplateColumns: '110px 70px 1fr', gap: 0, padding: '0.55rem 0.75rem', borderBottom: '1px solid var(--admin-border)', fontSize: '0.82rem', alignItems: 'start' },
    qetDim:     { color: 'var(--admin-text-secondary)', fontWeight: 600, textTransform: 'capitalize', paddingRight: '0.5rem' },
    qetRating:  { color: 'var(--admin-accent)', fontWeight: 700, textAlign: 'center' },
    qetText:    { color: 'var(--admin-text-secondary)', lineHeight: 1.5 },
};

const sm = {
    avatar:    { width: 30, height: 30, borderRadius: '50%', color: '#fff', fontSize: '0.62rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--admin-card)', flexShrink: 0, overflow: 'hidden' },
    overlay:   { position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    modal:     { background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)', borderRadius: 14, width: 360, maxHeight: '70vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' },
    header:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: '1px solid var(--admin-border)' },
    title:     { fontWeight: 700, fontSize: '0.95rem', color: 'var(--admin-text-primary)' },
    closeBtn:  { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-muted)', fontSize: '1rem' },
    list:      { overflowY: 'auto', padding: '0.75rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' },
    row:       { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.75rem', borderRadius: 8, background: 'var(--admin-bg-secondary)', border: '1px solid var(--admin-border)' },
    bigAvatar: { width: 38, height: 38, borderRadius: '50%', color: '#fff', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' },
    empName:   { fontSize: '0.88rem', fontWeight: 600, color: 'var(--admin-text-primary)' },
    empPos:    { fontSize: '0.75rem', color: 'var(--admin-text-muted)', marginTop: 2 },
};

const css = `
.si-card:hover { border-color: rgba(59,130,246,0.3) !important; }
.qet-row:last-child { border-bottom: none !important; }`;
