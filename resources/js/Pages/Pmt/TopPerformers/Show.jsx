import { useState } from 'react';
import { usePage, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { avatarSrc as resolveAvatar, onAvatarError } from '@/Components/defaultAvatar';

const RATING_CFG = {
    'Outstanding':       { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', icon: '🏆' },
    'Very Satisfactory': { color: '#10b981', bg: 'rgba(16,185,129,0.12)', icon: '⭐' },
    'Satisfactory':      { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: '✓' },
    'Unsatisfactory':    { color: '#eab308', bg: 'rgba(234,179,8,0.12)',   icon: '⚠' },
    'Poor':              { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   icon: '✗' },
};

const SUBMISSION_STATUS = {
    draft:                     { label: 'Draft',            c: 'var(--admin-text-muted)', bg: 'var(--admin-bg-secondary)' },
    submitted_to_supervisor:   { label: 'Submitted',        c: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
    supervisor_endorsed:       { label: 'Endorsed',         c: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
    dept_head_endorsed:        { label: 'Dept Head ✓',      c: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
    released_by_pmt:           { label: 'Released',         c: '#10b981', bg: 'rgba(16,185,129,0.12)' },
    returned_to_employee:      { label: 'Returned',         c: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
};

const IDP_STATUS = {
    draft:              { label: 'Draft',         c: 'var(--admin-text-muted)', bg: 'var(--admin-bg-secondary)' },
    pending_details:    { label: 'Pending',       c: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    submitted_to_ld:    { label: 'Submitted to L&D', c: '#10b981', bg: 'rgba(16,185,129,0.12)' },
};

function ratingCfg(r) { return RATING_CFG[r] ?? { color: 'var(--admin-text-muted)', bg: 'var(--admin-bg-secondary)', icon: '' }; }

function Badge({ label, color, bg, size = '0.7rem' }) {
    return (
        <span style={{ fontSize: size, fontWeight: 700, padding: '2px 9px', borderRadius: 99,
            color, background: bg, whiteSpace: 'nowrap' }}>
            {label}
        </span>
    );
}

function ScoreRing({ score, rating, size = 56 }) {
    const r = size / 2 - 5, circ = 2 * Math.PI * r;
    const color = ratingCfg(rating).color;
    const pct = Math.min((score / 5) * 100, 100);
    return (
        <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
            <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
                <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--admin-border)" strokeWidth="4" />
                <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="4"
                    strokeDasharray={`${circ * pct / 100} ${circ}`} strokeLinecap="round" />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: '0.72rem', fontWeight: 800, color }}>
                {score.toFixed(2)}
            </div>
        </div>
    );
}

// Minimal sparkline chart
function MiniChart({ data }) {
    if (!data || data.length < 2) return null;
    const W = 280, H = 80;
    const scores = data.map(d => d.score);
    const min = Math.min(...scores) - 0.3;
    const max = Math.max(...scores) + 0.3;
    const px = (i) => (i / (data.length - 1)) * (W - 20) + 10;
    const py = (v) => H - 10 - ((v - min) / (max - min)) * (H - 20);
    const path = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${px(i)} ${py(d.score)}`).join(' ');
    return (
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H, display: 'block' }}>
            <polyline fill="none" stroke="var(--admin-accent)" strokeWidth="2"
                points={data.map((d, i) => `${px(i)},${py(d.score)}`).join(' ')} />
            {data.map((d, i) => (
                <circle key={i} cx={px(i)} cy={py(d.score)} r="4" fill="var(--admin-accent)" />
            ))}
            {data.map((d, i) => (
                <text key={'l'+i} x={px(i)} y={py(d.score) - 8} textAnchor="middle"
                    fontSize="9" fill="var(--admin-text-muted)">{d.score.toFixed(2)}</text>
            ))}
            {data.map((d, i) => (
                <text key={'p'+i} x={px(i)} y={H - 1} textAnchor="middle"
                    fontSize="8" fill="var(--admin-text-muted)"
                    style={{ maxWidth: 40, overflow: 'hidden' }}>
                    {d.period?.split(' ')[0]}
                </text>
            ))}
        </svg>
    );
}

const TABS = ['Overview', 'Performance History', 'IPCRs', 'Dev Plans'];

export default function Show() {
    const { employee, stats, history, ipcrs, idps, chartData } = usePage().props;
    const [tab, setTab] = useState('Overview');
    const [expandedPeriod, setExpandedPeriod] = useState(null);
    const [expandedIdp, setExpandedIdp] = useState(null);

    const card = { background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)', borderRadius: 'var(--admin-radius)', boxShadow: 'var(--admin-shadow)' };

    const currentRating = ipcrs[0]?.pmt_adjectival || ipcrs[0]?.adjectival;
    const currentScore  = ipcrs[0]?.pmt_score ?? ipcrs[0]?.final_score;
    const cfg = ratingCfg(currentRating);

    return (
        <AppLayout title={employee.name} description={employee.position}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                {/* Header card */}
                <div style={{ ...card, padding: '1.25rem', borderLeft: `4px solid ${cfg.color}` }}>
                    <button onClick={() => router.visit('/pmt/top-performers')}
                        style={{ border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center',
                            gap: 5, color: 'var(--admin-text-muted)', fontSize: '0.82rem', padding: 0, marginBottom: '0.75rem' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg> Back to Top Performers
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                        <img src={resolveAvatar(employee.avatar)} alt={employee.name} onError={onAvatarError}
                            style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: `3px solid ${cfg.color}` }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--admin-text-primary)' }}>{employee.name}</span>
                                {employee.employee_id && (
                                    <Badge label={employee.employee_id} color="var(--admin-text-muted)" bg="var(--admin-bg-secondary)" />
                                )}
                                {employee.is_disabled
                                    ? <Badge label="Disabled" color="#ef4444" bg="rgba(239,68,68,0.12)" />
                                    : employee.is_active
                                        ? <Badge label="Active" color="#10b981" bg="rgba(16,185,129,0.12)" />
                                        : <Badge label="Inactive" color="var(--admin-text-muted)" bg="var(--admin-bg-secondary)" />}
                            </div>
                            <div style={{ fontSize: '0.82rem', color: 'var(--admin-text-muted)', marginTop: 3 }}>{employee.position}</div>
                            {employee.office && (
                                <div style={{ fontSize: '0.78rem', color: 'var(--admin-text-muted)', marginTop: 2 }}>
                                    <i className="bi bi-building" /> {employee.office.name}
                                    {employee.office.code && <span style={{ marginLeft: 5, fontSize: '0.68rem', padding: '1px 6px', borderRadius: 99, background: 'var(--admin-bg-secondary)' }}>{employee.office.code}</span>}
                                </div>
                            )}
                        </div>
                        {currentScore && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 }}>
                                <ScoreRing score={currentScore} rating={currentRating} size={60} />
                                <div>
                                    <div style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--admin-text-muted)' }}>Latest Score</div>
                                    <div style={{ fontWeight: 800, fontSize: '0.85rem', color: cfg.color, marginTop: 2 }}>
                                        {cfg.icon} {currentRating}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                    {TABS.map(t => (
                        <button key={t} onClick={() => setTab(t)}
                            style={{ padding: '0.45rem 1rem', borderRadius: 99, border: tab === t ? '1.5px solid var(--admin-accent)' : '1.5px solid var(--admin-border)',
                                background: tab === t ? 'rgba(59,130,246,0.1)' : 'var(--admin-card)',
                                color: tab === t ? 'var(--admin-accent)' : 'var(--admin-text-muted)',
                                cursor: 'pointer', fontSize: '0.8rem', fontWeight: tab === t ? 700 : 500 }}>
                            {t}
                        </button>
                    ))}
                </div>

                {/* ── TAB: Overview ── */}
                {tab === 'Overview' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                        {/* Stats row */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: '0.75rem' }}>
                            {[
                                { label: 'Periods Rated', value: stats.periods_rated, icon: 'bi-calendar-check' },
                                { label: 'Average Rating', value: stats.avg_rating?.toFixed(2) ?? '—', icon: 'bi-bar-chart' },
                                { label: 'Best Rating', value: stats.best_rating?.toFixed(2) ?? '—', sub: stats.best_period, icon: 'bi-trophy' },
                                { label: 'IDPs Submitted', value: stats.idps_submitted, icon: 'bi-journal-check' },
                            ].map(s => (
                                <div key={s.label} style={{ ...card, padding: '1rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <i className={`bi ${s.icon}`} style={{ color: 'var(--admin-accent)', fontSize: '1.1rem' }} />
                                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--admin-text-primary)', lineHeight: 1 }}>{s.value}</div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--admin-text-muted)' }}>{s.label}</div>
                                    {s.sub && <div style={{ fontSize: '0.65rem', color: 'var(--admin-text-muted)' }}>{s.sub}</div>}
                                </div>
                            ))}
                        </div>

                        {/* Employee details */}
                        <div style={{ ...card, padding: '1.1rem' }}>
                            <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--admin-text-muted)', marginBottom: '0.75rem',
                                textTransform: 'uppercase', letterSpacing: '0.06em' }}>Employee Details</div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: '0.6rem 1.5rem' }}>
                                {[
                                    { label: 'Employee ID', value: employee.employee_id || '—' },
                                    { label: 'Email', value: employee.email },
                                    { label: 'Role', value: employee.role || '—' },
                                    { label: 'Office', value: employee.office?.name || '—' },
                                    { label: 'Position', value: employee.position || '—' },
                                    { label: 'Activated On', value: employee.activated_at || '—' },
                                    { label: 'Member Since', value: employee.created_at },
                                ].map(f => (
                                    <div key={f.label}>
                                        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{f.label}</div>
                                        <div style={{ fontSize: '0.82rem', color: 'var(--admin-text-primary)', marginTop: 2 }}>{f.value}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Rating trend chart */}
                        {chartData.length >= 2 && (
                            <div style={{ ...card, padding: '1.1rem' }}>
                                <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--admin-text-muted)', marginBottom: '0.75rem',
                                    textTransform: 'uppercase', letterSpacing: '0.06em' }}>Rating Trend</div>
                                <MiniChart data={chartData} />
                            </div>
                        )}
                    </div>
                )}

                {/* ── TAB: Performance History ── */}
                {tab === 'Performance History' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {history.length === 0 && (
                            <div style={{ ...card, padding: '2.5rem', textAlign: 'center', color: 'var(--admin-text-muted)' }}>
                                <i className="bi bi-clock-history" style={{ fontSize: '2rem', display: 'block', marginBottom: 8 }} />
                                No performance history found.
                            </div>
                        )}
                        {history.map((row, i) => {
                            const expanded = expandedPeriod === i;
                            const subCfg = row.submission
                                ? (SUBMISSION_STATUS[row.submission.status] ?? { label: row.submission.status, c: 'var(--admin-text-muted)', bg: 'var(--admin-bg-secondary)' })
                                : null;
                            const idpCfg = row.idp
                                ? (IDP_STATUS[row.idp.status] ?? { label: row.idp.status, c: 'var(--admin-text-muted)', bg: 'var(--admin-bg-secondary)' })
                                : null;
                            const finalRating = row.submission?.final_adjectival;
                            const adjCfg = finalRating ? ratingCfg(finalRating) : null;
                            return (
                                <div key={i} style={{ ...card, overflow: 'hidden' }}>
                                    <div onClick={() => setExpandedPeriod(expanded ? null : i)}
                                        style={{ padding: '0.85rem 1.1rem', cursor: 'pointer', display: 'flex',
                                            alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                                            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--admin-text-primary)' }}>{row.period}</span>
                                            {adjCfg && <Badge label={`${adjCfg.icon} ${finalRating}`} color={adjCfg.color} bg={adjCfg.bg} />}
                                            {row.submission?.final_rating && (
                                                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: adjCfg?.color ?? 'var(--admin-text-primary)' }}>
                                                    {row.submission.final_rating.toFixed(2)}
                                                </span>
                                            )}
                                            {row.submission?.flagged && (
                                                <span title="Flagged for calibration" style={{ color: '#f59e0b', fontSize: '0.8rem' }}>⚑</span>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                            {subCfg && <Badge label={subCfg.label} color={subCfg.c} bg={subCfg.bg} />}
                                            {idpCfg && <Badge label={`IDP: ${idpCfg.label}`} color={idpCfg.c} bg={idpCfg.bg} size="0.65rem" />}
                                            <i className={`bi bi-chevron-${expanded ? 'up' : 'down'}`} style={{ color: 'var(--admin-text-muted)', fontSize: '0.75rem' }} />
                                        </div>
                                    </div>
                                    {expanded && (
                                        <div style={{ borderTop: '1px solid var(--admin-border)', padding: '0.85rem 1.1rem',
                                            display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: '0.75rem 1.5rem' }}>
                                            {/* IPCR */}
                                            {row.ipcr && (
                                                <div>
                                                    <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--admin-text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>IPCR</div>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--admin-text-primary)' }}>
                                                        Score: <strong>{row.ipcr.final_score}</strong>
                                                        {row.ipcr.pmt_score && row.ipcr.pmt_score !== row.ipcr.final_score && (
                                                            <span style={{ marginLeft: 5, color: 'var(--admin-accent)' }}>→ PMT: <strong>{row.ipcr.pmt_score}</strong></span>
                                                        )}
                                                    </div>
                                                    {(row.ipcr.pmt_adjectival || row.ipcr.adjectival) && (
                                                        <div style={{ marginTop: 4 }}>
                                                            <Badge label={row.ipcr.pmt_adjectival || row.ipcr.adjectival}
                                                                color={ratingCfg(row.ipcr.pmt_adjectival || row.ipcr.adjectival).color}
                                                                bg={ratingCfg(row.ipcr.pmt_adjectival || row.ipcr.adjectival).bg} />
                                                        </div>
                                                    )}
                                                    {row.ipcr.committed_at && (
                                                        <div style={{ fontSize: '0.7rem', color: 'var(--admin-text-muted)', marginTop: 4 }}>Committed: {row.ipcr.committed_at}</div>
                                                    )}
                                                </div>
                                            )}
                                            {/* Submission */}
                                            {row.submission && (
                                                <div>
                                                    <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--admin-text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Accomplishment</div>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--admin-text-primary)' }}>
                                                        Final Rating: <strong>{row.submission.final_rating?.toFixed(2) ?? '—'}</strong>
                                                    </div>
                                                    {subCfg && <div style={{ marginTop: 4 }}><Badge label={subCfg.label} color={subCfg.c} bg={subCfg.bg} /></div>}
                                                    {row.submission.submitted_at && (
                                                        <div style={{ fontSize: '0.7rem', color: 'var(--admin-text-muted)', marginTop: 4 }}>Submitted: {row.submission.submitted_at}</div>
                                                    )}
                                                    {row.submission.pmt_action_at && (
                                                        <div style={{ fontSize: '0.7rem', color: 'var(--admin-text-muted)' }}>PMT Action: {row.submission.pmt_action_at}</div>
                                                    )}
                                                </div>
                                            )}
                                            {/* IDP */}
                                            {row.idp && (
                                                <div>
                                                    <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--admin-text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Dev Plan</div>
                                                    {idpCfg && <div style={{ marginBottom: 4 }}><Badge label={idpCfg.label} color={idpCfg.c} bg={idpCfg.bg} /></div>}
                                                    {row.idp.source_score && (
                                                        <div style={{ fontSize: '0.8rem', color: 'var(--admin-text-primary)' }}>Source: <strong>{row.idp.source_score}</strong></div>
                                                    )}
                                                    {row.idp.lnd_sync_status && row.idp.lnd_sync_status !== 'not_sent' && (
                                                        <div style={{ fontSize: '0.7rem', color: 'var(--admin-text-muted)', marginTop: 4 }}>
                                                            LnD Sync: {row.idp.lnd_sync_status === 'acknowledged' ? '🟢' : row.idp.lnd_sync_status === 'sent' ? '🟡' : '🔴'} {row.idp.lnd_sync_status}
                                                        </div>
                                                    )}
                                                    {row.idp.submitted_to_ld_at && (
                                                        <div style={{ fontSize: '0.7rem', color: 'var(--admin-text-muted)', marginTop: 2 }}>Submitted: {row.idp.submitted_to_ld_at}</div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* ── TAB: IPCRs ── */}
                {tab === 'IPCRs' && (
                    <div style={{ ...card, overflow: 'hidden' }}>
                        {ipcrs.length === 0 ? (
                            <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--admin-text-muted)' }}>
                                <i className="bi bi-file-earmark-text" style={{ fontSize: '2rem', display: 'block', marginBottom: 8 }} />
                                No IPCR records found.
                            </div>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-bg-secondary)' }}>
                                        {['Period', 'Status', 'Final Score', 'PMT Score', 'Rating', 'Committed'].map(h => (
                                            <th key={h} style={{ padding: '0.65rem 1rem', textAlign: 'left', fontWeight: 700,
                                                fontSize: '0.7rem', color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {ipcrs.map((ipcr, i) => {
                                        const adj = ipcr.pmt_adjectival || ipcr.adjectival;
                                        const adjCfg = ratingCfg(adj);
                                        return (
                                            <tr key={ipcr.id} style={{ borderBottom: '1px solid var(--admin-border)', background: i % 2 === 0 ? 'transparent' : 'var(--admin-bg-secondary)' }}>
                                                <td style={{ padding: '0.65rem 1rem', fontWeight: 600 }}>{ipcr.period}</td>
                                                <td style={{ padding: '0.65rem 1rem' }}>
                                                    <Badge label={ipcr.status?.replace(/_/g, ' ')} color="var(--admin-text-muted)" bg="var(--admin-bg-secondary)" />
                                                </td>
                                                <td style={{ padding: '0.65rem 1rem', fontWeight: 700 }}>{ipcr.final_score?.toFixed(2) ?? '—'}</td>
                                                <td style={{ padding: '0.65rem 1rem', fontWeight: 700, color: 'var(--admin-accent)' }}>
                                                    {ipcr.pmt_score ? ipcr.pmt_score.toFixed(2) : '—'}
                                                </td>
                                                <td style={{ padding: '0.65rem 1rem' }}>
                                                    {adj ? <Badge label={`${adjCfg.icon} ${adj}`} color={adjCfg.color} bg={adjCfg.bg} /> : '—'}
                                                </td>
                                                <td style={{ padding: '0.65rem 1rem', color: 'var(--admin-text-muted)' }}>{ipcr.committed_at ?? '—'}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}

                {/* ── TAB: Dev Plans ── */}
                {tab === 'Dev Plans' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {idps.length === 0 && (
                            <div style={{ ...card, padding: '2.5rem', textAlign: 'center', color: 'var(--admin-text-muted)' }}>
                                <i className="bi bi-journal-richtext" style={{ fontSize: '2rem', display: 'block', marginBottom: 8 }} />
                                No development plans found.
                            </div>
                        )}
                        {idps.map((idp, i) => {
                            const expanded = expandedIdp === i;
                            const idpCfg = IDP_STATUS[idp.status] ?? { label: idp.status, c: 'var(--admin-text-muted)', bg: 'var(--admin-bg-secondary)' };
                            return (
                                <div key={idp.id} style={{ ...card, overflow: 'hidden' }}>
                                    <div onClick={() => setExpandedIdp(expanded ? null : i)}
                                        style={{ padding: '0.85rem 1.1rem', cursor: 'pointer', display: 'flex',
                                            alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                                            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--admin-text-primary)' }}>{idp.period}</span>
                                            <Badge label={idpCfg.label} color={idpCfg.c} bg={idpCfg.bg} />
                                            {idp.source_score && <span style={{ fontSize: '0.78rem', color: 'var(--admin-text-muted)' }}>Score: {idp.source_score}</span>}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            {idp.submitted_to_ld_at && <span style={{ fontSize: '0.7rem', color: 'var(--admin-text-muted)' }}>Submitted {idp.submitted_to_ld_at}</span>}
                                            <i className={`bi bi-chevron-${expanded ? 'up' : 'down'}`} style={{ color: 'var(--admin-text-muted)', fontSize: '0.75rem' }} />
                                        </div>
                                    </div>
                                    {expanded && idp.idp_rows?.length > 0 && (
                                        <div style={{ borderTop: '1px solid var(--admin-border)', overflowX: 'auto' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                                                <thead>
                                                    <tr style={{ background: 'var(--admin-bg-secondary)' }}>
                                                        {['Area / Competency', 'Learning Intervention', 'Mode', 'Target Date', 'Status'].map(h => (
                                                            <th key={h} style={{ padding: '0.5rem 0.75rem', textAlign: 'left', fontWeight: 700,
                                                                fontSize: '0.65rem', color: 'var(--admin-text-muted)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {idp.idp_rows.map((row, ri) => (
                                                        <tr key={ri} style={{ borderTop: '1px solid var(--admin-border)' }}>
                                                            <td style={{ padding: '0.5rem 0.75rem' }}>{row.area || row.competency || '—'}</td>
                                                            <td style={{ padding: '0.5rem 0.75rem' }}>{row.intervention || row.learning_intervention || '—'}</td>
                                                            <td style={{ padding: '0.5rem 0.75rem' }}>{row.mode || '—'}</td>
                                                            <td style={{ padding: '0.5rem 0.75rem', whiteSpace: 'nowrap' }}>{row.target_date || '—'}</td>
                                                            <td style={{ padding: '0.5rem 0.75rem' }}>{row.status || '—'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                    {expanded && (!idp.idp_rows || idp.idp_rows.length === 0) && (
                                        <div style={{ borderTop: '1px solid var(--admin-border)', padding: '1rem', color: 'var(--admin-text-muted)', fontSize: '0.8rem' }}>
                                            No IDP rows recorded.
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

            </div>
        </AppLayout>
    );
}
