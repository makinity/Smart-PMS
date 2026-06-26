import { useState } from 'react';
import { usePage, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';

const adjColor = (r) => !r ? 'var(--admin-text-muted)' : r >= 4.5 ? '#10b981' : r >= 3.5 ? '#3b82f6' : r >= 2.5 ? '#f59e0b' : '#ef4444';
const STATUS_CFG = {
    submitted: { label: 'Pending Review', c: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    released:  { label: 'Released',       c: '#4ade80', bg: 'rgba(74,222,128,0.12)' },
    returned:  { label: 'Returned',       c: '#f87171', bg: 'rgba(239,68,68,0.12)' },
};
const FILTERS = [
    { key: 'all',       label: 'All' },
    { key: 'submitted', label: 'Pending' },
    { key: 'released',  label: 'Released' },
    { key: 'returned',  label: 'Returned' },
];
function relTime(iso) {
    if (!iso) return '—';
    const d = Math.floor((Date.now() - new Date(iso)) / 86400000);
    return d === 0 ? 'Today' : d === 1 ? 'Yesterday' : `${d}d ago`;
}

export default function Index() {
    const { submissions = [] } = usePage().props;
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');

    const filtered = submissions.filter(s => {
        const mf = filter === 'all' || s.status === filter;
        const q  = search.toLowerCase();
        return mf && (!q || s.office_name.toLowerCase().includes(q) || s.dept_head_name.toLowerCase().includes(q));
    });

    const flagged   = filtered.filter(s => s.dept_head_flagged_for_calibration && s.status === 'submitted');
    const standard  = filtered.filter(s => !s.dept_head_flagged_for_calibration && s.status === 'submitted');
    const processed = filtered.filter(s => s.status !== 'submitted');
    const pendingCount = submissions.filter(s => s.status === 'submitted').length;

    const card = { background:'var(--admin-card)', border:'1px solid var(--admin-border-strong)', borderRadius:'var(--admin-radius)', boxShadow:'var(--admin-shadow)' };

    function divider(label, count, color) {
        return (
            <div style={{ display:'flex', alignItems:'center', gap:8, margin:'0.75rem 0 0.5rem' }}>
                <div style={{ flex:1, height:1, background:'var(--admin-border)' }} />
                <span style={{ fontSize:'0.62rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'0.1em', color, whiteSpace:'nowrap' }}>{label} · {count}</span>
                <div style={{ flex:1, height:1, background:'var(--admin-border)' }} />
            </div>
        );
    }

    function Row({ s }) {
        const sc = STATUS_CFG[s.status] ?? { label: s.status, c:'#94a3b8', bg:'rgba(100,116,139,0.12)' };
        return (
            <div onClick={() => router.visit(`/pmt/opcr-accomplishment/${s.id}`)}
                style={{ display:'flex', alignItems:'center', gap:'0.75rem', padding:'0.85rem 1rem', borderRadius:10, cursor:'pointer', marginBottom:6,
                    background:'var(--admin-bg-secondary)', border:'1px solid var(--admin-border)',
                    borderLeft:`3px solid ${s.dept_head_flagged_for_calibration ? '#a78bfa' : sc.c}` }}
                onMouseEnter={e => e.currentTarget.style.background='rgba(59,130,246,0.05)'}
                onMouseLeave={e => e.currentTarget.style.background='var(--admin-bg-secondary)'}>
                <img src={s.dept_head_avatar} alt={s.dept_head_name}
                    style={{ width:36, height:36, borderRadius:'50%', objectFit:'cover', flexShrink:0 }} />
                <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:600, fontSize:'0.88rem', color:'var(--admin-text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {s.office_name}
                    </div>
                    <div style={{ fontSize:'0.72rem', color:'var(--admin-text-muted)', marginTop:2, display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                        {s.period} · {s.employee_stats.released}/{s.employee_stats.total} employees · {relTime(s.submitted_at)}
                        {s.dept_head_flagged_for_calibration && (
                            <span style={{ fontSize:'0.6rem', fontWeight:700, padding:'1px 6px', borderRadius:99, background:'rgba(167,139,250,0.15)', color:'#a78bfa' }}>
                                <i className="bi bi-flag-fill" style={{ marginRight:3 }} />Flagged
                            </span>
                        )}
                    </div>
                </div>
                {(s.final_office_rating || s.computed_office_rating) && (
                    <span style={{ fontSize:'0.72rem', fontWeight:700, color: adjColor(s.final_office_rating ?? s.computed_office_rating), flexShrink:0 }}>
                        {Number(s.final_office_rating ?? s.computed_office_rating).toFixed(2)}
                    </span>
                )}
                <span style={{ flexShrink:0, fontSize:'0.62rem', fontWeight:700, padding:'2px 8px', borderRadius:99, background:sc.bg, color:sc.c }}>{sc.label}</span>
                <i className="bi bi-chevron-right" style={{ color:'var(--admin-text-muted)', fontSize:'0.75rem', flexShrink:0 }} />
            </div>
        );
    }

    return (
        <AppLayout title="OPCR Accomplishment" description="Review and release office performance ratings">
            <div style={{ ...card, padding:'1.25rem' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem', flexWrap:'wrap', gap:8 }}>
                    <div>
                        <div style={{ fontWeight:700, fontSize:'1rem', color:'var(--admin-text-primary)' }}>Office Accomplishments</div>
                        <div style={{ fontSize:'0.72rem', color:'var(--admin-text-muted)', marginTop:2 }}>{pendingCount} pending review · {submissions.length} total</div>
                    </div>
                    {pendingCount > 0 && <span style={{ fontSize:'0.62rem', fontWeight:800, padding:'2px 10px', borderRadius:99, background:'#f59e0b', color:'#fff' }}>{pendingCount} TO REVIEW</span>}
                </div>

                <div style={{ position:'relative', marginBottom:'0.75rem' }}>
                    <i className="bi bi-search" style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', color:'var(--admin-text-muted)', fontSize:'0.78rem', pointerEvents:'none' }} />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by office or dept head…"
                        style={{ width:'100%', boxSizing:'border-box', padding:'0.42rem 0.75rem 0.42rem 2rem', background:'var(--admin-bg-secondary)', border:'1px solid var(--admin-border)', borderRadius:8, color:'var(--admin-text-primary)', fontSize:'0.78rem', outline:'none', fontFamily:'inherit' }} />
                </div>

                <div style={{ display:'flex', gap:4, marginBottom:'1rem', overflowX:'auto', scrollbarWidth:'none' }}>
                    {FILTERS.map(({ key, label }) => (
                        <button key={key} onClick={() => setFilter(key)} style={{ flexShrink:0, padding:'0.35rem 0.85rem', borderRadius:99, border:'1px solid', fontSize:'0.72rem', fontWeight:600, cursor:'pointer',
                            borderColor: filter===key ? 'var(--admin-accent)' : 'var(--admin-border)',
                            background: filter===key ? 'rgba(59,130,246,0.12)' : 'transparent',
                            color: filter===key ? 'var(--admin-accent)' : 'var(--admin-text-muted)' }}>{label}</button>
                    ))}
                </div>

                {filtered.length === 0 && (
                    <div style={{ padding:'3rem', textAlign:'center', color:'var(--admin-text-muted)', fontSize:'0.85rem' }}>
                        <i className="bi bi-building" style={{ fontSize:'2rem', display:'block', marginBottom:8 }} />No submissions found.
                    </div>
                )}

                {flagged.length > 0 && (
                    <>
                        {divider('Needs Calibration', flagged.length, '#a78bfa')}
                        <div style={{ padding:'0.75rem', borderRadius:10, background:'rgba(167,139,250,0.06)', border:'1px solid rgba(167,139,250,0.2)', marginBottom:'0.5rem' }}>
                            <div style={{ fontSize:'0.72rem', color:'#a78bfa', marginBottom:'0.5rem', display:'flex', alignItems:'center', gap:6 }}>
                                <i className="bi bi-flag-fill" />Flagged by Department Head for PMT calibration before release.
                            </div>
                            {flagged.map(s => <Row key={s.id} s={s} />)}
                        </div>
                    </>
                )}

                {standard.length > 0 && (
                    <>
                        {divider('Standard Review', standard.length, '#f59e0b')}
                        {standard.map(s => <Row key={s.id} s={s} />)}
                    </>
                )}

                {processed.length > 0 && (
                    <>
                        {divider('Processed', processed.length, '#94a3b8')}
                        {processed.map(s => <Row key={s.id} s={s} />)}
                    </>
                )}
            </div>
        </AppLayout>
    );
}
