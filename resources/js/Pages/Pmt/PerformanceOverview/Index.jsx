import { useState, useMemo } from 'react';
import { usePage, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { avatarSrc as resolveAvatar, onAvatarError } from '@/Components/defaultAvatar';

const RATING_CFG = {
    'Outstanding':       { color: '#10b981', bg: 'rgba(16,185,129,0.12)',  icon: '🏆' },
    'Very Satisfactory': { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',  icon: '⭐' },
    'Satisfactory':      { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  icon: '✓'  },
    'Unsatisfactory':    { color: '#f97316', bg: 'rgba(249,115,22,0.12)',   icon: '⚠️' },
    'Poor':              { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',    icon: '🔴' },
};

const adjColor = r => RATING_CFG[r]?.color ?? 'var(--admin-text-muted)';

function ScoreRing({ score, rating, size = 52 }) {
    const r = size / 2 - 5, circ = 2 * Math.PI * r;
    const color = adjColor(rating);
    const pct = Math.min((score / 5) * 100, 100);
    return (
        <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
            <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
                <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--admin-border)" strokeWidth="4" />
                <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="4"
                    strokeDasharray={`${circ * pct / 100} ${circ}`} strokeLinecap="round" />
            </svg>
            <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:'0.72rem', fontWeight:800, color }}>
                {score.toFixed(2)}
            </div>
        </div>
    );
}

function Avatar({ name, avatar, size = 48 }) {
    return <img src={resolveAvatar(avatar)} alt={name} onError={onAvatarError}
        style={{ width:size, height:size, borderRadius:'50%', objectFit:'cover', flexShrink:0 }} />;
}

const TABS = [
    { key: '',                  label: 'All',               iconCls: null },
    { key: 'Outstanding',       label: 'Outstanding',       iconCls: 'bi-trophy-fill' },
    { key: 'Very Satisfactory', label: 'Very Satisfactory', iconCls: 'bi-star-fill' },
    { key: 'Satisfactory',      label: 'Satisfactory',      iconCls: 'bi-check-lg' },
    { key: 'Unsatisfactory',    label: 'Unsatisfactory',    iconCls: 'bi-exclamation-triangle-fill' },
    { key: 'Poor',              label: 'Poor',              iconCls: 'bi-x-circle-fill' },
];

export default function Index() {
    const { performers, counts, search: initSearch, rating: initRating, period } = usePage().props;
    const [search, setSearch] = useState(initSearch ?? '');
    const [rating, setRating] = useState(initRating ?? '');

    const filtered = useMemo(() => {
        const s = search.toLowerCase();
        return performers.filter(p => {
            const matchRating = !rating || p.rating === rating;
            const matchSearch = !s || p.name.toLowerCase().includes(s)
                || p.position.toLowerCase().includes(s)
                || p.office.toLowerCase().includes(s);
            return matchRating && matchSearch;
        });
    }, [performers, search, rating]);

    const card = {
        background: 'var(--admin-card)',
        border: '1px solid var(--admin-border-strong)',
        borderRadius: 'var(--admin-radius)',
        boxShadow: 'var(--admin-shadow)',
    };

    function handleCardClick(p) {
        if (p.is_low) {
            router.visit(`/pmt/development-planning/${p.ipcr_id}`);
        } else {
            router.visit(`/pmt/top-performers/${p.user_id}`);
        }
    }

    return (
        <AppLayout title="Performance Overview" description={period?.name}>
            <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>

                {/* Search */}
                <div style={{ ...card, padding:'0.6rem 1rem', display:'flex', alignItems:'center', gap:'0.6rem' }}>
                    <i className="bi bi-search" style={{ color:'var(--admin-text-muted)', fontSize:'0.9rem', flexShrink:0 }} />
                    <input value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search by name, position, or office..."
                        style={{ flex:1, border:'none', outline:'none', background:'transparent', fontSize:'0.9rem', color:'var(--admin-text-primary)' }} />
                    {search && <button onClick={() => setSearch('')}
                        style={{ border:'none', background:'none', cursor:'pointer', color:'var(--admin-text-muted)', fontSize:'1rem' }}>×</button>}
                </div>

                {/* Filter tabs */}
                <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap' }}>
                    {TABS.map(t => {
                        const active = rating === t.key;
                        const cfg = RATING_CFG[t.key] ?? { color:'var(--admin-accent)', bg:'rgba(59,130,246,0.12)' };
                        const count = t.key === '' ? counts.all : (counts[t.key] ?? 0);
                        return (
                            <button key={t.key} onClick={() => setRating(t.key)}
                                style={{ padding:'0.45rem 1rem', borderRadius:99,
                                    border: active ? `1.5px solid ${cfg.color}` : '1.5px solid var(--admin-border)',
                                    background: active ? cfg.bg : 'var(--admin-card)',
                                    color: active ? cfg.color : 'var(--admin-text-muted)',
                                    cursor:'pointer', fontSize:'0.8rem', fontWeight: active ? 700 : 500,
                                    display:'flex', alignItems:'center', gap:'0.4rem', transition:'all 0.15s' }}>
                                {t.iconCls && <i className={`bi ${t.iconCls}`} style={{ fontSize:'0.75rem' }} />}
                                {t.label}
                                <span style={{ fontSize:'0.7rem', fontWeight:700, padding:'1px 6px', borderRadius:99,
                                    background: active ? cfg.color : 'var(--admin-bg-secondary)',
                                    color: active ? '#fff' : 'var(--admin-text-muted)' }}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Results count */}
                <div style={{ fontSize:'0.75rem', color:'var(--admin-text-muted)' }}>
                    Showing {filtered.length} employee{filtered.length !== 1 ? 's' : ''}
                    {period ? ` · ${period.name}` : ''}
                </div>

                {/* Cards */}
                {filtered.length === 0 ? (
                    <div style={{ ...card, padding:'3rem', textAlign:'center', color:'var(--admin-text-muted)' }}>
                        <i className="bi bi-person-x" style={{ fontSize:'2rem', display:'block', marginBottom:8 }} />
                        No employees found{search ? ` for "${search}"` : ''}.
                    </div>
                ) : (
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:'0.85rem' }}>
                        {filtered.map((p, i) => {
                            const cfg = RATING_CFG[p.rating] ?? { color:'var(--admin-accent)', bg:'transparent' };
                            return (
                                <div key={p.ipcr_id}
                                    onClick={() => handleCardClick(p)}
                                    style={{ ...card, padding:'1.1rem', borderLeft:`4px solid ${cfg.color}`, cursor:'pointer',
                                        transition:'box-shadow 0.15s, transform 0.15s', position:'relative' }}
                                    onMouseEnter={e => { e.currentTarget.style.boxShadow='0 4px 20px rgba(0,0,0,0.12)'; e.currentTarget.style.transform='translateY(-2px)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.boxShadow='var(--admin-shadow)'; e.currentTarget.style.transform=''; }}>

                                    {/* Rank badge */}
                                    <div style={{ position:'absolute', top:10, right:10, fontSize:'0.62rem', fontWeight:700,
                                        padding:'2px 7px', borderRadius:99, background:cfg.bg, color:cfg.color }}>
                                        #{i + 1}
                                    </div>

                                    {/* Avatar + name */}
                                    <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', marginBottom:'0.85rem' }}>
                                        <Avatar name={p.name} avatar={p.avatar} size={48} />
                                        <div style={{ minWidth:0 }}>
                                            <div style={{ fontWeight:700, fontSize:'0.9rem', color:'var(--admin-text-primary)',
                                                whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{p.name}</div>
                                            <div style={{ fontSize:'0.72rem', color:'var(--admin-text-muted)', marginTop:1,
                                                whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{p.position}</div>
                                        </div>
                                    </div>

                                    {/* Office */}
                                    <div style={{ fontSize:'0.72rem', color:'var(--admin-text-muted)', marginBottom:'0.85rem',
                                        display:'flex', alignItems:'center', gap:4 }}>
                                        <i className="bi bi-building" style={{ flexShrink:0 }} /> {p.office}
                                    </div>

                                    {/* Score + rating */}
                                    <div style={{ display:'flex', alignItems:'center', gap:'0.75rem',
                                        paddingTop:'0.75rem', borderTop:'1px solid var(--admin-border)' }}>
                                        <ScoreRing score={p.score} rating={p.rating} size={52} />
                                        <div style={{ flex:1, minWidth:0 }}>
                                            <div style={{ fontSize:'0.62rem', fontWeight:700, textTransform:'uppercase',
                                                letterSpacing:'0.06em', color:'var(--admin-text-muted)' }}>Performance Score</div>
                                            <div style={{ fontWeight:800, fontSize:'0.88rem', color:cfg.color, marginTop:2 }}>
                                                {cfg.icon} {p.rating}
                                            </div>
                                        </div>
                                        {p.plan_status && (
                                            <span style={{ fontSize:'0.6rem', fontWeight:700, padding:'2px 8px', borderRadius:99, flexShrink:0,
                                                background: p.plan_status === 'submitted_to_ld' ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
                                                color: p.plan_status === 'submitted_to_ld' ? '#10b981' : '#f59e0b' }}>
                                                {p.plan_status_label}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
