import { useState, useEffect } from 'react';
import { usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { avatarSrc as resolveAvatar, onAvatarError } from '@/Components/defaultAvatar';

function useBreakpoint() {
    const [w, setW] = useState(() => typeof window !== 'undefined' ? window.innerWidth : 1200);
    useEffect(() => { const h = () => setW(window.innerWidth); window.addEventListener('resize', h); return () => window.removeEventListener('resize', h); }, []);
    return w >= 1024 ? 'desktop' : w >= 640 ? 'tablet' : 'mobile';
}

function StatusBadge({ status }) {
    const map = {
        submitted: { label: 'Submitted', bg: 'rgba(59,130,246,0.15)',  color: 'var(--admin-accent)', border: 'rgba(59,130,246,0.3)' },
        approved:  { label: 'Approved',  bg: 'rgba(74,222,128,0.15)', color: '#22c55e',             border: 'rgba(74,222,128,0.3)' },
        endorsed:  { label: 'Endorsed',  bg: 'rgba(59,130,246,0.15)', color: 'var(--admin-accent)',             border: 'rgba(59,130,246,0.3)' },
    };
    const c = map[status] ?? { label: status, bg: 'rgba(100,100,100,0.12)', color: 'var(--admin-text-muted)', border: 'rgba(100,100,100,0.2)' };
    return <span style={{ padding: '0.22rem 0.7rem', borderRadius: 99, fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>{c.label}</span>;
}

function Avatar({ name, src, size = 44 }) {
    return <img src={resolveAvatar(src)} alt={name} onError={onAvatarError} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid var(--admin-border)' }} />;
}

function ZeroOrValue({ v }) {
    return v ? <span>{v}</span> : <span style={{ color: 'var(--admin-text-muted)', opacity: 0.3 }}>0</span>;
}

function MporTable({ sections, grandQty, grandQualAvg, grandTimeAvg, grandQtyTotal }) {
    const W = [1,2,3,4];
    const th = { padding: '0.55rem 0.4rem', fontSize: '0.63rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--admin-text-muted)', textAlign: 'center', borderBottom: '1px solid var(--admin-border)', whiteSpace: 'nowrap' };
    const td = { padding: '0.5rem 0.4rem', textAlign: 'center', fontSize: '0.8rem', borderBottom: '1px solid var(--admin-border)' };
    const sticky = { position: 'sticky', left: 0, zIndex: 1 };
    return (
        <div style={{ overflowX: 'auto', borderRadius: 'var(--admin-radius)', border: '1px solid var(--admin-border-strong)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 880 }}>
                <thead>
                    <tr style={{ background: 'var(--admin-bg-secondary)' }}>
                        <th style={{ ...th, textAlign: 'left', minWidth: 220, ...sticky, background: 'var(--admin-bg-secondary)' }}>OUTPUT / TASK</th>
                        <th colSpan={5} style={{ ...th, color: 'var(--admin-accent)', borderLeft: '1px solid var(--admin-border)' }}>QUANTITY / EFFICIENCY</th>
                        <th colSpan={5} style={{ ...th, color: '#22c55e', borderLeft: '1px solid var(--admin-border)' }}>QUALITY / EFFECTIVENESS</th>
                        <th colSpan={5} style={{ ...th, color: '#f59e0b', borderLeft: '1px solid var(--admin-border)' }}>TIMELINESS</th>
                    </tr>
                    <tr style={{ background: 'var(--admin-bg-secondary)' }}>
                        <th style={{ ...th, textAlign: 'left', ...sticky, background: 'var(--admin-bg-secondary)' }}></th>
                        {[...W.map(w=>`W${w}`),'TOTAL',...W.map(w=>`W${w}`),'AVG',...W.map(w=>`W${w}`),'AVG'].map((h,i) => (
                            <th key={i} style={{ ...th, borderLeft: [0,5,10].includes(i)?'1px solid var(--admin-border)':undefined }}>{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {sections.map(sec => (
                        <>
                            <tr key={sec.key}><td colSpan={16} style={{ padding: '0.4rem 0.75rem', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--admin-text-muted)', textTransform: 'uppercase', background: 'var(--admin-bg-secondary)', ...sticky }}>{sec.label} ({sec.weight}%)</td></tr>
                            {sec.rows.length === 0 && <tr><td colSpan={16} style={{ ...td, color: 'var(--admin-text-muted)', fontSize: '0.75rem', fontStyle: 'italic', textAlign: 'left', paddingLeft: '1rem' }}>No rated entries.</td></tr>}
                            {sec.rows.map((row, ri) => (
                                <tr key={ri}>
                                    <td style={{ ...td, textAlign: 'left', fontWeight: 500, color: 'var(--admin-text-primary)', ...sticky, background: 'var(--admin-card)', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.title}</td>
                                    {W.map(w => <td key={w} style={{ ...td, borderLeft: w===1?'1px solid var(--admin-border)':undefined }}><ZeroOrValue v={row.qty[w]} /></td>)}
                                    <td style={{ ...td, fontWeight: 700, color: 'var(--admin-accent)' }}>{row.qty_total}</td>
                                    {W.map(w => <td key={w} style={{ ...td, borderLeft: w===1?'1px solid var(--admin-border)':undefined }}><ZeroOrValue v={row.quality[w]} /></td>)}
                                    <td style={{ ...td, fontWeight: 700, color: '#22c55e' }}>{row.qual_avg||'—'}</td>
                                    {W.map(w => <td key={w} style={{ ...td, borderLeft: w===1?'1px solid var(--admin-border)':undefined }}><ZeroOrValue v={row.timeliness[w]} /></td>)}
                                    <td style={{ ...td, fontWeight: 700, color: '#f59e0b' }}>{row.time_avg||'—'}</td>
                                </tr>
                            ))}
                        </>
                    ))}
                    <tr style={{ background: 'rgba(59,130,246,0.06)', borderTop: '2px solid var(--admin-accent)' }}>
                        <td style={{ padding: '0.5rem 0.4rem', textAlign: 'left', fontWeight: 700, fontSize: '0.72rem', color: 'var(--admin-accent)', textTransform: 'uppercase', position: 'sticky', left: 0, background: 'rgba(59,130,246,0.06)' }}>Grand Totals</td>
                        {W.map(w => <td key={w} style={{ padding: '0.5rem 0.4rem', textAlign: 'center', fontSize: '0.8rem', fontWeight: 600, borderLeft: w===1?'1px solid var(--admin-border)':undefined }}>{grandQty[w]||0}</td>)}
                        <td style={{ padding: '0.5rem 0.4rem', textAlign: 'center', fontWeight: 800, color: 'var(--admin-accent)', background: 'rgba(59,130,246,0.15)' }}>{grandQtyTotal}</td>
                        <td colSpan={4} style={{ padding: '0.5rem 0.4rem', textAlign: 'center', fontSize: '0.68rem', color: 'var(--admin-text-muted)', borderLeft: '1px solid var(--admin-border)' }}>Quality:</td>
                        <td style={{ padding: '0.5rem 0.4rem', textAlign: 'center', fontWeight: 700, color: '#22c55e' }}>{grandQualAvg||'—'}</td>
                        <td colSpan={4} style={{ padding: '0.5rem 0.4rem', textAlign: 'center', fontSize: '0.68rem', color: 'var(--admin-text-muted)', borderLeft: '1px solid var(--admin-border)' }}>Timeliness:</td>
                        <td style={{ padding: '0.5rem 0.4rem', textAlign: 'center', fontWeight: 700, color: '#f59e0b' }}>{grandTimeAvg||'—'}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}

function MobileCards({ sections, metric, setMetric }) {
    const mc = { qty: 'var(--admin-accent)', quality: '#22c55e', timeliness: '#f59e0b' };
    return (
        <>
            <div style={{ display: 'flex', borderBottom: '1px solid var(--admin-border)', marginBottom: '1rem' }}>
                {['qty','quality','timeliness'].map(m => (
                    <button key={m} onClick={() => setMetric(m)} style={{ flex: 1, padding: '0.6rem', background: 'none', border: 'none', borderBottom: metric===m?`2px solid var(--admin-accent)`:'2px solid transparent', cursor: 'pointer', fontSize: '0.78rem', fontWeight: metric===m?700:500, color: metric===m?'var(--admin-accent)':'var(--admin-text-muted)' }}>
                        {m==='qty'?'Quantity':m==='quality'?'Quality':'Timeliness'}
                    </button>
                ))}
            </div>
            {sections.map(sec => (
                <div key={sec.key}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--admin-text-muted)', textTransform: 'uppercase', margin: '0.5rem 0 0.35rem' }}>{sec.label} ({sec.weight}%)</div>
                    {sec.rows.length === 0 && <div style={{ padding: '0.75rem', fontSize: '0.78rem', color: 'var(--admin-text-muted)', fontStyle: 'italic', border: '1px dashed var(--admin-border)', borderRadius: 'var(--admin-radius)', marginBottom: '0.5rem' }}>No rated entries.</div>}
                    {sec.rows.map((row, i) => {
                        const data = metric==='qty'?row.qty:metric==='quality'?row.quality:row.timeliness;
                        const avg  = metric==='qty'?row.qty_total:metric==='quality'?row.qual_avg:row.time_avg;
                        const color = mc[metric];
                        return (
                            <div key={i} style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)', borderRadius: 'var(--admin-radius)', padding: '0.9rem 1rem', marginBottom: '0.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.65rem' }}>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--admin-text-primary)', flex: 1, marginRight: '0.5rem' }}>{row.title}</span>
                                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color, background: `${color}22`, border: `1px solid ${color}44`, borderRadius: 99, padding: '0.15rem 0.6rem', whiteSpace: 'nowrap' }}>{metric==='qty'?`Total: ${avg}`:`Avg: ${avg}`}</span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.4rem' }}>
                                    {[1,2,3,4].map(w => (
                                        <div key={w} style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: '0.63rem', color: 'var(--admin-text-muted)', marginBottom: '0.1rem' }}>W{w}</div>
                                            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: (data[w]||0)>0?'var(--admin-text-primary)':'var(--admin-text-muted)', opacity: (data[w]||0)>0?1:0.3 }}>{data[w]??0}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ))}
        </>
    );
}

export default function MporShow() {
    const { mpor, employee, sections, grandQty, grandQualAvg, grandTimeAvg, grandQtyTotal, backQ } = usePage().props;
    const bp = useBreakpoint();
    const [metric, setMetric] = useState('qty');
    const isMobile = bp === 'mobile';

    const monthLabel = (() => { try { return new Date(mpor.month+'-02').toLocaleDateString('en-US',{month:'long',year:'numeric'}); } catch { return mpor.month; } })();

    const timeline = [
        { label: 'Submitted', at: mpor.submitted_at, active: true },
        { label: 'Approved',    at: mpor.approved_at, active: ['approved'].includes(mpor.status) },
        { label: 'QAR Included', at: null,             active: !!mpor.in_qar },
    ];

    return (
        <AppLayout title={`QAR — ${employee?.name}`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

                {/* Header */}
                <div style={card}>
                    <div style={{ marginBottom: '1rem' }}>
                        <a href={`/dept-head/qar?q=${backQ ?? 1}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--admin-text-muted)', textDecoration: 'none', fontWeight: 600 }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
                            Back to QAR
                        </a>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                            <Avatar name={employee?.name} src={employee?.avatar} size={isMobile?44:52} />
                            <div>
                                <p style={statLabel}>QAR — MPOR Detail</p>
                                <h1 style={{ fontWeight: 700, fontSize: isMobile?'1.1rem':'1.3rem', color: 'var(--admin-text-primary)', lineHeight: 1.15 }}>{employee?.name}</h1>
                                <div style={{ fontSize: '0.78rem', color: 'var(--admin-text-muted)' }}>{employee?.position}</div>
                            </div>
                        </div>
                        <div style={{ padding: '0.2rem 0.6rem', borderRadius: 8, border: '1px solid var(--admin-border-strong)', background: 'var(--admin-bg-secondary)', fontSize: '0.78rem', fontWeight: 700, color: 'var(--admin-text-primary)', whiteSpace: 'nowrap', alignSelf: 'flex-start' }}>
                            {monthLabel}
                        </div>
                    </div>

                    {/* Timeline */}
                    <div style={{ display: 'flex', alignItems: 'center', marginTop: '1.25rem', overflowX: 'auto', paddingBottom: '0.1rem' }}>
                        {timeline.map((step, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: step.active?(i===2?'var(--admin-accent)':'var(--admin-accent)'):'var(--admin-bg-secondary)', border: `2px solid ${step.active?(i===2?'var(--admin-accent)':'var(--admin-accent)'):'var(--admin-border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        {step.active && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                                    </div>
                                    <div style={{ fontSize: '0.65rem', fontWeight: step.active?700:500, color: step.active?(i===2?'var(--admin-accent)':'var(--admin-accent)'):'var(--admin-text-muted)', marginTop: '0.3rem', textAlign: 'center', whiteSpace: 'nowrap' }}>{step.label}</div>
                                    {step.at && <div style={{ fontSize: '0.6rem', color: 'var(--admin-text-muted)', marginTop: '0.1rem', textAlign: 'center' }}>{step.at}</div>}
                                </div>
                                {i < timeline.length-1 && <div style={{ height: 2, flex: 1, background: timeline[i+1].active?'var(--admin-accent)':'var(--admin-border)', margin: '0 0.25rem', marginBottom: '1.5rem', minWidth: 20 }} />}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile?'1fr 1fr':'repeat(3,1fr)', gap: '0.65rem' }}>
                    <div style={card}><p style={statLabel}>Total Outputs</p><div style={{ fontSize: '1.7rem', fontWeight: 800, color: 'var(--admin-text-primary)', lineHeight: 1 }}>{grandQtyTotal}</div><div style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)', marginTop: '0.2rem' }}>Rated entries</div></div>
                    <div style={card}><p style={statLabel}>Quality Score</p><div style={{ fontSize: '1.7rem', fontWeight: 800, color: '#22c55e', lineHeight: 1 }}>{grandQualAvg||'—'}</div><div style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)', marginTop: '0.2rem' }}>Monthly avg</div></div>
                    <div style={{ ...card, gridColumn: isMobile?'span 2':'auto' }}><p style={statLabel}>Timeliness Score</p><div style={{ fontSize: '1.7rem', fontWeight: 800, color: '#f59e0b', lineHeight: 1 }}>{grandTimeAvg||'—'}</div><div style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)', marginTop: '0.2rem' }}>Monthly avg</div></div>
                </div>

                {/* Performance table */}
                <div style={card}>
                    <p style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--admin-text-primary)', marginBottom: '1rem' }}>Monthly Performance Records</p>
                    {grandQtyTotal === 0 ? (
                        <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--admin-text-muted)' }}>
                            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.25, margin: '0 auto 0.65rem', display: 'block' }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                            <p style={{ fontSize: '0.88rem' }}>No rated ORS entries for {monthLabel}.</p>
                        </div>
                    ) : isMobile ? (
                        <MobileCards sections={sections} metric={metric} setMetric={setMetric} />
                    ) : (
                        <MporTable sections={sections} grandQty={grandQty} grandQualAvg={grandQualAvg} grandTimeAvg={grandTimeAvg} grandQtyTotal={grandQtyTotal} />
                    )}
                </div>

                {/* Footer */}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile?'1fr':'1fr 1fr', gap: '0.65rem' }}>
                    <div style={card}>
                        <p style={statLabel}>Submitted By</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
                            <Avatar name={employee?.name} src={employee?.avatar} size={40} />
                            <div>
                                <div style={{ fontWeight: 700, color: 'var(--admin-text-primary)', fontSize: '0.88rem' }}>{employee?.name}</div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)' }}>{employee?.position}</div>
                                {mpor.submitted_at && <div style={{ fontSize: '0.7rem', color: 'var(--admin-accent)', marginTop: '0.1rem' }}>{mpor.submitted_at}</div>}
                            </div>
                        </div>
                    </div>
                    <div style={{ ...card, borderLeft: '3px solid var(--admin-accent)' }}>
                        <p style={statLabel}>Supervisor</p>
                        <div style={{ marginTop: '0.5rem' }}>
                            <div style={{ fontWeight: 600, fontSize: '0.88rem', color: mpor.approved_by ? 'var(--admin-text-primary)' : 'var(--admin-text-muted)', fontStyle: mpor.approved_by ? 'normal' : 'italic' }}>{mpor.approved_by ?? 'Pending'}</div>
                            {mpor.approved_at && <div style={{ fontSize: '0.7rem', color: '#22c55e', marginTop: '0.15rem' }}>✓ Approved {mpor.approved_at}</div>}
                            <div style={{ fontSize: '0.7rem', color: 'var(--admin-accent)', marginTop: '0.1rem' }}>↗ Included in QAR</div>
                        </div>
                    </div>
                </div>

            </div>
        </AppLayout>
    );
}

const card      = { background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)', borderRadius: 'var(--admin-radius)', padding: '1.25rem 1.5rem', boxShadow: 'var(--admin-shadow)' };
const statLabel = { fontSize: '0.72rem', fontWeight: 600, color: 'var(--admin-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.15rem' };
