import { useState } from 'react';
import { usePage, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { avatarSrc, onAvatarError } from '@/Components/defaultAvatar';

const STATUS_CFG = {
    supervisor_recommended: { label: 'Pending Approval',   c: '#f59e0b', bg: 'rgba(245,158,11,0.12)', bc: 'rgba(245,158,11,0.3)' },
    returned:               { label: 'Returned',           c: '#f87171', bg: 'rgba(239,68,68,0.12)',  bc: 'rgba(239,68,68,0.3)' },
    dept_head_approved:     { label: 'Approved',           c: '#10b981', bg: 'rgba(16,185,129,0.12)', bc: 'rgba(16,185,129,0.3)' },
    submitted_to_pmt:       { label: 'Submitted to PMT',   c: '#a78bfa', bg: 'rgba(139,92,246,0.12)', bc: 'rgba(139,92,246,0.3)' },
    submitted_to_ld:        { label: 'Submitted to L&D',   c: '#4ade80', bg: 'rgba(74,222,128,0.12)', bc: 'rgba(74,222,128,0.3)' },
};

const RATING_COLOR = { 'Poor': '#ef4444', 'Unsatisfactory': '#eab308' };

const FILTERS = [
    { key: 'all',                    label: 'All' },
    { key: 'supervisor_recommended', label: 'Pending' },
    { key: 'returned',               label: 'Returned' },
    { key: 'approved',               label: 'Approved' },
];

function relativeTime(iso) {
    if (!iso) return '—';
    const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

export default function Index() {
    const { plans = [] } = usePage().props;
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');

    const filtered = plans.filter(p => {
        const matchFilter = filter === 'all' || p.status === filter;
        const q = search.toLowerCase();
        return matchFilter && (!q || p.employee_name.toLowerCase().includes(q)
            || p.employee_office.toLowerCase().includes(q) || p.position.toLowerCase().includes(q));
    });

    const pendingCount = plans.filter(p => p.status === 'supervisor_recommended').length;
    const card = { background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)', borderRadius: 'var(--admin-radius)', boxShadow: 'var(--admin-shadow)' };

    return (
        <AppLayout title="IDP Approval" description="Approve employee Individual Development Plans">
            <div style={{ ...card, padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: 8 }}>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--admin-text-primary)' }}>IDP Approvals</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)', marginTop: 2 }}>
                            {pendingCount} pending approval · {plans.length} total
                        </div>
                    </div>
                    {pendingCount > 0 && (
                        <span style={{ fontSize: '0.62rem', fontWeight: 800, padding: '2px 10px', borderRadius: 99, background: '#f59e0b', color: '#fff' }}>
                            {pendingCount} NEW
                        </span>
                    )}
                </div>

                <div style={{ position: 'relative', marginBottom: '0.6rem' }}>
                    <i className="bi bi-search" style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--admin-text-muted)', fontSize: '0.78rem', pointerEvents: 'none' }} />
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search by name, position, or office…"
                        style={{ width: '100%', boxSizing: 'border-box', padding: '0.42rem 0.75rem 0.42rem 2rem', background: 'var(--admin-bg-secondary)', border: '1px solid var(--admin-border)', borderRadius: 8, color: 'var(--admin-text-primary)', fontSize: '0.78rem', outline: 'none', fontFamily: 'inherit' }} />
                </div>

                <div style={{ display: 'flex', gap: 4, marginBottom: '1rem', overflowX: 'auto', scrollbarWidth: 'none' }}>
                    {FILTERS.map(({ key, label }) => (
                        <button key={key} onClick={() => setFilter(key)} style={{
                            flexShrink: 0, padding: '0.35rem 0.85rem', borderRadius: 99, border: '1px solid',
                            fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
                            borderColor: filter === key ? 'var(--admin-accent)' : 'var(--admin-border)',
                            background: filter === key ? 'rgba(59,130,246,0.12)' : 'transparent',
                            color: filter === key ? 'var(--admin-accent)' : 'var(--admin-text-muted)',
                        }}>{label}</button>
                    ))}
                </div>

                {filtered.length === 0 ? (
                    <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: '0.85rem' }}>
                        <i className="bi bi-journal-check" style={{ fontSize: '2rem', display: 'block', marginBottom: 8 }} />
                        No IDPs found.
                    </div>
                ) : filtered.map(p => {
                    const sc = STATUS_CFG[p.status] ?? STATUS_CFG.supervisor_recommended;
                    const isPending = p.status === 'supervisor_recommended';
                    const ratingColor = RATING_COLOR[p.source_rating] ?? '#ef4444';
                    return (
                        <div key={p.id}
                            onClick={() => router.visit(`/dept-head/idp/${p.id}`)}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '0.85rem 0.75rem', borderRadius: 10, cursor: 'pointer', borderLeft: `3px solid ${isPending ? '#f59e0b' : sc.c}`, background: isPending ? 'rgba(245,158,11,0.04)' : 'transparent', marginBottom: '0.4rem', transition: 'background 0.15s' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--admin-bg-secondary)'}
                            onMouseLeave={e => e.currentTarget.style.background = isPending ? 'rgba(245,158,11,0.04)' : 'transparent'}>

                            <img src={avatarSrc(p.employee_avatar)} alt={p.employee_name} onError={onAvatarError}
                                style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid var(--admin-border-strong)' }} />

                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--admin-text-primary)' }}>{p.employee_name}</span>
                                    <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '1px 8px', borderRadius: 99, color: sc.c, background: sc.bg, border: `1px solid ${sc.bc}` }}>{sc.label}</span>
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)', marginTop: 2 }}>{p.position} · {p.employee_office}</div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)', marginTop: 1 }}>{p.period} · Updated {relativeTime(p.updated_at)}</div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem', flexShrink: 0 }}>
                                {p.source_score && <span style={{ fontSize: '0.85rem', fontWeight: 800, color: ratingColor }}>{p.source_score}</span>}
                                {p.source_rating && <span style={{ fontSize: '0.62rem', fontWeight: 700, color: ratingColor, background: `${ratingColor}1a`, border: `1px solid ${ratingColor}33`, padding: '1px 7px', borderRadius: 99, textTransform: 'uppercase' }}>{p.source_rating}</span>}
                                <i className="bi bi-chevron-right" style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)', marginTop: 2 }} />
                            </div>
                        </div>
                    );
                })}
            </div>
        </AppLayout>
    );
}
