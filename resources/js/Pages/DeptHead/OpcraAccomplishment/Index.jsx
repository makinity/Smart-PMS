import { useState, useEffect } from 'react';
import { router, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { avatarSrc, onAvatarError } from '@/Components/defaultAvatar';
import ValidationModal from '@/Components/ValidationModal';

function useBreakpoint() {
    const [w, setW] = useState(() => (typeof window === 'undefined' ? 1024 : window.innerWidth));
    useEffect(() => {
        const h = () => setW(window.innerWidth);
        window.addEventListener('resize', h);
        return () => window.removeEventListener('resize', h);
    }, []);
    if (w >= 1024) return 'desktop';
    if (w >= 768)  return 'tablet';
    return 'mobile';
}

const adjColor = (r) => !r ? 'var(--admin-text-muted)' : r >= 5.0 ? '#3b82f6' : r >= 4.0 ? '#10b981' : r >= 3.0 ? '#f59e0b' : r >= 2.0 ? '#eab308' : '#ef4444';
const adjLabel = (r) => !r ? '—' : r >= 5.0 ? 'Outstanding' : r >= 4.0 ? 'Very Satisfactory' : r >= 3.0 ? 'Satisfactory' : r >= 2.0 ? 'Unsatisfactory' : 'Poor';

// ── Office-Level OPCR Accomplishment Section ──────────────────────────────────
const FN_LABELS = { core: 'A. CORE FUNCTIONS', support: 'B. SUPPORT FUNCTIONS', strategic: 'C. STRATEGIC FUNCTIONS' };
function round2(v) { return Math.round(v * 100) / 100; }

function OpcraOfficeSection({ opcrSections, officialScore }) {
    if (!opcrSections || opcrSections.length === 0) return null;
    const ratingCol = (v) => ({
        fontWeight: 700, fontSize: '0.82rem',
        color: !v ? 'var(--admin-text-muted)' : v >= 5.0 ? '#3b82f6' : v >= 4.0 ? '#10b981' : v >= 3.0 ? '#f59e0b' : v >= 2.0 ? '#eab308' : '#ef4444',
    });
    const byType = {};
    opcrSections.forEach(fn => {
        const ft = fn.function_type ?? 'core';
        byType[ft] = byType[ft] ?? { ratings: [], weight: 0, label: FN_LABELS[ft] ?? ft };
        byType[ft].weight = round2(byType[ft].weight + (fn.weight_percent ?? 0));
        fn.outputs.forEach(o => o.indicators.forEach(i => {
            if (i.A !== null && i.A !== undefined) byType[ft].ratings.push(i.A);
        }));
    });
    const summary = Object.values(byType).map(ft => {
        const avg = ft.ratings.length ? round2(ft.ratings.reduce((s,v)=>s+v,0)/ft.ratings.length) : 0;
        return { label: ft.label, weight: ft.weight, weighted: round2(avg * ft.weight / 100) };
    });
    const overall = round2(summary.reduce((s,r)=>s+r.weighted,0));
    return (
        <div style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)', borderRadius: 'var(--admin-radius)', boxShadow: 'var(--admin-shadow)', overflow: 'hidden' }}>
            <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid var(--admin-border)', fontWeight: 700, fontSize: '0.9rem', color: 'var(--admin-text-primary)' }}>Office OPCR Accomplishment</div>
            {opcrSections.map((fn, fi) => (
                <div key={fi}>
                    <div style={{ padding: '0.6rem 1.25rem', background: 'var(--admin-bg-secondary)', borderBottom: '1px solid var(--admin-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--admin-text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{FN_LABELS[fn.function_type] ?? fn.function_type}</span>
                        {fn.weight_percent != null && <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--admin-accent)' }}>{fn.weight_percent}%</span>}
                    </div>
                    {fn.outputs.map((output, oi) => (
                        <div key={oi}>
                            <div style={{ padding: '0.5rem 1.25rem', background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--admin-border)', fontWeight: 600, fontSize: '0.78rem', color: 'var(--admin-text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{output.output_title}</div>
                            {output.indicators.map((ind, ii) => (
                                <div key={ii} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '0.65rem 1.25rem', borderBottom: '1px solid var(--admin-border)', flexWrap: 'wrap' }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', flex: 1, minWidth: 0 }}>
                                        <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--admin-bg-secondary)', border: '1px solid var(--admin-border)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 700, color: 'var(--admin-text-muted)', flexShrink: 0, marginTop: 2 }}>{ii + 1}</span>
                                        <span style={{ fontSize: '0.83rem', color: 'var(--admin-text-secondary)', lineHeight: 1.4 }}>{ind.indicator_text}</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '1rem', flexShrink: 0 }}>
                                        {[['Q', ind.Q], ['E', ind.E], ['T', ind.T], ['A', ind.A]].map(([lbl, val]) => (
                                            <div key={lbl} style={{ textAlign: 'center', minWidth: 36 }}>
                                                <div style={{ fontSize: '0.58rem', fontWeight: 700, color: 'var(--admin-text-muted)', marginBottom: 2 }}>{lbl}</div>
                                                <div style={ratingCol(val)}>{val ? Number(val).toFixed(2) : '—'}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            ))}
            {/* Performance Summary */}
            <div style={{ borderTop: '2px solid var(--admin-border)' }}>
                <div style={{ padding: '0.5rem 1.25rem', background: 'var(--admin-bg-secondary)' }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--admin-text-muted)' }}>Performance Summary</span>
                </div>
                {summary.map((row, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 1.25rem', borderBottom: '1px solid var(--admin-border)' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--admin-text-secondary)', fontStyle: 'italic' }}>Weighted Average Rating for {row.label} ({row.weight}%)</span>
                        <span style={{ fontWeight: 700, fontSize: '0.85rem', ...ratingCol(row.weighted) }}>{row.weighted > 0 ? row.weighted.toFixed(2) : '—'}</span>
                    </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 1.25rem', borderBottom: '1px solid var(--admin-border)' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--admin-text-primary)' }}>OVERALL RATING</span>
                    <span style={{ fontWeight: 800, fontSize: '0.95rem', ...ratingCol(officialScore) }}>{officialScore != null ? Number(officialScore).toFixed(2) : '—'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 1.25rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--admin-text-primary)' }}>ADJECTIVAL RATING</span>
                    <span style={{ fontWeight: 700, fontSize: '0.85rem', color: adjColor(officialScore) }}>{adjLabel(officialScore)}</span>
                </div>
            </div>
        </div>
    );
}

const STATUS_CFG = {
    draft:     { label: 'Draft',     c: '#94a3b8', bg: 'rgba(100,116,139,0.12)' },
    submitted: { label: 'Submitted', c: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    released:  { label: 'Released',  c: '#4ade80', bg: 'rgba(74,222,128,0.12)' },
    returned:  { label: 'Returned',  c: '#f87171', bg: 'rgba(239,68,68,0.12)' },
};

function ScoreRing({ score, size = 64 }) {
    const r = size / 2 - 6, circ = 2 * Math.PI * r;
    const color = adjColor(score);
    return (
        <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
            <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
                <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--admin-border)" strokeWidth="5" />
                <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="5"
                    strokeDasharray={`${circ * Math.min((score/5)*100,100) / 100} ${circ}`} strokeLinecap="round" />
            </svg>
            <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize: size>70?'1rem':'0.82rem', fontWeight:800, color }}>
                {score !== null && score !== undefined ? Number(score).toFixed(2) : '—'}
            </div>
        </div>
    );
}

export default function Index() {
    const { period, submission, employees, stats, hasApprovedOpcr, approvedOpcrId, opcrSections, projectedRating } = usePage().props;
    const bp = useBreakpoint();
    const [remarks, setRemarks]   = useState(submission?.dept_head_remarks ?? '');
    const [flagged, setFlagged]   = useState(submission?.flagged_for_calibration ?? false);
    const [confirm, setConfirm]   = useState(false);
    const [warning, setWarning]   = useState(null); // unapproved employees list
    const [saving, setSaving]     = useState(false);
    const [search, setSearch]     = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const filteredEmployees = employees.filter(emp => {
        const matchSearch = emp.name.toLowerCase().includes(search.toLowerCase());
        const empStatus = emp.released ? 'released_by_pmt' : emp.approved ? 'approved' : (emp.status ?? 'not_submitted');
        const matchStatus = statusFilter === 'all' || empStatus === statusFilter;
        return matchSearch && matchStatus;
    });

    const status   = submission?.status ?? 'draft';
    const sc       = STATUS_CFG[status] ?? STATUS_CFG.draft;
    const locked   = submission && !['draft','returned'].includes(status);
    const released = status === 'released';
    const canSubmit = !locked && stats.approved > 0 && !!period && hasApprovedOpcr;
    const pct      = stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0;

    const card  = { background:'var(--admin-card)', border:'1px solid var(--admin-border-strong)', borderRadius:'var(--admin-radius)', boxShadow:'var(--admin-shadow)' };
    const lbl   = { fontSize:'0.62rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--admin-text-muted)', marginBottom:'0.4rem' };

    function doSubmit() {
        setSaving(true);
        router.post('/dept-head/opcr-accomplishment/submit', { remarks, flagged_for_calibration: flagged }, {
            preserveScroll: true,
            onSuccess: () => { setSaving(false); setConfirm(false); },
            onError:   () => setSaving(false),
        });
    }

    function handleSubmitClick() {
        if (!canSubmit) return;

        // Employees who haven't submitted their accomplishment at all
        const notSubmitted = employees.filter(emp => emp.status === 'not_submitted');

        // Employees who submitted but weren't approved yet (pending somewhere in the flow)
        const unapproved = employees.filter(emp =>
            !['dept_head_approved', 'released_by_pmt', 'not_submitted'].includes(emp.status)
        );

        const hasIssues = notSubmitted.length > 0 || unapproved.length > 0;

        if (hasIssues) {
            // Build combined warning list
            const warningItems = [
                ...notSubmitted.map(emp => ({
                    name: emp.name,
                    sub: emp.position,
                    avatar: emp.avatar,
                    reason: 'No accomplishment submitted',
                    // Notify the supervisor of this employee
                    ...(emp.supervisor_id ? {
                        notifyPayload: {
                            _url: '/api/notify/reminder',
                            employee_id: emp.supervisor_id,
                            context: 'accomplishment_not_submitted',
                        }
                    } : {}),
                })),
                ...unapproved.map(emp => ({
                    name: emp.name,
                    sub: emp.position,
                    avatar: emp.avatar,
                    reason: emp.status?.replace(/_/g, ' ') ?? 'pending approval',
                })),
            ];
            setWarning(warningItems);
        } else {
            setConfirm(true);
        }
    }

    if (!period) return (
        <AppLayout title="OPCR Accomplishment">
            <div style={{ ...card, padding:'3rem', textAlign:'center', color:'var(--admin-text-muted)' }}>
                <i className="bi bi-calendar-x" style={{ fontSize:'2rem', display:'block', marginBottom:8 }} />No active period.
            </div>
        </AppLayout>
    );

    return (
        <AppLayout title="OPCR Accomplishment" description={period.name}>
            <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>

                {/* Header */}
                <div style={{ ...card, padding:'1rem 1.25rem', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8 }}>
                    <div>
                        <div style={{ fontWeight:700, fontSize:'1rem', color:'var(--admin-text-primary)' }}>OPCR Accomplishment</div>
                        <div style={{ fontSize:'0.75rem', color:'var(--admin-text-muted)' }}>{period.name}</div>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        {released && (
                            <a href="/dept-head/opcr-accomplishment/export"
                               title="Export Official OPCR"
                               style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'0.45rem 1.1rem', borderRadius:8, background:'rgba(34,197,94,0.12)', border:'1px solid rgba(34,197,94,0.28)', color:'#4ade80', fontSize:'0.82rem', fontWeight:600, textDecoration:'none' }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                {bp !== 'mobile' && 'Download'}
                            </a>
                        )}
                    </div>
                </div>

                {/* OPCR status banner */}
                <div style={{ padding:'0.85rem 1.1rem', borderRadius:'var(--admin-radius)', display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, flexWrap:'wrap',
                    background: hasApprovedOpcr ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.1)',
                    border: `1px solid ${hasApprovedOpcr ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.35)'}`,
                    borderLeft: `4px solid ${hasApprovedOpcr ? '#10b981' : '#f59e0b'}` }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <i className={`bi ${hasApprovedOpcr ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'}`}
                            style={{ color: hasApprovedOpcr ? '#10b981' : '#f59e0b', fontSize:'1rem', flexShrink:0 }} />
                        <div>
                            <div style={{ fontWeight:700, fontSize:'0.88rem', color: hasApprovedOpcr ? '#10b981' : '#f59e0b' }}>
                                {hasApprovedOpcr ? 'OPCR Approved' : 'No Approved OPCR Yet'}
                            </div>
                            <div style={{ fontSize:'0.75rem', color:'var(--admin-text-muted)', marginTop:2 }}>
                                {hasApprovedOpcr
                                    ? 'The office has an approved OPCR. You may proceed with the accomplishment submission.'
                                    : 'The office must have an approved OPCR before submitting. Please ensure the OPCR has been approved by PMT first.'}
                            </div>
                        </div>
                    </div>
                    {hasApprovedOpcr ? (
                        <a href={`/dept-head/opcr/${approvedOpcrId}`}
                            style={{ padding:'0.4rem 0.9rem', borderRadius:8, border:'1px solid #10b981', background:'rgba(16,185,129,0.1)', color:'#10b981', textDecoration:'none', fontSize:'0.78rem', fontWeight:700, display:'flex', alignItems:'center', gap:5, flexShrink:0 }}>
                            <i className="bi bi-clipboard-check-fill" /> View OPCR
                        </a>
                    ) : (
                        <a href="/dept-head/opcr"
                            style={{ padding:'0.4rem 0.9rem', borderRadius:8, border:'1px solid rgba(245,158,11,0.4)', background:'rgba(245,158,11,0.08)', color:'#f59e0b', textDecoration:'none', fontSize:'0.78rem', fontWeight:700, display:'flex', alignItems:'center', gap:5, flexShrink:0 }}>
                            <i className="bi bi-arrow-right" /> Go to OPCR
                        </a>
                    )}
                </div>

                {/* Official rating — after PMT release */}
                {released && (
                    <div style={{ ...card, padding:'1.1rem 1.25rem', borderLeft:'3px solid #4ade80', background:'rgba(74,222,128,0.04)' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'1rem', flexWrap:'wrap' }}>
                            <ScoreRing score={parseFloat(submission.final_office_rating ?? 0)} size={80} />
                            <div>
                                <div style={lbl}>Official Office Rating</div>
                                <div style={{ fontWeight:800, fontSize:'1.1rem', color:adjColor(submission.final_office_rating) }}>{submission.final_adjectival_rating}</div>
                                <div style={{ fontSize:'0.7rem', color:'#4ade80', marginTop:4, display:'flex', alignItems:'center', gap:4 }}>
                                    <i className="bi bi-patch-check-fill" /> Officially Released by PMT
                                </div>
                                {submission.pmt_remarks && <div style={{ marginTop:6, fontSize:'0.72rem', color:'var(--admin-text-muted)', fontStyle:'italic' }}>"{submission.pmt_remarks}"</div>}
                            </div>
                        </div>
                    </div>
                )}

                {/* Projected score — visible before PMT release as long as at least one employee is approved */}
                {!released && projectedRating !== null && projectedRating !== undefined && (
                    <div style={{ ...card, padding:'1.1rem 1.25rem', borderLeft:'3px solid var(--admin-accent)', background:'rgba(59,130,246,0.03)' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'1rem', flexWrap:'wrap' }}>
                            <ScoreRing score={parseFloat(projectedRating)} size={80} />
                            <div>
                                <div style={lbl}>Projected Office Rating</div>
                                <div style={{ fontWeight:800, fontSize:'1.1rem', color:adjColor(projectedRating) }}>{adjLabel(projectedRating)}</div>
                                <div style={{ fontSize:'0.7rem', color:'var(--admin-text-muted)', marginTop:4, display:'flex', alignItems:'center', gap:4 }}>
                                    <i className="bi bi-info-circle" /> Based on {stats.approved} approved employee{stats.approved !== 1 ? 's' : ''} · Not yet official
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Summary cards */}
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:'0.75rem' }}>
                    <div style={{ ...card, padding:'1.1rem 1.25rem' }}>
                        <div style={lbl}>Employees Approved</div>
                        <div style={{ fontSize:'2rem', fontWeight:800, color:'var(--admin-text-primary)', lineHeight:1 }}>
                            {stats.approved} <span style={{ fontSize:'1.1rem', fontWeight:400, color:'var(--admin-text-muted)' }}>/ {stats.total}</span>
                        </div>
                        <div style={{ marginTop:'0.5rem', height:6, borderRadius:99, background:'var(--admin-border)', overflow:'hidden' }}>
                            <div style={{ height:'100%', width:`${pct}%`, background: pct===100 ? '#10b981' : 'var(--admin-accent)', borderRadius:99 }} />
                        </div>
                        <div style={{ fontSize:'0.68rem', color:'var(--admin-text-muted)', marginTop:4 }}>
                            {stats.total - stats.approved > 0 ? `${stats.total - stats.approved} pending approval` : 'All employees approved ✓'}
                        </div>
                    </div>
                </div>

                <div style={{ ...card, overflow:'hidden' }}>
                    <div style={{ padding:'0.85rem 1.25rem', borderBottom:'1px solid var(--admin-border)' }}>
                        <div style={{ fontWeight:700, fontSize:'0.9rem', color:'var(--admin-text-primary)', marginBottom:'0.65rem' }}>Employee Ratings</div>
                        <div style={{ display:'flex', gap:'0.5rem', alignItems:'center', flexWrap:'wrap' }}>
                            <div style={{ position:'relative', flex:'1 1 180px', minWidth:0 }}>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--admin-text-muted)" strokeWidth="2" style={{ position:'absolute', left:'0.6rem', top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employee…" style={{ width:'100%', paddingLeft:'2rem', paddingRight:'0.65rem', paddingTop:'0.4rem', paddingBottom:'0.4rem', borderRadius:8, border:'1px solid var(--admin-border-strong)', background:'var(--admin-bg-secondary)', color:'var(--admin-text-primary)', fontSize:'0.82rem', outline:'none', boxSizing:'border-box' }} />
                            </div>
                            <div style={{ display:'flex', gap:'0.3rem', flexShrink:0 }}>
                                {[['all','All'],['released_by_pmt','Released'],['approved','Approved'],['supervisor_endorsed','Pending'],['not_submitted','Not Submitted']].map(([val, label]) => (
                                    <button key={val} onClick={() => setStatusFilter(val)} style={{ padding:'0.38rem 0.65rem', borderRadius:7, border:`1px solid ${statusFilter===val?'var(--admin-accent)':'var(--admin-border-strong)'}`, background:statusFilter===val?'rgba(59,130,246,0.12)':'var(--admin-bg-secondary)', color:statusFilter===val?'var(--admin-accent)':'var(--admin-text-muted)', fontWeight:statusFilter===val?700:500, fontSize:'0.75rem', cursor:'pointer', whiteSpace:'nowrap' }}>{label}</button>
                                ))}
                            </div>
                        </div>
                    </div>
                    {/* Desktop table */}
                    <div style={{ overflowX:'auto', display:'none' }} className="desk-table">
                        <table style={{ width:'100%', borderCollapse:'collapse' }}>
                            <thead>
                                <tr style={{ background:'var(--admin-bg-secondary)' }}>
                                    {['Employee','Position','IPCR Score','Status',''].map(h => (
                                        <th key={h} style={{ padding:'0.5rem 1rem', fontSize:'0.62rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--admin-text-muted)', textAlign:'left', borderBottom:'1px solid var(--admin-border)', whiteSpace:'nowrap' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredEmployees.length === 0 ? (
                                    <tr><td colSpan={5} style={{ padding:'1.5rem', textAlign:'center', color:'var(--admin-text-muted)', fontSize:'0.85rem' }}>No employees match your filter.</td></tr>
                                ) : filteredEmployees.map(emp => {
                                    const canView = !!emp.submission_id;
                                    return (
                                        <tr key={emp.id}
                                            onClick={() => canView && router.visit(`/dept-head/accomplishment-review/${emp.submission_id}`)}
                                            style={{ borderBottom:'1px solid var(--admin-border)', cursor: canView ? 'pointer' : 'default', transition:'background 0.15s' }}
                                            onMouseEnter={e => canView && (e.currentTarget.style.background='var(--admin-bg-secondary)')}
                                            onMouseLeave={e => (e.currentTarget.style.background='')}>
                                            <td style={{ padding:'0.6rem 1rem' }}>
                                                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                                                    <img src={avatarSrc(emp.avatar)} alt={emp.name} onError={onAvatarError}
                                                        style={{ width:28, height:28, borderRadius:'50%', objectFit:'cover', flexShrink:0 }} />
                                                    <span style={{ fontWeight:600, fontSize:'0.85rem', color:'var(--admin-text-primary)' }}>{emp.name}</span>
                                                </div>
                                            </td>
                                            <td style={{ padding:'0.6rem 1rem', fontSize:'0.8rem', color:'var(--admin-text-muted)' }}>{emp.position}</td>
                                            <td style={{ padding:'0.6rem 1rem', fontSize:'0.9rem', fontWeight:700, color:adjColor(emp.system_score) }}>
                                                {emp.system_score ? Number(emp.system_score).toFixed(2) : '—'}
                                            </td>
                                            <td style={{ padding:'0.6rem 1rem' }}>
                                                {emp.released
                                                    ? <span style={{ fontSize:'0.62rem', fontWeight:700, padding:'2px 8px', borderRadius:99, background:'rgba(59,130,246,0.12)', color:'#60a5fa' }}>✓ Released</span>
                                                    : emp.approved
                                                        ? <span style={{ fontSize:'0.62rem', fontWeight:700, padding:'2px 8px', borderRadius:99, background:'rgba(74,222,128,0.12)', color:'#4ade80' }}>✓ Approved</span>
                                                        : emp.status === 'supervisor_endorsed'
                                                            ? <span style={{ fontSize:'0.62rem', fontWeight:700, padding:'2px 8px', borderRadius:99, background:'rgba(245,158,11,0.12)', color:'#f59e0b' }}>⏳ Pending</span>
                                                            : <span style={{ fontSize:'0.62rem', fontWeight:700, padding:'2px 8px', borderRadius:99, background:'rgba(100,116,139,0.12)', color:'var(--admin-text-muted)' }}>{emp.status === 'not_submitted' ? 'Not Submitted' : emp.status}</span>}
                                            </td>
                                            <td style={{ padding:'0.6rem 1rem', textAlign:'right' }}>
                                                {canView && <i className="bi bi-chevron-right" style={{ color:'var(--admin-text-muted)', fontSize:'0.75rem' }} />}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {/* Mobile cards */}
                    <div className="mob-list">
                        {filteredEmployees.length === 0 ? (
                            <div style={{ padding:'1.5rem', textAlign:'center', color:'var(--admin-text-muted)', fontSize:'0.85rem' }}>No employees match your filter.</div>
                        ) : filteredEmployees.map(emp => {
                            const canView = !!emp.submission_id;
                            return (
                                <div key={emp.id}
                                    onClick={() => canView && router.visit(`/dept-head/accomplishment-review/${emp.submission_id}`)}
                                    style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0.7rem 1rem', borderBottom:'1px solid var(--admin-border)', cursor: canView ? 'pointer' : 'default' }}>
                                    <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
                                        <img src={avatarSrc(emp.avatar)} alt={emp.name} onError={onAvatarError}
                                            style={{ width:32, height:32, borderRadius:'50%', objectFit:'cover', flexShrink:0 }} />
                                        <div>
                                            <div style={{ fontWeight:600, fontSize:'0.88rem', color:'var(--admin-text-primary)' }}>{emp.name}</div>
                                            <div style={{ fontSize:'0.72rem', marginTop:2, color: emp.released ? '#60a5fa' : emp.approved ? '#4ade80' : 'var(--admin-text-muted)' }}>
                                                {emp.released ? `Released · ${emp.system_score ? Number(emp.system_score).toFixed(2) : '—'}` : emp.approved ? `Approved · ${emp.system_score ? Number(emp.system_score).toFixed(2) : '—'}` : emp.status === 'supervisor_endorsed' ? 'Pending Approval' : 'Not Submitted'}
                                            </div>
                                        </div>
                                    </div>
                                    {canView && <i className="bi bi-chevron-right" style={{ color:'var(--admin-text-muted)', fontSize:'0.75rem', flexShrink:0 }} />}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Office OPCR Accomplishment */}
                <OpcraOfficeSection opcrSections={opcrSections} officialScore={submission?.final_office_rating ?? submission?.computed_office_rating} />

                {/* Submit / Released */}
                {released ? (
                    <div style={{ ...card, padding:'1.25rem', textAlign:'center', borderLeft:'3px solid #4ade80' }}>
                        <i className="bi bi-building-check" style={{ fontSize:'2rem', color:'#4ade80', display:'block', marginBottom:8 }} />
                        <div style={{ fontWeight:700, color:'#4ade80' }}>Officially Released</div>
                        <div style={{ fontSize:'0.82rem', color:'var(--admin-text-muted)', marginTop:4 }}>Your office accomplishment has been reviewed and released by PMT.</div>
                    </div>
                ) : (
                    <div style={{ ...card, padding:'1.25rem' }}>
                        <div style={{ fontWeight:700, fontSize:'0.9rem', color:'var(--admin-text-primary)', marginBottom:'1rem', display:'flex', alignItems:'center', gap:6 }}>
                            <i className="bi bi-send-check" style={{ color:'var(--admin-accent)' }} /> Submit
                        </div>

                        {/* Returned notice */}
                        {status === 'returned' && submission?.pmt_remarks && (
                            <div style={{ padding:'0.7rem 0.9rem', borderRadius:8, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', borderLeft:'3px solid #ef4444', marginBottom:'1rem' }}>
                                <div style={{ fontSize:'0.62rem', fontWeight:700, color:'#f87171', textTransform:'uppercase', marginBottom:3 }}>PMT Return Remarks</div>
                                <div style={{ fontSize:'0.82rem', color:'#f87171', fontStyle:'italic' }}>{submission.pmt_remarks}</div>
                            </div>
                        )}

                        <div style={{ marginBottom:'1rem' }}>
                            <div style={lbl}>Remarks <span style={{ fontWeight:400, textTransform:'none', letterSpacing:0 }}>(optional)</span></div>
                            <textarea rows={3} maxLength={2000} value={remarks} onChange={e => setRemarks(e.target.value)} disabled={locked}
                                placeholder="Add context for the PMT review..."
                                style={{ width:'100%', boxSizing:'border-box', padding:'0.65rem 0.9rem', background:'var(--admin-bg-secondary)', border:'1px solid var(--admin-border)', borderRadius:8, color:'var(--admin-text-primary)', fontSize:'0.85rem', outline:'none', resize:'vertical', fontFamily:'inherit', opacity: locked ? 0.6 : 1 }} />
                        </div>

                        {!locked && (
                            <label style={{ display:'flex', alignItems:'flex-start', gap:'0.75rem', cursor:'pointer', padding:'0.85rem 1rem', borderRadius:10, marginBottom:'1rem',
                                background: flagged ? 'rgba(167,139,250,0.08)' : 'var(--admin-bg-secondary)',
                                border:`1px solid ${flagged ? 'rgba(167,139,250,0.4)' : 'var(--admin-border)'}` }}>
                                <input type="checkbox" checked={flagged} onChange={e => setFlagged(e.target.checked)} style={{ marginTop:2, accentColor:'#a78bfa', flexShrink:0 }} />
                                <div>
                                    <div style={{ fontWeight:700, fontSize:'0.88rem', color: flagged ? '#a78bfa' : 'var(--admin-text-primary)', display:'flex', alignItems:'center', gap:5 }}>
                                        <i className="bi bi-flag-fill" style={{ fontSize:'0.78rem' }} /> Flag for PMT Calibration
                                    </div>
                                    <div style={{ fontSize:'0.72rem', color:'var(--admin-text-muted)', marginTop:3, lineHeight:1.5 }}>
                                        Request PMT to run a calibration session before releasing the office rating.
                                    </div>
                                </div>
                            </label>
                        )}

                        <div style={{ display:'flex', justifyContent:'flex-end' }}>
                            {locked ? (
                                <span style={{ fontSize:'0.82rem', color:'var(--admin-text-muted)', display:'flex', alignItems:'center', gap:6 }}>
                                    <i className="bi bi-clock-history" /> Submitted · Awaiting PMT Review
                                </span>
                            ) : (
                                <button onClick={() => handleSubmitClick()} disabled={!canSubmit}
                                    style={{ padding:'0.6rem 1.75rem', borderRadius:8, border:'none',
                                        background: canSubmit ? 'var(--admin-accent)' : 'var(--admin-bg-secondary)',
                                        color: canSubmit ? '#fff' : 'var(--admin-text-muted)',
                                        cursor: canSubmit ? 'pointer' : 'not-allowed',
                                        fontSize:'0.88rem', fontWeight:700, display:'flex', alignItems:'center', gap:6 }}>
                                    <i className="bi bi-send-fill" />
                                    {stats.approved === 0 ? 'No Approved Employees Yet' : 'Submit'}
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Warning modal — unapproved employees */}
            {warning && (
                <ValidationModal
                    title="Some Employees Have Pending Issues"
                    description={`${warning.length} employee(s) have not yet completed their accomplishment submission. Their scores will NOT be included in the office rating. You may notify their supervisor or proceed anyway.`}
                    items={warning}
                    onClose={() => setWarning(null)}
                    extra={
                        <button
                            onClick={() => { setWarning(null); setConfirm(true); }}
                            style={{ padding:'0.5rem 1.25rem', borderRadius:8, border:'none', background:'var(--admin-accent)', color:'#fff', fontSize:'0.85rem', fontWeight:700, cursor:'pointer', marginRight:'0.5rem' }}>
                            Proceed Anyway
                        </button>
                    }
                />
            )}

            {/* Confirm modal */}
            {confirm && (
                <>
                    <div onClick={() => setConfirm(false)} style={{ position:'fixed', inset:0, zIndex:1100, background:'rgba(0,0,0,0.55)' }} />
                    <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', zIndex:1101,
                        background:'var(--admin-card)', borderRadius:'var(--admin-radius)', border:'1px solid var(--admin-border-strong)',
                        boxShadow:'var(--admin-shadow)', width:'90%', maxWidth:420, padding:'1.5rem' }}>
                        <div style={{ width:52, height:52, borderRadius:'50%', background:'rgba(59,130,246,0.12)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 1rem' }}>
                            <i className="bi bi-send-fill" style={{ color:'var(--admin-accent)', fontSize:'1.25rem' }} />
                        </div>
                        <div style={{ textAlign:'center', fontWeight:700, fontSize:'1rem', color:'var(--admin-text-primary)', marginBottom:8 }}>Submit to PMT?</div>
                        <div style={{ textAlign:'center', fontSize:'0.85rem', color:'var(--admin-text-muted)', lineHeight:1.55, marginBottom:'1.25rem' }}>
                            This will submit your office's accomplishment report to PMT for review.
                            {flagged && <><br/><span style={{ color:'#a78bfa', fontWeight:600 }}>Flagged for PMT Calibration.</span></>}
                        </div>
                        <div style={{ display:'flex', gap:8 }}>
                            <button onClick={() => setConfirm(false)} style={{ flex:1, padding:'0.6rem', borderRadius:8, border:'1px solid var(--admin-border-strong)', background:'transparent', color:'var(--admin-text-primary)', cursor:'pointer', fontWeight:600, fontSize:'0.85rem' }}>Cancel</button>
                            <button onClick={doSubmit} disabled={saving} style={{ flex:1, padding:'0.6rem', borderRadius:8, border:'none', background:'var(--admin-accent)', color:'#fff', cursor: saving ? 'not-allowed' : 'pointer', fontWeight:700, fontSize:'0.85rem', opacity: saving ? 0.7 : 1 }}>
                                {saving ? 'Submitting…' : 'Confirm Submit'}
                            </button>
                        </div>
                    </div>
                </>
            )}

            <style>{`
                .desk-table { display: block !important; }
                .mob-list   { display: none !important; }
                @media (max-width: 767px) {
                    .desk-table { display: none !important; }
                    .mob-list   { display: block !important; }
                }
            `}</style>
        </AppLayout>
    );
}
