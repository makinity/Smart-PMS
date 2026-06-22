import { useState, useEffect } from 'react';
import { usePage, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import ReturnRemarksBanner from '@/Components/ReturnRemarksBanner';
import { useToast } from '@/Components/Snackbar';
import { avatarSrc, onAvatarError } from '@/Components/defaultAvatar';
import AssigneeReviewModal from '@/Components/AssigneeReviewModal';

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

function StatusBadge({ status }) {
    const map = {
        draft:     { label: 'Draft',     bg: 'rgba(234,179,8,0.12)',  color: '#ca8a04',  border: 'rgba(234,179,8,0.3)' },
        submitted: { label: 'Submitted', bg: 'rgba(59,130,246,0.12)', color: 'var(--admin-accent)', border: 'rgba(59,130,246,0.3)' },
        approved:  { label: 'Approved',  bg: 'rgba(74,222,128,0.12)', color: '#4ade80',  border: 'rgba(74,222,128,0.3)' },
        returned:  { label: 'Returned',  bg: 'rgba(239,68,68,0.12)',  color: '#f87171',  border: 'rgba(239,68,68,0.3)' },
    };
    const c = map[status] ?? { label: status ?? '—', bg: 'var(--admin-bg-secondary)', color: 'var(--admin-text-muted)', border: 'var(--admin-border)' };
    return (
        <span style={{ padding: '0.15rem 0.6rem', borderRadius: 99, fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', background: c.bg, color: c.color, border: `1px solid ${c.border}`, whiteSpace: 'nowrap' }}>
            {c.label}
        </span>
    );
}

export default function Show() {
    const { opcr, uwps = [], functions: fns = [] } = usePage().props;
    const toast = useToast();
    const bp    = useBreakpoint();

    const [status,      setStatus]      = useState(opcr?.status ?? 'draft');
    const [activeFnId,  setActiveFnId]  = useState(fns?.[0]?.id ?? null);
    const [activeMfoId, setActiveMfoId] = useState(fns?.[0]?.mfos?.[0]?.id ?? null);
    const [activeUwpId, setActiveUwpId] = useState(null);
    const [submitting,  setSubmitting]  = useState(false);
    const [contribOpen, setContribOpen] = useState(false);

    const activeFn       = fns?.find(f => f.id === activeFnId);
    const activeFnForMfo = fns?.find(f => f.mfos?.some(m => m.id === activeMfoId));
    const allApproved    = uwps.length > 0 && uwps.every(u => u.status === 'approved' || u.status === 'pmt_approved');
    const approvedCount  = uwps.filter(u => u.status === 'approved' || u.status === 'pmt_approved').length;
    const canSubmit      = status === 'draft' && allApproved;

    function handleSubmit() {
        setSubmitting(true);
        router.patch(`/dept-head/opcr/${opcr.id}/submit`, {}, {
            onSuccess: () => { setStatus('submitted'); toast('OPCR submitted to PMT.', 'success'); },
            onError:   () => toast('Failed to submit OPCR.', 'error'),
            onFinish:  () => setSubmitting(false),
        });
    }

    // Build visible MFOs based on active fn + optional UWP filter
    const displayFn  = bp === 'desktop' ? activeFn : (activeFnForMfo ?? activeFn);
    const mfosToShow = (displayFn?.mfos ?? [])
        .filter(mfo => bp === 'desktop' ? true : mfo.id === activeMfoId)
        .map(mfo => ({
            ...mfo,
            successIndicators: (mfo.successIndicators ?? []).filter(
                si => !activeUwpId || si.supervisor === uwps.find(u => u.id === activeUwpId)?.supervisor
            ),
        }))
        .filter(mfo => mfo.successIndicators.length > 0);

    const Actions = () => (
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {!allApproved && status === 'draft' && (
                <span style={s.warnPill}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    {approvedCount}/{uwps.length} UWPs
                </span>
            )}
            <a href={`/dept-head/opcr/${opcr?.id}/export-excel?opcr_id=${opcr?.id}`} style={s.exportBtn} title="Export OPCR">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                {bp === 'desktop' && 'Export OPCR'}
            </a>
            {canSubmit && (
                <button style={s.submitBtn} onClick={handleSubmit} disabled={submitting}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                    {submitting ? 'Submitting…' : 'Submit to PMT'}
                </button>
            )}
        </div>
    );

    return (
        <AppLayout title="OPCR">
            <style>{css}</style>

            {/* ── Unified card wrapper ── */}
            <div style={{ borderRadius: 'var(--admin-radius-lg)', border: '1px solid var(--admin-border-strong)', background: 'var(--admin-card)', boxShadow: 'var(--admin-shadow)', overflow: 'clip' }}>

                {/* ── Sticky top bar ── */}
                <div style={{ position: 'sticky', top: 0, zIndex: 40, background: 'var(--admin-card)', borderBottom: '1px solid var(--admin-border)', padding: '0.6rem 1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                            <button onClick={() => router.visit('/dept-head/opcr')} style={s.backBtn} title="Back">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
                            </button>
                            <div style={{ width: 1, height: 28, background: 'var(--admin-border-strong)', flexShrink: 0 }} />
                            <div style={{ minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--admin-text-primary)', whiteSpace: 'nowrap' }}>
                                        {opcr?.period ?? 'OPCR'}
                                    </span>
                                    <StatusBadge status={status} />
                                </div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)', marginTop: '0.1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {opcr?.office ?? ''}
                                </div>
                            </div>
                        </div>
                        {bp !== 'mobile' && <Actions />}
                        {bp !== 'desktop' && (
                            <button style={s.contribIconBtn} onClick={() => setContribOpen(true)} title={`Contributors ${approvedCount}/${uwps.length}`}>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                                <span style={{ ...s.contribCount, background: allApproved ? 'rgba(74,222,128,0.2)' : 'rgba(234,179,8,0.2)', color: allApproved ? '#4ade80' : '#facc15' }}>
                                    {approvedCount}/{uwps.length}
                                </span>
                            </button>
                        )}
                    </div>
                </div>

                {/* ── Return remarks banner ── */}
                {status === 'returned' && <ReturnRemarksBanner remarks={opcr?.return_remarks} label="Returned by PMT" />}

                {/* ── Tablet: two-row tab nav + Contributors button ── */}
                {bp === 'tablet' && (
                    <div style={{ position: 'sticky', top: '4.35rem', zIndex: 35, background: 'var(--admin-card)', borderBottom: '1px solid var(--admin-border)' }}>
                        <div style={{ display: 'flex', overflowX: 'auto', scrollbarWidth: 'none', borderBottom: '1px solid var(--admin-border)', alignItems: 'center' }}>
                            {fns?.map(fn => (
                                <button key={fn.id} style={{ ...s.tab, ...(activeFnId === fn.id ? s.tabActive : {}) }}
                                    onClick={() => { setActiveFnId(fn.id); setActiveMfoId(fn.mfos?.[0]?.id ?? null); }}>
                                    {fn.name}{fn.weight_percent != null ? ` (${fn.weight_percent}%)` : ''}
                                </button>
                            ))}
                        </div>
                        <div style={{ display: 'flex', overflowX: 'auto', scrollbarWidth: 'none', whiteSpace: 'nowrap' }}>
                            {(activeFn?.mfos ?? []).map(mfo => (
                                <button key={mfo.id} style={{ ...s.tab, ...(activeMfoId === mfo.id ? s.tabActive : {}) }}
                                    onClick={() => setActiveMfoId(mfo.id)}>
                                    {mfo.title}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Mobile: two-row tab nav + Contributors button ── */}
                {bp === 'mobile' && (
                    <div style={{ position: 'sticky', top: '4.35rem', zIndex: 35, background: 'var(--admin-card)', borderBottom: '1px solid var(--admin-border)' }}>
                        <div style={{ display: 'flex', overflowX: 'auto', scrollbarWidth: 'none', borderBottom: '1px solid var(--admin-border)', alignItems: 'center' }}>
                            {fns?.map(fn => (
                                <button key={fn.id} style={{ ...s.tab, ...(activeFnId === fn.id ? s.tabActive : {}) }}
                                    onClick={() => { setActiveFnId(fn.id); setActiveMfoId(fn.mfos?.[0]?.id ?? null); }}>
                                    {fn.name}{fn.weight_percent != null ? ` (${fn.weight_percent}%)` : ''}
                                </button>
                            ))}
                        </div>
                        <div style={{ display: 'flex', overflowX: 'auto', scrollbarWidth: 'none', whiteSpace: 'nowrap' }}>
                            {(activeFn?.mfos ?? []).map(mfo => (
                                <button key={mfo.id} style={{ ...s.tab, ...(activeMfoId === mfo.id ? s.tabActive : {}) }}
                                    onClick={() => setActiveMfoId(mfo.id)}>
                                    {mfo.title}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Layout ── */}
                <div style={{ display: 'flex', flexDirection: bp !== 'desktop' ? 'column' : 'row', minHeight: 600 }}>

                    {/* Left sidebar (desktop only) */}
                    {bp === 'desktop' && (
                        <aside style={s.leftPanel}>
                            <div style={{ padding: '0.5rem 0' }}>
                                <div style={s.panelLabel}>Contributing UWPs</div>
                                {uwps.map(u => (
                                    <button key={u.id}
                                        style={{ ...s.uwpItem, ...(activeUwpId === u.id ? s.uwpItemActive : {}) }}
                                        onClick={() => setActiveUwpId(activeUwpId === u.id ? null : u.id)}>
                                        <img src={avatarSrc(u.supervisor_avatar)} onError={onAvatarError} alt={u.supervisor} style={{ ...s.uwpAvatar, objectFit: 'cover' }} />
                                        <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                                            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--admin-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.supervisor}</div>
                                            {u.mfo_labels && <div style={{ fontSize: '0.7rem', color: 'var(--admin-text-muted)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.mfo_labels}</div>}
                                        </div>
                                        <span style={u.status === 'approved' ? s.approvedDot : s.pendingDot}>
                                            {u.status === 'approved' ? '✓' : '✗'}
                                        </span>
                                    </button>
                                ))}
                                <div style={{ padding: '0.4rem 1rem 0.75rem', fontSize: '0.75rem', fontWeight: 600, color: allApproved ? '#4ade80' : '#facc15' }}>
                                    {approvedCount} of {uwps.length} UWPs approved
                                </div>

                                <div style={{ borderTop: '1px solid var(--admin-border)', margin: '0 0 0.5rem' }} />
                                <div style={s.panelLabel}>MFOs / PPAs</div>
                                {fns?.map(fn => (
                                    <div key={fn.id}>
                                        <button style={{ ...s.fnItem, ...(activeFnId === fn.id ? s.fnItemActive : {}) }}
                                            onClick={() => { setActiveFnId(fn.id); setActiveMfoId(fn.mfos?.[0]?.id ?? null); }}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                                            <span style={{ flex: 1, textAlign: 'left' }}>{fn.name}</span>
                                            {fn.weight_percent != null && (
                                                <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '1px 6px', borderRadius: 99, background: 'rgba(59,130,246,0.12)', color: 'var(--admin-accent)', flexShrink: 0 }}>
                                                    {fn.weight_percent}%
                                                </span>
                                            )}
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
                        </aside>
                    )}

                    {/* Center panel */}
                    <main style={{ ...s.centerPanel, paddingBottom: bp === 'mobile' ? '5rem' : '1.5rem' }}>
                        {mfosToShow.length === 0 && !displayFn && (
                            <div style={s.empty}>Select a function to view its indicators.</div>
                        )}
                        {mfosToShow.map(mfo => (
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
                                    <SiCard key={si.id} si={si} index={idx + 1} periodId={opcr?.performance_period_id ?? 1} />
                                ))}
                            </section>
                        ))}
                    </main>
                </div>

            </div>{/* ── end unified card wrapper ── */}

            {/* ── Mobile sticky bottom bar ── */}
            {bp === 'mobile' && (
                <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 99,
                    background: 'var(--admin-card)', borderTop: '1px solid var(--admin-border)',
                    padding: '0.75rem 1rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                    <Actions />
                </div>
            )}

            {/* ── Contributors Modal (tablet/mobile) ── */}
            {contribOpen && (
                <div style={sm.overlay} onClick={() => setContribOpen(false)}>
                    <div style={sm.modal} onClick={e => e.stopPropagation()}>
                        <div style={sm.header}>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--admin-text-primary)' }}>Contributing UWPs</div>
                                <div style={{ fontSize: '0.72rem', color: allApproved ? '#4ade80' : '#facc15', marginTop: 2 }}>
                                    {approvedCount} of {uwps.length} UWPs approved
                                </div>
                            </div>
                            <button style={sm.closeBtn} onClick={() => setContribOpen(false)}>✕</button>
                        </div>
                        <div style={sm.list}>
                            {uwps.map(u => (
                                <button key={u.id}
                                    style={{ ...sm.uwpRow, ...(activeUwpId === u.id ? sm.uwpRowActive : {}) }}
                                    onClick={() => { setActiveUwpId(activeUwpId === u.id ? null : u.id); setContribOpen(false); }}>
                                    <img src={avatarSrc(u.supervisor_avatar)} onError={onAvatarError} alt={u.supervisor} style={{ ...sm.avatar, objectFit: 'cover' }} />
                                    <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                                        <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--admin-text-primary)' }}>{u.supervisor}</div>
                                        {u.mfo_labels && <div style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.mfo_labels}</div>}
                                    </div>
                                    <span style={u.status === 'approved' ? s.approvedDot : s.pendingDot}>
                                        {u.status === 'approved' ? '✓' : '✗'}
                                    </span>
                                </button>
                            ))}
                            {activeUwpId && (
                                <button style={sm.clearBtn} onClick={() => { setActiveUwpId(null); setContribOpen(false); }}>
                                    Show all UWPs
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}

function SiCard({ si, index, periodId = 1 }) {
    const [qetOpen, setQetOpen] = useState(false);
    const [assigneesOpen, setAssigneesOpen] = useState(false);
    const budget    = si.allotted_budget ? parseFloat(si.allotted_budget) : 0;
    const assignees = si.assignments ?? [];
    const hasQet    = si.qetStandards?.length > 0;

    return (
        <div style={s.siCard} className="si-card">
            <h4 style={s.siTitle}>{si.indicator_text ?? '—'}</h4>

            <div style={s.siMeta}>
                <span style={s.siBudget}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 4 }}><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
                    P{budget.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </span>
                {assignees.length > 0 && (
                    <>
                        <span style={s.metaDot} />
                        <button type="button" onClick={() => setAssigneesOpen(true)} style={s.assigneeStack} title="View assigned employees">
                            {assignees.slice(0, 3).map((a, i) => (
                                <img key={i} src={avatarSrc(a.employee?.avatar)} onError={onAvatarError} alt={a.employee?.name}
                                    style={{ ...s.avatar, objectFit: 'cover', zIndex: 10 - i }} />
                            ))}
                            {assignees.length > 3 && (
                                <div style={{ ...s.avatar, background: 'var(--admin-border-strong)', color: 'var(--admin-text-muted)', fontSize: '0.6rem' }}>
                                    +{assignees.length - 3}
                                </div>
                            )}
                        </button>
                    </>
                )}
            </div>

            {hasQet && (
                <div>
                    <button style={s.qetToggle} onClick={() => setQetOpen(v => !v)}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                        QET Standards ({si.qetStandards.length})
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: 'auto', transform: qetOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9"/></svg>
                    </button>
                    {qetOpen && (
                        <div style={s.qetTable}>
                            <div style={s.qetHead}><span>DIM</span><span style={{ textAlign: 'center' }}>RATING</span><span>STANDARD</span></div>
                            {si.qetStandards.map(q => (
                                <div key={q.id} style={s.qetRow} className="qet-row">
                                    <span style={s.qetDim}>{q.dimension}</span>
                                    <span style={s.qetRating}>{q.rating}</span>
                                    <span style={s.qetText}>{q.standard_text}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {assigneesOpen && (
                <AssigneeReviewModal
                    indicator={si}
                    periodId={periodId}
                    employees={(si.assignments ?? []).map(a => a.employee).filter(Boolean)}
                    suggestionsUrl="/dept-head/uwp/suggestions"
                    onClose={() => setAssigneesOpen(false)}
                />
            )}
        </div>
    );
}

const sm = {
    overlay:     { position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' },
    modal:       { background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)', borderRadius: 14, width: '100%', maxWidth: 420, maxHeight: '70vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' },
    header:      { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '1rem 1.25rem', borderBottom: '1px solid var(--admin-border)' },
    closeBtn:    { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-muted)', fontSize: '1rem', flexShrink: 0, marginLeft: '0.5rem' },
    list:        { overflowY: 'auto', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' },
    uwpRow:      { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0.85rem', borderRadius: 10, background: 'var(--admin-bg-secondary)', border: '1px solid var(--admin-border)', cursor: 'pointer', width: '100%', textAlign: 'left' },
    uwpRowActive:{ border: '1px solid var(--admin-accent)', background: 'rgba(59,130,246,0.08)' },
    avatar:      { width: 36, height: 36, borderRadius: '50%', color: '#fff', fontSize: '0.7rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    clearBtn:    { padding: '0.6rem', borderRadius: 8, border: '1px dashed var(--admin-border-strong)', background: 'none', cursor: 'pointer', color: 'var(--admin-text-muted)', fontSize: '0.82rem', fontWeight: 600, width: '100%', marginTop: '0.25rem' },
};

const s = {
    backBtn:      { background: 'none', border: 'none', color: 'var(--admin-text-primary)', cursor: 'pointer', padding: '0.25rem', display: 'flex', alignItems: 'center', flexShrink: 0 },
    submitBtn:    { display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.45rem 1.1rem', borderRadius: 8, border: 'none', background: 'rgba(37,99,235,0.9)', color: '#fff', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' },
    exportBtn:    { display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.45rem 1.1rem', borderRadius: 8, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.28)', color: '#4ade80', fontSize: '0.82rem', fontWeight: 600, textDecoration: 'none' },
    warnPill:     { display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.75rem', borderRadius: 999, fontSize: '0.72rem', fontWeight: 600, background: 'rgba(234,179,8,0.12)', border: '1px solid rgba(234,179,8,0.3)', color: '#facc15', whiteSpace: 'nowrap' },

    leftPanel:    { width: 270, minWidth: 270, borderRight: '1px solid var(--admin-border)', background: 'var(--admin-sidebar)', flexShrink: 0, padding: '1.25rem 0', overflowY: 'auto' },
    panelLabel:   { padding: '0 1rem 0.65rem', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.09em', color: 'var(--admin-text-muted)', textTransform: 'uppercase' },
    uwpItem:      { width: '100%', display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.55rem 1rem', background: 'none', border: 'none', cursor: 'pointer', borderLeft: '2px solid transparent' },
    uwpItemActive:{ background: 'rgba(59,130,246,0.07)', borderLeftColor: 'var(--admin-accent)' },
    uwpAvatar:    { width: 28, height: 28, borderRadius: '50%', color: '#fff', fontSize: '0.6rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    approvedDot:  { fontSize: '0.65rem', fontWeight: 700, color: '#4ade80', background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.3)', padding: '0.15rem 0.5rem', borderRadius: 999, flexShrink: 0 },
    pendingDot:   { fontSize: '0.65rem', fontWeight: 700, color: '#f87171', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', padding: '0.15rem 0.5rem', borderRadius: 999, flexShrink: 0 },
    fnItem:       { width: '100%', display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 1rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-muted)', textAlign: 'left', borderLeft: '2px solid transparent', fontSize: '0.82rem' },
    fnItemActive: { color: 'var(--admin-accent)', background: 'rgba(59,130,246,0.07)', borderLeftColor: 'var(--admin-accent)', fontWeight: 600 },
    mfoItem:      { width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.45rem 1rem 0.45rem 2rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-muted)', textAlign: 'left', borderLeft: '2px solid transparent', fontSize: '0.76rem' },
    mfoItemActive:{ color: 'var(--admin-accent)', background: 'rgba(59,130,246,0.08)', borderLeftColor: 'var(--admin-accent)', fontWeight: 600 },

    centerPanel:  { flex: 1, overflowY: 'auto', padding: '1.5rem', minWidth: 0 },
    empty:        { padding: '4rem', textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: '0.875rem' },

    tab:          { flexShrink: 0, padding: '0.6rem 1rem', background: 'none', border: 'none', borderBottom: '2px solid transparent', cursor: 'pointer', color: 'var(--admin-text-muted)', fontSize: '0.78rem', fontWeight: 500, whiteSpace: 'nowrap' },
    tabActive:    { color: 'var(--admin-accent)', borderBottomColor: 'var(--admin-accent)', fontWeight: 700 },
    contribBtn:   { display: 'flex', alignItems: 'center', gap: '0.4rem', marginLeft: 'auto', marginRight: '0.5rem', flexShrink: 0, padding: '0.35rem 0.75rem', borderRadius: 99, border: '1px solid var(--admin-border-strong)', background: 'none', color: 'var(--admin-text-secondary)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' },
    contribCount: { padding: '0.1rem 0.45rem', borderRadius: 99, fontSize: '0.65rem', fontWeight: 700 },
    contribIconBtn: { display: 'flex', alignItems: 'center', gap: '0.3rem', flexShrink: 0, padding: '0.35rem 0.5rem', borderRadius: 8, border: '1px solid var(--admin-border-strong)', background: 'none', color: 'var(--admin-text-secondary)', cursor: 'pointer' },

    mfoGroup:     { marginBottom: '2.5rem' },
    mfoHeader:    { display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid var(--admin-border)', marginBottom: '1rem' },
    mfoIcon:      { color: 'var(--admin-accent)', display: 'flex', alignItems: 'center' },
    mfoTitle:     { fontWeight: 700, fontSize: '1rem', color: 'var(--admin-text-primary)' },
    countBadge:   { padding: '0.2rem 0.75rem', borderRadius: 999, background: 'var(--admin-bg-secondary)', border: '1px solid var(--admin-border)', fontSize: '0.72rem', color: 'var(--admin-text-muted)', whiteSpace: 'nowrap' },

    siCard:       { background: 'rgba(255,255,255,0.02)', border: '1px solid var(--admin-border)', borderRadius: 12, padding: '1.25rem 1.5rem', marginBottom: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' },
    siTitle:      { fontSize: '1.05rem', fontWeight: 600, color: 'var(--admin-text-primary)', lineHeight: 1.4, margin: 0 },
    siMeta:       { display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' },
    siBudget:     { display: 'flex', alignItems: 'center', fontSize: '0.82rem', color: 'var(--admin-text-muted)', fontFamily: 'monospace' },
    metaDot:      { width: 4, height: 4, borderRadius: '50%', background: 'var(--admin-border-strong)', flexShrink: 0 },
    assigneeStack:{ display: 'flex', alignItems: 'center', background: 'none', border: 'none', padding: '0.15rem 0.25rem 0.15rem 0.4rem', margin: 0, cursor: 'pointer', borderRadius: 999 },
    avatar:       { width: 26, height: 26, borderRadius: '50%', color: '#fff', fontSize: '0.6rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--admin-card)', marginLeft: -6, flexShrink: 0, overflow: 'hidden' },

    qetToggle:    { display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'none', border: '1px solid var(--admin-border)', borderRadius: 6, padding: '0.35rem 0.75rem', color: '#4ade80', fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer', width: '100%' },
    qetTable:     { marginTop: '0.5rem', border: '1px solid var(--admin-border)', borderRadius: 8, overflow: 'hidden' },
    qetHead:      { display: 'grid', gridTemplateColumns: '80px 60px 1fr', padding: '0.45rem 0.75rem', background: 'var(--admin-bg-secondary)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--admin-text-muted)', textTransform: 'uppercase', borderBottom: '1px solid var(--admin-border)' },
    qetRow:       { display: 'grid', gridTemplateColumns: '80px 60px 1fr', padding: '0.55rem 0.75rem', borderBottom: '1px solid var(--admin-border)', fontSize: '0.82rem', alignItems: 'start' },
    qetDim:       { color: 'var(--admin-text-secondary)', fontWeight: 600, textTransform: 'capitalize', paddingRight: '0.5rem' },
    qetRating:    { color: 'var(--admin-accent)', fontWeight: 700, textAlign: 'center' },
    qetText:      { color: 'var(--admin-text-secondary)', lineHeight: 1.5 },
};

const css = `
.si-card:hover { border-color: rgba(59,130,246,0.35) !important; background: rgba(59,130,246,0.03) !important; }
.qet-row:last-child { border-bottom: none !important; }
button:disabled { opacity: 0.5; cursor: not-allowed; }
`;
