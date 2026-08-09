import { useState, useMemo } from 'react';
import { usePage, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { avatarSrc as resolveAvatar, onAvatarError } from '@/Components/defaultAvatar';
import PeriodSelector from '@/Components/PeriodSelector';

const RATING_CFG = {
    'Outstanding':       { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',  icon: '🏆' },
    'Very Satisfactory': { color: '#10b981', bg: 'rgba(16,185,129,0.12)',  icon: '⭐' },
    'Satisfactory':      { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  icon: '✓'  },
    'Unsatisfactory':    { color: '#eab308', bg: 'rgba(234,179,8,0.12)',    icon: '⚠️' },
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
    { key: 'top',               label: 'Top Employees',     iconCls: 'bi-award-fill' },
    { key: 'Outstanding',       label: 'Outstanding',       iconCls: 'bi-trophy-fill' },
    { key: 'Very Satisfactory', label: 'Very Satisfactory', iconCls: 'bi-star-fill' },
    { key: 'Satisfactory',      label: 'Satisfactory',      iconCls: 'bi-check-lg' },
    { key: 'Unsatisfactory',    label: 'Unsatisfactory',    iconCls: 'bi-exclamation-triangle-fill' },
    { key: 'Poor',              label: 'Poor',              iconCls: 'bi-x-circle-fill' },
];

export default function Index() {
    const { performers, counts, search: initSearch, rating: initRating, period, allPeriods } = usePage().props;
    const [search, setSearch] = useState(initSearch ?? '');
    const [rating, setRating] = useState(initRating ?? '');
    const [exporting, setExporting] = useState(false);
    const isPastPeriod = period && !period.is_active;

    const filtered = useMemo(() => {
        const s = search.toLowerCase();
        const TOP_RATINGS = ['Outstanding', 'Very Satisfactory'];
        return performers.filter(p => {
            const matchRating = !rating
                || (rating === 'top' ? TOP_RATINGS.includes(p.rating) : p.rating === rating);
            const matchSearch = !s || p.name.toLowerCase().includes(s)
                || p.position.toLowerCase().includes(s)
                || p.office.toLowerCase().includes(s);
            return matchRating && matchSearch;
        });
    }, [performers, search, rating]);

    const topCount = (counts['Outstanding'] ?? 0) + (counts['Very Satisfactory'] ?? 0);

    function handleExport() {
        setExporting(true);
        window.location.href = '/pmt/performance-overview/export-top-employees';
        setTimeout(() => setExporting(false), 3000);
    }

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

                {/* Top bar: Export button + Period selector */}
                <div style={{ display:'flex', justifyContent:'flex-end', alignItems:'center', gap:'0.5rem' }}>
                    <button
                        onClick={handleExport}
                        disabled={exporting}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.4rem',
                            padding: '0.42rem 1rem',
                            background: exporting ? 'rgba(16,185,129,0.6)' : '#10b981',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 8,
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: exporting ? 'not-allowed' : 'pointer',
                            boxShadow: '0 1px 4px rgba(16,185,129,0.25)',
                            transition: 'background 0.15s',
                            fontFamily: 'inherit',
                        }}
                        title={`Export Outstanding & Very Satisfactory employees to Excel`}
                    >
                        <i className={exporting ? 'bi bi-hourglass-split' : 'bi bi-file-earmark-excel-fill'} style={{ fontSize: '0.85rem' }} />
                        {exporting ? 'Preparing…' : `Export Top Employees${topCount > 0 ? ` (${topCount})` : ''}`}
                    </button>
                    <PeriodSelector period={period} allPeriods={allPeriods} route="/pmt/performance-overview" />
                </div>

                {/* Search + Filter container */}
                <div style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)', borderRadius: 'var(--admin-radius)', boxShadow: 'var(--admin-shadow)', padding: '1rem 1.25rem' }}>
                    {/* Search */}
                    <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
                        <i className="bi bi-search" style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--admin-text-muted)', fontSize: '0.78rem', pointerEvents: 'none' }} />
                        <input value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Search by name, position, or office..."
                            style={{ width: '100%', boxSizing: 'border-box', padding: '0.42rem 0.75rem 0.42rem 2rem', background: 'var(--admin-bg-secondary)', border: '1px solid var(--admin-border)', borderRadius: 8, color: 'var(--admin-text-primary)', fontSize: '0.78rem', outline: 'none', fontFamily: 'inherit' }} />
                    </div>

                    {/* Filter tabs */}
                    <div style={{ display: 'flex', gap: 4, overflowX: 'auto', scrollbarWidth: 'none' }}>
                        {TABS.map(t => {
                            const active = rating === t.key;
                            const isTop  = t.key === 'top';
                            const cfg    = isTop
                                ? { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' }
                                : (RATING_CFG[t.key] ?? { color: 'var(--admin-accent)', bg: 'rgba(59,130,246,0.12)' });
                            const count  = t.key === ''    ? counts.all
                                         : t.key === 'top' ? topCount
                                         : (counts[t.key] ?? 0);
                            return (
                                <button key={t.key} onClick={() => setRating(t.key)} style={{
                                    flexShrink: 0, padding: '0.35rem 0.85rem', borderRadius: 99, border: '1px solid',
                                    fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
                                    borderColor: active ? (cfg.color ?? 'var(--admin-accent)') : 'var(--admin-border)',
                                    background: active ? cfg.bg : 'transparent',
                                    color: active ? (cfg.color ?? 'var(--admin-accent)') : 'var(--admin-text-muted)',
                                    display: 'flex', alignItems: 'center', gap: '0.3rem',
                                }}>
                                    {t.iconCls && <i className={`bi ${t.iconCls}`} style={{ fontSize: '0.68rem' }} />}
                                    {t.label} {count}
                                </button>
                            );
                        })}
                    </div>
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
                                                letterSpacing:'0.06em', color:'var(--admin-text-muted)' }}>
                                                Performance Score
                                            </div>
                                            <div style={{ fontWeight:800, fontSize:'0.88rem', color:cfg.color, marginTop:2 }}>
                                                {cfg.icon} {p.rating}
                                            </div>
                                            {/* Badges row — below the rating label */}
                                            {(p.is_calibrated || p.plan_status) && (
                                                <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginTop:5 }}>
                                                    {p.is_calibrated && (
                                                        <span style={{ fontSize:'0.58rem', fontWeight:700, padding:'1px 6px', borderRadius:99,
                                                            background:'rgba(139,92,246,0.12)', color:'#a78bfa', border:'1px solid rgba(139,92,246,0.25)' }}>
                                                            Calibrated
                                                        </span>
                                                    )}
                                                    {p.plan_status && (
                                                        <span style={{ fontSize:'0.58rem', fontWeight:700, padding:'1px 6px', borderRadius:99,
                                                            background: p.plan_status === 'submitted_to_ld' ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
                                                            color: p.plan_status === 'submitted_to_ld' ? '#10b981' : '#f59e0b',
                                                            border: `1px solid ${p.plan_status === 'submitted_to_ld' ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.25)'}` }}>
                                                            {p.plan_status_label}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
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
