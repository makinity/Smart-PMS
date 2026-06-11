import { useState, useEffect, useMemo } from 'react';
import { router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { avatarSrc as resolveAvatar, onAvatarError } from '@/Components/defaultAvatar';

function useBreakpoint() {
    const [w, setW] = useState(() => typeof window !== 'undefined' ? window.innerWidth : 1200);
    useEffect(() => {
        const h = () => setW(window.innerWidth);
        window.addEventListener('resize', h);
        return () => window.removeEventListener('resize', h);
    }, []);
    return w >= 1024 ? 'desktop' : w >= 640 ? 'tablet' : 'mobile';
}

function StatusBadge({ status }) {
    const map = {
        submitted: { label: 'Submitted', bg: 'rgba(59,130,246,0.15)',  color: 'var(--admin-accent)',  border: 'rgba(59,130,246,0.3)' },
        approved:  { label: 'Approved',  bg: 'rgba(74,222,128,0.15)', color: '#22c55e',              border: 'rgba(74,222,128,0.3)' },
        endorsed:  { label: 'Endorsed',  bg: 'rgba(139,92,246,0.15)', color: '#a78bfa',              border: 'rgba(139,92,246,0.3)' },
        returned:  { label: 'Returned',  bg: 'rgba(239,68,68,0.15)',  color: '#f87171',              border: 'rgba(239,68,68,0.3)' },
    };
    const c = map[status] ?? { label: status, bg: 'rgba(100,100,100,0.12)', color: 'var(--admin-text-muted)', border: 'rgba(100,100,100,0.2)' };
    return (
        <span style={{ padding: '0.2rem 0.65rem', borderRadius: 99, fontSize: '0.67rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', background: c.bg, color: c.color, border: `1px solid ${c.border}`, whiteSpace: 'nowrap' }}>
            {c.label}
        </span>
    );
}

function Avatar({ name, src, size = 40 }) {
    return <img src={resolveAvatar(src)} alt={name} onError={onAvatarError} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid var(--admin-border)' }} />;
}

const STATUSES = ['', 'submitted', 'approved', 'returned'];
const STATUS_LABELS = { '': 'All', submitted: 'Submitted', approved: 'Approved', returned: 'Returned' };

export default function Index({ mpors, search: initSearch, month: initMonth, status: initStatus }) {
    const bp = useBreakpoint();
    const [search, setSearch] = useState(initSearch ?? '');
    const [month, setMonth]   = useState(initMonth ?? '');
    const [status, setStatus] = useState(initStatus ?? '');

    // Debounced reload
    useEffect(() => {
        const t = setTimeout(() => {
            router.get('/supervisor/mpor', { search, month, status }, { preserveState: true, replace: true });
        }, 300);
        return () => clearTimeout(t);
    }, [search, month, status]);

    const isMobile = bp === 'mobile';

    return (
        <AppLayout title="MPOR Review">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

                {/* Header */}
                <div style={card}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
                        <div style={iconBox}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                        </div>
                        <div>
                            <p style={statLabel}>Monthly Performance Output Report</p>
                            <h1 style={{ fontWeight: 700, fontSize: '1.35rem', color: 'var(--admin-text-primary)', lineHeight: 1.1 }}>MPOR Review</h1>
                        </div>
                    </div>
                </div>

                {/* Filters — single row across all breakpoints */}
                <div style={{ ...card, padding: isMobile ? '0.85rem 0.9rem' : '1rem 1.25rem' }}>
                    <div style={{ display: 'flex', gap: isMobile ? '0.4rem' : '0.65rem', alignItems: 'center', marginBottom: '0.6rem' }}>
                        {/* Search */}
                        <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--admin-text-muted)" strokeWidth="2" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                            </svg>
                            <input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder={isMobile ? 'Search…' : 'Search employee name…'}
                                style={{ ...inputStyle, ...(isMobile ? compactInput : null), paddingLeft: '2.1rem', width: '100%' }}
                            />
                        </div>
                        {/* Month */}
                        <input
                            type="month"
                            value={month}
                            onChange={e => setMonth(e.target.value)}
                            style={{ ...inputStyle, ...(isMobile ? compactInput : null) }}
                        />
                    </div>
                    {/* Status pills */}
                    <div style={{ display: 'flex', gap: 4, overflowX: 'auto', scrollbarWidth: 'none' }}>
                        {STATUSES.map(s => (
                            <button key={s} onClick={() => setStatus(s)} style={{
                                flexShrink: 0, padding: '0.35rem 0.85rem', borderRadius: 99, border: '1px solid',
                                fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
                                borderColor: status === s ? 'var(--admin-accent)' : 'var(--admin-border)',
                                background: status === s ? 'rgba(59,130,246,0.12)' : 'transparent',
                                color: status === s ? 'var(--admin-accent)' : 'var(--admin-text-muted)',
                            }}>{STATUS_LABELS[s]}</button>
                        ))}
                    </div>
                </div>

                {/* Count */}
                {mpors.length === 0 ? (
                    <div style={{ ...card, padding: '3rem', textAlign: 'center', color: 'var(--admin-text-muted)' }}>
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.25, margin: '0 auto 0.75rem', display: 'block' }}>
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                        </svg>
                        <p style={{ fontSize: '0.9rem' }}>No MPOR submissions found.</p>
                        <p style={{ fontSize: '0.78rem', opacity: 0.65, marginTop: '0.25rem' }}>Employees must submit their MPOR before it appears here.</p>
                    </div>
                ) : isMobile ? (
                    <MobileList mpors={mpors} />
                ) : (
                    <DesktopTable mpors={mpors} />
                )}
            </div>
        </AppLayout>
    );
}

function DesktopTable({ mpors }) {
    const th = { padding: '0.6rem 1rem', fontSize: '0.67rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--admin-text-muted)', textAlign: 'left', borderBottom: '1px solid var(--admin-border)', whiteSpace: 'nowrap' };
    const td = { padding: '0.85rem 1rem', borderBottom: '1px solid var(--admin-border)', verticalAlign: 'middle' };

    return (
        <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ background: 'var(--admin-bg-secondary)' }}>
                        <th style={th}>Employee</th>
                        <th style={th}>Month</th>
                        <th style={th}>Submitted</th>
                        <th style={th}>Status</th>
                        <th style={{ ...th, textAlign: 'right' }}>Action</th>
                    </tr>
                </thead>
                <tbody>
                    {mpors.map(m => (
                        <tr key={m.id} style={{ transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--admin-bg-secondary)'} onMouseLeave={e => e.currentTarget.style.background = ''}>
                            <td style={td}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <Avatar name={m.employee.name} src={m.employee.avatar} />
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--admin-text-primary)' }}>{m.employee.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>{m.employee.position}</div>
                                    </div>
                                </div>
                            </td>
                            <td style={td}>
                                <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--admin-text-primary)' }}>
                                    {formatMonth(m.month)}
                                </span>
                            </td>
                            <td style={td}>
                                <span style={{ fontSize: '0.82rem', color: 'var(--admin-text-muted)' }}>{m.submitted_at ?? '—'}</span>
                            </td>
                            <td style={td}><StatusBadge status={m.status} /></td>
                            <td style={{ ...td, textAlign: 'right' }}>
                                <a href={`/supervisor/mpor/${m.id}`} style={btnView}>
                                    Review
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                                </a>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function MobileList({ mpors }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {mpors.map(m => (
                <div key={m.id} style={card}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                        <Avatar name={m.employee.name} src={m.employee.avatar} size={44} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--admin-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.employee.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.employee.position}</div>
                        </div>
                        <StatusBadge status={m.status} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--admin-text-primary)' }}>{formatMonth(m.month)}</span>
                            {m.submitted_at && <span style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)', marginLeft: '0.5rem' }}>{m.submitted_at}</span>}
                        </div>
                        <a href={`/supervisor/mpor/${m.id}`} style={btnView}>
                            Review
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                        </a>
                    </div>
                </div>
            ))}
        </div>
    );
}

function formatMonth(m) {
    try { return new Date(m + '-02').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }); }
    catch { return m; }
}

const card      = { background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)', borderRadius: 'var(--admin-radius)', padding: '1.25rem 1.5rem', boxShadow: 'var(--admin-shadow)' };
const iconBox   = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 42, height: 42, borderRadius: 12, border: '1px solid var(--admin-border)', background: 'rgba(59,130,246,0.08)', color: 'var(--admin-accent)', flexShrink: 0 };
const statLabel = { fontSize: '0.72rem', fontWeight: 600, color: 'var(--admin-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.15rem' };
const inputStyle = { padding: '0.55rem 0.85rem', borderRadius: 10, border: '1px solid var(--admin-border-strong)', background: 'var(--admin-bg-secondary)', color: 'var(--admin-text-primary)', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' };
const compactInput = { padding: '0.5rem 0.5rem', fontSize: '0.78rem', borderRadius: 8 };
const btnView   = { display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.45rem 0.9rem', borderRadius: 8, border: '1px solid var(--admin-border-strong)', background: 'transparent', color: 'var(--admin-text-primary)', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', textDecoration: 'none', whiteSpace: 'nowrap' };
