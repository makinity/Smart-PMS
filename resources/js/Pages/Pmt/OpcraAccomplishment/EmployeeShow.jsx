import { useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { avatarSrc, onAvatarError } from '@/Components/defaultAvatar';

const STEPS = [
    { key: 'draft',                   label: 'Draft',      icon: 'bi-pencil-square' },
    { key: 'submitted_to_supervisor', label: 'Supervisor', icon: 'bi-person-check' },
    { key: 'supervisor_endorsed',     label: 'Dept Head',  icon: 'bi-building' },
    { key: 'dept_head_approved',      label: 'Approved',   icon: 'bi-patch-check' },
    { key: 'released_by_pmt',         label: 'Released',   icon: 'bi-award' },
];
const STEP_KEYS = STEPS.map(s => s.key);
const ADJECTIVAL = ['Outstanding', 'Very Satisfactory', 'Satisfactory', 'Unsatisfactory', 'Poor'];
const SMPOR_TABS = [
    { key: 'qty',  label: 'Efficiency / Quantity' },
    { key: 'qual', label: 'Quality / Effectiveness' },
    { key: 'time', label: 'Timeliness' },
];

function activeStep(status) {
    if (!status || status === 'draft' || status === 'returned_to_employee') return 0;
    const i = STEP_KEYS.indexOf(status);
    return i === -1 ? 1 : i;
}
function adjLabel(r) { return !r ? '—' : r >= 5.0 ? 'Outstanding' : r >= 4.0 ? 'Very Satisfactory' : r >= 3.0 ? 'Satisfactory' : r >= 2.0 ? 'Unsatisfactory' : 'Poor'; }
function formatBytes(b) {
    if (!b) return '';
    if (b < 1024) return b + ' B';
    if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
    return (b / 1048576).toFixed(1) + ' MB';
}

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
                        <span style={{ fontSize: '0.6rem', fontWeight: current ? 700 : 500, color: current ? 'var(--admin-accent)' : 'var(--admin-text-muted)', textAlign: 'center', whiteSpace: 'nowrap' }}>{step.label}</span>
                    </div>
                );
            })}
        </div>
    );
}

function ScoreCircle({ score, rating, label = 'IPCR SCORE' }) {
    const pct = Math.min((score / 5) * 100, 100);
    const color = score >= 5.0 ? '#3b82f6' : score >= 4.0 ? '#10b981' : score >= 3.0 ? '#f59e0b' : score >= 2.0 ? '#eab308' : '#ef4444';
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
                    {score > 0 ? Number(score).toFixed(2) : '—'}
                </div>
            </div>
            <div>
                <div style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--admin-text-muted)', marginBottom: 2 }}>{label}</div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--admin-text-primary)', whiteSpace: 'nowrap' }}>{rating ?? '—'}</div>
            </div>
        </div>
    );
}

function SmporTable({ table }) {
    const [tab, setTab] = useState('qty');
    const months = table?.months ?? [], sections = table?.sections ?? [];
    const th = { padding: '0.5rem 0.75rem', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--admin-text-muted)', whiteSpace: 'nowrap', background: 'var(--admin-bg-secondary)', borderBottom: '1px solid var(--admin-border)' };
    const td = { padding: '0.55rem 0.75rem', fontSize: '0.82rem', color: 'var(--admin-text-primary)', borderBottom: '1px solid var(--admin-border)', whiteSpace: 'nowrap' };
    function val(row, m) { const d = row.months[m] ?? {}; return tab === 'qty' ? d.qty : tab === 'qual' ? d.qual_pts : d.time_pts; }
    function total(row) { return tab === 'qty' ? row.total_qty : tab === 'qual' ? row.avg_qual : row.avg_time; }
    if (!sections.length) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: '0.82rem' }}><i className="bi bi-table" style={{ fontSize: '1.5rem', display: 'block', marginBottom: 6 }} />No rated ORS data found.</div>;
    return (
        <>
            <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--admin-border)', marginBottom: '0.75rem', overflowX: 'auto', scrollbarWidth: 'none' }}>
                {SMPOR_TABS.map(t => <button key={t.key} onClick={() => setTab(t.key)} style={{ padding: '0.5rem 0.9rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: tab === t.key ? 700 : 500, whiteSpace: 'nowrap', color: tab === t.key ? 'var(--admin-accent)' : 'var(--admin-text-muted)', borderBottom: `2px solid ${tab === t.key ? 'var(--admin-accent)' : 'transparent'}`, marginBottom: -1 }}>{t.label}</button>)}
            </div>
            {sections.map(section => (
                <div key={section.type} style={{ marginBottom: '0.75rem', border: '1px solid var(--admin-border)', borderRadius: 8, overflow: 'hidden' }}>
                    <div style={{ padding: '0.5rem 0.85rem', background: 'rgba(59,130,246,0.05)', borderBottom: '1px solid var(--admin-border)', fontSize: '0.78rem', fontWeight: 700, textTransform: 'capitalize', color: 'var(--admin-text-primary)' }}>
                        {section.type}{section.weight ? ` (${section.weight}%)` : ''}
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead><tr>
                                <th style={{ ...th, position: 'sticky', left: 0, zIndex: 2, minWidth: 200, textAlign: 'left' }}>Expected Output</th>
                                {months.map(m => <th key={m} style={{ ...th, textAlign: 'center', minWidth: 60 }}>{m}</th>)}
                                <th style={{ ...th, textAlign: 'center', minWidth: 70, color: 'var(--admin-accent)' }}>{tab === 'qty' ? 'Total' : 'Avg'}</th>
                            </tr></thead>
                            <tbody>
                                {section.rows.map((row, i) => (
                                    <tr key={i}>
                                        <td style={{ ...td, position: 'sticky', left: 0, zIndex: 1, background: 'var(--admin-card)', fontWeight: 500, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.output}</td>
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

function RatingBadge({ label, value }) {
    const color = !value ? 'var(--admin-text-muted)' : value >= 5.0 ? '#3b82f6' : value >= 4.0 ? '#10b981' : value >= 3.0 ? '#f59e0b' : value >= 2.0 ? '#eab308' : '#ef4444';
    return (
        <div style={{ textAlign: 'center', minWidth: 40 }}>
            <div style={{ fontSize: '0.58rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--admin-text-muted)', marginBottom: 2 }}>{label}</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 800, color, lineHeight: 1 }}>{value != null ? Number(value).toFixed(2) : '—'}</div>
        </div>
    );
}

function IpcrSections({ sections, ipcrMeta }) {
    const typeScores = ipcrMeta?.type_scores ?? [], score = ipcrMeta?.score ?? 0, rating = ipcrMeta?.rating ?? null;
    const sColor = s => s >= 5.0 ? '#3b82f6' : s >= 4.0 ? '#10b981' : s >= 3.0 ? '#f59e0b' : s >= 2.0 ? '#eab308' : '#ef4444';
    if (!sections?.length) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: '0.82rem' }}>No IPCR data available.</div>;
    return (
        <>
            {sections.map(fn => (
                <div key={fn.id} style={{ marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.6rem 0.85rem', background: 'rgba(59,130,246,0.05)', borderRadius: '8px 8px 0 0', border: '1px solid var(--admin-border)' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--admin-text-primary)', flex: 1 }}>{fn.name}</span>
                        {fn.weight && <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: 'rgba(59,130,246,0.10)', color: 'var(--admin-accent)' }}>{fn.weight}%</span>}
                    </div>
                    {fn.mfos.map(mfo => (
                        <div key={mfo.id} style={{ border: '1px solid var(--admin-border)', borderTop: 'none' }}>
                            <div style={{ padding: '0.55rem 0.85rem', background: 'var(--admin-bg-secondary)', borderBottom: '1px solid var(--admin-border)', fontSize: '0.82rem', fontWeight: 600 }}>{mfo.title}</div>
                            {mfo.indicators.map((ind, i) => (
                                <div key={ind.id} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', padding: '0.7rem 0.85rem', borderBottom: '1px solid var(--admin-border)', flexWrap: 'wrap' }}>
                                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(59,130,246,0.12)', color: 'var(--admin-accent)', fontSize: '0.62rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>{i + 1}</div>
                                    <div style={{ flex: 1, minWidth: 160 }}>
                                        <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--admin-text-primary)', lineHeight: 1.45 }}>{ind.indicator_text}</div>
                                        {ind.target_timeline && <div style={{ fontSize: '0.7rem', color: 'var(--admin-text-muted)', marginTop: 2 }}><i className="bi bi-clock" style={{ marginRight: 3 }} />{ind.target_timeline}</div>}
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                                        {[['Q', ind.ratings?.Q], ['E', ind.ratings?.E], ['T', ind.ratings?.T], ['A', ind.ratings?.A]].map(([l, v]) => <RatingBadge key={l} label={l} value={v} />)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            ))}
            {typeScores.length > 0 && (
                <div style={{ padding: '0.85rem', background: 'var(--admin-bg-secondary)', borderRadius: 8, border: '1px solid var(--admin-border)', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--admin-text-muted)', marginBottom: 2 }}>Performance Summary</div>
                    {typeScores.map((ts, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', flexWrap: 'wrap', gap: 4 }}>
                            <span style={{ color: 'var(--admin-text-secondary)', fontStyle: 'italic' }}>Weighted Average for {ts.label} ({ts.weight}%)</span>
                            <span style={{ fontWeight: 800, color: sColor(ts.weighted_score) }}>{ts.weighted_score.toFixed(2)}</span>
                        </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.45rem', borderTop: '1px solid var(--admin-border)', fontSize: '0.82rem' }}>
                        <span style={{ fontWeight: 700 }}>OVERALL RATING</span>
                        <div><span style={{ fontWeight: 800, fontSize: '1rem', color: sColor(score) }}>{score > 0 ? score.toFixed(2) : '—'}</span>{rating && <span style={{ fontSize: '0.68rem', color: 'var(--admin-text-muted)', marginLeft: 6 }}>{rating}</span>}</div>
                    </div>
                </div>
            )}
        </>
    );
}


function CalibrateModal({ opcraId, submission, ipcrMeta, onClose }) {
    const computedScore = ipcrMeta?.score ?? 0;
    const existing = submission?.final_rating;
    const [rating, setRating]     = useState(existing ? Number(existing).toFixed(2) : computedScore ? computedScore.toFixed(2) : '');
    const [adj, setAdj]           = useState(submission?.final_adjectival_rating ?? adjLabel(computedScore));
    const [remarks, setRemarks]   = useState(submission?.pmt_remarks ?? '');
    const [saving, setSaving]     = useState(false);

    function onRatingChange(v) {
        setRating(v);
        const n = parseFloat(v);
        if (!isNaN(n)) setAdj(adjLabel(n));
    }
    const rColor = adj === 'Outstanding' ? '#3b82f6' : adj === 'Very Satisfactory' ? '#10b981' : adj === 'Satisfactory' ? '#f59e0b' : adj === 'Unsatisfactory' ? '#eab308' : '#ef4444';

    function submit() {
        if (!remarks.trim() || !adj || !rating) return;
        setSaving(true);
        router.post(`/pmt/opcr-accomplishment/${opcraId}/employee/${submission.id}/calibrate`, {
            final_rating: parseFloat(rating),
            final_adjectival_rating: adj,
            pmt_remarks: remarks,
        }, {
            preserveScroll: true,
            onSuccess: () => { setSaving(false); onClose(); },
            onError: () => setSaving(false),
        });
    }

    return (
        <>
            <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.55)' }} />
            <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 1101, background: 'var(--admin-card)', borderRadius: 'var(--admin-radius)', border: '1px solid var(--admin-border-strong)', boxShadow: 'var(--admin-shadow)', width: '90%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
                <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--admin-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--admin-text-primary)' }}>Calibrate Score</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)', marginTop: 2 }}>{submission?.employee_name} — {submission?.period}</div>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-muted)', fontSize: '1rem' }}><i className="bi bi-x-lg" /></button>
                </div>
                <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {/* Computed vs calibrated */}
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, padding: '0.75rem', borderRadius: 10, background: 'var(--admin-bg-secondary)', border: '1px solid var(--admin-border)', minWidth: 130 }}>
                            <div style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--admin-text-muted)', marginBottom: 6 }}>Computed Score</div>
                            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--admin-text-primary)' }}>{computedScore > 0 ? computedScore.toFixed(2) : '—'}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)' }}>{adjLabel(computedScore)}</div>
                        </div>
                        <i className="bi bi-arrow-right" style={{ color: 'var(--admin-text-muted)', fontSize: '1.2rem' }} />
                        <div style={{ flex: 1, padding: '0.75rem', borderRadius: 10, background: adj ? `${rColor}10` : 'var(--admin-bg-secondary)', border: `1px solid ${adj ? `${rColor}40` : 'var(--admin-border)'}`, minWidth: 130 }}>
                            <div style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', color: adj ? rColor : 'var(--admin-text-muted)', marginBottom: 6 }}>Calibrated</div>
                            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: adj ? rColor : 'var(--admin-text-muted)' }}>{rating || '—'}</div>
                            <div style={{ fontSize: '0.72rem', fontWeight: 600, color: adj ? rColor : 'var(--admin-text-muted)' }}>{adj || '—'}</div>
                        </div>
                    </div>
                    {/* Rating input */}
                    <div>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--admin-text-muted)', marginBottom: '0.4rem' }}>Final Rating (1.00–5.00) <span style={{ color: '#ef4444' }}>*</span></div>
                        <input type="number" min="1" max="5" step="0.01" value={rating} onChange={e => onRatingChange(e.target.value)}
                            style={{ width: '100%', boxSizing: 'border-box', padding: '0.6rem 0.9rem', background: 'var(--admin-bg-secondary)', border: '1px solid var(--admin-border)', borderRadius: 8, color: 'var(--admin-text-primary)', fontSize: '0.95rem', fontWeight: 700, outline: 'none', fontFamily: 'inherit' }} />
                    </div>
                    {/* Adjectival pills */}
                    <div>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--admin-text-muted)', marginBottom: '0.4rem' }}>Adjectival Rating <span style={{ color: '#ef4444' }}>*</span></div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {ADJECTIVAL.map(a => (
                                <button key={a} onClick={() => setAdj(a)} style={{ padding: '0.35rem 0.8rem', borderRadius: 99, border: '1px solid', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', borderColor: adj === a ? rColor : 'var(--admin-border)', background: adj === a ? `${rColor}18` : 'transparent', color: adj === a ? rColor : 'var(--admin-text-muted)' }}>{a}</button>
                            ))}
                        </div>
                    </div>
                    {/* Remarks */}
                    <div>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--admin-text-muted)', marginBottom: '0.4rem' }}>Calibration Remarks <span style={{ color: '#ef4444' }}>*</span></div>
                        <textarea rows={3} maxLength={2000} value={remarks} onChange={e => setRemarks(e.target.value)}
                            placeholder="Explain the basis for this calibration..."
                            style={{ width: '100%', boxSizing: 'border-box', padding: '0.65rem 0.9rem', background: 'var(--admin-bg-secondary)', border: `1px solid ${!remarks.trim() ? 'rgba(239,68,68,0.4)' : 'var(--admin-border)'}`, borderRadius: 8, color: 'var(--admin-text-primary)', fontSize: '0.85rem', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }} />
                    </div>
                </div>
                <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid var(--admin-border)', display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <button onClick={onClose} style={{ padding: '0.5rem 1.1rem', borderRadius: 8, border: '1px solid var(--admin-border-strong)', background: 'transparent', color: 'var(--admin-text-primary)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>Cancel</button>
                    <button onClick={submit} disabled={!remarks.trim() || !adj || !rating || saving}
                        style={{ padding: '0.5rem 1.25rem', borderRadius: 8, border: 'none', background: (!remarks.trim() || !adj || !rating) ? 'var(--admin-bg-secondary)' : '#a78bfa', color: (!remarks.trim() || !adj || !rating) ? 'var(--admin-text-muted)' : '#fff', cursor: (!remarks.trim() || !adj || !rating || saving) ? 'not-allowed' : 'pointer', fontSize: '0.85rem', fontWeight: 700, opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <i className="bi bi-sliders" />{saving ? 'Saving…' : 'Save Calibration'}
                    </button>
                </div>
            </div>
        </>
    );
}

export default function EmployeeShow() {
    const { opcraId, submission, smporTable, ipcrSections, ipcrMeta } = usePage().props;
    const [showCalibrate, setShowCalibrate] = useState(false);
    const [activeTab, setActiveTab]         = useState('smpor');

    const status   = submission?.status;
    const canAct   = status === 'dept_head_approved';
    const card     = { background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)', borderRadius: 'var(--admin-radius)', boxShadow: 'var(--admin-shadow)' };
    const lbl      = { fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--admin-text-muted)', marginBottom: '0.5rem' };
    const hasCalib = submission?.pmt_remarks && submission?.final_rating;

    return (
        <AppLayout title="Employee Accomplishment" description={`${submission?.employee_name} — ${submission?.period}`}>
            <div style={{ borderRadius: 'var(--admin-radius-lg)', border: '1px solid var(--admin-border-strong)', background: 'var(--admin-card)', boxShadow: 'var(--admin-shadow)', overflow: 'clip', marginBottom: '1rem' }}>
                <div style={{ position: 'sticky', top: 0, zIndex: 40, background: 'var(--admin-card)', borderBottom: '1px solid var(--admin-border)', padding: '0.6rem 1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                            <button onClick={() => router.visit(`/pmt/opcr-accomplishment/${opcraId}`)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-primary)', padding: '0.25rem', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
                            </button>
                            <div style={{ width: 1, height: 28, background: 'var(--admin-border-strong)', flexShrink: 0 }} />
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
                                <img src={avatarSrc(submission?.employee_avatar)} onError={onAvatarError} alt={submission?.employee_name}
                                    style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--admin-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {submission?.employee_name}
                                    </div>
                                    <div style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)' }}>{submission?.employee_office} · {submission?.period}</div>
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                            {hasCalib && (
                                <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: 'rgba(167,139,250,0.15)', color: '#a78bfa' }}>
                                    <i className="bi bi-sliders" style={{ marginRight: 3 }} />Calibrated
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <div style={{ padding: '1rem 1.25rem' }}>
                    <PipelineStepper status={status} />
                </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                {/* Calibrated score banner */}
                {hasCalib && (
                    <div style={{ ...card, padding: '1rem 1.25rem', borderLeft: '3px solid #a78bfa', background: 'rgba(167,139,250,0.04)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                            <div>
                                <div style={lbl}>Calibrated Score</div>
                                <ScoreCircle score={parseFloat(submission.final_rating)} rating={submission.final_adjectival_rating} label="CALIBRATED" />
                            </div>
                            <div style={{ flex: 1, minWidth: 200, padding: '0.75rem', borderRadius: 8, background: 'var(--admin-bg-secondary)', border: '1px solid var(--admin-border)' }}>
                                <div style={lbl}>Calibration Remarks</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--admin-text-secondary)', fontStyle: 'italic', lineHeight: 1.55 }}>{submission.pmt_remarks}</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Review trail */}
                {(submission?.supervisor_remarks || submission?.dept_head_remarks) && (
                    <div style={{ ...card, padding: '1rem 1.25rem' }}>
                        <div style={lbl}>Review Trail</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                            {submission.supervisor_remarks && (
                                <div style={{ padding: '0.65rem 0.9rem', borderRadius: 8, background: 'var(--admin-bg-secondary)', border: '1px solid var(--admin-border)', borderLeft: '3px solid #60a5fa' }}>
                                    <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase', marginBottom: 3 }}>Supervisor</div>
                                    <div style={{ fontSize: '0.82rem', color: 'var(--admin-text-secondary)', fontStyle: 'italic' }}>{submission.supervisor_remarks}</div>
                                </div>
                            )}
                            {submission.dept_head_remarks && (
                                <div style={{ padding: '0.65rem 0.9rem', borderRadius: 8, background: 'var(--admin-bg-secondary)', border: '1px solid var(--admin-border)', borderLeft: '3px solid #34d399' }}>
                                    <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#34d399', textTransform: 'uppercase', marginBottom: 3 }}>Dept Head</div>
                                    <div style={{ fontSize: '0.82rem', color: 'var(--admin-text-secondary)', fontStyle: 'italic' }}>{submission.dept_head_remarks}</div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Score summary cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
                    <div style={{ ...card, padding: '1.1rem 1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.65rem' }}>
                            <div style={lbl}>SMPOR</div>
                            <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: submission?.dataset_source === 'qar_official' ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)', color: submission?.dataset_source === 'qar_official' ? '#10b981' : '#f59e0b' }}>
                                {submission?.dataset_source === 'qar_official' ? 'QAR Official' : 'Preview'}
                            </span>
                        </div>
                        <button onClick={() => setActiveTab('smpor')} style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--admin-accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <i className="bi bi-table" /> View SMPOR
                        </button>
                    </div>
                    <div style={{ ...card, padding: '1.1rem 1.25rem' }}>
                        <div style={{ marginBottom: '0.65rem' }}><div style={lbl}>IPCR Score</div></div>
                        {ipcrMeta ? <div style={{ marginBottom: '0.65rem' }}><ScoreCircle score={ipcrMeta.score} rating={ipcrMeta.rating} /></div>
                            : <div style={{ fontSize: '0.82rem', color: 'var(--admin-text-muted)', marginBottom: '0.65rem' }}>No IPCR data.</div>}
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

                {/* Attachments */}
                {submission?.attachments?.length > 0 && (
                    <div style={{ ...card, padding: '1.1rem 1.25rem' }}>
                        <div style={lbl}>Supporting Documents</div>
                        {submission.attachments.map((a, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.45rem 0.75rem', background: 'var(--admin-bg-secondary)', borderRadius: 8, border: '1px solid var(--admin-border)', marginBottom: 4 }}>
                                <i className="bi bi-file-earmark" style={{ color: 'var(--admin-accent)', flexShrink: 0 }} />
                                <span style={{ flex: 1, fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.original_name}</span>
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
                        <div style={lbl}>Employee Remarks</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--admin-text-secondary)', lineHeight: 1.55, fontStyle: 'italic' }}>{submission.employee_remarks}</div>
                    </div>
                )}

                {/* Calibrate action */}
                {canAct && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button onClick={() => setShowCalibrate(true)}
                            style={{ padding: '0.6rem 1.5rem', borderRadius: 8, border: '1px solid rgba(167,139,250,0.4)', background: 'rgba(167,139,250,0.08)', color: '#a78bfa', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <i className="bi bi-sliders" /> {hasCalib ? 'Adjust Calibration' : 'Calibrate Score'}
                        </button>
                    </div>
                )}
            </div>

            {showCalibrate && <CalibrateModal opcraId={opcraId} submission={submission} ipcrMeta={ipcrMeta} onClose={() => setShowCalibrate(false)} />}
        </AppLayout>
    );
}
