import { useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { avatarSrc, onAvatarError } from '@/Components/defaultAvatar';
import AppLayout from '@/Layouts/AppLayout';
import { useToast } from '@/Components/Snackbar';
import { useConfirm } from '@/Components/ConfirmDialog';
import useBreakpoint from '@/Components/useBreakpoint';

const STEPS = [
    { key: 'draft',                   label: 'Draft',      icon: 'bi-pencil-square' },
    { key: 'submitted_to_supervisor', label: 'Supervisor', icon: 'bi-person-check' },
    { key: 'supervisor_endorsed',     label: 'Dept Head',  icon: 'bi-building' },
    { key: 'dept_head_endorsed',      label: 'PMT',        icon: 'bi-patch-check' },
    { key: 'released_by_pmt',         label: 'Released',   icon: 'bi-award' },
];
const STEP_KEYS = STEPS.map(s => s.key);
function activeStep(status) {
    if (!status || status === 'draft' || status === 'returned_to_employee') return 0;
    const i = STEP_KEYS.indexOf(status);
    return i === -1 ? 1 : i;
}
const STATUS_CFG = {
    submitted_to_supervisor: { label: 'Pending Review',  c: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    supervisor_endorsed:     { label: 'Endorsed',        c: '#60a5fa', bg: 'rgba(59,130,246,0.12)' },
    dept_head_endorsed:      { label: 'Awaiting PMT',    c: '#60a5fa', bg: 'rgba(59,130,246,0.12)' },
    recommended_by_pmt:      { label: 'PMT Recommended', c: '#34d399', bg: 'rgba(16,185,129,0.12)' },
    pmt_approved:            { label: 'PMT Approved',    c: '#34d399', bg: 'rgba(16,185,129,0.12)' },
    released_by_pmt:         { label: 'Released',        c: '#4ade80', bg: 'rgba(74,222,128,0.12)' },
    returned_to_employee:    { label: 'Returned',        c: '#f87171', bg: 'rgba(239,68,68,0.12)' },
};
const SMPOR_TABS = [
    { key: 'qty',  label: 'Efficiency / Quantity' },
    { key: 'qual', label: 'Quality / Effectiveness' },
    { key: 'time', label: 'Timeliness' },
];

function formatBytes(b) {
    if (!b) return '';
    if (b < 1024) return b + ' B';
    if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
    return (b / 1048576).toFixed(1) + ' MB';
}

// ── Pipeline Stepper ──────────────────────────────────────────────────────────
function PipelineStepper({ status }) {
    const cur = activeStep(status), returned = status === 'returned_to_employee';
    return (
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ position: 'absolute', top: 17, left: '5%', right: '5%', height: 2, background: 'var(--admin-border)', zIndex: 0 }} />
            {STEPS.map((step, i) => {
                const done = i < cur, current = i === cur;
                return (
                    <div key={step.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, zIndex: 1, flex: 1 }}>
                        <div style={{ width: 34, height: 34, borderRadius: '50%',
                            background: returned && current ? '#ef4444' : done || current ? 'var(--admin-accent)' : 'var(--admin-bg-secondary)',
                            border: `2px solid ${returned && current ? '#ef4444' : done || current ? 'var(--admin-accent)' : 'var(--admin-border)'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: done || current ? '#fff' : 'var(--admin-text-muted)',
                            boxShadow: current ? '0 0 0 4px rgba(59,130,246,0.2)' : 'none' }}>
                            <i className={`bi ${returned && current ? 'bi-arrow-counterclockwise' : done ? 'bi-check-lg' : step.icon}`} style={{ fontSize: '0.8rem' }} />
                        </div>
                        <span style={{ fontSize: '0.6rem', fontWeight: current ? 700 : 500, color: current ? 'var(--admin-accent)' : 'var(--admin-text-muted)', textAlign: 'center', whiteSpace: 'nowrap' }}>
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
    const bp  = useBreakpoint();
    const pct = Math.min((score / 5) * 100, 100);
    const color = score >= 4.5 ? '#10b981' : score >= 3.5 ? '#3b82f6' : score >= 2.5 ? '#f59e0b' : '#ef4444';
    const r = 28;
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{ position: 'relative', width: 64, height: 64, flexShrink: 0 }}>
                <svg width="64" height="64" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="32" cy="32" r={r} fill="none" stroke="var(--admin-border)" strokeWidth="5" />
                    <circle cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="5"
                        strokeDasharray={`${2 * Math.PI * r * pct / 100} ${2 * Math.PI * r}`} strokeLinecap="round" />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 800, color }}>
                    {score > 0 ? score.toFixed(2) : '—'}
                </div>
            </div>
            <div>
                <div style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--admin-text-muted)', marginBottom: 2 }}>IPCR SCORE</div>
                <div style={{ fontWeight: 700, fontSize: bp === 'mobile' ? '0.72rem' : '0.95rem', color: 'var(--admin-text-primary)', whiteSpace: 'nowrap' }}>{rating ?? '—'}</div>
            </div>
        </div>
    );
}

// ── SMPOR Table ───────────────────────────────────────────────────────────────
function SmporTable({ table }) {
    const [tab, setTab] = useState('qty');
    const months = table?.months ?? [], sections = table?.sections ?? [];
    const th = { padding: '0.5rem 0.75rem', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--admin-text-muted)', whiteSpace: 'nowrap', background: 'var(--admin-bg-secondary)', borderBottom: '1px solid var(--admin-border)' };
    const td = { padding: '0.55rem 0.75rem', fontSize: '0.82rem', color: 'var(--admin-text-primary)', borderBottom: '1px solid var(--admin-border)', whiteSpace: 'nowrap' };

    function val(row, m) {
        const d = row.months[m] ?? {};
        return tab === 'qty' ? d.qty : tab === 'qual' ? d.qual_pts : d.time_pts;
    }
    function total(row) {
        return tab === 'qty' ? row.total_qty : tab === 'qual' ? row.avg_qual : row.avg_time;
    }

    if (!sections.length) return (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: '0.82rem' }}>
            <i className="bi bi-table" style={{ fontSize: '1.5rem', display: 'block', marginBottom: 6 }} />No rated ORS data found.
        </div>
    );

    return (
        <>
            <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--admin-border)', marginBottom: '0.75rem', overflowX: 'auto', scrollbarWidth: 'none' }}>
                {SMPOR_TABS.map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)} style={{ padding: '0.5rem 0.9rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: tab === t.key ? 700 : 500, whiteSpace: 'nowrap', color: tab === t.key ? 'var(--admin-accent)' : 'var(--admin-text-muted)', borderBottom: `2px solid ${tab === t.key ? 'var(--admin-accent)' : 'transparent'}`, marginBottom: -1 }}>{t.label}</button>
                ))}
            </div>
            {sections.map(section => (
                <div key={section.type} style={{ marginBottom: '0.75rem', border: '1px solid var(--admin-border)', borderRadius: 8, overflow: 'hidden' }}>
                    <div style={{ padding: '0.5rem 0.85rem', background: 'rgba(59,130,246,0.05)', borderBottom: '1px solid var(--admin-border)', fontSize: '0.78rem', fontWeight: 700, color: 'var(--admin-text-primary)', textTransform: 'capitalize' }}>
                        {section.type}{section.weight ? ` (${section.weight}%)` : ''}
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr>
                                    <th style={{ ...th, position: 'sticky', left: 0, zIndex: 2, minWidth: 200, textAlign: 'left' }}>Expected Output</th>
                                    {months.map(m => <th key={m} style={{ ...th, textAlign: 'center', minWidth: 60 }}>{m}</th>)}
                                    <th style={{ ...th, textAlign: 'center', minWidth: 70, color: 'var(--admin-accent)' }}>{tab === 'qty' ? 'Total' : 'Avg'}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {section.rows.map((row, i) => (
                                    <tr key={i}>
                                        <td style={{ ...td, position: 'sticky', left: 0, zIndex: 1, background: 'var(--admin-card)', fontWeight: 500, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis' }} title={row.output}>{row.output}</td>
                                        {months.map(m => <td key={m} style={{ ...td, textAlign: 'center' }}>{val(row, m) || '—'}</td>)}
                                        <td style={{ ...td, textAlign: 'center', fontWeight: 700, borderLeft: '1px solid var(--admin-border-strong)' }}>{total(row) || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ))}
        </>
    );
}

// ── IPCR Sections ─────────────────────────────────────────────────────────────
function RatingBadge({ label, value }) {
    const color = !value ? 'var(--admin-text-muted)' : value >= 4.5 ? '#10b981' : value >= 3.5 ? '#3b82f6' : value >= 2.5 ? '#f59e0b' : '#ef4444';
    return (
        <div style={{ textAlign: 'center', minWidth: 40 }}>
            <div style={{ fontSize: '0.58rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--admin-text-muted)', marginBottom: 2 }}>{label}</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 800, color, lineHeight: 1 }}>{value != null ? value.toFixed(2) : '—'}</div>
        </div>
    );
}

function IpcrSections({ sections, ipcrMeta }) {
    const typeScores = ipcrMeta?.type_scores ?? [];
    const score  = ipcrMeta?.score ?? 0;
    const rating = ipcrMeta?.rating ?? null;
    const sColor = s => s >= 4.5 ? '#10b981' : s >= 3.5 ? '#3b82f6' : s >= 2.5 ? '#f59e0b' : '#ef4444';

    if (!sections?.length) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: '0.82rem' }}>No IPCR data available.</div>;
    return (
        <>
            {sections.map(fn => (
                <div key={fn.id} style={{ marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.6rem 0.85rem', background: 'rgba(59,130,246,0.05)', borderRadius: '8px 8px 0 0', border: '1px solid var(--admin-border)' }}>
                        <i className="bi bi-house-door" style={{ color: 'var(--admin-accent)' }} />
                        <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--admin-text-primary)', flex: 1 }}>{fn.name}</span>
                        {fn.weight && <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: 'rgba(59,130,246,0.10)', color: 'var(--admin-accent)' }}>{fn.weight}%</span>}
                    </div>
                    {fn.mfos.map(mfo => (
                        <div key={mfo.id} style={{ border: '1px solid var(--admin-border)', borderTop: 'none' }}>
                            <div style={{ padding: '0.55rem 0.85rem', background: 'var(--admin-bg-secondary)', borderBottom: '1px solid var(--admin-border)', fontSize: '0.82rem', fontWeight: 600, color: 'var(--admin-text-primary)' }}>{mfo.title}</div>
                            {mfo.indicators.map((ind, i) => (
                                <div key={ind.id} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', padding: '0.7rem 0.85rem', borderBottom: '1px solid var(--admin-border)', flexWrap: 'wrap' }}>
                                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(59,130,246,0.12)', color: 'var(--admin-accent)', fontSize: '0.62rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>{i + 1}</div>
                                    <div style={{ flex: 1, minWidth: 160 }}>
                                        <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--admin-text-primary)', lineHeight: 1.45 }}>{ind.indicator_text}</div>
                                        {ind.target_timeline && <div style={{ fontSize: '0.7rem', color: 'var(--admin-text-muted)', marginTop: 2 }}><i className="bi bi-clock" style={{ marginRight: 3 }} />{ind.target_timeline}</div>}
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                                        {[['Q', ind.ratings?.Q], ['E', ind.ratings?.E], ['T', ind.ratings?.T], ['A', ind.ratings?.A]].map(([l, v]) => (
                                            <RatingBadge key={l} label={l} value={v} />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            ))}
            {typeScores.length > 0 && (
                <div style={{ marginTop: '0.5rem', padding: '0.85rem', background: 'var(--admin-bg-secondary)', borderRadius: 8, border: '1px solid var(--admin-border)', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--admin-text-muted)', marginBottom: 2 }}>Performance Summary</div>
                    {typeScores.map((ts, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 4, fontSize: '0.8rem' }}>
                            <span style={{ color: 'var(--admin-text-secondary)', fontStyle: 'italic' }}>Weighted Average Rating for {ts.label} ({ts.weight}%)</span>
                            <span style={{ fontWeight: 800, color: sColor(ts.weighted_score) }}>{ts.weighted_score.toFixed(2)}</span>
                        </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 4, paddingTop: '0.45rem', borderTop: '1px solid var(--admin-border)', fontSize: '0.82rem' }}>
                        <span style={{ fontWeight: 700, color: 'var(--admin-text-primary)' }}>OVERALL RATING</span>
                        <div style={{ textAlign: 'right' }}>
                            <span style={{ fontWeight: 800, fontSize: '1rem', color: sColor(score) }}>{score > 0 ? score.toFixed(2) : '—'}</span>
                            {rating && <span style={{ fontSize: '0.68rem', color: 'var(--admin-text-muted)', marginLeft: 6 }}>{rating}</span>}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

// ── Return Modal ──────────────────────────────────────────────────────────────
function ReturnModal({ submissionId, onClose }) {
    const [remarks, setRemarks] = useState('');
    const [submitting, setSubmitting] = useState(false);

    function submit() {
        if (!remarks.trim()) return;
        setSubmitting(true);
        router.post(`/supervisor/accomplishment/${submissionId}/return`, { remarks }, {
            preserveScroll: true,
            onSuccess: () => { setSubmitting(false); onClose(); },
            onError:   () => setSubmitting(false),
        });
    }

    return (
        <>
            <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.5)' }} />
            <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 1101,
                background: 'var(--admin-card)', borderRadius: 'var(--admin-radius)', border: '1px solid var(--admin-border-strong)',
                boxShadow: 'var(--admin-shadow)', width: '90%', maxWidth: 480 }}>
                <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--admin-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--admin-text-primary)' }}>Return Submission</div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-muted)', fontSize: '1rem' }}>
                        <i className="bi bi-x-lg" />
                    </button>
                </div>
                <div style={{ padding: '1rem 1.25rem' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--admin-text-muted)', marginBottom: '0.5rem' }}>
                        Reason / Remarks <span style={{ color: '#ef4444' }}>*</span>
                    </div>
                    <textarea rows={4} maxLength={2000} value={remarks} onChange={e => setRemarks(e.target.value)}
                        placeholder="Explain why this submission is being returned..."
                        style={{ width: '100%', boxSizing: 'border-box', padding: '0.65rem 0.9rem',
                            background: 'var(--admin-bg-secondary)',
                            border: `1px solid ${!remarks.trim() ? 'rgba(239,68,68,0.4)' : 'var(--admin-border)'}`,
                            borderRadius: 8, color: 'var(--admin-text-primary)', fontSize: '0.85rem',
                            outline: 'none', resize: 'vertical', fontFamily: 'inherit' }} />
                    <div style={{ textAlign: 'right', fontSize: '0.65rem', color: 'var(--admin-text-muted)', marginTop: 3 }}>{remarks.length}/2000</div>
                </div>
                <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid var(--admin-border)', display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <button onClick={onClose} style={{ padding: '0.5rem 1.1rem', borderRadius: 8, border: '1px solid var(--admin-border-strong)', background: 'transparent', color: 'var(--admin-text-primary)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>Cancel</button>
                    <button onClick={submit} disabled={!remarks.trim() || submitting}
                        style={{ padding: '0.5rem 1.25rem', borderRadius: 8, border: 'none',
                            background: !remarks.trim() ? 'var(--admin-bg-secondary)' : '#ef4444',
                            color: !remarks.trim() ? 'var(--admin-text-muted)' : '#fff',
                            cursor: !remarks.trim() || submitting ? 'not-allowed' : 'pointer',
                            fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <i className="bi bi-arrow-counterclockwise" />
                        {submitting ? 'Returning…' : 'Return to Employee'}
                    </button>
                </div>
            </div>
        </>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Show() {
    const { submission, smporTable, ipcrSections, ipcrMeta } = usePage().props;
    const toast = useToast();
    const confirm = useConfirm();
    const [showReturn, setShowReturn] = useState(false);
    const [endorsing,  setEndorsing]  = useState(false);
    const [activeTab,  setActiveTab]  = useState('smpor');

    const status = submission?.status;
    const sc     = STATUS_CFG[status] ?? { label: status, c: '#94a3b8', bg: 'rgba(100,116,139,0.12)' };
    const canAct = status === 'submitted_to_supervisor';

    async function handleEndorse() {
        if (!await confirm('Endorse this accomplishment to the Department Head?')) return;
        setEndorsing(true);
        router.post(`/supervisor/accomplishment/${submission.id}/endorse`, {}, {
            preserveScroll: true,
            onFinish: () => setEndorsing(false),
        });
    }

    const card = { background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)', borderRadius: 'var(--admin-radius)', boxShadow: 'var(--admin-shadow)' };
    const sectionLabel = { fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--admin-text-muted)', marginBottom: '0.5rem' };

    return (
        <AppLayout title="Review Accomplishment" description={`${submission?.employee_name} — ${submission?.period}`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                {/* Header + pipeline */}
                <div style={{ ...card, padding: '1.1rem 1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: '0.85rem' }}>
                        <div>
                            <button onClick={() => router.visit('/supervisor/accomplishment')}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-muted)', fontSize: '0.82rem', padding: 0, marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <i className="bi bi-arrow-left" /> Back
                            </button>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <img src={avatarSrc(submission?.employee_avatar)} onError={onAvatarError} alt={submission?.employee_name}
                                    style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--admin-border-strong)', flexShrink: 0 }} />
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--admin-text-primary)', marginBottom: 2 }}>
                                        {submission?.employee_name}
                                        <span style={{ fontWeight: 400, color: 'var(--admin-text-muted)', fontSize: '0.85rem' }}> — {submission?.employee_office}</span>
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>{submission?.period}</div>
                                </div>
                            </div>
                        </div>
                        <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: '0.68rem', fontWeight: 700, background: sc.bg, color: sc.c }}>{sc.label}</span>
                    </div>
                    <PipelineStepper status={status} />
                    {status === 'returned_to_employee' && submission?.supervisor_remarks && (
                        <div style={{ marginTop: '0.75rem', padding: '0.65rem 0.9rem', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', fontSize: '0.82rem', color: '#f87171' }}>
                            <strong>Return remarks:</strong> {submission.supervisor_remarks}
                        </div>
                    )}
                </div>

                {/* Summary cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
                    <div style={{ ...card, padding: '1.1rem 1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.65rem' }}>
                            <div><div style={sectionLabel}>SMPOR</div><div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--admin-text-primary)' }}>Summary MPOR</div></div>
                            <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                                background: submission?.dataset_source === 'qar_official' ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
                                color: submission?.dataset_source === 'qar_official' ? '#10b981' : '#f59e0b' }}>
                                {submission?.dataset_source === 'qar_official' ? 'QAR Official' : 'Preview'}
                            </span>
                        </div>
                        <button onClick={() => setActiveTab('smpor')} style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--admin-accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <i className="bi bi-table" /> View SMPOR
                        </button>
                    </div>
                    <div style={{ ...card, padding: '1.1rem 1.25rem' }}>
                        <div style={{ marginBottom: '0.65rem' }}><div style={sectionLabel}>IPCR</div><div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--admin-text-primary)' }}>Individual Performance</div></div>
                        {ipcrMeta ? <div style={{ marginBottom: '0.65rem' }}><ScoreCircle score={ipcrMeta.score} rating={ipcrMeta.rating} /></div> : <div style={{ fontSize: '0.82rem', color: 'var(--admin-text-muted)', marginBottom: '0.65rem' }}>No IPCR data.</div>}
                        <button onClick={() => setActiveTab('ipcr')} style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--admin-accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <i className="bi bi-clipboard2-data" /> View IPCR
                        </button>
                    </div>
                </div>

                {/* SMPOR / IPCR tabs */}
                <div style={{ ...card, padding: '1.1rem 1.25rem' }}>
                    <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--admin-border)', marginBottom: '1rem' }}>
                        {[['smpor', 'SMPOR'], ['ipcr', 'IPCR']].map(([key, label]) => (
                            <button key={key} onClick={() => setActiveTab(key)} style={{ padding: '0.5rem 1rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: activeTab === key ? 700 : 500, color: activeTab === key ? 'var(--admin-accent)' : 'var(--admin-text-muted)', borderBottom: `2px solid ${activeTab === key ? 'var(--admin-accent)' : 'transparent'}`, marginBottom: -1 }}>
                                {label}
                            </button>
                        ))}
                    </div>
                    {activeTab === 'smpor' ? <SmporTable table={smporTable} /> : <IpcrSections sections={ipcrSections} ipcrMeta={ipcrMeta} />}
                </div>

                {/* Supporting docs */}
                {submission?.attachments?.length > 0 && (
                    <div style={{ ...card, padding: '1.1rem 1.25rem' }}>
                        <div style={sectionLabel}>Supporting Documents</div>
                        {submission.attachments.map((a, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.45rem 0.75rem', background: 'var(--admin-bg-secondary)', borderRadius: 8, border: '1px solid var(--admin-border)', marginBottom: 4 }}>
                                <i className="bi bi-file-earmark" style={{ color: 'var(--admin-accent)', flexShrink: 0 }} />
                                <span style={{ flex: 1, fontSize: '0.82rem', color: 'var(--admin-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.original_name}</span>
                                <span style={{ fontSize: '0.68rem', color: 'var(--admin-text-muted)', flexShrink: 0 }}>{formatBytes(a.size)}</span>
                                <a href={a.url} target="_blank" rel="noreferrer" style={{ padding: '3px 7px', borderRadius: 5, border: '1px solid var(--admin-border)', color: 'var(--admin-text-muted)', textDecoration: 'none', fontSize: '0.78rem' }}>
                                    <i className="bi bi-download" />
                                </a>
                            </div>
                        ))}
                    </div>
                )}

                {/* Employee remarks */}
                {submission?.employee_remarks && (
                    <div style={{ ...card, padding: '1.1rem 1.25rem' }}>
                        <div style={sectionLabel}>Employee Remarks</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--admin-text-secondary)', lineHeight: 1.55, fontStyle: 'italic' }}>{submission.employee_remarks}</div>
                    </div>
                )}

                {/* Actions */}
                {canAct && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <button onClick={() => setShowReturn(true)}
                            style={{ padding: '0.6rem 1.5rem', borderRadius: 8, border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.08)', color: '#f87171', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <i className="bi bi-arrow-counterclockwise" /> Return
                        </button>
                        <button onClick={handleEndorse} disabled={endorsing}
                            style={{ padding: '0.6rem 1.75rem', borderRadius: 8, border: 'none', background: 'var(--admin-accent)', color: '#fff', cursor: endorsing ? 'not-allowed' : 'pointer', fontSize: '0.88rem', fontWeight: 700, opacity: endorsing ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <i className="bi bi-check2-circle" />
                            {endorsing ? 'Endorsing…' : 'Endorse Submission'}
                        </button>
                    </div>
                )}
            </div>

            {showReturn && <ReturnModal submissionId={submission.id} onClose={() => setShowReturn(false)} />}
        </AppLayout>
    );
}
