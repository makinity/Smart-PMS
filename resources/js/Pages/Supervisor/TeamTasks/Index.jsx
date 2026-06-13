import { useState, useEffect, useRef } from 'react';
import { usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import TaskDetailsModal from '@/Pages/Employee/MyTask/TaskDetailsModal';
import { avatarSrc, onAvatarError } from '@/Components/defaultAvatar';

const STATUS_CFG = {
    draft:     { label: 'Draft',     c: '#94a3b8', bg: 'rgba(100,116,139,0.12)', border: 'rgba(100,116,139,0.25)' },
    recording: { label: 'Recording', c: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.3)' },
    paused:    { label: 'Paused',    c: '#a78bfa', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.3)' },
    submitted: { label: 'Submitted', c: '#60a5fa', bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.3)' },
    rated:     { label: 'Rated',     c: '#4ade80', bg: 'rgba(74,222,128,0.12)',  border: 'rgba(74,222,128,0.3)' },
};

const FILTERS = [
    { key: 'all' },
    { key: 'recording' },
    { key: 'paused' },
    { key: 'draft' },
    { key: 'submitted' },
    { key: 'rated' },
];

function fmtSeconds(s) {
    if (!s && s !== 0) return null;
    if (s < 60) return '<1m';
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function fmtDate(d) {
    if (!d) return null;
    return new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

function liveSeconds(entry) {
    let total = entry.total_seconds ?? 0;
    if (entry.status === 'recording' && entry.started_at) {
        total += Math.floor((Date.now() - new Date(entry.started_at).getTime()) / 1000);
    }
    return total;
}

function TaskCard({ entry, onClick }) {
    const sc = STATUS_CFG[entry.status] ?? STATUS_CFG.draft;
    const isLive = entry.status === 'recording';
    const [secs, setSecs] = useState(() => liveSeconds(entry));

    useEffect(() => {
        setSecs(liveSeconds(entry));
        if (!isLive) return;
        const id = setInterval(() => setSecs(liveSeconds(entry)), 1000);
        return () => clearInterval(id);
    }, [entry.status, entry.started_at, entry.total_seconds]);

    return (
        <div style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)',
            borderRadius: 12, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem',
            borderTop: `3px solid ${sc.c}`, cursor: 'pointer' }}
            className="task-card"
            onClick={onClick}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                    <img src={avatarSrc(entry.employee_avatar)} alt={entry.employee_name} onError={onAvatarError}
                        style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, objectFit: 'cover' }} />
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--admin-text-primary)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {entry.employee_name}
                    </span>
                </div>
                <span style={{ flexShrink: 0, fontSize: '0.6rem', fontWeight: 700, padding: '2px 7px',
                    borderRadius: 99, background: sc.bg, color: sc.c, border: `1px solid ${sc.border}`,
                    display: 'flex', alignItems: 'center', gap: 4 }}>
                    {isLive && <span className="live-dot" />}
                    {sc.label}
                </span>
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--admin-text-secondary)', lineHeight: 1.45, margin: 0,
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {entry.indicator}
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginTop: 'auto' }}>
                {entry.work_date && <Chip icon="📅">{fmtDate(entry.work_date)}</Chip>}
                {entry.quantity > 0 && <Chip icon="✦">{entry.quantity} qty</Chip>}
                {secs > 0 && <Chip icon="⏱" live={isLive}>{fmtSeconds(secs)}</Chip>}
            </div>
        </div>
    );
}

function Chip({ icon, children, live }) {
    return (
        <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.65rem',
            color: live ? '#f59e0b' : 'var(--admin-text-muted)',
            background: live ? 'rgba(245,158,11,0.1)' : 'var(--admin-bg-secondary)',
            padding: '2px 7px', borderRadius: 99,
            border: `1px solid ${live ? 'rgba(245,158,11,0.3)' : 'var(--admin-border)'}` }}>
            <span style={{ fontSize: '0.6rem' }}>{icon}</span>{children}
        </span>
    );
}

export default function Index() {
    const { entries: initialEntries = [], period, auth } = usePage().props;
    const [entries, setEntries] = useState(initialEntries);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');
    const [activeEntry, setActiveEntry] = useState(null);
    const channelRef = useRef(null);

    useEffect(() => {
        const userId = auth?.user?.id;
        if (!userId || !window.Echo) return;

        channelRef.current = window.Echo.private(`supervisor.${userId}`)
            .listen('.ors.activity', ({ entry }) => {
                setEntries(prev => {
                    const idx = prev.findIndex(e => e.id === entry.id);
                    if (idx === -1) return [entry, ...prev];
                    const next = [...prev];
                    next[idx] = entry;
                    return next;
                });
                setActiveEntry(prev => prev?.id === entry.id ? entry : prev);
            });

        return () => {
            if (channelRef.current) window.Echo.leave(`supervisor.${userId}`);
        };
    }, [auth?.user?.id]);

    const filtered = entries.filter(e => {
        const matchStatus = filter === 'all' || e.status === filter;
        const q = search.toLowerCase();
        return matchStatus && (!q || e.employee_name.toLowerCase().includes(q) || e.indicator.toLowerCase().includes(q));
    });

    const countOf = key => key === 'all' ? entries.length : entries.filter(e => e.status === key).length;
    const card = { background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)', borderRadius: 'var(--admin-radius)', boxShadow: 'var(--admin-shadow)' };

    return (
        <AppLayout title="Team Tasks">
            <style>{css}</style>
            <div style={{ ...card, padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: 8 }}>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--admin-text-primary)' }}>Team Task Monitor</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)', marginTop: 2 }}>
                            {entries.length} entries{period ? ` · ${period}` : ''}
                        </div>
                    </div>
                    {countOf('recording') > 0 && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.65rem', fontWeight: 700,
                            padding: '3px 10px', borderRadius: 99, background: 'rgba(245,158,11,0.15)',
                            color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>
                            <span className="live-dot" />
                            {countOf('recording')} Recording
                        </span>
                    )}
                </div>

                <div style={{ position: 'relative', marginBottom: '0.6rem' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                        style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--admin-text-muted)', pointerEvents: 'none' }}>
                        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search by employee or task…"
                        style={{ width: '100%', boxSizing: 'border-box', padding: '0.42rem 0.75rem 0.42rem 2rem',
                            background: 'var(--admin-bg-secondary)', border: '1px solid var(--admin-border)',
                            borderRadius: 8, color: 'var(--admin-text-primary)', fontSize: '0.78rem', outline: 'none', fontFamily: 'inherit' }} />
                </div>

                <div style={{ display: 'flex', gap: 4, marginBottom: '1.25rem', overflowX: 'auto', scrollbarWidth: 'none' }}>
                    {FILTERS.map(({ key }) => {
                        const sc = STATUS_CFG[key];
                        const active = filter === key;
                        const label = key === 'all' ? 'All' : sc.label;
                        return (
                            <button key={key} onClick={() => setFilter(key)} style={{
                                flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5,
                                padding: '0.3rem 0.75rem', borderRadius: 99, border: '1px solid',
                                fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
                                borderColor: active ? (sc?.c ?? 'var(--admin-accent)') : 'var(--admin-border)',
                                background: active ? (sc?.bg ?? 'rgba(59,130,246,0.12)') : 'transparent',
                                color: active ? (sc?.c ?? 'var(--admin-accent)') : 'var(--admin-text-muted)',
                            }}>
                                {label}
                                <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '1px 5px', borderRadius: 99, background: 'rgba(0,0,0,0.1)' }}>
                                    {countOf(key)}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {filtered.length === 0 ? (
                    <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: '0.85rem' }}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
                            style={{ display: 'block', margin: '0 auto 0.75rem', opacity: 0.35 }}>
                            <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                        </svg>
                        No tasks found.
                    </div>
                ) : (
                    <div className="task-grid">
                        {filtered.map(e => <TaskCard key={e.id} entry={e} onClick={() => setActiveEntry(e)} />)}
                    </div>
                )}
            </div>

            {activeEntry && (
                <TaskDetailsModal entry={activeEntry} onClose={() => setActiveEntry(null)} />
            )}
        </AppLayout>
    );
}

const css = `
.task-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.75rem;
}
@media (max-width: 1280px) { .task-grid { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 900px)  { .task-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 560px)  { .task-grid { grid-template-columns: 1fr; } }
.task-card { transition: box-shadow 0.15s; }
.task-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.12); border-color: rgba(59,130,246,0.3) !important; }
.live-dot { width: 6px; height: 6px; border-radius: 50%; background: #f59e0b; display: inline-block; animation: pulse 1.2s infinite; }
@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.3; } }
`;
