import { useState, useMemo } from 'react';
import { router, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { SmporTable, IpcrSections, MporList, scoreColor } from '@/Pages/Pmt/_shared/PerformanceForms';
import { avatarSrc as resolveAvatar, onAvatarError } from '@/Components/defaultAvatar';

const card = { background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)', borderRadius: 'var(--admin-radius)', boxShadow: 'var(--admin-shadow)' };
const sectionLabel = { fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--admin-text-muted)', marginBottom: '0.5rem' };

function Avatar({ name, avatar, size = 56 }) {
    return <img src={resolveAvatar(avatar)} alt={name} onError={onAvatarError} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />;
}

function ScoreCircle({ score, rating, label = 'Performance Score' }) {
    const pct = Math.min((score / 5) * 100, 100);
    const color = scoreColor(score);
    const r = 28;
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{ position: 'relative', width: 64, height: 64, flexShrink: 0 }}>
                <svg width="64" height="64" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="32" cy="32" r={r} fill="none" stroke="var(--admin-border)" strokeWidth="5" />
                    <circle cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="5" strokeDasharray={`${2 * Math.PI * r * pct / 100} ${2 * Math.PI * r}`} strokeLinecap="round" />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 800, color }}>
                    {score > 0 ? Number(score).toFixed(2) : '—'}
                </div>
            </div>
            <div>
                <div style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--admin-text-muted)', marginBottom: 2 }}>{label}</div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color }}>{rating ?? '—'}</div>
            </div>
        </div>
    );
}

// ── Skill Gaps card ─────────────────────────────────────────────────────────────
function SkillGapsCard({ skillGaps, employeeName }) {
    const dims = skillGaps?.weak_dimensions ?? [];
    const outputs = skillGaps?.weak_outputs ?? [];
    const weakest = dims[0];

    const narrative = useMemo(() => {
        if (!dims.length && !outputs.length) return `No rated performance data is available to derive specific skill gaps for ${employeeName}. Review the forms below and document gaps manually.`;
        const parts = [];
        if (weakest) parts.push(`weakest in ${weakest.label.toLowerCase()} (avg ${weakest.avg.toFixed(2)})`);
        if (outputs.length) parts.push(`${outputs.length} output${outputs.length !== 1 ? 's' : ''} scored below satisfactory`);
        return `${employeeName} is ${parts.join(', ')}. The areas below are the strongest candidates for development activities.`;
    }, [dims, outputs, weakest, employeeName]);

    return (
        <div style={{ ...card, padding: '1.1rem 1.25rem', borderLeft: '3px solid #f59e0b' }}>
            <div style={sectionLabel}><i className="bi bi-exclamation-triangle" style={{ marginRight: 5 }} />Why Development Is Needed</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--admin-text-secondary)', lineHeight: 1.55, marginBottom: dims.length || outputs.length ? '0.9rem' : 0 }}>{narrative}</div>

            {dims.length > 0 && (
                <div style={{ marginBottom: outputs.length ? '0.9rem' : 0 }}>
                    <div style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--admin-text-muted)', marginBottom: '0.45rem' }}>Weakest Dimensions</div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {dims.map(d => (
                            <span key={d.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0.35rem 0.75rem', borderRadius: 99, fontSize: '0.75rem', fontWeight: 600, background: `${scoreColor(d.avg)}14`, color: scoreColor(d.avg), border: `1px solid ${scoreColor(d.avg)}33` }}>
                                {d.label}<b>{d.avg.toFixed(2)}</b>
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {outputs.length > 0 && (
                <div>
                    <div style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--admin-text-muted)', marginBottom: '0.45rem' }}>Lowest-Scoring Outputs</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {outputs.map((o, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 0.75rem', borderRadius: 8, background: 'var(--admin-bg-secondary)', border: '1px solid var(--admin-border)' }}>
                                <span style={{ flex: 1, minWidth: 0, fontSize: '0.8rem', color: 'var(--admin-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={o.output}>{o.output}</span>
                                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: scoreColor(o.a), flexShrink: 0 }}>{o.a != null ? Number(o.a).toFixed(2) : '—'}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ── History timeline ────────────────────────────────────────────────────────────
function HistoryTimeline({ periods, activeIpcrId, onSelect }) {
    if (!periods?.length) return null;
    return (
        <div style={{ ...card, padding: '1.1rem 1.25rem' }}>
            <div style={sectionLabel}><i className="bi bi-clock-history" style={{ marginRight: 5 }} />Performance History</div>
            <div style={{ display: 'flex', gap: '0.6rem', overflowX: 'auto', paddingBottom: 4 }}>
                {periods.map(p => {
                    const active = p.ipcr_id === activeIpcrId;
                    return (
                        <button key={p.ipcr_id} onClick={() => onSelect(p.ipcr_id)}
                            style={{ flexShrink: 0, minWidth: 150, textAlign: 'left', padding: '0.75rem 0.9rem', borderRadius: 10, cursor: 'pointer',
                                background: active ? 'rgba(59,130,246,0.06)' : 'var(--admin-bg-secondary)',
                                border: `1.5px solid ${active ? 'var(--admin-accent)' : 'var(--admin-border)'}` }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--admin-text-muted)', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.period_name}</div>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                                <span style={{ fontSize: '1.15rem', fontWeight: 800, color: scoreColor(p.score) }}>{p.score > 0 ? Number(p.score).toFixed(2) : '—'}</span>
                                {p.is_low && <i className="bi bi-arrow-down-circle-fill" style={{ color: '#ef4444', fontSize: '0.75rem' }} />}
                            </div>
                            <div style={{ fontSize: '0.66rem', fontWeight: 600, color: scoreColor(p.score), marginTop: 2 }}>{p.rating}</div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// ── Main Page ───────────────────────────────────────────────────────────────────
export default function Show() {
    const { employee, current, periods, skillGaps } = usePage().props;
    const [activeIpcrId, setActiveIpcrId] = useState(current.ipcr_id);
    const [formTab, setFormTab] = useState('ipcr');

    const activePeriod = useMemo(
        () => periods.find(p => p.ipcr_id === activeIpcrId) ?? periods[0],
        [periods, activeIpcrId]
    );

    return (
        <AppLayout title="Development Planning" description={`${employee.name} — ${current.period_name}`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                {/* Header */}
                <div style={{ ...card, padding: '1.1rem 1.25rem' }}>
                    <button onClick={() => router.visit('/pmt/development-planning')}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-muted)', fontSize: '0.82rem', padding: 0, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <i className="bi bi-arrow-left" /> Back to list
                    </button>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', minWidth: 0 }}>
                            <Avatar name={employee.name} avatar={employee.avatar} />
                            <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--admin-text-primary)' }}>{employee.name}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)', marginTop: 2 }}>{employee.position}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)', marginTop: 4, display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                    <span><i className="bi bi-building" style={{ marginRight: 4 }} />{employee.office}</span>
                                    <span><i className="bi bi-person-badge" style={{ marginRight: 4 }} />Head: {employee.dept_head}</span>
                                </div>
                            </div>
                        </div>
                        <ScoreCircle score={current.score} rating={current.rating} label="Evaluated Rating" />
                    </div>
                </div>

                {/* Skill gaps */}
                <SkillGapsCard skillGaps={skillGaps} employeeName={employee.name} />

                {/* History timeline */}
                <HistoryTimeline periods={periods} activeIpcrId={activeIpcrId} onSelect={setActiveIpcrId} />

                {/* Forms panel */}
                <div style={{ ...card, padding: '1.1rem 1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: '0.5rem' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--admin-text-primary)' }}>
                            {activePeriod?.period_name} <span style={{ fontWeight: 400, color: 'var(--admin-text-muted)', fontSize: '0.8rem' }}>— performance forms</span>
                        </div>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: scoreColor(activePeriod?.score), padding: '2px 10px', borderRadius: 99, background: `${scoreColor(activePeriod?.score)}14` }}>
                            {activePeriod?.score > 0 ? Number(activePeriod.score).toFixed(2) : '—'} · {activePeriod?.rating}
                        </span>
                    </div>
                    <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--admin-border)', marginBottom: '1rem' }}>
                        {[['ipcr', 'IPCR'], ['smpor', 'SMPOR'], ['mpor', 'MPOR']].map(([key, label]) => (
                            <button key={key} onClick={() => setFormTab(key)} style={{ padding: '0.5rem 1rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: formTab === key ? 700 : 500, color: formTab === key ? 'var(--admin-accent)' : 'var(--admin-text-muted)', borderBottom: `2px solid ${formTab === key ? 'var(--admin-accent)' : 'transparent'}`, marginBottom: -1 }}>
                                {label}
                            </button>
                        ))}
                    </div>
                    {formTab === 'ipcr' && <IpcrSections sections={activePeriod?.ipcrSections} />}
                    {formTab === 'smpor' && <SmporTable table={activePeriod?.smporTable} />}
                    {formTab === 'mpor' && <MporList mpors={activePeriod?.mpors} />}
                </div>
            </div>
        </AppLayout>
    );
}
