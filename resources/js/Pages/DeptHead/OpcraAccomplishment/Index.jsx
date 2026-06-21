import { useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { avatarSrc, onAvatarError } from '@/Components/defaultAvatar';

const adjColor = (r) => !r ? 'var(--admin-text-muted)' : r >= 4.5 ? '#10b981' : r >= 3.5 ? '#3b82f6' : r >= 2.5 ? '#f59e0b' : '#ef4444';
const adjLabel = (r) => !r ? '—' : r >= 4.5 ? 'Outstanding' : r >= 3.5 ? 'Very Satisfactory' : r >= 2.5 ? 'Satisfactory' : r >= 1.5 ? 'Unsatisfactory' : 'Poor';

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
                {score > 0 ? Number(score).toFixed(2) : '—'}
            </div>
        </div>
    );
}

export default function Index() {
    const { period, submission, employees, stats, hasApprovedOpcr, approvedOpcrId } = usePage().props;
    const [remarks, setRemarks]   = useState(submission?.dept_head_remarks ?? '');
    const [flagged, setFlagged]   = useState(submission?.flagged_for_calibration ?? false);
    const [confirm, setConfirm]   = useState(false);
    const [saving, setSaving]     = useState(false);
    const [selectedEmp, setSelectedEmp] = useState(null);

    const status   = submission?.status ?? 'draft';
    const sc       = STATUS_CFG[status] ?? STATUS_CFG.draft;
    const locked   = submission && !['draft','returned'].includes(status);
    const released = status === 'released';
    const canSubmit = !locked && stats.released > 0 && !!period && hasApprovedOpcr;
    const pct      = stats.total > 0 ? Math.round((stats.released / stats.total) * 100) : 0;

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

    function resetForReview() {
        if (!window.confirm('Reset this OPCR accomplishment to PMT review? This clears the released state.')) return;
        router.post('/dept-head/opcr-accomplishment/reset', {}, { preserveScroll: true });
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
                            <button type="button"
                                onClick={resetForReview}
                                style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'0.45rem 0.9rem', borderRadius:6, border:'1px solid #ef4444', background:'rgba(239,68,68,0.08)', color:'#ef4444', fontSize:'0.8rem', fontWeight:600 }}>
                                <i className="bi bi-arrow-counterclockwise" /> Reset for PMT Review
                            </button>
                        )}
                        {released && (
                            <a href="/dept-head/opcr-accomplishment/export"
                               style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'0.45rem 0.9rem', borderRadius:6, background:'#16a34a', color:'#fff', fontSize:'0.8rem', fontWeight:600, textDecoration:'none' }}>
                                <i className="bi bi-file-earmark-excel" /> Export Official OPCR
                            </a>
                        )}
                        <span style={{ padding:'3px 12px', borderRadius:99, fontSize:'0.68rem', fontWeight:700, background:sc.bg, color:sc.c }}>{sc.label}</span>
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

                {/* Official rating — after release */}
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

                {/* Summary cards */}
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:'0.75rem' }}>
                    <div style={{ ...card, padding:'1.1rem 1.25rem' }}>
                        <div style={lbl}>Employees Released</div>
                        <div style={{ fontSize:'2rem', fontWeight:800, color:'var(--admin-text-primary)', lineHeight:1 }}>
                            {stats.released} <span style={{ fontSize:'1.1rem', fontWeight:400, color:'var(--admin-text-muted)' }}>/ {stats.total}</span>
                        </div>
                        <div style={{ marginTop:'0.5rem', height:6, borderRadius:99, background:'var(--admin-border)', overflow:'hidden' }}>
                            <div style={{ height:'100%', width:`${pct}%`, background: pct===100 ? '#10b981' : 'var(--admin-accent)', borderRadius:99 }} />
                        </div>
                        <div style={{ fontSize:'0.68rem', color:'var(--admin-text-muted)', marginTop:4 }}>
                            {stats.total - stats.released > 0 ? `${stats.total - stats.released} pending PMT review` : 'All employees released ✓'}
                        </div>
                    </div>
                </div>

                {/* Employee list */}
                <div style={{ ...card, overflow:'hidden' }}>
                    <div style={{ padding:'0.85rem 1.25rem', borderBottom:'1px solid var(--admin-border)', fontWeight:700, fontSize:'0.9rem', color:'var(--admin-text-primary)' }}>
                        Employee Ratings
                    </div>
                    {/* Desktop table */}
                    <div style={{ overflowX:'auto', display:'none' }} className="desk-table">
                        <table style={{ width:'100%', borderCollapse:'collapse' }}>
                            <thead>
                                <tr style={{ background:'var(--admin-bg-secondary)' }}>
                                    {['Employee','Position','Rating','Adjectival','Status'].map(h => (
                                        <th key={h} style={{ padding:'0.5rem 1rem', fontSize:'0.62rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--admin-text-muted)', textAlign:'left', borderBottom:'1px solid var(--admin-border)', whiteSpace:'nowrap' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {employees.map(emp => (
                                    <tr key={emp.id} onClick={() => setSelectedEmp(emp)}
                                        style={{ borderBottom:'1px solid var(--admin-border)', cursor:'pointer', transition:'background 0.15s' }}
                                        onMouseEnter={e => e.currentTarget.style.background='var(--admin-bg-secondary)'}
                                        onMouseLeave={e => e.currentTarget.style.background=''}>
                                        <td style={{ padding:'0.6rem 1rem' }}>
                                            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                                                <img src={avatarSrc(emp.avatar)} alt={emp.name} onError={onAvatarError}
                                                    style={{ width:28, height:28, borderRadius:'50%', objectFit:'cover', flexShrink:0 }} />
                                                <span style={{ fontWeight:600, fontSize:'0.85rem', color:'var(--admin-text-primary)' }}>{emp.name}</span>
                                            </div>
                                        </td>
                                        <td style={{ padding:'0.6rem 1rem', fontSize:'0.8rem', color:'var(--admin-text-muted)' }}>{emp.position}</td>
                                        <td style={{ padding:'0.6rem 1rem', fontSize:'0.9rem', fontWeight:700, color:adjColor(emp.final_rating) }}>{emp.final_rating ? Number(emp.final_rating).toFixed(2) : '—'}</td>
                                        <td style={{ padding:'0.6rem 1rem', fontSize:'0.8rem', fontWeight:600, color:adjColor(emp.final_rating) }}>{emp.adjectival ?? '—'}</td>
                                        <td style={{ padding:'0.6rem 1rem' }}>
                                            {emp.released
                                                ? <span style={{ fontSize:'0.62rem', fontWeight:700, padding:'2px 8px', borderRadius:99, background:'rgba(74,222,128,0.12)', color:'#4ade80' }}>✓ Released</span>
                                                : <span style={{ fontSize:'0.62rem', fontWeight:700, padding:'2px 8px', borderRadius:99, background:'rgba(245,158,11,0.12)', color:'#f59e0b' }}>⏳ Pending</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {/* Mobile cards */}
                    <div className="mob-list">
                        {employees.map(emp => (
                            <div key={emp.id} onClick={() => setSelectedEmp(emp)}
                                style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0.7rem 1rem', borderBottom:'1px solid var(--admin-border)', cursor:'pointer' }}>
                                <div>
                                    <div style={{ fontWeight:600, fontSize:'0.88rem', color:'var(--admin-text-primary)' }}>{emp.name}</div>
                                    <div style={{ fontSize:'0.72rem', marginTop:2, color: emp.released ? adjColor(emp.final_rating) : 'var(--admin-text-muted)' }}>
                                        {emp.released ? `${Number(emp.final_rating).toFixed(2)} · ${emp.adjectival}` : 'Not yet released'}
                                    </div>
                                </div>
                                {emp.released
                                    ? <span style={{ fontSize:'0.62rem', fontWeight:700, padding:'2px 7px', borderRadius:99, background:'rgba(74,222,128,0.12)', color:'#4ade80' }}>Released</span>
                                    : <span style={{ fontSize:'0.62rem', fontWeight:700, padding:'2px 7px', borderRadius:99, background:'rgba(245,158,11,0.12)', color:'#f59e0b' }}>Pending</span>}
                            </div>
                        ))}
                    </div>
                </div>

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
                            <i className="bi bi-send-check" style={{ color:'var(--admin-accent)' }} /> Submit OPCR Accomplishment
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
                                <button onClick={() => canSubmit && setConfirm(true)} disabled={!canSubmit}
                                    style={{ padding:'0.6rem 1.75rem', borderRadius:8, border:'none',
                                        background: canSubmit ? 'var(--admin-accent)' : 'var(--admin-bg-secondary)',
                                        color: canSubmit ? '#fff' : 'var(--admin-text-muted)',
                                        cursor: canSubmit ? 'pointer' : 'not-allowed',
                                        fontSize:'0.88rem', fontWeight:700, display:'flex', alignItems:'center', gap:6 }}>
                                    <i className="bi bi-send-fill" />
                                    {stats.released === 0 ? 'No Released Employees Yet' : 'Submit to PMT'}
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

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
                        <div style={{ textAlign:'center', fontWeight:700, fontSize:'1rem', color:'var(--admin-text-primary)', marginBottom:8 }}>Submit OPCR Accomplishment?</div>
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

            {/* Employee Detail Modal */}
            {selectedEmp && (
                <>
                    <div onClick={() => setSelectedEmp(null)} style={{ position:'fixed', inset:0, zIndex:1200, background:'rgba(0,0,0,0.55)' }} />
                    <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', zIndex:1201,
                        background:'var(--admin-card)', borderRadius:'var(--admin-radius)', border:'1px solid var(--admin-border-strong)',
                        boxShadow:'var(--admin-shadow)', width:'90%', maxWidth:420, padding:'1.75rem' }}>
                        {/* Close */}
                        <button onClick={() => setSelectedEmp(null)} style={{ position:'absolute', top:12, right:14, background:'none', border:'none', fontSize:'1.2rem', cursor:'pointer', color:'var(--admin-text-muted)' }}>×</button>

                        {/* Profile */}
                        <div style={{ display:'flex', alignItems:'center', gap:'1rem', marginBottom:'1.5rem' }}>
                            <img src={avatarSrc(selectedEmp.avatar)} alt={selectedEmp.name} onError={onAvatarError}
                                style={{ width:64, height:64, borderRadius:'50%', objectFit:'cover', flexShrink:0 }} />
                            <div>
                                <div style={{ fontWeight:800, fontSize:'1rem', color:'var(--admin-text-primary)' }}>{selectedEmp.name}</div>
                                <div style={{ fontSize:'0.78rem', color:'var(--admin-text-muted)', marginTop:2 }}>{selectedEmp.position}</div>
                                <div style={{ marginTop:5 }}>
                                    {selectedEmp.released
                                        ? <span style={{ fontSize:'0.62rem', fontWeight:700, padding:'2px 8px', borderRadius:99, background:'rgba(74,222,128,0.12)', color:'#4ade80' }}>✓ Released</span>
                                        : <span style={{ fontSize:'0.62rem', fontWeight:700, padding:'2px 8px', borderRadius:99, background:'rgba(245,158,11,0.12)', color:'#f59e0b' }}>⏳ Pending</span>}
                                </div>
                            </div>
                        </div>

                        {/* Scores */}
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem' }}>
                            {/* System Score */}
                            <div style={{ padding:'1rem', borderRadius:10, background:'var(--admin-bg-secondary)', border:'1px solid var(--admin-border)', textAlign:'center' }}>
                                <div style={{ fontSize:'0.6rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--admin-text-muted)', marginBottom:8 }}>System Score</div>
                                <ScoreRing score={selectedEmp.system_score ?? 0} size={72} />
                                <div style={{ marginTop:6, fontSize:'0.75rem', fontWeight:600, color:adjColor(selectedEmp.system_score) }}>{adjLabel(selectedEmp.system_score)}</div>
                            </div>
                            {/* PMT Final Rating */}
                            <div style={{ padding:'1rem', borderRadius:10, background:'var(--admin-bg-secondary)', border:'1px solid var(--admin-border)', textAlign:'center' }}>
                                <div style={{ fontSize:'0.6rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--admin-text-muted)', marginBottom:8 }}>PMT Final Rating</div>
                                <ScoreRing score={selectedEmp.final_rating ?? 0} size={72} />
                                <div style={{ marginTop:6, fontSize:'0.75rem', fontWeight:600, color:adjColor(selectedEmp.final_rating) }}>{selectedEmp.adjectival ?? (selectedEmp.released ? '—' : 'Not yet released')}</div>
                            </div>
                        </div>

                        {/* PMT Remarks */}
                        {selectedEmp.pmt_remarks && (
                            <div style={{ marginTop:'0.75rem', padding:'0.75rem', borderRadius:8, background:'rgba(59,130,246,0.06)', border:'1px solid rgba(59,130,246,0.2)', borderLeft:'3px solid var(--admin-accent)' }}>
                                <div style={{ fontSize:'0.6rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--admin-accent)', marginBottom:4 }}>PMT Remarks</div>
                                <div style={{ fontSize:'0.82rem', color:'var(--admin-text-primary)', lineHeight:1.5, fontStyle:'italic' }}>"{selectedEmp.pmt_remarks}"</div>
                            </div>
                        )}
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
