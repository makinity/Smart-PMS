import { useState, useCallback } from 'react';
import { router, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { useToast } from '@/Components/Snackbar';
import { useConfirm } from '@/Components/ConfirmDialog';
import { avatarSrc as resolveAvatar, onAvatarError } from '@/Components/defaultAvatar';
import useBreakpoint from '@/Components/useBreakpoint';

const RATING_COLOR = { 'Poor': '#ef4444', 'Unsatisfactory': '#f97316' };

const STATUS_CFG = {
    pending_details:        { label: 'Pending Fill-up',        c: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  bc: 'rgba(245,158,11,0.3)' },
    draft:                  { label: 'Draft',                  c: '#94a3b8', bg: 'rgba(100,116,139,0.12)', bc: 'rgba(100,116,139,0.3)' },
    submitted:              { label: 'Under Review',           c: '#60a5fa', bg: 'rgba(59,130,246,0.12)',  bc: 'rgba(59,130,246,0.3)' },
    supervisor_recommended: { label: 'Supervisor Recommended', c: '#a78bfa', bg: 'rgba(139,92,246,0.12)',  bc: 'rgba(139,92,246,0.3)' },
    returned:               { label: 'Returned — Please Revise', c: '#f87171', bg: 'rgba(239,68,68,0.12)', bc: 'rgba(239,68,68,0.3)' },
    approved:               { label: 'Approved',               c: '#10b981', bg: 'rgba(16,185,129,0.12)',  bc: 'rgba(16,185,129,0.3)' },
    dept_head_approved:     { label: 'Approved',               c: '#10b981', bg: 'rgba(16,185,129,0.12)',  bc: 'rgba(16,185,129,0.3)' },
    submitted_to_pmt:       { label: 'Under PMT Review',       c: '#a78bfa', bg: 'rgba(139,92,246,0.12)',  bc: 'rgba(139,92,246,0.3)' },
    submitted_to_ld:        { label: 'Submitted to L&D',       c: '#4ade80', bg: 'rgba(74,222,128,0.12)',  bc: 'rgba(74,222,128,0.3)' },
};

const EMPTY_ROW = () => ({
    performance_gap: '', developmental_activity: '',
    support_needed: '', support_from_supervisor: '',
    expected_completion: '', results: '',
});

// ── Score Ring ────────────────────────────────────────────────────────────────
function ScoreRing({ score, rating, size = 52 }) {
    const color = RATING_COLOR[rating] ?? '#ef4444';
    const r = size / 2 - 5;
    const circ = 2 * Math.PI * r;
    const pct = Math.min((score / 5) * 100, 100);
    return (
        <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
            <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
                <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--admin-border)" strokeWidth="4" />
                <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="4"
                    strokeDasharray={`${circ * pct / 100} ${circ}`} strokeLinecap="round" />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800, color }}>
                {score?.toFixed(2) ?? '—'}
            </div>
        </div>
    );
}

// ── Empty State ───────────────────────────────────────────────────────────────
function EmptyState() {
    return (
        <div style={{ textAlign: 'center', padding: '5rem 2rem' }}>
            <div style={{
                width: 72, height: 72, borderRadius: '50%', margin: '0 auto 1.25rem',
                background: 'rgba(59,130,246,0.08)', border: '1px solid var(--admin-border-strong)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                <i className="bi bi-journal-bookmark" style={{ fontSize: '2rem', color: 'var(--admin-text-muted)' }} />
            </div>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--admin-text-primary)', marginBottom: '0.4rem' }}>
                No IDP Assigned
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--admin-text-muted)', maxWidth: 380, margin: '0 auto' }}>
                Your Individual Development Plan will appear here once PMT initiates it based on your performance score.
            </div>
        </div>
    );
}

// ── Field wrapper ─────────────────────────────────────────────────────────────
function Field({ label, children }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <label style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.08em', color: 'var(--admin-text-muted)' }}>{label}</label>
            {children}
        </div>
    );
}

// ── Goal Card ─────────────────────────────────────────────────────────────────
function GoalCard({ index, row, onChange, onRemove, readOnly }) {
    const bp = useBreakpoint();
    const isMobile = bp === 'mobile';

    const set = (field) => (e) => onChange(index, field, e.target.value);

    const taBase = {
        width: '100%', background: 'var(--admin-bg-secondary)',
        border: '1px solid var(--admin-border-strong)', borderRadius: 8,
        padding: '0.55rem 0.75rem', color: 'var(--admin-text-primary)',
        fontSize: '0.85rem', lineHeight: 1.5, resize: 'vertical',
        outline: 'none', fontFamily: 'inherit', minHeight: 80,
    };

    const roBox = {
        background: 'var(--admin-bg-secondary)', border: '1px solid var(--admin-border)',
        borderRadius: 8, padding: '0.55rem 0.75rem', fontSize: '0.85rem',
        color: 'var(--admin-text-secondary)', lineHeight: 1.5, minHeight: 38,
    };


    return (
        <div style={{
            background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)',
            borderRadius: 'var(--admin-radius)', padding: isMobile ? '1rem' : '1.25rem',
            boxShadow: 'var(--admin-shadow)',
        }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div style={{
                        width: 26, height: 26, borderRadius: '50%', background: 'rgba(59,130,246,0.12)',
                        border: '1px solid rgba(59,130,246,0.25)', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: '0.72rem', fontWeight: 800, color: 'var(--admin-accent)',
                    }}>{index + 1}</div>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--admin-text-primary)' }}>
                        Development Goal
                    </span>
                </div>
                {!readOnly && (
                    <button onClick={() => onRemove(index)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px',
                            color: 'var(--admin-text-muted)', borderRadius: 6, lineHeight: 1 }}
                        onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--admin-text-muted)'}
                        title="Remove goal">
                        <i className="bi bi-trash3" style={{ fontSize: '0.95rem' }} />
                    </button>
                )}
            </div>

            <div style={isMobile
                ? { display: 'flex', flexDirection: 'column', gap: '0.9rem' }
                : { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>

                {/* Left col */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                    <Field label="Performance Gap">
                        {readOnly ? <div style={{ ...roBox, minHeight: 80 }}>{row.performance_gap || '—'}</div>
                            : <textarea className="idp-ta" style={{ ...taBase, minHeight: 90 }}
                                value={row.performance_gap} onChange={set('performance_gap')}
                                placeholder="Describe the performance gap..." />}
                    </Field>
                    <Field label="Support Needed">
                        {readOnly ? <div style={roBox}>{row.support_needed || '—'}</div>
                            : <textarea className="idp-ta" style={taBase} value={row.support_needed}
                                onChange={set('support_needed')} placeholder="e.g. financial resources, training materials..." />}
                    </Field>
                    <Field label="Support from Immediate Supervisor">
                        {readOnly ? <div style={roBox}>{row.support_from_supervisor || '—'}</div>
                            : <textarea className="idp-ta" style={taBase} value={row.support_from_supervisor}
                                onChange={set('support_from_supervisor')} placeholder="e.g. weekly check-ins, coaching sessions..." />}
                    </Field>
                </div>

                {/* Right col */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                    <Field label="Developmental Activities">
                        {readOnly ? <div style={{ ...roBox, minHeight: 90 }}>{row.developmental_activity || '—'}</div>
                            : <textarea className="idp-ta" style={{ ...taBase, minHeight: 90 }}
                                value={row.developmental_activity} onChange={set('developmental_activity')}
                                placeholder="What actions will you take?" />}
                    </Field>
                    <Field label="Expected Date of Completion">
                        {readOnly ? <div style={roBox}>{row.expected_completion || '—'}</div>
                            : <input type="date" className="idp-ta" value={row.expected_completion}
                                onChange={set('expected_completion')}
                                style={{ ...taBase, minHeight: 'unset', height: 38, resize: 'none' }} />}
                    </Field>
                    <Field label="Results">
                        {readOnly ? <div style={roBox}>{row.results || '—'}</div>
                            : <>
                                <textarea className="idp-ta" style={taBase} value={row.results}
                                    onChange={set('results')}
                                    placeholder="Expected outcomes / to be filled after implementation..." />
                                <span style={{ fontSize: '0.7rem', fontStyle: 'italic', color: 'var(--admin-text-muted)' }}>
                                    Fill this in after the activity is completed.
                                </span>
                            </>}
                    </Field>
                </div>
            </div>
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function IdpIndex() {
    const { props } = usePage();
    const { employee, plan } = props;
    const toast   = useToast();
    const confirm = useConfirm();
    const bp      = useBreakpoint();
    const isMobile = bp === 'mobile';

    const [rows, setRows]         = useState(() => plan?.idp_rows?.length ? plan.idp_rows : [EMPTY_ROW()]);
    const [saving, setSaving]     = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const isSubmitted  = ['submitted', 'supervisor_recommended', 'approved', 'submitted_to_ld'].includes(plan?.status);
    const ratingColor  = RATING_COLOR[plan?.source_rating] ?? '#ef4444';
    const statusCfg    = STATUS_CFG[plan?.status] ?? STATUS_CFG.pending_details;

    const handleChange = useCallback((i, field, val) =>
        setRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r)), []);

    const addRow    = () => setRows(prev => [...prev, EMPTY_ROW()]);
    const removeRow = (i) => { if (rows.length > 1) setRows(prev => prev.filter((_, idx) => idx !== i)); };

    const saveDraft = () => {
        if (!plan) return;
        setSaving(true);
        router.patch(`/employee/idp/${plan.id}`, { idp_rows: rows }, {
            preserveScroll: true,
            onSuccess: () => toast?.('Draft saved.', 'success'),
            onError:   () => toast?.('Failed to save.', 'error'),
            onFinish:  () => setSaving(false),
        });
    };

    const handleSubmit = async () => {
        if (!plan) return;
        const ok = await confirm?.('Once submitted, this form cannot be edited. Are you sure?');
        if (!ok) return;
        setSubmitting(true);
        router.patch(`/employee/idp/${plan.id}`, { idp_rows: rows }, {
            preserveScroll: true,
            onSuccess: () => {
                router.post(`/employee/idp/${plan.id}/submit`, {}, {
                    preserveScroll: true,
                    onSuccess: () => toast?.('IDP submitted successfully.', 'success'),
                    onError:   () => toast?.('Failed to submit.', 'error'),
                    onFinish:  () => setSubmitting(false),
                });
            },
            onError: () => { toast?.('Failed to save rows.', 'error'); setSubmitting(false); },
        });
    };

    return (
        <AppLayout title="My IDP" description="Individual Development Plan">
            <style>{`.idp-ta:focus{border-color:var(--admin-accent)!important;box-shadow:0 0 0 3px rgba(59,130,246,0.12)}.idp-ta::placeholder{color:var(--admin-text-muted);opacity:.6}`}</style>
            <div>

                {/* Page header */}
                <div style={{
                    background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)',
                    borderRadius: 'var(--admin-radius)', padding: isMobile ? '1rem' : '0.85rem 1.1rem',
                    marginBottom: '1rem', boxShadow: 'var(--admin-shadow)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem',
                }}>
                    <div style={{ minWidth: 0 }}>
                        <h1 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0, color: 'var(--admin-text-primary)' }}>My IDP</h1>
                        <p style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)', margin: '3px 0 0' }}>
                            Individual Development Plan{plan?.period ? ` · ${plan.period}` : ''}
                        </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 }}>
                        {plan && (
                            <span style={{
                                fontSize: '0.65rem', fontWeight: 700, padding: '3px 10px', borderRadius: 99,
                                color: statusCfg.c, background: statusCfg.bg, border: `1px solid ${statusCfg.bc}`,
                                textTransform: 'uppercase', letterSpacing: '0.06em',
                            }}>{statusCfg.label}</span>
                        )}
                        {plan && (
                            <a href={`/employee/idp/${plan.id}/export`} style={{
                                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                                padding: '0.55rem 1.1rem', borderRadius: 10, fontSize: '0.85rem', fontWeight: 600,
                                border: '1px solid #16a34a', color: '#16a34a',
                                background: 'transparent', textDecoration: 'none', whiteSpace: 'nowrap',
                                cursor: 'pointer',
                            }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                {!isMobile && 'Export Excel'}
                            </a>
                        )}
                    </div>
                </div>

                {!plan && <EmptyState />}

                {plan && (<>
                    {/* Employee info card */}
                    <div style={{
                        background: 'var(--admin-card)',
                        borderLeft: `3px solid ${ratingColor}`,
                        border: '1px solid var(--admin-border-strong)',
                        borderLeftWidth: 3,
                        borderRadius: 'var(--admin-radius)',
                        padding: isMobile ? '1rem' : '1.25rem 1.5rem',
                        marginBottom: '1rem',
                        boxShadow: 'var(--admin-shadow)',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            gap: '1rem', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                                <img src={resolveAvatar(employee.avatar)} alt={employee.name} onError={onAvatarError}
                                    style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', flexShrink: 0,
                                        border: '2px solid var(--admin-border-strong)' }} />
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--admin-text-primary)' }}>{employee.name}</div>
                                    <div style={{ fontSize: '0.78rem', color: 'var(--admin-text-muted)', marginTop: 2 }}>
                                        {employee.position} · {employee.office}
                                    </div>
                                </div>
                            </div>
                            {plan.source_score && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                                    <div>
                                        <div style={{ fontSize: '0.55rem', fontWeight: 700, textTransform: 'uppercase',
                                            letterSpacing: '0.08em', color: 'var(--admin-text-muted)', marginBottom: 4, textAlign: 'right' }}>
                                            Performance Score
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <ScoreRing score={plan.source_score} rating={plan.source_rating} />
                                            <span style={{
                                                fontSize: '0.65rem', fontWeight: 700, padding: '2px 9px', borderRadius: 99,
                                                color: ratingColor, background: `${ratingColor}1a`,
                                                border: `1px solid ${ratingColor}33`, textTransform: 'uppercase',
                                            }}>{plan.source_rating}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {plan.pmt_remarks && (
                            <div style={{
                                marginTop: '0.9rem', background: 'rgba(245,158,11,0.08)',
                                border: '1px solid rgba(245,158,11,0.25)', borderRadius: 8,
                                padding: '0.6rem 0.85rem', display: 'flex', gap: '0.6rem', alignItems: 'flex-start',
                            }}>
                                <i className="bi bi-exclamation-triangle-fill" style={{ color: '#f59e0b', flexShrink: 0, marginTop: 1 }} />
                                <p style={{ margin: 0, fontSize: '0.82rem', color: '#f59e0b', lineHeight: 1.5 }}>
                                    <strong>PMT Remarks:</strong> {plan.pmt_remarks}
                                </p>
                            </div>
                        )}

                        {isSubmitted && plan.status !== 'returned' && (
                            <div style={{
                                marginTop: '0.75rem', background: 'rgba(16,185,129,0.08)',
                                border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8,
                                padding: '0.5rem 0.85rem', display: 'flex', gap: '0.5rem', alignItems: 'center',
                            }}>
                                <i className="bi bi-check-circle-fill" style={{ color: '#10b981', flexShrink: 0 }} />
                                <span style={{ fontSize: '0.82rem', color: '#10b981' }}>
                                    {plan.status === 'approved' ? 'Your IDP has been approved.' :
                                     plan.status === 'submitted_to_ld' ? 'Submitted to L&D.' :
                                     plan.status === 'supervisor_recommended' ? 'Recommended by supervisor. Awaiting dept-head approval.' :
                                     'Submitted. Awaiting supervisor review.'}
                                </span>
                            </div>
                        )}
                        {plan.status === 'returned' && (
                            <div style={{
                                marginTop: '0.75rem', background: 'rgba(239,68,68,0.08)',
                                border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8,
                                padding: '0.6rem 0.85rem', display: 'flex', gap: '0.6rem',
                            }}>
                                <i className="bi bi-exclamation-circle-fill" style={{ color: '#ef4444', flexShrink: 0, marginTop: 1 }} />
                                <div style={{ fontSize: '0.82rem', lineHeight: 1.5 }}>
                                    <div style={{ color: '#ef4444', fontWeight: 700, marginBottom: 2 }}>
                                        IDP Returned — Please revise and resubmit.
                                    </div>
                                    {(plan.supervisor_remarks || plan.dept_head_remarks) && (
                                        <div style={{ color: 'var(--admin-text-secondary)' }}>
                                            {plan.dept_head_remarks || plan.supervisor_remarks}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>


                    {/* Goal cards */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {rows.map((row, i) => (
                            <GoalCard key={i} index={i} row={row}
                                onChange={handleChange} onRemove={removeRow} readOnly={isSubmitted} />
                        ))}
                    </div>

                    {/* Add goal */}
                    {!isSubmitted && (
                        <button onClick={addRow} style={{
                            width: '100%', height: 48, marginTop: '1rem',
                            background: 'none', border: '2px dashed var(--admin-border-strong)',
                            borderRadius: 'var(--admin-radius)', cursor: 'pointer',
                            color: 'var(--admin-accent)', fontWeight: 600, fontSize: '0.875rem',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                            transition: 'background 0.15s, border-color 0.15s',
                        }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(59,130,246,0.05)'; e.currentTarget.style.borderColor = 'var(--admin-accent)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.borderColor = 'var(--admin-border-strong)'; }}>
                            <i className="bi bi-plus-lg" /> Add Development Goal
                        </button>
                    )}

                    {!isSubmitted && plan.updated_at && (
                        <p style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--admin-text-muted)', marginTop: '0.75rem' }}>
                            <i className="bi bi-clock" style={{ marginRight: 4 }} />Last saved {plan.updated_at}
                        </p>
                    )}
                </>)}
            </div>

            {/* Sticky action bar */}
            {plan && !isSubmitted && (
                <div style={{
                    position: 'sticky', bottom: '-1rem', zIndex: 100,
                    background: 'var(--admin-card)',
                    borderTop: '2px solid var(--admin-border-strong)',
                    boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
                    padding: isMobile ? '0.75rem 1rem' : '0.85rem 1.5rem',
                    margin: '1rem -1.5rem -1rem',
                    display: 'flex', alignItems: 'center',
                    flexDirection: isMobile ? 'column' : 'row',
                    gap: isMobile ? '0.5rem' : '1rem', justifyContent: 'space-between',
                }}>
                    <div style={{ display: 'flex', gap: '0.6rem', width: isMobile ? '100%' : 'auto' }}>
                        <button onClick={saveDraft} disabled={saving} style={{
                            flex: isMobile ? 1 : 'none', padding: '0.55rem 1.25rem', borderRadius: 8,
                            fontWeight: 600, fontSize: '0.875rem', cursor: saving ? 'not-allowed' : 'pointer',
                            opacity: saving ? 0.6 : 1, background: 'transparent',
                            border: '1.5px solid var(--admin-text-muted)', color: 'var(--admin-text-primary)',
                        }}>
                            {saving ? 'Saving…' : 'Save Draft'}
                        </button>
                        <button onClick={handleSubmit} disabled={submitting} style={{
                            flex: isMobile ? 1 : 'none', padding: '0.55rem 1.5rem', borderRadius: 8,
                            fontWeight: 700, fontSize: '0.875rem', cursor: submitting ? 'not-allowed' : 'pointer',
                            opacity: submitting ? 0.6 : 1,
                            background: 'var(--admin-accent)', border: 'none', color: '#fff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                            boxShadow: '0 4px 14px rgba(59,130,246,0.35)',
                        }}>
                            {submitting ? 'Submitting…' : 'Submit IDP'}
                            {!submitting && <i className="bi bi-arrow-right" />}
                        </button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem',
                        color: 'var(--admin-text-muted)', fontSize: '0.75rem',
                        justifyContent: isMobile ? 'center' : 'flex-start',
                    }}>
                        <i className="bi bi-lock" />
                        <span>Once submitted, this form cannot be edited</span>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
