import { useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { avatarSrc, onAvatarError } from '@/Components/defaultAvatar';

const adjColor = (r) => !r ? 'var(--admin-text-muted)' : r >= 4.5 ? '#10b981' : r >= 3.5 ? '#3b82f6' : r >= 2.5 ? '#f59e0b' : '#ef4444';
const adjLabel = (r) => !r ? '—' : r >= 4.5 ? 'Outstanding' : r >= 3.5 ? 'Very Satisfactory' : r >= 2.5 ? 'Satisfactory' : r >= 1.5 ? 'Unsatisfactory' : 'Poor';

const STATUS_CFG = {
    submitted: { label:'Pending PMT Review', c:'#f59e0b', bg:'rgba(245,158,11,0.12)' },
    released:  { label:'Released',           c:'#4ade80', bg:'rgba(74,222,128,0.12)' },
    returned:  { label:'Returned',           c:'#f87171', bg:'rgba(239,68,68,0.12)' },
};

function ScoreRing({ score, size = 80 }) {
    const r = size/2-6, circ = 2*Math.PI*r, color = adjColor(score);
    return (
        <div style={{ position:'relative', width:size, height:size, flexShrink:0 }}>
            <svg width={size} height={size} style={{ transform:'rotate(-90deg)' }}>
                <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--admin-border)" strokeWidth="5" />
                <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="5"
                    strokeDasharray={`${circ*Math.min((score/5)*100,100)/100} ${circ}`} strokeLinecap="round" />
            </svg>
            <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1rem', fontWeight:800, color }}>
                {score > 0 ? Number(score).toFixed(2) : '—'}
            </div>
        </div>
    );
}

function ReturnModal({ submissionId, onClose }) {
    const [remarks, setRemarks] = useState('');
    const [saving, setSaving]   = useState(false);
    function submit() {
        setSaving(true);
        router.post(`/pmt/opcr-accomplishment/${submissionId}/return`, { pmt_remarks: remarks }, {
            preserveScroll:true, onSuccess:() => { setSaving(false); onClose(); }, onError:() => setSaving(false),
        });
    }
    return (
        <>
            <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:1100, background:'rgba(0,0,0,0.5)' }} />
            <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', zIndex:1101,
                background:'var(--admin-card)', borderRadius:'var(--admin-radius)', border:'1px solid var(--admin-border-strong)',
                boxShadow:'var(--admin-shadow)', width:'90%', maxWidth:480 }}>
                <div style={{ padding:'1rem 1.25rem', borderBottom:'1px solid var(--admin-border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div style={{ fontWeight:700, fontSize:'0.95rem', color:'var(--admin-text-primary)' }}>Return to Dept Head</div>
                    <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--admin-text-muted)' }}><i className="bi bi-x-lg" /></button>
                </div>
                <div style={{ padding:'1rem 1.25rem' }}>
                    <div style={{ fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--admin-text-muted)', marginBottom:'0.5rem' }}>PMT Remarks <span style={{ color:'#ef4444' }}>*</span></div>
                    <textarea rows={4} maxLength={2000} value={remarks} onChange={e => setRemarks(e.target.value)}
                        placeholder="Explain why this submission is being returned..."
                        style={{ width:'100%', boxSizing:'border-box', padding:'0.65rem 0.9rem', background:'var(--admin-bg-secondary)',
                            border:`1px solid ${!remarks.trim()?'rgba(239,68,68,0.4)':'var(--admin-border)'}`,
                            borderRadius:8, color:'var(--admin-text-primary)', fontSize:'0.85rem', outline:'none', resize:'vertical', fontFamily:'inherit' }} />
                </div>
                <div style={{ padding:'0.75rem 1.25rem', borderTop:'1px solid var(--admin-border)', display:'flex', justifyContent:'space-between', gap:8 }}>
                    <button onClick={onClose} style={{ padding:'0.5rem 1.1rem', borderRadius:8, border:'1px solid var(--admin-border-strong)', background:'transparent', color:'var(--admin-text-primary)', cursor:'pointer', fontSize:'0.85rem', fontWeight:600 }}>Cancel</button>
                    <button onClick={submit} disabled={!remarks.trim()||saving} style={{ padding:'0.5rem 1.25rem', borderRadius:8, border:'none',
                        background:!remarks.trim()?'var(--admin-bg-secondary)':'#ef4444', color:!remarks.trim()?'var(--admin-text-muted)':'#fff',
                        cursor:!remarks.trim()||saving?'not-allowed':'pointer', fontSize:'0.85rem', fontWeight:700, display:'flex', alignItems:'center', gap:6 }}>
                        <i className="bi bi-arrow-counterclockwise" />{saving?'Returning…':'Return to Dept Head'}
                    </button>
                </div>
            </div>
        </>
    );
}

export default function Show() {
    const { submission, officeInfo, employees } = usePage().props;
    const [showReturn,    setShowReturn]    = useState(false);
    const [releasing,     setReleasing]     = useState(false);

    const status   = submission?.status;
    const sc       = STATUS_CFG[status] ?? { label:status, c:'#94a3b8', bg:'rgba(100,116,139,0.12)' };
    const canAct   = status === 'submitted';
    const released = status === 'released';

    function doRelease() {
        setReleasing(true);
        router.post(`/pmt/opcr-accomplishment/${submission.id}/release`, {}, {
            preserveScroll:true, onFinish:() => setReleasing(false),
        });
    }

    const card = { background:'var(--admin-card)', border:'1px solid var(--admin-border-strong)', borderRadius:'var(--admin-radius)', boxShadow:'var(--admin-shadow)' };
    const lbl  = { fontSize:'0.62rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--admin-text-muted)', marginBottom:'0.4rem' };

    return (
        <AppLayout title="OPCR Accomplishment" description={`${officeInfo.name} — ${officeInfo.period}`}>
            <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>

                {/* Header */}
                <div style={{ ...card, padding:'1.1rem 1.25rem' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:8, marginBottom:'0.5rem' }}>
                        <div>
                            <button onClick={() => router.visit('/pmt/opcr-accomplishment')} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--admin-text-muted)', fontSize:'0.82rem', padding:0, marginBottom:4, display:'flex', alignItems:'center', gap:4 }}>
                                <i className="bi bi-arrow-left" /> Back
                            </button>
                            <div style={{ fontWeight:700, fontSize:'1.05rem', color:'var(--admin-text-primary)' }}>{officeInfo.name}</div>
                            <div style={{ fontSize:'0.75rem', color:'var(--admin-text-muted)' }}>{officeInfo.period} · Dept Head: {officeInfo.dept_head}</div>
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                            {submission.dept_head_flagged_for_calibration && (
                                <span style={{ fontSize:'0.62rem', fontWeight:700, padding:'2px 8px', borderRadius:99, background:'rgba(167,139,250,0.15)', color:'#a78bfa' }}>
                                    <i className="bi bi-flag-fill" style={{ marginRight:3 }} />Flagged for Calibration
                                </span>
                            )}
                            <span style={{ padding:'3px 10px', borderRadius:99, fontSize:'0.68rem', fontWeight:700, background:sc.bg, color:sc.c }}>{sc.label}</span>
                        </div>
                    </div>
                    {/* 3-step pipeline */}
                    <div style={{ display:'flex', alignItems:'center', gap:0, marginTop:'0.75rem' }}>
                        {[['Draft','bi-pencil-square',true],['Submitted','bi-send',true],['Released','bi-award',released]].map(([label, icon, done], i) => (
                            <div key={label} style={{ display:'flex', alignItems:'center', flex:1 }}>
                                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, flex:1 }}>
                                    <div style={{ width:32, height:32, borderRadius:'50%',
                                        background: done ? 'var(--admin-accent)' : 'var(--admin-bg-secondary)',
                                        border:`2px solid ${done ? 'var(--admin-accent)' : 'var(--admin-border)'}`,
                                        display:'flex', alignItems:'center', justifyContent:'center',
                                        color: done ? '#fff' : 'var(--admin-text-muted)',
                                        boxShadow: i===1&&!released ? '0 0 0 4px rgba(59,130,246,0.2)' : 'none' }}>
                                        <i className={`bi ${done && i<2 ? 'bi-check-lg' : icon}`} style={{ fontSize:'0.78rem' }} />
                                    </div>
                                    <span style={{ fontSize:'0.58rem', fontWeight: (i===1&&!released)||(i===2&&released) ? 700 : 500, color: (i===1&&!released)||(i===2&&released) ? 'var(--admin-accent)' : 'var(--admin-text-muted)' }}>{label}</span>
                                </div>
                                {i < 2 && <div style={{ height:2, flex:0.5, background: done ? 'var(--admin-accent)' : 'var(--admin-border)', marginBottom:16 }} />}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Final rating — after release */}
                {released && (
                    <div style={{ ...card, padding:'1.1rem 1.25rem', borderLeft:'3px solid #4ade80', background:'rgba(74,222,128,0.04)' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'1rem', flexWrap:'wrap', justifyContent:'space-between' }}>
                            <div style={{ display:'flex', alignItems:'center', gap:'1rem' }}>
                                <ScoreRing score={parseFloat(submission.final_office_rating ?? 0)} />
                                <div>
                                    <div style={lbl}>Official Office Rating</div>
                                    <div style={{ fontWeight:800, fontSize:'1.1rem', color:adjColor(submission.final_office_rating) }}>{submission.final_adjectival_rating}</div>
                                    <div style={{ fontSize:'0.7rem', color:'#4ade80', marginTop:4, display:'flex', alignItems:'center', gap:4 }}>
                                        <i className="bi bi-patch-check-fill" /> Released by PMT
                                    </div>
                                </div>
                            </div>
                            {submission.pmt_remarks && (
                                <div style={{ flex:1, minWidth:200, padding:'0.75rem', borderRadius:8, background:'var(--admin-bg-secondary)', border:'1px solid var(--admin-border)', borderLeft:'3px solid #a78bfa' }}>
                                    <div style={{ fontSize:'0.62rem', fontWeight:700, color:'#a78bfa', textTransform:'uppercase', marginBottom:3 }}>PMT Calibration Remarks</div>
                                    <div style={{ fontSize:'0.82rem', color:'var(--admin-text-secondary)', fontStyle:'italic', lineHeight:1.55 }}>{submission.pmt_remarks}</div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Score + dept head remarks */}
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:'0.75rem' }}>
                    <div style={{ ...card, padding:'1.1rem 1.25rem', display:'flex', alignItems:'center', gap:'0.85rem' }}>
                        <ScoreRing score={parseFloat(submission.computed_office_rating ?? 0)} />
                        <div>
                            <div style={lbl}>Computed Office Rating</div>
                            <div style={{ fontWeight:700, fontSize:'0.95rem', color:'var(--admin-text-primary)' }}>{adjLabel(submission.computed_office_rating)}</div>
                            <div style={{ fontSize:'0.68rem', color:'var(--admin-text-muted)', marginTop:2 }}>Average of released employees</div>
                        </div>
                    </div>
                    {submission.dept_head_remarks && (
                        <div style={{ ...card, padding:'1.1rem 1.25rem', borderLeft:'3px solid #34d399' }}>
                            <div style={{ fontSize:'0.62rem', fontWeight:700, color:'#34d399', textTransform:'uppercase', marginBottom:6 }}>Dept Head Remarks</div>
                            <div style={{ fontSize:'0.85rem', color:'var(--admin-text-secondary)', fontStyle:'italic', lineHeight:1.55 }}>{submission.dept_head_remarks}</div>
                        </div>
                    )}
                </div>

                {/* Employee breakdown */}
                <div style={{ ...card, overflow:'hidden' }}>
                    <div style={{ padding:'0.85rem 1.25rem', borderBottom:'1px solid var(--admin-border)', fontWeight:700, fontSize:'0.9rem', color:'var(--admin-text-primary)' }}>
                        Employee Ratings Breakdown
                    </div>
                    {/* Desktop */}
                    <div style={{ overflowX:'auto' }} className="desk-table">
                        <table style={{ width:'100%', borderCollapse:'collapse' }}>
                            <thead>
                                <tr style={{ background:'var(--admin-bg-secondary)' }}>
                                    {['Employee','Position','System Score','Calibrated','Status',''].map(h => (
                                        <th key={h} style={{ padding:'0.5rem 1rem', fontSize:'0.62rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--admin-text-muted)', textAlign:'left', borderBottom:'1px solid var(--admin-border)', whiteSpace:'nowrap' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {employees.map(emp => {
                                    const canView = !!emp.submission_id;
                                    return (
                                        <tr key={emp.id}
                                            onClick={() => canView && router.visit(`/pmt/opcr-accomplishment/${submission.id}/employee/${emp.submission_id}`)}
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
                                            <td style={{ padding:'0.6rem 1rem', fontSize:'0.88rem', fontWeight:700, color:adjColor(emp.system_score) }}>
                                                {emp.system_score ? Number(emp.system_score).toFixed(2) : '—'}
                                            </td>
                                            <td style={{ padding:'0.6rem 1rem', fontSize:'0.88rem', fontWeight:700, color: emp.calibrated_rating ? '#a78bfa' : 'var(--admin-text-muted)' }}>
                                                {emp.calibrated_rating ? Number(emp.calibrated_rating).toFixed(2) : '—'}
                                                {emp.calibrated_rating && <span style={{ fontSize:'0.62rem', fontWeight:600, marginLeft:4, color:'#a78bfa' }}>calibrated</span>}
                                            </td>
                                            <td style={{ padding:'0.6rem 1rem' }}>
                                                {emp.approved
                                                    ? <span style={{ fontSize:'0.62rem', fontWeight:700, padding:'2px 8px', borderRadius:99, background:'rgba(74,222,128,0.12)', color:'#4ade80' }}>✓ Approved</span>
                                                    : <span style={{ fontSize:'0.62rem', fontWeight:700, padding:'2px 8px', borderRadius:99, background:'rgba(100,116,139,0.12)', color:'var(--admin-text-muted)' }}>
                                                        {emp.status === 'not_submitted' ? 'Not Submitted' : emp.status}
                                                    </span>}
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
                    {/* Mobile */}
                    <div className="mob-list">
                        {employees.map(emp => {
                            const canView = !!emp.submission_id;
                            return (
                                <div key={emp.id}
                                    onClick={() => canView && router.visit(`/pmt/opcr-accomplishment/${submission.id}/employee/${emp.submission_id}`)}
                                    style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0.7rem 1rem', borderBottom:'1px solid var(--admin-border)', cursor: canView ? 'pointer' : 'default' }}>
                                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                                        <img src={avatarSrc(emp.avatar)} alt={emp.name} onError={onAvatarError}
                                            style={{ width:32, height:32, borderRadius:'50%', objectFit:'cover', flexShrink:0 }} />
                                        <div>
                                            <div style={{ fontWeight:600, fontSize:'0.88rem', color:'var(--admin-text-primary)' }}>{emp.name}</div>
                                            <div style={{ fontSize:'0.72rem', marginTop:2, color: emp.calibrated_rating ? '#a78bfa' : emp.approved ? '#4ade80' : 'var(--admin-text-muted)' }}>
                                                {emp.calibrated_rating ? `Calibrated: ${Number(emp.calibrated_rating).toFixed(2)}` : emp.approved ? `System: ${emp.system_score ? Number(emp.system_score).toFixed(2) : '—'}` : 'Not Submitted'}
                                            </div>
                                        </div>
                                    </div>
                                    {canView && <i className="bi bi-chevron-right" style={{ color:'var(--admin-text-muted)', fontSize:'0.75rem', flexShrink:0 }} />}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Actions */}
                {canAct && (
                    <div style={{ display:'flex', justifyContent:'space-between', gap:'0.75rem', flexWrap:'wrap' }}>
                        <button onClick={() => setShowReturn(true)} style={{ padding:'0.6rem 1.25rem', borderRadius:8, border:'1px solid rgba(239,68,68,0.4)', background:'rgba(239,68,68,0.08)', color:'#f87171', cursor:'pointer', fontSize:'0.85rem', fontWeight:700, display:'flex', alignItems:'center', gap:6 }}>
                            <i className="bi bi-arrow-counterclockwise" /> Return
                        </button>
                        <button onClick={doRelease} disabled={releasing} style={{ padding:'0.6rem 1.5rem', borderRadius:8, border:'none', background:'var(--admin-accent)', color:'#fff', cursor: releasing?'not-allowed':'pointer', fontSize:'0.85rem', fontWeight:700, opacity: releasing?0.7:1, display:'flex', alignItems:'center', gap:6 }}>
                            <i className="bi bi-award-fill" />{releasing?'Releasing…':'Release'}
                        </button>
                    </div>
                )}
            </div>

            {showReturn    && <ReturnModal submissionId={submission.id} onClose={() => setShowReturn(false)} />}

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
