import { useState, useEffect, useRef } from 'react';
import { usePage, router } from '@inertiajs/react';
import axios from 'axios';
import AppLayout from '@/Layouts/AppLayout';
import { useToast } from '@/Components/Snackbar';
import { useConfirm } from '@/Components/ConfirmDialog';
import QetModal from './QetModal';
import AssignModal from './AssignModal';

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

function useSidebarLeft() {
    const getLeft = () => {
        if (window.innerWidth < 768) return 0;
        const el = document.querySelector('.app-main');
        return el ? parseInt(getComputedStyle(el).marginLeft) || 0 : 0;
    };
    const [left, setLeft] = useState(getLeft);
    useEffect(() => {
        const update = () => setLeft(getLeft());
        window.addEventListener('resize', update);
        const t = setTimeout(update, 250);
        return () => { window.removeEventListener('resize', update); clearTimeout(t); };
    }, []);
    return left;
}

function useDelayedPresence(value, delay = 280) {
    const [renderValue, setRenderValue] = useState(value);
    const [closing, setClosing] = useState(false);

    useEffect(() => {
        if (value) {
            setRenderValue(value);
            setClosing(false);
            return;
        }

        if (!renderValue) return;

        setClosing(true);
        const timer = setTimeout(() => {
            setRenderValue(null);
            setClosing(false);
        }, delay);

        return () => clearTimeout(timer);
    }, [value, renderValue, delay]);

    return { renderValue, closing };
}

function formatBudget(value) {
    if (value === null || value === undefined || value === '') return null;
    const num = Number(value);
    if (Number.isNaN(num)) return null;
    return `P${num.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function Editor() {
    const { uwp, functions: initialFunctions, employees } = usePage().props;

    const [functions, setFunctions]             = useState(initialFunctions ?? []);
    const [activeFnId, setActiveFnId]           = useState(initialFunctions?.[0]?.id ?? null);
    const [activeMfoId, setActiveMfoId]         = useState(initialFunctions?.[0]?.mfos?.[0]?.id ?? null);
    const [qetModal, setQetModal]               = useState(null);
    const [assignModal, setAssignModal]         = useState(null);
    const [activeIndicator, setActiveIndicator] = useState(null);
    const [fnModal, setFnModal]                 = useState(null);
    const [addIndicatorCtx, setAddIndicatorCtx] = useState(null);
    const [addMfoCtx, setAddMfoCtx]             = useState(null);
    const [saving, setSaving]                   = useState(false);
    const [navOpen, setNavOpen]                 = useState(false);
    const bp = useBreakpoint();

    const toast    = useToast();
    const confirm  = useConfirm();
    const activeFn = functions.find(f => f.id === activeFnId);

    function patchIndicator(fnId, mfoId, siId, patch) {
        setFunctions(fns => fns.map(f => f.id !== fnId ? f : {
            ...f, mfos: f.mfos.map(m => m.id !== mfoId ? m : {
                ...m, successIndicators: m.successIndicators.map(s => s.id !== siId ? s : { ...s, ...patch }),
            }),
        }));
        // sync live activeIndicator
        setActiveIndicator(ai => ai?.si?.id === siId ? { ...ai, si: { ...ai.si, ...patch } } : ai);
    }

    function apiUrl(path) { return `/supervisor/uwp/${uwp.id}/${path}`; }

    async function handleSaveDraft() {
        setSaving(true);
        try {
            await axios.patch(apiUrl('draft'));
            toast('Draft saved successfully.', 'draft');
        } catch {
            toast('Failed to save draft.', 'error');
        } finally {
            setSaving(false);
        }
    }

    async function handleSubmit() {
        const totalWeight = functions.reduce((sum, f) => sum + (parseFloat(f.weight_percent) || 0), 0);
        if (totalWeight !== 100) {
            toast(`Total function weight must be 100%. Current total: ${totalWeight}%.`, 'error');
            return;
        }
        if (!await confirm('Submit this UWP for review? You will not be able to edit it after submission.')) return;
        let success = false;
        try {
            await axios.patch(apiUrl('submit'));
            success = true;
        } catch {
            toast('Failed to submit UWP.', 'error');
        }
        if (success) {
            toast('UWP submitted for review.', 'submitted');
            router.visit('/supervisor/uwp');
        }
    }

    // Function CRUD
    async function handleSaveFunction(fnData) {
        try {
            if (fnData.id) {
                await axios.patch(apiUrl(`functions/${fnData.id}`), fnData);
                setFunctions(fns => fns.map(f => f.id === fnData.id ? { ...f, ...fnData } : f));
                toast('Function updated.', 'success');
            } else {
                const { data } = await axios.post(apiUrl('functions'), fnData);
                setFunctions(fns => [...fns, data]);
                setActiveFnId(data.id);
                toast('Function added.', 'success');
            }
        } catch {
            toast('Failed to save function.', 'error');
        }
        setFnModal(null);
    }

    async function handleDeleteFunction(fnId) {
        if (!await confirm('Delete this function and all its MFOs and indicators?')) return;
        try {
            await axios.delete(apiUrl(`functions/${fnId}`));
            setFunctions(fns => fns.filter(f => f.id !== fnId));
            if (activeFnId === fnId) { setActiveFnId(null); setActiveMfoId(null); }
            toast('Function deleted.', 'warning');
        } catch {
            toast('Failed to delete function.', 'error');
        }
    }

    // MFO CRUD
    async function handleSaveMfo(mfoData) {
        try {
            if (mfoData.id) {
                await axios.patch(apiUrl(`mfos/${mfoData.id}`), mfoData);
                setFunctions(fns => fns.map(f => f.id === mfoData.fnId
                    ? { ...f, mfos: f.mfos.map(m => m.id === mfoData.id ? { ...m, ...mfoData } : m) }
                    : f));
                toast('MFO updated.', 'success');
            } else {
                const { data } = await axios.post(apiUrl('mfos'), { ...mfoData, uwp_function_id: mfoData.fnId });
                setFunctions(fns => fns.map(f => f.id === mfoData.fnId
                    ? { ...f, mfos: [...f.mfos, data] } : f));
                setActiveMfoId(data.id);
                toast('MFO added.', 'success');
            }
        } catch {
            toast('Failed to save MFO.', 'error');
        }
        setAddMfoCtx(null);
    }

    async function handleDeleteMfo(fnId, mfoId) {
        if (!await confirm('Delete this MFO and all its indicators?')) return;
        try {
            await axios.delete(apiUrl(`mfos/${mfoId}`));
            setFunctions(fns => fns.map(f => f.id !== fnId ? f : {
                ...f, mfos: f.mfos.filter(m => m.id !== mfoId),
            }));
            if (activeMfoId === mfoId) setActiveMfoId(null);
            toast('MFO deleted.', 'warning');
        } catch {
            toast('Failed to delete MFO.', 'error');
        }
    }

    // Indicator CRUD
    async function handleCreateIndicator(siData) {
        try {
            const { data } = await axios.post(apiUrl('indicators'), siData);
            setFunctions(fns => fns.map(f => ({
                ...f, mfos: f.mfos.map(m => m.id === siData.uwp_mfo_id
                    ? { ...m, successIndicators: [...m.successIndicators, data] } : m),
            })));
            setAddIndicatorCtx(null);
            toast('Indicator created.', 'success');
        } catch {
            toast('Failed to create indicator.', 'error');
        }
    }

    async function handleDeleteIndicator(fnId, mfoId, siId) {
        if (!await confirm('Delete this indicator?')) return;
        try {
            await axios.delete(apiUrl(`indicators/${siId}`));
            setFunctions(fns => fns.map(f => f.id !== fnId ? f : {
                ...f, mfos: f.mfos.map(m => m.id !== mfoId ? m : {
                    ...m, successIndicators: m.successIndicators.filter(s => s.id !== siId),
                }),
            }));
            toast('Indicator deleted.', 'warning');
        } catch {
            toast('Failed to delete indicator.', 'error');
        }
    }

    async function handleIndicatorChange(patch) {
        const { fnId, mfoId, si } = activeIndicator;
        patchIndicator(fnId, mfoId, si.id, patch);
        try {
            await axios.patch(apiUrl(`indicators/${si.id}`), patch);
        } catch {
            toast('Failed to save indicator changes.', 'error');
        }
    }

    // QET
    async function handleSaveQet(siId, standards) {
        const modal = qetModal;
        patchIndicator(modal.fnId, modal.mfoId, siId, { qetStandards: standards });
        setQetModal(null);
        try {
            await axios.put(apiUrl(`indicators/${siId}/qet`), { standards });
            toast('QET standards saved.', 'success');
        } catch {
            toast('Failed to save QET standards.', 'error');
        }
    }

    // Assign
    async function handleSaveAssign(siId, emps) {
        const modal = assignModal;
        try {
            const { data } = await axios.put(apiUrl(`indicators/${siId}/assign`), {
                employee_ids: emps.map(e => e.id),
            });
            patchIndicator(modal.fnId, modal.mfoId, siId, { assignments: data.assignments });
            setAssignModal(null);
            toast(`${emps.length} employee${emps.length !== 1 ? 's' : ''} assigned.`, 'success');
        } catch {
            toast('Failed to assign employees.', 'error');
        }
    }

    // All MFOs across all functions (for tab strip on mobile)
    const allMfos = functions.flatMap(f => f.mfos ?? []);
    const activeMfo = allMfos.find(m => m.id === activeMfoId);
    const activeFnForMfo = functions.find(f => f.mfos?.some(m => m.id === activeMfoId));

    // Breadcrumb dropdown state (tablet)
    const [fnDropOpen,  setFnDropOpen]  = useState(false);
    const [mfoDropOpen, setMfoDropOpen] = useState(false);
    const fnDropRef = useRef(null);
    const mfoDropRef = useRef(null);

    useEffect(() => {
        if (!fnDropOpen && !mfoDropOpen) return;
        const onDown = e => {
            if (fnDropOpen && fnDropRef.current && !fnDropRef.current.contains(e.target)) setFnDropOpen(false);
            if (mfoDropOpen && mfoDropRef.current && !mfoDropRef.current.contains(e.target)) setMfoDropOpen(false);
        };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [fnDropOpen, mfoDropOpen]);

    return (
        <AppLayout title="UWP Editor">
            <style>{css}</style>

            {/* ── Unified card wrapper ── */}
            <div style={{ borderRadius: 'var(--admin-radius-lg)', border: '1px solid var(--admin-border-strong)', background: 'var(--admin-card)', boxShadow: 'var(--admin-shadow)', overflow: 'clip' }}>

            {/* ── Top bar ── */}
            <div style={{ position: 'sticky', top: 0, zIndex: 40, background: 'var(--admin-card)', borderBottom: '1px solid var(--admin-border)', padding: '0.6rem 1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                    {/* Left: back + title block */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                        <button onClick={() => router.visit('/supervisor/uwp')} style={s.backBtn} title="Back to UWP list">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
                        </button>
                        <div style={{ width: 1, height: 28, background: 'var(--admin-border-strong)', flexShrink: 0 }} />
                        <div style={{ minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--admin-text-primary)', whiteSpace: 'nowrap' }}>
                                    UWP Editor
                                </span>
                                <StatusBadge status={uwp?.status} />
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)', marginTop: '0.1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {uwp?.office ?? ''}{uwp?.office && uwp?.period ? ' · ' : ''}{uwp?.period ?? ''}
                            </div>
                        </div>
                    </div>
                    {/* Right: actions (desktop/tablet only) */}
                    {bp !== 'mobile' && uwp?.editable && (
                        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                            <button style={s.btnSecondary} onClick={handleSaveDraft} disabled={saving}>
                                {saving ? 'Saving…' : 'Save Draft'}
                            </button>
                            <button style={s.btnPrimary} onClick={handleSubmit}>Submit</button>
                        </div>
                    )}
                </div>
            </div>

            {!uwp?.editable && (
                <div style={s.readonlyBanner}>
                    🔒 This UWP is <strong>{uwp?.status?.replace(/_/g, ' ')}</strong> and cannot be edited.
                </div>
            )}

            {/* ── Tablet: same two-row tab nav as mobile ── */}
            {bp === 'tablet' && (
                <div style={{ position: 'sticky', top: '4.35rem', zIndex: 35, background: 'var(--admin-card)', borderBottom: '1px solid var(--admin-border)' }}>
                    <div style={{ display: 'flex', overflowX: 'auto', scrollbarWidth: 'none', borderBottom: '1px solid var(--admin-border)' }}>
                        {functions.map(fn => (
                            <button key={fn.id} style={{ ...s.tab, ...(activeFnId === fn.id ? s.tabActive : {}) }}
                                onClick={() => { setActiveFnId(fn.id); setActiveMfoId(fn.mfos?.[0]?.id ?? null); }}>
                                {fn.name}
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

            {/* ── Mobile: MFO tab strip ── */}
            {bp === 'mobile' && (
                <div style={{ position: 'sticky', top: '4.35rem', zIndex: 35, background: 'var(--admin-card)', borderBottom: '1px solid var(--admin-border)' }}>
                    {/* Function selector row */}
                    <div style={{ display: 'flex', overflowX: 'auto', scrollbarWidth: 'none', borderBottom: '1px solid var(--admin-border)' }}>
                        {functions.map(fn => (
                            <button key={fn.id}
                                style={{ ...s.tab, ...(activeFnId === fn.id ? s.tabActive : {}) }}
                                onClick={() => { setActiveFnId(fn.id); setActiveMfoId(fn.mfos?.[0]?.id ?? null); }}>
                                {fn.name}
                            </button>
                        ))}
                    </div>
                    {/* MFO tabs for active function */}
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

            {/* ── Three-column layout ── */}
            <div style={{ ...s.layout, flexDirection: bp !== 'desktop' ? 'column' : 'row' }} className="uwp-layout">

                {/* ── Left panel: sidebar on desktop only ── */}
                {bp === 'desktop' && (
                    <aside style={s.leftPanel} className="uwp-left">
                        <EditorLeftNav
                            functions={functions} activeFnId={activeFnId} activeMfoId={activeMfoId}
                            editable={uwp?.editable}
                            setActiveFnId={setActiveFnId} setActiveMfoId={setActiveMfoId}
                            setFnModal={setFnModal} setAddMfoCtx={setAddMfoCtx}
                            handleDeleteFunction={handleDeleteFunction} activeFn={activeFn}
                        />
                    </aside>
                )}

                {/* Col 2: MFO groups */}
                <main style={{ ...s.centerPanel, paddingBottom: bp === 'mobile' ? '7rem' : '1.5rem' }} className="uwp-center">
                    {(() => {
                        // Desktop: show ALL mfos of active function
                        // Tablet/Mobile: show only the active MFO
                        const displayFn = bp === 'desktop' ? activeFn : (activeFnForMfo ?? activeFn);
                        const mfosToShow = displayFn?.mfos?.filter(mfo =>
                            bp === 'desktop' ? true : mfo.id === activeMfoId
                        ) ?? [];

                        if (!displayFn) {
                            return <div style={s.empty}>Select a function to view its MFOs and indicators.</div>;
                        }
                        if (mfosToShow.length === 0) {
                            return <div style={s.empty}>No MFOs yet. Use "+ Add MFO / PPA" to get started.</div>;
                        }
                        return mfosToShow.map(mfo => (
                            <MfoGroup
                                key={mfo.id}
                                mfo={mfo}
                                fnId={displayFn.id}
                                editable={uwp?.editable}
                                bp={bp}
                                onEditMfo={mfo => setAddMfoCtx({ fn: displayFn, mfo })}
                                onDeleteMfo={mfoId => handleDeleteMfo(displayFn.id, mfoId)}
                                onEditQet={si => setQetModal({ indicator: si, fnId: displayFn.id, mfoId: mfo.id })}
                                onAssign={si => setAssignModal({ indicator: si, fnId: displayFn.id, mfoId: mfo.id })}
                                onOpenContext={si => setActiveIndicator({ si, fnId: displayFn.id, mfoId: mfo.id })}
                                onDeleteIndicator={siId => handleDeleteIndicator(displayFn.id, mfo.id, siId)}
                                onAddIndicator={() => setAddIndicatorCtx({ mfo })}
                            />
                        ));
                    })()}
                </main>

            </div>
            </div>{/* ── end unified card wrapper ── */}

            {/* FAB: mobile/tablet add button */}
            {bp !== 'desktop' && uwp?.editable && (
                <div style={{ position: 'fixed', bottom: bp === 'mobile' && uwp?.editable ? '5.5rem' : '1.5rem', right: '1.25rem', zIndex: 98 }}>
                    <MobileAddMenu
                        activeFn={activeFn ?? activeFnForMfo}
                        functions={functions}
                        onAddMfo={fn => setAddMfoCtx({ fn })}
                        onAddFn={() => setFnModal({})}
                        fab
                    />
                </div>
            )}

            {/* Sticky bottom bar on mobile */}
            {bp === 'mobile' && uwp?.editable && (
                <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 99,
                    background: 'var(--admin-card)', borderTop: '1px solid var(--admin-border)',
                    padding: '0.75rem 1rem', minHeight: 56, display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                    <button style={s.btnSecondary} onClick={handleSaveDraft} disabled={saving}>
                        {saving ? 'Saving…' : 'Save Draft'}
                    </button>
                    <button style={s.btnPrimary} onClick={handleSubmit}>Submit</button>
                </div>
            )}

            {/* Modals */}
            {qetModal && (
                <QetModal
                    indicator={qetModal.indicator}
                    onSave={handleSaveQet}
                    onClose={() => setQetModal(null)}
                />
            )}
            {assignModal && (
                <AssignModal
                    indicator={assignModal.indicator}
                    periodId={uwp?.performance_period_id ?? 1}
                    employees={employees ?? []}
                    allIndicators={functions.flatMap(f => f.mfos?.flatMap(m => (m.successIndicators ?? []).map(si => ({ ...si, mfo_title: m.title, function_name: f.name, function_type: f.function_type }))) ?? [])}
                    onSave={handleSaveAssign}
                    onClose={() => setAssignModal(null)}
                />
            )}

            <IndicatorContextSidebar
                indicator={activeIndicator?.si}
                editable={uwp?.editable}
                onChange={handleIndicatorChange}
                onClose={() => setActiveIndicator(null)}
                bp={bp}
            />

            <AddIndicatorSidebar
                ctx={addIndicatorCtx}
                activeFn={activeFn}
                onSave={handleCreateIndicator}
                onClose={() => setAddIndicatorCtx(null)}
                bp={bp}
            />

            <AddMfoSidebar
                ctx={addMfoCtx}
                onSave={handleSaveMfo}
                onClose={() => setAddMfoCtx(null)}
                bp={bp}
            />

            {fnModal !== null && (
                <FunctionModal
                    fn={fnModal.fn ?? {}}
                    functions={functions}
                    onSave={handleSaveFunction}
                    onClose={() => setFnModal(null)}
                    bp={bp}
                />
            )}
        </AppLayout>
    );
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

function EditorLeftNav({ functions, activeFnId, activeMfoId, editable, setActiveFnId, setActiveMfoId, setFnModal, setAddMfoCtx, handleDeleteFunction, activeFn }) {
    return (
        <div style={{ padding: '0.5rem 0' }}>
            <div style={s.panelLabel}>MFOs / PPAs</div>
            {functions.map(fn => (
                <div key={fn.id}>
                    <div className="fn-actions-row" style={{ display: 'flex', alignItems: 'center' }}>
                        <button style={{ ...s.fnItem, ...(activeFnId === fn.id ? s.fnItemActive : {}), flex: 1 }}
                            onClick={() => { setActiveFnId(fn.id); setActiveMfoId(fn.mfos?.[0]?.id ?? null); }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                            <span style={{ flex: 1, textAlign: 'left' }}>{fn.name}</span>
                        </button>
                        {editable && (
                            <div className="fn-actions">
                                <button style={s.fnActionBtn} onClick={() => setFnModal({ fn })} title="Edit">
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                </button>
                                <button style={{ ...s.fnActionBtn, color: '#ef4444' }} onClick={() => handleDeleteFunction(fn.id)} title="Delete">
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                                </button>
                            </div>
                        )}
                    </div>
                    {activeFnId === fn.id && fn.mfos?.map(mfo => (
                        <button key={mfo.id} style={{ ...s.mfoItem, ...(activeMfoId === mfo.id ? s.mfoItemActive : {}) }}
                            onClick={() => setActiveMfoId(mfo.id)}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
                            <span style={{ flex: 1, textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{mfo.title}</span>
                        </button>
                    ))}
                    {activeFnId === fn.id && editable && (
                        <button style={s.addMfoBtn} onClick={() => setAddMfoCtx({ fn })}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
                            Add MFO / PPA
                        </button>
                    )}
                </div>
            ))}
            {editable && (
                <button style={s.addFnBtn} onClick={() => setFnModal({})}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
                    Add Function
                </button>
            )}
        </div>
    );
}

function MfoGroup({ mfo, fnId, editable, bp, onEditMfo, onDeleteMfo, onEditQet, onAssign, onOpenContext, onDeleteIndicator, onAddIndicator }) {
    const count = mfo.successIndicators?.length ?? 0;
    return (
        <section style={s.mfoGroup}>
            <div className="mfo-header-row" style={s.mfoHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={s.mfoIcon}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
                    </span>
                    <span style={s.mfoTitle}>{mfo.title}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={s.indicatorBadge}>{count} {count === 1 ? 'Indicator' : 'Indicators'}</span>
                    {editable && bp === 'mobile' && (
                        <button type="button" style={s.mfoInlineBtn} onClick={() => onEditMfo(mfo)} title="Edit MFO">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                        </button>
                    )}
                    {editable && bp !== 'mobile' && (
                        <div className="mfo-actions">
                            <button style={s.fnActionBtn} title="Edit MFO" onClick={() => onEditMfo(mfo)}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            </button>
                            <button style={{ ...s.fnActionBtn, color: '#ef4444' }} title="Delete MFO" onClick={() => onDeleteMfo(mfo.id)}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {mfo.successIndicators?.map(si => (
                <IndicatorCard
                    key={si.id}
                    si={si}
                    editable={editable}
                    onEditQet={() => onEditQet(si)}
                    onAssign={() => onAssign(si)}
                    onOpenContext={() => onOpenContext(si)}
                    onDelete={() => onDeleteIndicator(si.id)}
                />
            ))}

            {editable && (
                <button style={s.addBtn} onClick={onAddIndicator}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>
                    Add Indicator
                </button>
            )}
        </section>
    );
}

// ── Single indicator card ──
function IndicatorCard({ si, editable, onEditQet, onAssign, onOpenContext, onDelete }) {
    const [menuOpen, setMenuOpen] = useState(false);
    const budget = formatBudget(si.allotted_budget ?? 0);
    const assignees = si.assignments ?? [];

    return (
        <div style={s.siCard} className="si-card">
            {/* Title */}
            <h4 style={s.siTitle} onClick={onOpenContext}>{si.indicator_text ?? '—'}</h4>

            {/* Budget + avatars row */}
            <div style={s.siMeta}>
                {budget && (
                    <span style={s.siBudget}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 4 }}><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
                        {budget}
                    </span>
                )}
                {assignees.length > 0 && (
                    <>
                        <span style={s.metaDot} />
                        <div style={s.avatarGroup}>
                            {assignees.slice(0, 3).map((a, i) => (
                                <div key={i} style={{ ...s.avatar, zIndex: 10 - i }}>
                                    {initials(a.employee?.name)}
                                </div>
                            ))}
                            {assignees.length > 3 && <div style={{ ...s.avatar, background: 'var(--admin-border-strong)' }}>+{assignees.length - 3}</div>}
                        </div>
                    </>
                )}
            </div>

            {/* Actions */}
            <div style={s.siActions}>
                <button style={{ ...s.siBtn, ...s.assignBtn }} onClick={onAssign}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/></svg>
                    Assign
                </button>
                <button style={{ ...s.siBtn, ...s.qetBtn }} onClick={onEditQet}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                    QET Standards
                </button>
                <div style={{ position: 'relative', marginLeft: 'auto' }}>
                    <button style={s.moreBtn} onClick={() => setMenuOpen(v => !v)}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                    </button>
                    {menuOpen && (
                        <>
                            <div style={s.menuBackdrop} onClick={() => setMenuOpen(false)} />
                            <div style={s.menu}>
                            <button style={s.menuItem} onClick={() => { onOpenContext(); setMenuOpen(false); }}>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
                                View Details
                            </button>
                            {editable && <>
                                <button style={s.menuItem} onClick={() => { onAssign(); setMenuOpen(false); }}>
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/></svg>
                                    Assign Employee
                                </button>
                                <button style={s.menuItem} onClick={() => { onEditQet(); setMenuOpen(false); }}>
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                                    Edit QET Standards
                                </button>
                                <div style={s.menuDivider} />
                                <button style={{ ...s.menuItem, color: '#f87171' }} onClick={() => { onDelete(); setMenuOpen(false); }}>
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                                    Delete Indicator
                                </button>
                            </>}
                        </div>
                    </>
                )}
                </div>
            </div>
        </div>
    );
}

// ── Indicator Context overlay sidebar ──
function IndicatorContextSidebar({ indicator, editable, onChange, onClose, bp }) {
    const { renderValue: visibleIndicator, closing } = useDelayedPresence(indicator);
    const left = useSidebarLeft();
    const budget = formatBudget(visibleIndicator?.allotted_budget ?? 0) ?? 'P0.00';
    const qty      = visibleIndicator?.target_quantity ?? '';
    const timeline = visibleIndicator?.target_timeline ?? '';

    const body = (
        <div style={sCtx.body}>
            <div style={sCtx.infoBlock}>
                {editable ? (
                    <>
                        <div style={sCtx.infoRow}>
                            <span style={sCtx.infoLabel}>SUCCESS INDICATOR TEXT</span>
                            <textarea placeholder="Describe the measurable outcome..." value={visibleIndicator?.indicator_text ?? ''} onChange={e => onChange({ indicator_text: e.target.value })} style={{ ...sCtx.editInput, resize: 'vertical', minHeight: 80 }} />
                        </div>
                        <div style={sCtx.hr} />
                        <div style={sCtx.infoRow}>
                            <span style={sCtx.infoLabel}>TARGET QTY</span>
                            <input type="text" placeholder="e.g. 1, 100%" value={qty} onChange={e => onChange({ target_quantity: e.target.value })} style={sCtx.editInput} />
                        </div>
                        <div style={sCtx.hr} />
                        <div style={sCtx.infoRow}>
                            <span style={sCtx.infoLabel}>TARGET TIMELINE</span>
                            <textarea placeholder="e.g. within 5 working days upon receipt" value={timeline} onChange={e => onChange({ target_timeline: e.target.value })} style={{ ...sCtx.editInput, resize: 'vertical', minHeight: 70 }} />
                        </div>
                        <div style={sCtx.hr} />
                        <div style={sCtx.infoRow}>
                            <span style={sCtx.infoLabel}>BUDGET ALLOTTED P</span>
                            <input type="number" min="0" placeholder="0.00" value={visibleIndicator?.allotted_budget ?? ''} onChange={e => onChange({ allotted_budget: e.target.value })} style={sCtx.editInput} />
                        </div>
                    </>
                ) : (
                    <>
                        <div style={sCtx.infoRow}>
                            <span style={sCtx.infoLabel}>TARGET</span>
                            <span style={{ ...sCtx.infoVal, color: 'var(--admin-accent)', fontWeight: 700 }}>
                                {qty ? `${qty} ${timeline}` : (timeline || '—')}
                            </span>
                        </div>
                        <div style={sCtx.hr} />
                        <div style={sCtx.infoRow}>
                            <span style={sCtx.infoLabel}>BUDGET</span>
                            <span style={sCtx.infoVal}>{budget}</span>
                        </div>
                    </>
                )}
            </div>
            <div style={{ ...sCtx.sectionLabel, marginTop: '1.25rem' }}>SUCCESS INDICATOR</div>
            <p style={sCtx.indicatorText}>
                {visibleIndicator?.indicator_text || (qty && timeline ? `${qty} ${timeline}` : (timeline || qty || '—'))}
            </p>
        </div>
    );

    if (bp === 'mobile') {
        if (!visibleIndicator) return null;
        return (
            <>
                <div onClick={onClose} style={{ position: 'fixed', top: 0, bottom: 0, left, right: 0, zIndex: 1100, background: 'rgba(0,0,0,0.5)' }} />
                <div style={{ position: 'fixed', bottom: 0, left, right: 0, zIndex: 1101, background: 'var(--admin-card)', borderRadius: '20px 20px 0 0', boxShadow: '0 -8px 32px rgba(0,0,0,0.3)', height: '82vh', display: 'flex', flexDirection: 'column', animation: 'slideUp 0.25s ease' }}>
                    <div style={{ padding: '10px 1.25rem 0', flexShrink: 0, display: 'flex', justifyContent: 'center', position: 'relative' }}>
                        <div style={{ width: 36, height: 4, borderRadius: 99, background: 'var(--admin-border-strong)' }} />
                        <button onClick={onClose} style={{ position: 'absolute', right: '1rem', top: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-muted)', fontSize: '1.1rem', padding: 4 }}>✕</button>
                    </div>
                    <div style={{ padding: '0.5rem 1.25rem 0', flexShrink: 0 }}>
                        <span style={sCtx.label}>INDICATOR CONTEXT</span>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto' }}>{body}</div>
                </div>
                <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
            </>
        );
    }

    return (
        <>
            {visibleIndicator && <div style={sCtx.backdrop} onClick={onClose} />}
            <div style={{ ...sCtx.panel, ...(visibleIndicator && !closing ? sCtx.open : {}) }}>
                <div style={sCtx.header}>
                    <span style={sCtx.label}>INDICATOR CONTEXT</span>
                    <button style={sCtx.closeBtn} onClick={onClose}>✕</button>
                </div>
                {body}
            </div>
        </>
    );
}

function AddIndicatorSidebar({ ctx, activeFn, onSave, onClose, bp }) {
    const { renderValue: visibleCtx, closing } = useDelayedPresence(ctx);
    const [text, setText]         = useState('');
    const [budget, setBudget]     = useState('');
    const [qty, setQty]           = useState('');
    const [timeline, setTimeline] = useState('');

    const mfoTitle = visibleCtx?.mfo?.title ?? '';

    async function handleCreate() {
        if (!text.trim()) return;
        await onSave({
            uwp_mfo_id:      visibleCtx.mfo.id,
            indicator_text:  text.trim(),
            target_quantity: qty || null,
            target_timeline: timeline || null,
            allotted_budget: budget || null,
        });
        setText(''); setBudget(''); setQty(''); setTimeline('');
    }

    const left = useSidebarLeft();

    const panelBody = (
        <>
            <div style={sAdd.body}>
                <div style={sAdd.fieldGroup}>
                    <label style={sAdd.label}>SUCCESS INDICATOR NAME</label>
                    <textarea style={sAdd.textarea} placeholder="Describe the measurable outcome for this unit..." value={text} onChange={e => setText(e.target.value)} rows={4} />
                </div>
                <div style={sAdd.row}>
                    <div style={{ flex: 1 }}>
                        <label style={sAdd.label}>BUDGET ALLOTTED</label>
                        <div style={sAdd.inputWrap}>
                            <span style={sAdd.inputPrefix}>P</span>
                            <input style={sAdd.input} placeholder="0.00" value={budget} onChange={e => setBudget(e.target.value)} />
                        </div>
                    </div>
                </div>
                <div style={sAdd.row}>
                    <div style={{ flex: 1 }}>
                        <label style={sAdd.label}>TARGET QUANTITY</label>
                        <input style={{ ...sAdd.input, paddingLeft: '0.75rem' }} placeholder="e.g. 1, 95%, 100%" value={qty} onChange={e => setQty(e.target.value)} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <label style={sAdd.label}>TARGET TIMELINE</label>
                        <input style={{ ...sAdd.input, paddingLeft: '0.75rem' }} placeholder="e.g. Q4 2026, Day 26" value={timeline} onChange={e => setTimeline(e.target.value)} />
                    </div>
                </div>
                <div style={sAdd.aiBanner}>
                    <div style={sAdd.aiHeader}>
                        <span style={sAdd.aiIcon}>✦</span>
                        <span style={sAdd.aiLabel}>AI BENCHMARK ANALYSIS</span>
                        <span style={{ ...sAdd.aiIcon, marginLeft: 'auto', opacity: 0.5 }}>✦</span>
                    </div>
                    <p style={sAdd.aiText}>Based on 2025 performance, similar indicators target{' '}<strong style={{ color: 'var(--admin-accent)' }}>100% completion</strong> within{' '}<strong style={{ color: 'var(--admin-accent)' }}>5 working days</strong>.</p>
                    <button style={sAdd.aiLink}>Apply Suggestion →</button>
                </div>
                <p style={sAdd.note}>ⓘ Indicators added here will be pending review by the Planning Office before final UWP approval.</p>
            </div>
            <div style={sAdd.footer}>
                <button style={sCtx.closeBtn} onClick={onClose}>Cancel</button>
                <button style={{ ...s.btnPrimary, padding: '0.6rem 1.5rem', fontSize: '0.85rem' }} onClick={handleCreate}>Create Indicator</button>
            </div>
        </>
    );

    if (bp === 'mobile') {
        if (!visibleCtx) return null;
        return (
            <>
                <div onClick={onClose} style={{ position: 'fixed', top: 0, bottom: 0, left, right: 0, zIndex: 1100, background: 'rgba(0,0,0,0.5)' }} />
                <div style={{ position: 'fixed', bottom: 0, left, right: 0, zIndex: 1101, background: 'var(--admin-card)', borderRadius: '20px 20px 0 0', boxShadow: '0 -8px 32px rgba(0,0,0,0.3)', height: '82vh', display: 'flex', flexDirection: 'column', animation: 'slideUp 0.25s ease' }}>
                    <div style={{ padding: '10px 1.25rem 0', flexShrink: 0, display: 'flex', justifyContent: 'center', position: 'relative' }}>
                        <div style={{ width: 36, height: 4, borderRadius: 99, background: 'var(--admin-border-strong)' }} />
                        <button onClick={onClose} style={{ position: 'absolute', right: '1rem', top: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-muted)', fontSize: '1.1rem', padding: 4 }}>✕</button>
                    </div>
                    <div style={{ padding: '0.75rem 1.25rem 0.25rem', flexShrink: 0, borderBottom: '1px solid var(--admin-border)' }}>
                        <div style={sAdd.title}>New Success Indicator</div>
                        <div style={sAdd.sub}>{activeFn?.name ?? ''}</div>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>{panelBody}</div>
                </div>
                <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
            </>
        );
    }

    return (
        <>
            {visibleCtx && <div style={sCtx.backdrop} onClick={onClose} />}
            <div style={{ ...sAdd.panel, ...(visibleCtx && !closing ? sAdd.open : {}) }}>
                <div style={sAdd.header}>
                    <div>
                        <div style={sAdd.title}>New Success Indicator</div>
                        <div style={sAdd.sub}>{activeFn?.name ?? ''}</div>
                    </div>
                    <button style={sCtx.closeBtn} onClick={onClose}>✕</button>
                </div>
                {panelBody}
            </div>
        </>
    );
}

const sAdd = {
    panel:      { position: 'fixed', top: 0, right: 0, height: '100vh', width: 420, zIndex: 1101, background: 'var(--admin-card)', borderLeft: '1px solid var(--admin-border-strong)', display: 'flex', flexDirection: 'column', transform: 'translateX(100%)', transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)', boxShadow: '-8px 0 32px rgba(0,0,0,0.35)' },
    open:       { transform: 'translateX(0)' },
    mobileSheet: { position: 'fixed', left: 0, right: 0, bottom: 0, top: 'auto', width: '100%', maxWidth: '100%', height: '82vh', background: 'var(--admin-card)', borderRadius: '20px 20px 0 0', transform: 'translateY(100%)', transition: 'transform 0.28s cubic-bezier(0.22, 1, 0.36, 1)', willChange: 'transform', boxShadow: '0 -8px 32px rgba(0,0,0,0.35)', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
    mobileSheetOpen: { transform: 'translateY(0)', animation: 'slideUp 0.28s cubic-bezier(0.22, 1, 0.36, 1)' },
    dragHandle: { position: 'absolute', left: '50%', top: 8, transform: 'translateX(-50%)', width: 36, height: 4, borderRadius: 99, background: 'var(--admin-border-strong)' },
    header:     { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--admin-border)' },
    title:      { fontSize: '1.1rem', fontWeight: 700, color: 'var(--admin-text-primary)', marginBottom: '0.2rem' },
    sub:        { fontSize: '0.78rem', color: 'var(--admin-text-muted)' },
    body:       { flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' },
    footer:     { display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem', padding: '1rem 1.5rem', borderTop: '1px solid var(--admin-border)' },
    fieldGroup: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
    label:      { fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--admin-text-muted)', textTransform: 'uppercase' },
    textarea:   { width: '100%', minHeight: 110, padding: '0.75rem', background: 'var(--admin-bg-secondary)', border: '1px solid var(--admin-accent)', borderRadius: 8, color: 'var(--admin-text-primary)', fontSize: '0.9rem', resize: 'vertical', outline: 'none', boxSizing: 'border-box' },
    row:        { display: 'flex', gap: '0.75rem' },
    inputWrap:  { display: 'flex', alignItems: 'center', background: 'var(--admin-bg-secondary)', border: '1px solid var(--admin-border-strong)', borderRadius: 8, overflow: 'hidden' },
    inputPrefix:{ padding: '0 0.6rem', color: 'var(--admin-text-muted)', fontSize: '0.85rem', flexShrink: 0 },
    input:      { flex: 1, padding: '0.6rem 0.75rem', background: 'var(--admin-bg-secondary)', border: '1px solid var(--admin-border-strong)', borderRadius: 8, color: 'var(--admin-text-primary)', fontSize: '0.85rem', outline: 'none', width: '100%', boxSizing: 'border-box' },
    aiBanner:   { background: 'var(--admin-bg-secondary)', border: '1px solid var(--admin-border-strong)', borderRadius: 10, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' },
    aiHeader:   { display: 'flex', alignItems: 'center', gap: '0.5rem' },
    aiIcon:     { color: 'var(--admin-accent)', fontSize: '0.8rem' },
    aiLabel:    { fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--admin-accent)', textTransform: 'uppercase' },
    aiText:     { fontSize: '0.85rem', color: 'var(--admin-text-secondary)', margin: 0, lineHeight: 1.5 },
    aiLink:     { background: 'none', border: 'none', color: 'var(--admin-accent)', fontSize: '0.82rem', cursor: 'pointer', padding: 0, textAlign: 'left' },
    note:       { fontSize: '0.78rem', color: 'var(--admin-text-muted)', fontStyle: 'italic', margin: 0 },
};

function AddMfoSidebar({ ctx, onSave, onClose, bp }) {
    const { renderValue: visibleCtx, closing } = useDelayedPresence(ctx);
    const [title, setTitle] = useState(ctx?.mfo?.title ?? '');
    const charCount = title.length;

    const isEdit = !!visibleCtx?.mfo;

    // Pre-fill when ctx changes (opening edit vs new)
    useEffect(() => {
        setTitle(visibleCtx?.mfo?.title ?? '');
    }, [visibleCtx]);

    async function handleSave() {
        if (!title.trim()) return;
        await onSave({ id: visibleCtx?.mfo?.id, fnId: visibleCtx?.fn?.id, title, weight_percent: null });
        setTitle('');
    }

    const left = useSidebarLeft();

    const panelBody = (
        <>
            <div style={sAdd.body}>
                <div style={sAdd.fieldGroup}>
                    <label style={sAdd.label}>MFO TITLE</label>
                    <div style={{ position: 'relative' }}>
                        <textarea style={sAdd.textarea} placeholder="Enter the Major Final Output title..." value={title} maxLength={255} onChange={e => setTitle(e.target.value)} rows={5} />
                        <span style={{ position: 'absolute', bottom: 8, right: 10, fontSize: '0.65rem', color: 'var(--admin-text-muted)' }}>{charCount}/255</span>
                    </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', padding: '2rem 0', color: 'var(--admin-text-muted)' }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity=".4"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
                    <p style={{ fontSize: '0.8rem', textAlign: 'center', fontStyle: 'italic', opacity: 0.6, margin: 0 }}>Define strategic objectives and performance indicators within this MFO cluster.</p>
                </div>
            </div>
            <div style={sAdd.footer}>
                <button style={{ background: 'none', border: '1px solid var(--admin-border-strong)', cursor: 'pointer', color: 'var(--admin-text-muted)', borderRadius: 8, padding: '0.6rem 1.25rem', fontWeight: 600, fontSize: '0.85rem', letterSpacing: '0.04em' }} onClick={onClose}>CANCEL</button>
                <button style={{ ...s.btnPrimary, padding: '0.6rem 1.5rem', fontSize: '0.85rem', letterSpacing: '0.04em' }} onClick={handleSave}>{isEdit ? 'SAVE MFO' : 'ADD MFO'}</button>
            </div>
        </>
    );

    if (bp === 'mobile') {
        if (!visibleCtx) return null;
        return (
            <>
                <div onClick={onClose} style={{ position: 'fixed', top: 0, bottom: 0, left, right: 0, zIndex: 1100, background: 'rgba(0,0,0,0.5)' }} />
                <div style={{ position: 'fixed', bottom: 0, left, right: 0, zIndex: 1101, background: 'var(--admin-card)', borderRadius: '20px 20px 0 0', boxShadow: '0 -8px 32px rgba(0,0,0,0.3)', height: '82vh', display: 'flex', flexDirection: 'column', animation: 'slideUp 0.25s ease' }}>
                    <div style={{ padding: '10px 1.25rem 0', flexShrink: 0, display: 'flex', justifyContent: 'center', position: 'relative' }}>
                        <div style={{ width: 36, height: 4, borderRadius: 99, background: 'var(--admin-border-strong)' }} />
                        <button onClick={onClose} style={{ position: 'absolute', right: '1rem', top: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-muted)', fontSize: '1.1rem', padding: 4 }}>✕</button>
                    </div>
                    <div style={{ padding: '0.75rem 1.25rem 0.25rem', flexShrink: 0, borderBottom: '1px solid var(--admin-border)' }}>
                        <div style={sAdd.title}>{isEdit ? 'Edit MFO' : 'New MFO / PPA'}</div>
                        <div style={sAdd.sub}>{ctx?.fn?.name ?? ''}</div>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>{panelBody}</div>
                </div>
                <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
            </>
        );
    }

    return (
        <>
            {visibleCtx && <div style={sCtx.backdrop} onClick={onClose} />}
            <div style={{ ...sAdd.panel, ...(visibleCtx && !closing ? sAdd.open : {}) }}>
                <div style={sAdd.header}>
                    <div>
                        <div style={sAdd.title}>{isEdit ? 'Edit MFO' : 'New MFO / PPA'}</div>
                        <div style={sAdd.sub}>{ctx?.fn?.name ?? ''}</div>
                    </div>
                    <button style={sCtx.closeBtn} onClick={onClose}>✕</button>
                </div>
                {panelBody}
            </div>
        </>
    );
}

// ── Function create/edit modal ──
function FunctionModal({ fn, functions = [], onSave, onClose, bp }) {
    const { renderValue: visibleFn, closing } = useDelayedPresence(fn);
    const left = useSidebarLeft();
    const isEdit = !!visibleFn?.id;

    const typeLabels = { core: 'Core Functions', support: 'Support Functions', strategic: 'Strategic Functions' };

    function getAutoName(selectedType) {
        // existing types excluding the one being edited
        const existing = functions.filter(f => !isEdit || f.id !== visibleFn?.id);
        const usedTypes = existing.map(f => f.function_type);
        const order = ['core', 'support', 'strategic'];
        const sorted = order.filter(t => t === selectedType || usedTypes.includes(t));
        const idx = sorted.indexOf(selectedType);
        const prefix = String.fromCharCode(65 + idx); // A, B, C
        return `${prefix}. ${typeLabels[selectedType]}`;
    }

    const [type, setType]     = useState(fn?.function_type ?? 'core');
    const [name, setName]     = useState(fn?.name ?? (!fn?.id ? getAutoName(fn?.function_type ?? 'core') : ''));
    const [weight, setWeight] = useState(fn?.weight_percent ?? '');

    // types already used (excluding current fn when editing)
    const usedTypes = functions.filter(f => !isEdit || f.id !== visibleFn?.id).map(f => f.function_type);

    const usedWeight = functions
        .filter(f => !isEdit || f.id !== visibleFn?.id)
        .reduce((sum, f) => sum + (parseFloat(f.weight_percent) || 0), 0);
    const remainingWeight = 100 - usedWeight;
    const weightExceeds = parseFloat(weight) > remainingWeight;

    async function handleSave() {
        if (!name.trim()) return;
        if (!isEdit && usedTypes.includes(type)) return;
        if (weightExceeds) return;
        await onSave({ id: visibleFn?.id, name, function_type: type, weight_percent: weight || null });
    }

    const modalContent = (
        <>
            <div style={sFn.header}>
                <div>
                    <div style={sFn.title}>{isEdit ? 'Edit Function' : 'New Function'}</div>
                    <div style={sFn.sub}>{isEdit ? visibleFn.name : 'Add a new function group'}</div>
                </div>
                <button style={sCtx.closeBtn} onClick={onClose}>✕</button>
            </div>
            <div style={sFn.body}>
                <div style={sAdd.fieldGroup}>
                    <label style={sAdd.label}>FUNCTION NAME</label>
                    <input style={{ ...sAdd.input, paddingLeft: '0.75rem', textTransform: 'uppercase' }} placeholder="e.g. A. CORE FUNCTIONS" value={name} onChange={e => setName(e.target.value.toUpperCase())} />
                </div>
                <div style={sAdd.row}>
                    <div style={{ flex: 1 }}>
                        <label style={sAdd.label}>TYPE</label>
                        <select style={{ ...sAdd.input, paddingLeft: '0.75rem' }} value={type} onChange={e => {
                                const val = e.target.value;
                                setType(val);
                                if (!isEdit) setName(getAutoName(val));
                            }}>
                            <option value="core" disabled={usedTypes.includes('core')}>Core{usedTypes.includes('core') ? ' (added)' : ''}</option>
                            <option value="support" disabled={usedTypes.includes('support')}>Support{usedTypes.includes('support') ? ' (added)' : ''}</option>
                            <option value="strategic" disabled={usedTypes.includes('strategic')}>Strategic{usedTypes.includes('strategic') ? ' (added)' : ''}</option>
                        </select>
                    </div>
                    <div style={{ flex: 1 }}>
                        <label style={sAdd.label}>WEIGHT %</label>
                        <input style={{ ...sAdd.input, paddingLeft: '0.75rem', borderColor: weightExceeds ? '#ef4444' : undefined }} type="number" min="0" max="100" placeholder="e.g. 80" value={weight} onChange={e => setWeight(e.target.value)} />
                        {weightExceeds && <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>Max allowed: {remainingWeight}%</div>}
                        {!weightExceeds && weight === '' && <div style={{ color: 'var(--admin-text-muted)', fontSize: '0.75rem', marginTop: '0.25rem' }}>Remaining: {remainingWeight}%</div>}
                    </div>
                </div>
            </div>
            <div style={sFn.footer}>
                <button style={{ background: 'none', border: '1px solid var(--admin-border-strong)', cursor: 'pointer', color: 'var(--admin-text-muted)', borderRadius: 8, padding: '0.5rem 1.1rem', fontWeight: 600, fontSize: '0.85rem' }} onClick={onClose}>Cancel</button>
                <button style={{ ...s.btnPrimary, padding: '0.5rem 1.25rem', opacity: ((!isEdit && usedTypes.includes(type)) || weightExceeds) ? 0.5 : 1, cursor: ((!isEdit && usedTypes.includes(type)) || weightExceeds) ? 'not-allowed' : 'pointer' }} onClick={handleSave} disabled={(!isEdit && usedTypes.includes(type)) || weightExceeds}>{isEdit ? 'Save Changes' : 'Add Function'}</button>
            </div>
        </>
    );

    if (bp === 'mobile') {
        if (!visibleFn) return null;
        return (
            <>
                <div onClick={onClose} style={{ position: 'fixed', top: 0, bottom: 0, left, right: 0, zIndex: 1100, background: 'rgba(0,0,0,0.5)' }} />
                <div style={{ position: 'fixed', bottom: 0, left, right: 0, zIndex: 1101, background: 'var(--admin-card)', borderRadius: '20px 20px 0 0', boxShadow: '0 -8px 32px rgba(0,0,0,0.3)', animation: 'slideUp 0.25s ease' }}>
                    <div style={{ padding: '10px 1.25rem 0', display: 'flex', justifyContent: 'center' }}>
                        <div style={{ width: 36, height: 4, borderRadius: 99, background: 'var(--admin-border-strong)' }} />
                    </div>
                    {modalContent}
                </div>
                <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
            </>
        );
    }

    if (!visibleFn) return null;
    return (
        <div style={sFn.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
            <div style={sFn.modal}>{modalContent}</div>
        </div>
    );
}

const sFn = {
    overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center' },
    modal:   { background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)', borderRadius: 'var(--admin-radius-lg)', width: '100%', maxWidth: 420, boxShadow: 'var(--admin-shadow)' },
    fullscreen: { position: 'fixed', inset: 0, maxWidth: '100%', maxHeight: '100%', borderRadius: 0, display: 'flex', flexDirection: 'column', boxShadow: 'none', overflow: 'hidden' },
    mobileSheet: { position: 'fixed', left: 0, right: 0, bottom: 0, top: 'auto', width: '100%', maxWidth: '100%', height: '82vh', background: 'var(--admin-card)', borderRadius: '20px 20px 0 0', transform: 'translateY(100%)', transition: 'transform 0.28s cubic-bezier(0.22, 1, 0.36, 1)', willChange: 'transform', boxShadow: '0 -8px 32px rgba(0,0,0,0.35)', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
    mobileSheetOpen: { transform: 'translateY(0)', animation: 'slideUp 0.28s cubic-bezier(0.22, 1, 0.36, 1)' },
    dragHandle: { position: 'absolute', left: '50%', top: 8, transform: 'translateX(-50%)', width: 36, height: 4, borderRadius: 99, background: 'var(--admin-border-strong)' },
    header:  { padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--admin-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
    title:   { fontWeight: 700, fontSize: '1rem', color: 'var(--admin-text-primary)', marginBottom: '0.15rem' },
    sub:     { fontSize: '0.78rem', color: 'var(--admin-text-muted)' },
    body:    { padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1, overflowY: 'auto' },
    footer:  { padding: '1rem 1.5rem', borderTop: '1px solid var(--admin-border)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' },
};

function initials(name) {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

function MobileAddMenu({ activeFn, functions, onAddMfo, onAddFn, fab }) {
    const [open, setOpen] = useState(false);
    const btnRef = useRef(null);

    const rect = open ? btnRef.current?.getBoundingClientRect() : null;

    const btnStyle = fab
        ? { width: 52, height: 52, borderRadius: 999, border: 'none', background: 'var(--admin-accent)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 16px rgba(59,130,246,0.45)' }
        : { width: 34, height: 34, borderRadius: 999, border: '1px solid var(--admin-border-strong)', background: 'rgba(59,130,246,0.08)', color: 'var(--admin-accent)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' };

    return (
        <div style={fab ? {} : { position: 'relative', flexShrink: 0, display: 'flex', alignItems: 'center', borderLeft: '1px solid var(--admin-border)', paddingLeft: '0.5rem', paddingRight: '0.5rem' }}>
            <button ref={btnRef} type="button" style={btnStyle}
                onClick={() => setOpen(v => !v)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
            </button>
            {open && rect && (
                <>
                    <div style={{ position: 'fixed', inset: 0, zIndex: 400 }} onClick={() => setOpen(false)} />
                    <div style={{ position: 'fixed', ...(fab ? { bottom: window.innerHeight - rect.top + 8 } : { top: rect.bottom + 8 }), right: Math.max(8, window.innerWidth - rect.right), zIndex: 401, background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)', borderRadius: 12, padding: '0.35rem', minWidth: 200, boxShadow: '0 8px 32px rgba(0,0,0,0.35)', display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <div style={{ padding: '0.4rem 0.75rem', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>Add to UWP</div>
                        {activeFn && (
                            <button style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.55rem 0.75rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-primary)', fontSize: '0.85rem', borderRadius: 8, textAlign: 'left', width: '100%' }}
                                onClick={() => { onAddMfo(activeFn); setOpen(false); }}>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
                                Add MFO / PPA
                                <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--admin-text-muted)' }}>{activeFn.name}</span>
                            </button>
                        )}
                        <button style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.55rem 0.75rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-primary)', fontSize: '0.85rem', borderRadius: 8, textAlign: 'left', width: '100%' }}
                            onClick={() => { onAddFn(); setOpen(false); }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                            Add Function
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}

// ── Styles ──
const s = {
    topbar:         { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', gap: '0.5rem', flexWrap: 'wrap' },
    topTitle:       { fontWeight: 700, fontSize: '1.05rem', color: 'var(--admin-text-primary)' },
    backBtn:        { background: 'none', border: 'none', color: 'var(--admin-text-primary)', cursor: 'pointer', padding: '0.25rem', display: 'flex', alignItems: 'center', flexShrink: 0 },
    divider:        { width: 1, height: 18, background: 'var(--admin-border-strong)' },
    draftBadge:     { fontSize: '0.8rem', color: 'var(--admin-text-muted)' },
    btnPrimary:     { padding: '0.45rem 1.1rem', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'var(--admin-accent)', color: '#fff', fontSize: '0.82rem', fontWeight: 600 },
    btnSecondary:   { padding: '0.45rem 1.1rem', borderRadius: 8, border: '1px solid var(--admin-border-strong)', cursor: 'pointer', background: 'transparent', color: 'var(--admin-text-primary)', fontSize: '0.82rem', fontWeight: 600 },
    readonlyBanner: { marginBottom: '1rem', padding: '0.65rem 1rem', borderRadius: 8, background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.3)', color: '#ca8a04', fontSize: '0.82rem' },

    layout:         { display: 'flex', gap: 0, overflow: 'visible', minHeight: 600 },

    // Left panel
    leftPanel:      { width: 270, minWidth: 270, borderRight: '1px solid var(--admin-border)', background: 'var(--admin-sidebar)', flexShrink: 0, padding: '1.25rem 0' },
    panelLabel:     { padding: '0 1rem 0.65rem', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.09em', color: 'var(--admin-text-muted)', textTransform: 'uppercase' },
    fnItem:         { width: '100%', display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 1rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-muted)', textAlign: 'left', borderLeft: '2px solid transparent', fontSize: '0.82rem' },
    fnItemActive:   { color: 'var(--admin-accent)', background: 'rgba(59,130,246,0.07)', borderLeftColor: 'var(--admin-accent)', fontWeight: 600 },
    fnIcon:         { flexShrink: 0, display: 'flex', alignItems: 'center' },
    mfoItem:        { width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.45rem 1rem 0.45rem 2rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-muted)', textAlign: 'left', borderLeft: '2px solid transparent', fontSize: '0.76rem' },
    mfoItemActive:  { color: 'var(--admin-accent)', background: 'rgba(59,130,246,0.08)', borderLeftColor: 'var(--admin-accent)', fontWeight: 600 },
    addMfoBtn:      { width: '100%', display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 1rem 0.4rem 2rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-accent)', fontSize: '0.72rem', fontWeight: 600, opacity: 0.7 },
    fnActionBtn:    { flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-muted)', padding: '0.35rem 0.4rem', display: 'flex', alignItems: 'center' },
    addFnBtn:       { width: '100%', display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.65rem 1rem', background: 'none', border: 'none', borderTop: '1px solid var(--admin-border)', cursor: 'pointer', color: 'var(--admin-accent)', fontSize: '0.78rem', fontWeight: 600, marginTop: '0.5rem' },

    // Center panel
    centerPanel:    { flex: 1, overflowY: 'auto', padding: '1.5rem', minWidth: 0 },
    empty:          { padding: '4rem', textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: '0.875rem' },

    // MFO group
    mfoGroup:       { marginBottom: '2.5rem' },
    mfoHeader:      { display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid var(--admin-border)', marginBottom: '1rem' },
    mfoIcon:        { color: 'var(--admin-accent)', display: 'flex', alignItems: 'center' },
    mfoTitle:       { fontWeight: 700, fontSize: '1rem', color: 'var(--admin-text-primary)' },
    indicatorBadge: { padding: '0.2rem 0.75rem', borderRadius: 999, background: 'var(--admin-bg-secondary)', border: '1px solid var(--admin-border)', fontSize: '0.72rem', color: 'var(--admin-text-muted)', whiteSpace: 'nowrap' },

    // Indicator card — matches stitch: glass card with large title
    siCard:         { background: 'rgba(255,255,255,0.02)', border: '1px solid var(--admin-border)', borderRadius: 12, padding: '1.25rem 1.5rem', marginBottom: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.85rem', transition: 'border-color 0.2s' },
    siTitle:        { fontSize: '1.05rem', fontWeight: 600, color: 'var(--admin-text-primary)', lineHeight: 1.4, cursor: 'pointer', margin: 0 },
    siMeta:         { display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' },
    siBudget:       { display: 'flex', alignItems: 'center', fontSize: '0.82rem', color: 'var(--admin-text-muted)', fontFamily: 'monospace' },
    metaDot:        { width: 4, height: 4, borderRadius: '50%', background: 'var(--admin-border-strong)', flexShrink: 0 },
    avatarGroup:    { display: 'flex' },
    avatar:         { width: 26, height: 26, borderRadius: '50%', background: 'var(--admin-accent)', color: '#fff', fontSize: '0.6rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--admin-card)', marginLeft: -6 },
    siActions:      { display: 'flex', gap: '0.5rem', alignItems: 'center' },
    siBtn:          { display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.42rem 0.85rem', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', border: '1px solid transparent', whiteSpace: 'nowrap' },
    assignBtn:      { background: 'rgba(59,130,246,0.12)', color: 'var(--admin-accent)', borderColor: 'rgba(59,130,246,0.25)' },
    qetBtn:         { background: 'rgba(74,222,128,0.1)', color: '#4ade80', borderColor: 'rgba(74,222,128,0.25)' },
    moreBtn:        { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-muted)', display: 'flex', alignItems: 'center', padding: '0.25rem' },
    menuBackdrop:   { position: 'fixed', inset: 0, zIndex: 200 },
    menu:           { position: 'absolute', bottom: '100%', right: 0, zIndex: 201, background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)', borderRadius: 8, padding: '0.35rem', minWidth: 170, boxShadow: '0 -4px 24px rgba(0,0,0,0.35)', display: 'flex', flexDirection: 'column', gap: 2, marginBottom: '0.25rem' },
    menuItem:       { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-secondary)', fontSize: '0.8rem', borderRadius: 6, textAlign: 'left', width: '100%' },
    menuDivider:    { height: 1, background: 'var(--admin-border)', margin: '0.25rem 0' },

    addBtn:         { width: '100%', padding: '0.85rem', borderRadius: 10, border: '2px dashed var(--admin-border)', background: 'none', cursor: 'pointer', color: 'var(--admin-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.82rem', fontWeight: 600, marginTop: '0.25rem' },

    // Tablet breadcrumb nav
    breadcrumbRow:  { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0', marginBottom: '1rem', flexWrap: 'nowrap', overflow: 'hidden' },
    fnPill:         { display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.85rem', borderRadius: 99, border: '1px solid var(--admin-accent)', background: 'transparent', color: 'var(--admin-accent)', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' },
    mfoPill:        { display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.85rem', borderRadius: 99, border: 'none', background: 'var(--admin-accent)', color: '#fff', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis' },
    dropdown:       { position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 300, background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)', borderRadius: 10, padding: '0.35rem', minWidth: 220, maxWidth: 320, maxHeight: 320, overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.35)', display: 'flex', flexDirection: 'column', gap: 2 },
    dropBackdrop:   { position: 'fixed', inset: 0, zIndex: 299 },
    dropItem:       { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-secondary)', fontSize: '0.82rem', borderRadius: 6, textAlign: 'left', width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
    dropItemActive: { color: 'var(--admin-accent)', fontWeight: 600 },

    // Mobile tab strip
    tabStrip:       { display: 'flex', overflowX: 'auto', scrollbarWidth: 'none', gap: 0, marginBottom: '1rem', borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-card)', whiteSpace: 'nowrap' },
    tab:            { flexShrink: 0, padding: '0.6rem 1rem', background: 'none', border: 'none', borderBottom: '2px solid transparent', cursor: 'pointer', color: 'var(--admin-text-muted)', fontSize: '0.78rem', fontWeight: 500, whiteSpace: 'nowrap', lineHeight: 1, maxWidth: '10rem', overflow: 'hidden', textOverflow: 'ellipsis' },
    tabActive:      { color: 'var(--admin-accent)', borderBottomColor: 'var(--admin-accent)', fontWeight: 700 },
    tabAddBtn:      { flexShrink: 0, marginLeft: 'auto', marginRight: '0.5rem', width: 34, height: 34, borderRadius: 999, border: '1px solid var(--admin-border-strong)', background: 'rgba(59,130,246,0.08)', color: 'var(--admin-accent)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
    mfoInlineBtn:   { flexShrink: 0, width: 34, height: 34, borderRadius: 10, border: '1px solid var(--admin-border-strong)', background: 'rgba(59,130,246,0.08)', color: 'var(--admin-accent)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
};

const sCtx = {
    backdrop:      { position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.4)' },
    panel:         { position: 'fixed', top: 0, right: 0, height: '100vh', width: 300, zIndex: 1101, background: 'var(--admin-card)', borderLeft: '1px solid var(--admin-border-strong)', display: 'flex', flexDirection: 'column', transform: 'translateX(100%)', transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)', boxShadow: '-8px 0 32px rgba(0,0,0,0.35)' },
    open:          { transform: 'translateX(0)' },
    fullscreen:    { position: 'fixed', inset: 0, zIndex: 1200, background: 'var(--admin-card)', borderRadius: 0, display: 'flex', flexDirection: 'column', boxShadow: 'none', overflow: 'hidden', borderLeft: 'none', transform: 'translateX(0)' },
    mobileSheet:   { position: 'fixed', left: 0, right: 0, bottom: 0, top: 'auto', width: '100%', maxWidth: '100%', height: '82vh', background: 'var(--admin-card)', borderRadius: '20px 20px 0 0', transform: 'translateY(100%)', transition: 'transform 0.28s cubic-bezier(0.22, 1, 0.36, 1)', willChange: 'transform', boxShadow: '0 -8px 32px rgba(0,0,0,0.35)', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
    mobileSheetOpen: { transform: 'translateY(0)', animation: 'slideUp 0.28s cubic-bezier(0.22, 1, 0.36, 1)' },
    header:        { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: '1px solid var(--admin-border)' },
    label:         { fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.09em', color: 'var(--admin-text-muted)', textTransform: 'uppercase' },
    closeBtn:      { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-muted)', fontSize: '1rem' },
    body:          { flex: 1, overflowY: 'auto', padding: '1.25rem' },
    infoBlock:     { background: 'var(--admin-bg-secondary)', border: '1px solid var(--admin-border)', borderRadius: 10, padding: '1rem', marginBottom: '1.25rem' },
    infoRow:       { padding: '0.3rem 0' },
    infoLabel:     { display: 'block', fontSize: '0.65rem', color: 'var(--admin-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 },
    infoVal:       { fontSize: '0.88rem', color: 'var(--admin-text-primary)', fontWeight: 500 },
    hr:            { height: 1, background: 'var(--admin-border)', margin: '0.5rem 0' },
    sectionLabel:  { fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.09em', color: 'var(--admin-text-muted)', textTransform: 'uppercase', marginBottom: '0.6rem' },
    insightRow:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.85rem', marginBottom: '0.5rem', background: 'var(--admin-bg-secondary)', border: '1px solid var(--admin-border)', borderRadius: 8, fontSize: '0.82rem', color: 'var(--admin-text-secondary)' },
    indicatorText: { fontSize: '0.85rem', color: 'var(--admin-text-secondary)', lineHeight: 1.6, background: 'var(--admin-bg-secondary)', border: '1px solid var(--admin-border)', borderRadius: 8, padding: '0.75rem 0.9rem', margin: 0 },
    editInput:     { width: '100%', boxSizing: 'border-box', background: 'var(--admin-bg-primary)', border: '1px solid var(--admin-border)', borderRadius: 6, padding: '0.35rem 0.5rem', color: 'var(--admin-text-primary)', fontSize: '0.85rem', outline: 'none' },
};

const css = `
.si-card:hover { border-color: rgba(59,130,246,0.35) !important; background: rgba(59,130,246,0.03) !important; }
.si-card h4:hover { color: var(--admin-accent) !important; }
.menu-item:hover { background: rgba(255,255,255,0.05) !important; }
.fn-actions { display: flex; align-items: center; opacity: 0; transition: opacity 0.15s; position: absolute; right: 0.25rem; inset-block: 0; }
.fn-actions-row { position: relative; }
.fn-actions-row:hover .fn-actions { opacity: 1; }
.mfo-actions { display: flex; align-items: center; opacity: 0; transition: opacity 0.15s; }
.mfo-header-row:hover .mfo-actions { opacity: 1; }
@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}`;
