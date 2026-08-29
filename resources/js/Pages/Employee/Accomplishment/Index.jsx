import { useState, useRef } from 'react';
import { router, usePage } from '@inertiajs/react';
import { useToast } from '@/Components/Snackbar';
import AppLayout from '@/Layouts/AppLayout';
import useBreakpoint from '@/Components/useBreakpoint';
import PeriodSelector from '@/Components/PeriodSelector';

// ── helpers ───────────────────────────────────────────────────────────────────
const STEPS = [
    { key: 'draft',                   label: 'Draft',      icon: 'bi-pencil-square' },
    { key: 'submitted_to_supervisor', label: 'Supervisor', icon: 'bi-person-check' },
    { key: 'supervisor_approved',     label: 'Approved',   icon: 'bi-patch-check' },
    { key: 'released_by_pmt',         label: 'Released',   icon: 'bi-award' },
];

const STATUS_CFG = {
    draft:                   { label: 'Draft',               c: '#94a3b8', bg: 'rgba(100,116,139,0.12)' },
    submitted_to_supervisor: { label: 'Submitted',           c: '#60a5fa', bg: 'rgba(59,130,246,0.12)' },
    supervisor_approved:     { label: 'Supervisor Approved', c: '#a78bfa', bg: 'rgba(139,92,246,0.12)' },
    dept_head_endorsed:      { label: 'Awaiting PMT',        c: '#60a5fa', bg: 'rgba(59,130,246,0.12)' },
    recommended_by_pmt:      { label: 'PMT Recommended',     c: '#34d399', bg: 'rgba(16,185,129,0.12)' },
    pmt_approved:            { label: 'PMT Approved',        c: '#34d399', bg: 'rgba(16,185,129,0.12)' },
    released_by_pmt:         { label: 'Released',            c: '#4ade80', bg: 'rgba(74,222,128,0.12)' },
    returned_to_employee:    { label: 'Returned',            c: '#f87171', bg: 'rgba(239,68,68,0.12)' },
};

const STEP_KEYS = STEPS.map(s => s.key);

function activeStep(status) {
    if (!status || status === 'draft' || status === 'returned_to_employee') return 0;
    const i = STEP_KEYS.indexOf(status);
    return i === -1 ? 1 : i;
}

function formatBytes(b) {
    if (!b) return '';
    if (b < 1024) return b + ' B';
    if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
    return (b / 1048576).toFixed(1) + ' MB';
}

// ── Pipeline Stepper ──────────────────────────────────────────────────────────
function PipelineStepper({ status }) {
    const cur      = activeStep(status);
    const returned = status === 'returned_to_employee';
    return (
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ position: 'absolute', top: 17, left: '5%', right: '5%', height: 2,
                background: 'var(--admin-border)', zIndex: 0 }} />
            {STEPS.map((step, i) => {
                const done    = i < cur;
                const current = i === cur;
                return (
                    <div key={step.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, zIndex: 1, flex: 1 }}>
                        <div style={{
                            width: 34, height: 34, borderRadius: '50%',
                            background: returned && current ? '#ef4444' : done || current ? 'var(--admin-accent)' : 'var(--admin-bg-secondary)',
                            border: `2px solid ${returned && current ? '#ef4444' : done || current ? 'var(--admin-accent)' : 'var(--admin-border)'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: done || current ? '#fff' : 'var(--admin-text-muted)',
                            boxShadow: current ? '0 0 0 4px rgba(59,130,246,0.2)' : 'none',
                        }}>
                            <i className={`bi ${returned && current ? 'bi-arrow-counterclockwise' : done ? 'bi-check-lg' : step.icon}`}
                                style={{ fontSize: '0.8rem' }} />
                        </div>
                        <span style={{ fontSize: '0.6rem', fontWeight: current ? 700 : 500,
                            color: current ? 'var(--admin-accent)' : 'var(--admin-text-muted)',
                            textAlign: 'center', whiteSpace: 'nowrap' }}>
                            {step.label}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

// ── Score Circle ──────────────────────────────────────────────────────────────
function ScoreCircle({ score, rating }) {
    const bp    = useBreakpoint();
    const pct   = Math.min((score / 5) * 100, 100);
    const color = score >= 5.0 ? '#3b82f6' : score >= 4.0 ? '#10b981' : score >= 3.0 ? '#f59e0b' : score >= 2.0 ? '#eab308' : '#ef4444';
    const r = 28;
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{ position: 'relative', width: 64, height: 64, flexShrink: 0 }}>
                <svg width="64" height="64" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="32" cy="32" r={r} fill="none" stroke="var(--admin-border)" strokeWidth="5" />
                    <circle cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="5"
                        strokeDasharray={`${2 * Math.PI * r * pct / 100} ${2 * Math.PI * r}`}
                        strokeLinecap="round" style={{ transition: 'stroke-dasharray 0.5s' }} />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.9rem', fontWeight: 800, color }}>
                    {score > 0 ? score.toFixed(2) : '—'}
                </div>
            </div>
            <div>
                <div style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
                    color: 'var(--admin-text-muted)', marginBottom: 2 }}>IPCR Score</div>
                <div style={{ fontWeight: 700, fontSize: bp === 'mobile' ? '0.72rem' : '0.95rem', color: 'var(--admin-text-primary)', whiteSpace: 'nowrap', maxWidth: 120 }}>{rating ?? '—'}</div>
            </div>
        </div>
    );
}

// ── File Row ──────────────────────────────────────────────────────────────────
function FileRow({ name, size, onRemove }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.45rem 0.75rem',
            background: 'var(--admin-bg-secondary)', borderRadius: 8, border: '1px solid var(--admin-border)', marginBottom: 4 }}>
            <i className="bi bi-file-earmark" style={{ color: 'var(--admin-accent)', flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                color: 'var(--admin-text-primary)' }}>{name}</span>
            <span style={{ fontSize: '0.68rem', color: 'var(--admin-text-muted)', flexShrink: 0 }}>{formatBytes(size)}</span>
            {onRemove && (
                <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer',
                    color: '#ef4444', fontSize: '0.82rem', padding: 0, flexShrink: 0 }}>
                    <i className="bi bi-x-lg" />
                </button>
            )}
        </div>
    );
}

// ── Validation Block Modal ────────────────────────────────────────────────────
function ValidationBlockModal({ blockers, onClose }) {
    return (
        <>
            <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.5)' }} />
            <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 1101,
                background: 'var(--admin-card)', borderRadius: 'var(--admin-radius)', border: '1px solid var(--admin-border-strong)',
                boxShadow: 'var(--admin-shadow)', width: '90%', maxWidth: 440 }}>
                <div style={{ padding: '1.25rem 1.25rem 0.75rem' }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(239,68,68,0.12)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.85rem' }}>
                        <i className="bi bi-exclamation-triangle-fill" style={{ color: '#ef4444', fontSize: '1.1rem' }} />
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--admin-text-primary)', marginBottom: 6 }}>
                        Cannot Submit Yet
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--admin-text-muted)', marginBottom: '1rem', lineHeight: 1.5 }}>
                        Please resolve the following before submitting your accomplishment:
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {blockers.map((msg, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10,
                                padding: '0.65rem 0.85rem', borderRadius: 8,
                                background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)' }}>
                                <i className="bi bi-x-circle-fill" style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: 2, flexShrink: 0 }} />
                                <span style={{ fontSize: '0.83rem', color: 'var(--admin-text-primary)', lineHeight: 1.5 }}>{msg}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div style={{ padding: '0.75rem 1.25rem 1.25rem', display: 'flex', justifyContent: 'flex-end' }}>
                    <button onClick={onClose}
                        style={{ padding: '0.5rem 1.5rem', borderRadius: 8, border: 'none',
                            background: 'var(--admin-accent)', color: '#fff',
                            cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700 }}>
                        Understood
                    </button>
                </div>
            </div>
        </>
    );
}

// ── Confirm Submit Modal ──────────────────────────────────────────────────────
function ConfirmSubmitModal({ onConfirm, onCancel, submitting }) {
    return (
        <>
            {/* Backdrop */}
            <div
                onClick={onCancel}
                style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)' }}
            />

            {/* Dialog */}
            <div style={{
                position: 'fixed', top: '50%', left: '50%',
                transform: 'translate(-50%,-50%)',
                zIndex: 1101,
                background: 'var(--admin-card)',
                borderRadius: 'var(--admin-radius)',
                border: '1px solid var(--admin-border-strong)',
                boxShadow: 'var(--admin-shadow)',
                width: '90%', maxWidth: 420,
                overflow: 'hidden',
            }}>
                {/* Top accent bar */}
                <div style={{ height: 4, background: 'var(--admin-accent)' }} />

                {/* Body */}
                <div style={{ padding: '1.75rem 1.75rem 1.25rem', textAlign: 'center' }}>
                    {/* Icon badge */}
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 56, height: 56, borderRadius: '50%',
                        background: 'rgba(59,130,246,0.12)',
                        border: '1.5px solid rgba(59,130,246,0.25)',
                        marginBottom: '1.1rem',
                    }}>
                        <i className="bi bi-send-fill" style={{ color: 'var(--admin-accent)', fontSize: '1.4rem' }} />
                    </div>

                    {/* Title */}
                    <div style={{
                        fontWeight: 700, fontSize: '1.15rem',
                        color: 'var(--admin-text-primary)',
                        letterSpacing: '-0.01em',
                        marginBottom: '0.55rem',
                    }}>
                        Submit Accomplishment?
                    </div>

                    {/* Description */}
                    <p style={{
                        fontSize: '0.875rem', color: 'var(--admin-text-muted)',
                        lineHeight: 1.65, margin: 0,
                    }}>
                        This will submit your{' '}
                        <strong style={{ color: 'var(--admin-text-secondary)' }}>SMPOR</strong> and{' '}
                        <strong style={{ color: 'var(--admin-text-secondary)' }}>IPCR</strong> to your
                        supervisor for review. You will <strong style={{ color: 'var(--admin-text-secondary)' }}>not</strong>{' '}
                        be able to edit your submission after this.
                    </p>
                </div>

                {/* Divider */}
                <div style={{ borderTop: '1px solid var(--admin-border)', margin: '0 1.75rem' }} />

                {/* Footer buttons */}
                <div style={{
                    padding: '1rem 1.75rem 1.5rem',
                    display: 'flex', gap: '0.6rem',
                    flexDirection: 'column',
                }}>
                    <button
                        onClick={onConfirm}
                        disabled={submitting}
                        style={{
                            width: '100%', padding: '0.65rem',
                            borderRadius: 'var(--admin-radius)',
                            border: 'none',
                            background: 'var(--admin-accent)',
                            color: '#fff',
                            cursor: submitting ? 'not-allowed' : 'pointer',
                            fontSize: '0.9rem', fontWeight: 700,
                            opacity: submitting ? 0.7 : 1,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                            transition: 'opacity 0.15s',
                        }}
                    >
                        {submitting
                            ? <><i className="bi bi-arrow-repeat" style={{ animation: 'spin 0.8s linear infinite' }} /> Submitting…</>
                            : <><i className="bi bi-send-fill" /> Confirm Submit</>
                        }
                    </button>
                    <button
                        onClick={onCancel}
                        disabled={submitting}
                        style={{
                            width: '100%', padding: '0.65rem',
                            borderRadius: 'var(--admin-radius)',
                            border: '1px solid var(--admin-border-strong)',
                            background: 'transparent',
                            color: 'var(--admin-text-secondary)',
                            cursor: submitting ? 'not-allowed' : 'pointer',
                            fontSize: '0.88rem', fontWeight: 500,
                            transition: 'opacity 0.15s',
                        }}
                    >
                        Cancel
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Index() {
    const { period, submission, smporMeta, ipcrMeta, submitBlockers, allPeriods } = usePage().props;

    const [remarks,    setRemarks]    = useState(submission?.remarks ?? '');
    const [files,      setFiles]      = useState([]);
    const [showConfirm, setShowConfirm] = useState(false);
    const [showBlockers, setShowBlockers] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const toast = useToast();
    const fileRef = useRef(null);

    const status  = submission?.status ?? 'draft';
    const locked  = submission ? !['draft', 'returned_to_employee'].includes(status) : false;
    const sc      = STATUS_CFG[status] ?? STATUS_CFG.draft;
    const hasBlockers = submitBlockers && submitBlockers.length > 0;
    const canSubmit = !locked && !!period;

    function onFilePick(e) {
        setFiles(prev => [...prev, ...Array.from(e.target.files)]);
        e.target.value = '';
    }

    function handleSubmit() {
        setSubmitting(true);
        const fd = new FormData();
        if (remarks) fd.append('remarks', remarks);
        files.forEach(f => fd.append('supporting_files[]', f));
        router.post('/employee/accomplishment/submit', fd, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => { setSubmitting(false); setShowConfirm(false); setFiles([]); toast('Accomplishment submitted successfully.', 'success'); },
            onError:   (errors) => { setSubmitting(false); setShowConfirm(false); toast(errors?.message ?? Object.values(errors ?? {})[0] ?? 'Failed to submit.', 'error'); },
        });
    }

    const card = { background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)', borderRadius: 'var(--admin-radius)', boxShadow: 'var(--admin-shadow)' };
    const sectionLabel = { fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--admin-text-muted)', marginBottom: '0.5rem' };

    if (!period) return (
        <AppLayout title="Accomplishments">
            <div style={{ ...card, padding: '3rem', textAlign: 'center', color: 'var(--admin-text-muted)' }}>
                <i className="bi bi-calendar-x" style={{ fontSize: '2rem', display: 'block', marginBottom: 8 }} />
                No active performance period.
                {allPeriods && allPeriods.length > 0 && (
                    <div style={{ marginTop: '1rem' }}>
                        <PeriodSelector period={period} allPeriods={allPeriods} route="/employee/accomplishment" />
                    </div>
                )}
            </div>
        </AppLayout>
    );

    return (
        <AppLayout title="Accomplishments">
            <div style={{ ...card, padding: '0.75rem 1.25rem', marginBottom: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                <PeriodSelector period={period} allPeriods={allPeriods} route="/employee/accomplishment" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                {/* ── Pipeline ── */}
                <div style={{ ...card, padding: '1.1rem 1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: 6 }}>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--admin-text-primary)' }}>Submission Pipeline</span>
                        <span style={{ padding: '2px 10px', borderRadius: 99, fontSize: '0.68rem', fontWeight: 700, background: sc.bg, color: sc.c }}>{sc.label}</span>
                    </div>
                    <PipelineStepper status={status} />
                    {status === 'returned_to_employee' && (
                        <div style={{ marginTop: '0.75rem', padding: '0.65rem 0.9rem', borderRadius: 8,
                            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                            fontSize: '0.82rem', color: '#f87171', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <i className="bi bi-arrow-counterclockwise" />
                            Returned — review any remarks and resubmit.
                        </div>
                    )}
                </div>

                {/* ── SMPOR + IPCR summary cards ── */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
                    {/* SMPOR */}
                    <div style={{ ...card, padding: '1.1rem 1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.65rem' }}>
                            <div>
                                <div style={sectionLabel}>SMPOR</div>
                                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--admin-text-primary)' }}>Summary MPOR</div>
                            </div>
                            <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                                background: smporMeta?.source === 'qar_official' ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
                                color: smporMeta?.source === 'qar_official' ? '#10b981' : '#f59e0b' }}>
                                {smporMeta?.source === 'qar_official' ? 'QAR Official' : 'Preview'}
                            </span>
                        </div>
                        <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '0.75rem' }}>
                            {[['Total Qty', smporMeta?.total_qty ?? 0], ['MPORs', smporMeta?.mpor_count ?? 0]].map(([l, v]) => (
                                <div key={l}>
                                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--admin-text-primary)', lineHeight: 1 }}>{v}</div>
                                    <div style={{ fontSize: '0.65rem', color: 'var(--admin-text-muted)' }}>{l}</div>
                                </div>
                            ))}
                        </div>
                        <button onClick={() => router.visit('/employee/accomplishment/smpor')}
                            style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--admin-accent)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <i className="bi bi-table" /> View Full SMPOR
                        </button>
                    </div>

                    {/* IPCR */}
                    <div style={{ ...card, padding: '1.1rem 1.25rem' }}>
                        <div style={{ marginBottom: '0.65rem' }}>
                            <div style={sectionLabel}>IPCR</div>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--admin-text-primary)' }}>Individual Performance</div>
                        </div>
                        {status === 'released_by_pmt' && submission?.final_rating ? (
                            <div style={{ marginBottom: '0.75rem' }}>
                                <ScoreCircle score={parseFloat(submission.final_rating)} rating={submission.final_adjectival_rating} />
                                <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: 5 }}>
                                    <i className="bi bi-patch-check-fill" style={{ color: '#4ade80', fontSize: '0.78rem' }} />
                                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#4ade80' }}>Official PMT Rating</span>
                                </div>
                                {submission.pmt_remarks && (
                                    <div style={{ marginTop: '0.5rem', fontSize: '0.72rem', color: 'var(--admin-text-muted)', fontStyle: 'italic', lineHeight: 1.5 }}>
                                        "{submission.pmt_remarks}"
                                    </div>
                                )}
                            </div>
                        ) : ipcrMeta ? (
                            <div style={{ marginBottom: '0.75rem' }}><ScoreCircle score={ipcrMeta.score} rating={ipcrMeta.rating} /></div>
                        ) : (
                            <div style={{ fontSize: '0.82rem', color: 'var(--admin-text-muted)', marginBottom: '0.75rem' }}>No IPCR data yet.</div>
                        )}
                        <button onClick={() => router.visit('/employee/accomplishment/ipcr')}
                            style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--admin-accent)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <i className="bi bi-clipboard2-data" /> View Full IPCR
                        </button>
                    </div>
                </div>

                {/* ── Submit form ── */}
                {status === 'released_by_pmt' ? (
                    <div style={{ ...card, padding: '1.25rem', textAlign: 'center', borderLeft: '3px solid #4ade80' }}>
                        <i className="bi bi-award-fill" style={{ fontSize: '2rem', color: '#4ade80', display: 'block', marginBottom: 8 }} />
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#4ade80', marginBottom: 4 }}>Officially Released</div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--admin-text-muted)' }}>Your accomplishment has been reviewed and officially released by PMT.</div>
                    </div>
                ) : (
                <div style={{ ...card, padding: '1.25rem' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--admin-text-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <i className="bi bi-send-check" style={{ color: 'var(--admin-accent)' }} /> Submit
                    </div>

                    {/* Files */}
                    <div style={{ marginBottom: '1rem' }}>
                        <div style={sectionLabel}>Supporting Documents</div>
                        {/* Uploaded (locked) */}
                        {locked && submission?.attachments?.map((a, i) => (
                            <FileRow key={i} name={a.original_name} size={a.size} />
                        ))}
                        {/* New picks */}
                        {!locked && files.map((f, i) => (
                            <FileRow key={i} name={f.name} size={f.size} onRemove={() => setFiles(p => p.filter((_, j) => j !== i))} />
                        ))}
                        {!locked && (
                            <>
                                <div onClick={() => fileRef.current?.click()} style={{
                                    border: '2px dashed var(--admin-border)', borderRadius: 10, padding: '1rem',
                                    textAlign: 'center', cursor: 'pointer', color: 'var(--admin-text-muted)', fontSize: '0.82rem', marginTop: 4,
                                }}
                                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--admin-accent)'}
                                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--admin-border)'}>
                                    <i className="bi bi-cloud-upload" style={{ fontSize: '1.3rem', display: 'block', marginBottom: 2 }} />
                                    Click to attach files
                                </div>
                                <input ref={fileRef} type="file" multiple style={{ display: 'none' }} onChange={onFilePick} />
                            </>
                        )}
                    </div>

                    {/* Remarks */}
                    <div style={{ marginBottom: '1rem' }}>
                        <div style={sectionLabel}>Remarks <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></div>
                        <textarea rows={3} maxLength={5000} disabled={locked}
                            value={remarks} onChange={e => setRemarks(e.target.value)}
                            placeholder="Add notes for your reviewers..."
                            style={{ width: '100%', boxSizing: 'border-box', padding: '0.6rem 0.85rem',
                                background: 'var(--admin-bg-secondary)', border: '1px solid var(--admin-border)',
                                borderRadius: 8, color: 'var(--admin-text-primary)', fontSize: '0.85rem',
                                outline: 'none', resize: 'vertical', fontFamily: 'inherit', opacity: locked ? 0.7 : 1 }} />
                        <div style={{ textAlign: 'right', fontSize: '0.65rem', color: 'var(--admin-text-muted)' }}>{remarks.length}/5000</div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                        {submission?.submitted_at && (
                            <span style={{ fontSize: '0.68rem', color: 'var(--admin-text-muted)' }}>
                                <i className="bi bi-clock-history" style={{ marginRight: 4 }} />
                                Submitted {new Date(submission.submitted_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                        )}
                        <button onClick={() => {
                            if (!canSubmit) return;
                            if (hasBlockers) { setShowBlockers(true); return; }
                            setShowConfirm(true);
                        }} disabled={!canSubmit}
                            style={{ marginLeft: 'auto', padding: '0.5rem 1.5rem', borderRadius: 8, border: 'none',
                                background: canSubmit ? 'var(--admin-accent)' : 'var(--admin-bg-secondary)',
                                color: canSubmit ? '#fff' : 'var(--admin-text-muted)',
                                cursor: canSubmit ? 'pointer' : 'not-allowed',
                                fontSize: '0.85rem', fontWeight: 700,
                                display: 'flex', alignItems: 'center', gap: 6 }}>
                            <i className="bi bi-send-fill" />
                            {locked ? 'Submitted' : 'Submit'}
                        </button>
                    </div>
                </div>
                )}
            </div>

            {showConfirm && (
                <ConfirmSubmitModal
                    onConfirm={handleSubmit}
                    onCancel={() => setShowConfirm(false)}
                    submitting={submitting}
                />
            )}
            {showBlockers && (
                <ValidationBlockModal
                    blockers={submitBlockers}
                    onClose={() => setShowBlockers(false)}
                />
            )}
        </AppLayout>
    );
}
