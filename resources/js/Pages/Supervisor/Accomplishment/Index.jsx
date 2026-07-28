import { useState, useEffect } from 'react';
import { usePage, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { avatarSrc, onAvatarError } from '@/Components/defaultAvatar';

const STATUS_CFG = {
    submitted_to_supervisor: { label: 'Pending Review',  c: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    supervisor_approved:     { label: 'Approved',        c: '#60a5fa', bg: 'rgba(59,130,246,0.12)' },
    dept_head_endorsed:      { label: 'Awaiting PMT',    c: '#60a5fa', bg: 'rgba(59,130,246,0.12)' },
    released_by_pmt:         { label: 'Released',        c: '#4ade80', bg: 'rgba(74,222,128,0.12)' },
    returned_to_employee:    { label: 'Returned',        c: '#f87171', bg: 'rgba(239,68,68,0.12)' },
};

const FILTERS = [
    { key: 'all',                     label: 'All' },
    { key: 'submitted_to_supervisor', label: 'Pending' },
    { key: 'supervisor_approved',     label: 'Approved' },
    { key: 'returned_to_employee',    label: 'Returned' },
];

function relativeTime(iso) {
    if (!iso) return '—';
    const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

function useIsMobile() {
    const [mobile, setMobile] = useState(() => window.innerWidth < 640);
    useEffect(() => {
        const h = () => setMobile(window.innerWidth < 640);
        window.addEventListener('resize', h);
        return () => window.removeEventListener('resize', h);
    }, []);
    return mobile;
}

export default function Index() {
    const { submissions = [] } = usePage().props;
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');
    const isMobile = useIsMobile();

    const filtered = submissions.filter(s => {
        const matchFilter = filter === 'all' || s.status === filter;
        const q = search.toLowerCase();
        return matchFilter && (!q || s.employee_name.toLowerCase().includes(q) || s.employee_office.toLowerCase().includes(q));
    });

    const pendingCount = submissions.filter(s => s.status === 'submitted_to_supervisor').length;
    const card = { background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)', borderRadius: 'var(--admin-radius)', boxShadow: 'var(--admin-shadow)' };

    return (
        <AppLayout title="Accomplishment Reviews" description="Review employee accomplishment submissions">
            <div style={{ ...card, padding: '1.25rem' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: 8 }}>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--admin-text-primary)' }}>Employee Submissions</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)', marginTop: 2 }}>
                            {pendingCount} pending review · {submissions.length} total
                        </div>
                    </div>
                    {pendingCount > 0 && (
                        <span style={{ fontSize: '0.62rem', fontWeight: 800, padding: '2px 10px', borderRadius: 99, background: '#f59e0b', color: '#fff' }}>
                            {pendingCount} NEW
                        </span>
                    )}
                </div>

                {/* Search */}
                <div style={{ position: 'relative', marginBottom: '0.6rem' }}>
                    <i className="bi bi-search" style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--admin-text-muted)', fontSize: '0.78rem', pointerEvents: 'none' }} />
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search by employee or office…"
                        style={{ width: '100%', boxSizing: 'border-box', padding: '0.42rem 0.75rem 0.42rem 2rem',
                            background: 'var(--admin-bg-secondary)', border: '1px solid var(--admin-border)',
                            borderRadius: 8, color: 'var(--admin-text-primary)', fontSize: '0.78rem', outline: 'none', fontFamily: 'inherit' }} />
                </div>

                {/* Filter pills */}
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

                {/* List */}
                {filtered.length === 0 ? (
                    <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: '0.85rem' }}>
                        <i className="bi bi-inbox" style={{ fontSize: '2rem', display: 'block', marginBottom: 8 }} />
                        No submissions found.
                    </div>
                ) : filtered.map(s => {
                    const sc = STATUS_CFG[s.status] ?? { label: s.status, c: '#94a3b8', bg: 'rgba(100,116,139,0.12)' };
                    const pending     = s.status === 'submitted_to_supervisor';
                    const avatar      = avatarSrc(s.employee_avatar);
                    const borderColor = pending ? '#f59e0b' : sc.c;

                    if (isMobile) {
                        return (
                            <div key={s.id} onClick={() => router.visit(`/supervisor/accomplishment/${s.id}`)}
                                style={{ padding: '0.9rem 1rem', borderRadius: 10, cursor: 'pointer', marginBottom: 8,
                                    background: 'var(--admin-bg-secondary)', border: '1px solid var(--admin-border)',
                                    borderLeft: `3px solid ${borderColor}` }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
                                    <img src={avatar} alt={s.employee_name} onError={onAvatarError}
                                        style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, objectFit: 'cover' }} />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--admin-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {s.employee_name}
                                        </div>
                                        <div style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {s.employee_office}
                                        </div>
                                    </div>
                                    <i className="bi bi-chevron-right" style={{ color: 'var(--admin-text-muted)', fontSize: '0.75rem', flexShrink: 0 }} />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', paddingLeft: '2.5rem' }}>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--admin-text-muted)' }}>
                                        {s.period} · {relativeTime(s.submitted_at)}
                                    </span>
                                    <span style={{ flexShrink: 0, fontSize: '0.62rem', fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: sc.bg, color: sc.c }}>
                                        {sc.label}
                                    </span>
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div key={s.id} onClick={() => router.visit(`/supervisor/accomplishment/${s.id}`)}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1rem',
                                borderRadius: 10, cursor: 'pointer', marginBottom: 6,
                                background: 'var(--admin-bg-secondary)', border: '1px solid var(--admin-border)',
                                borderLeft: `3px solid ${borderColor}`, transition: 'background 0.1s' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.05)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'var(--admin-bg-secondary)'}>
                            <img src={avatar} alt={s.employee_name} onError={onAvatarError}
                                style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, objectFit: 'cover' }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--admin-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {s.employee_name}
                                    <span style={{ fontWeight: 400, color: 'var(--admin-text-muted)', fontSize: '0.8rem' }}> — {s.employee_office}</span>
                                </div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)', marginTop: 2 }}>
                                    {s.period} · Submitted {relativeTime(s.submitted_at)}
                                </div>
                            </div>
                            <span style={{ flexShrink: 0, fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: sc.bg, color: sc.c }}>
                                {sc.label}
                            </span>
                            <i className="bi bi-chevron-right" style={{ color: 'var(--admin-text-muted)', fontSize: '0.75rem', flexShrink: 0 }} />
                        </div>
                    );
                })}
            </div>
        </AppLayout>
    );
}
