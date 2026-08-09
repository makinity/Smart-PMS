import { useState, useEffect, useRef, useMemo } from 'react';
import { Link, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import PeriodSelector from '@/Components/PeriodSelector';
import { avatarSrc as resolveAvatar, onAvatarError } from '@/Components/defaultAvatar';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function MonthPicker({ value, onChange }) {
    const [open, setOpen]   = useState(false);
    const [year, setYear]   = useState(() => value ? parseInt(value.slice(0,4)) : new Date().getFullYear());
    const ref = useRef(null);

    useEffect(() => {
        if (!open) return;
        const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    // Sync year if value changes externally
    useEffect(() => {
        if (value) setYear(parseInt(value.slice(0,4)));
    }, [value]);

    const hasValue = !!value;
    const selectedMonth = value ? parseInt(value.slice(5,7)) - 1 : null; // 0-indexed
    const selectedYear  = value ? parseInt(value.slice(0,4)) : null;

    function select(m) {
        const mm = String(m + 1).padStart(2, '0');
        onChange(`${year}-${mm}`);
        setOpen(false);
    }

    function clear(e) {
        e.stopPropagation();
        onChange('');
    }

    return (
        <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
            <button
                onClick={() => setOpen(o => !o)}
                title={value ? `Month: ${MONTH_NAMES[selectedMonth]} ${selectedYear}` : 'Filter by month'}
                style={{
                    display: 'flex', alignItems: 'center', gap: '0.35rem',
                    padding: '0.38rem 0.6rem',
                    borderRadius: 8,
                    border: `1px solid ${hasValue ? 'rgba(59,130,246,0.5)' : 'var(--admin-border-strong)'}`,
                    background: hasValue ? 'rgba(59,130,246,0.08)' : 'var(--admin-bg-secondary)',
                    color: hasValue ? 'var(--admin-accent)' : 'var(--admin-text-muted)',
                    cursor: 'pointer', fontSize: '0.75rem', fontWeight: hasValue ? 700 : 500,
                    whiteSpace: 'nowrap', transition: 'all 0.15s',
                }}
            >
                {/* Calendar icon */}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                {hasValue && (
                    <>
                        <span>{MONTH_NAMES[selectedMonth]} {selectedYear}</span>
                        {/* Clear × */}
                        <span onClick={clear} style={{ marginLeft: 2, lineHeight: 1, opacity: 0.7 }}>×</span>
                    </>
                )}
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                    style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}>
                    <polyline points="6 9 12 15 18 9"/>
                </svg>
            </button>

            {open && (
                <div style={{
                    position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                    background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)',
                    borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.15)', zIndex: 100,
                    padding: '0.75rem', minWidth: 220,
                }}>
                    {/* Year nav */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                        <button onClick={() => setYear(y => y - 1)} style={yearBtn}>‹</button>
                        <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--admin-text-primary)' }}>{year}</span>
                        <button onClick={() => setYear(y => y + 1)} style={yearBtn}>›</button>
                    </div>
                    {/* Month grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.35rem' }}>
                        {MONTH_NAMES.map((name, i) => {
                            const isSelected = i === selectedMonth && year === selectedYear;
                            return (
                                <button key={i} onClick={() => select(i)} style={{
                                    padding: '0.4rem 0', borderRadius: 7, border: 'none',
                                    background: isSelected ? 'var(--admin-accent)' : 'var(--admin-bg-secondary)',
                                    color: isSelected ? '#fff' : 'var(--admin-text-primary)',
                                    fontWeight: isSelected ? 700 : 500, fontSize: '0.8rem', cursor: 'pointer',
                                }}>
                                    {name}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

const yearBtn = { background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: 'var(--admin-text-muted)', padding: '0 0.4rem', lineHeight: 1 };

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

export default function Index({ mpors, search: initSearch, month: initMonth, status: initStatus, period, allPeriods }) {
    const bp = useBreakpoint();
    const [search, setSearch] = useState(initSearch ?? '');
    const [month, setMonth]   = useState(initMonth ?? '');
    const [status, setStatus] = useState(initStatus ?? 'submitted');

    // Debounced reload — preserve period_id so past-period view is not lost on filter change
    useEffect(() => {
        const t = setTimeout(() => {
            const params = { search, month, status };
            if (period && !period.is_active) params.period_id = period.id;
            router.get('/supervisor/mpor', params, { preserveState: true, replace: true });
        }, 300);
        return () => clearTimeout(t);
    }, [search, month, status]);

    const isMobile = bp === 'mobile';
    const rows = mpors.data ?? mpors;

    return (
        <AppLayout title="MPOR Review">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

                {/* Filters — single row across all breakpoints */}
                <div style={{ ...card, padding: isMobile ? '0.85rem 0.9rem' : '1rem 1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.6rem', flexWrap: 'wrap' }}>
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
                        {/* Month picker — calendar icon button */}
                        <MonthPicker value={month} onChange={setMonth} />
                        <PeriodSelector period={period} allPeriods={allPeriods} route="/supervisor/mpor" />
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

                {/* List / Table */}
                {rows.length === 0 ? (
                    <div style={{ ...card, padding: '3rem', textAlign: 'center', color: 'var(--admin-text-muted)' }}>
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.25, margin: '0 auto 0.75rem', display: 'block' }}>
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                        </svg>
                        <p style={{ fontSize: '0.9rem' }}>No MPOR submissions found.</p>
                        <p style={{ fontSize: '0.78rem', opacity: 0.65, marginTop: '0.25rem' }}>Employees must submit their MPOR before it appears here.</p>
                    </div>
                ) : isMobile ? (
                    <MobileList mpors={rows} />
                ) : (
                    <DesktopTable mpors={rows} />
                )}

                {/* Pagination */}
                {mpors.links?.length > 3 && (
                    <Pagination links={mpors.links} />
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
                                <Link href={`/supervisor/mpor/${m.id}`} style={btnView}>
                                    Review
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                                </Link>
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
                        <Link href={`/supervisor/mpor/${m.id}`} style={btnView}>
                            Review
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                        </Link>
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

function Pagination({ links }) {
    if (!links?.length) return null;
    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {links.map((link, index) => (
                <button
                    key={`${link.label}-${index}`}
                    type="button"
                    disabled={!link.url}
                    onClick={() => { if (!link.url) return; router.get(link.url, {}, { preserveScroll: true, preserveState: true }); }}
                    style={{ borderRadius: 8, border: link.active ? 'none' : '1px solid var(--admin-border-strong)', padding: '0.35rem 0.85rem', fontSize: '0.82rem', cursor: link.url ? 'pointer' : 'not-allowed', background: link.active ? 'var(--admin-accent)' : 'transparent', color: link.active ? '#fff' : 'var(--admin-text-primary)', opacity: !link.url ? 0.45 : 1, fontWeight: link.active ? 700 : 400 }}
                    dangerouslySetInnerHTML={{ __html: link.label }}
                />
            ))}
        </div>
    );
}
