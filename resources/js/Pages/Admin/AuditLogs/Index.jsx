import AppLayout from '@/Layouts/AppLayout';
import { Head, router, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState, Fragment } from 'react';
import { avatarSrc, onAvatarError } from '@/Components/defaultAvatar';
import useBreakpoint from '@/Components/useBreakpoint';

const BASE = '/administrator/audit-logs';

// ── shared styles ─────────────────────────────────────────────────────────────
const card = { background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)', borderRadius: 'var(--admin-radius)', padding: '1.25rem 1.5rem', boxShadow: 'var(--admin-shadow)' };
const cardHeader = { fontWeight: 700, fontSize: '0.9rem', color: 'var(--admin-text-primary)', marginBottom: '1rem', letterSpacing: '-0.01em' };
const statLabel = { fontSize: '0.72rem', fontWeight: 600, color: 'var(--admin-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.25rem' };
const statValue = { fontSize: '1.6rem', fontWeight: 800, color: 'var(--admin-text-primary)', letterSpacing: '-0.03em', lineHeight: 1.1 };
const fieldLabel = { fontSize: '0.72rem', fontWeight: 700, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' };
const inputStyle = { width: '100%', boxSizing: 'border-box', padding: '0.55rem 0.75rem', borderRadius: 10, border: '1px solid var(--admin-border-strong)', background: 'var(--admin-bg-secondary)', color: 'var(--admin-text-primary)', fontSize: '0.82rem', outline: 'none' };
const actionSecondary = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.55rem 0.9rem', borderRadius: 10, border: '1px solid var(--admin-border-strong)', background: 'transparent', color: 'var(--admin-text-primary)', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', minHeight: 38 };

const EVENT_BADGE = {
    created: { background: 'rgba(74,222,128,0.12)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)' },
    updated: { background: 'rgba(234,179,8,0.12)', color: '#ca8a04', border: '1px solid rgba(234,179,8,0.3)' },
    deleted: { background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' },
    default: { background: 'rgba(59,130,246,0.12)', color: 'var(--admin-accent)', border: '1px solid rgba(59,130,246,0.3)' },
};
const SUBJECT_BADGE = { background: 'var(--admin-bg-secondary)', color: 'var(--admin-text-muted)', border: '1px solid var(--admin-border)' };

function eventStyle(event) { return EVENT_BADGE[event] || EVENT_BADGE.default; }
function prettyEvent(e) { return e ? e.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'Activity'; }

function Badge({ children, style }) {
    return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, borderRadius: 999, padding: '0.2rem 0.6rem', fontSize: '0.7rem', fontWeight: 700, whiteSpace: 'nowrap', ...style }}>{children}</span>;
}

function fmtVal(v) {
    if (v === null || v === undefined || v === '') return '—';
    if (typeof v === 'boolean') return v ? 'true' : 'false';
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
}

// ── Change diff ───────────────────────────────────────────────────────────────
function ChangeDiff({ changes, properties }) {
    const attrs = changes?.attributes;
    const old = changes?.old || {};

    if (attrs && Object.keys(attrs).length) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {Object.keys(attrs).map((key) => {
                    const hasOld = old && Object.prototype.hasOwnProperty.call(old, key);
                    return (
                        <div key={key} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '0.4rem', fontSize: '0.8rem' }}>
                            <span style={{ fontWeight: 700, color: 'var(--admin-text-secondary)', minWidth: 120 }}>{key}</span>
                            {hasOld && (
                                <>
                                    <span style={{ color: '#f87171', textDecoration: 'line-through', wordBreak: 'break-word' }}>{fmtVal(old[key])}</span>
                                    <i className="bi bi-arrow-right" style={{ color: 'var(--admin-text-muted)', fontSize: '0.7rem' }} />
                                </>
                            )}
                            <span style={{ color: '#4ade80', wordBreak: 'break-word' }}>{fmtVal(attrs[key])}</span>
                        </div>
                    );
                })}
            </div>
        );
    }

    // Non-CRUD events: dump remaining properties
    const extra = Object.entries(properties || {}).filter(([k]) => k !== 'attributes' && k !== 'old');
    if (extra.length) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {extra.map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', fontSize: '0.8rem' }}>
                        <span style={{ fontWeight: 700, color: 'var(--admin-text-secondary)', minWidth: 120 }}>{k}</span>
                        <span style={{ color: 'var(--admin-text-primary)', wordBreak: 'break-word' }}>{fmtVal(v)}</span>
                    </div>
                ))}
            </div>
        );
    }

    return <p style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)' }}>No recorded field changes.</p>;
}

function Actor({ causer }) {
    if (!causer) return <span style={{ fontSize: '0.82rem', color: 'var(--admin-text-muted)' }}><i className="bi bi-robot" /> System</span>;
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
            <img src={avatarSrc(causer.avatar)} onError={onAvatarError} alt={causer.name} style={{ width: 30, height: 30, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
            <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--admin-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{causer.name}</div>
                {causer.role && <div style={{ fontSize: '0.7rem', color: 'var(--admin-text-muted)' }}>{causer.role}</div>}
            </div>
        </div>
    );
}

function Pagination({ links }) {
    if (!links?.length) return null;
    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {links.map((link, i) => (
                <button key={`${link.label}-${i}`} type="button" disabled={!link.url}
                    onClick={() => { if (link.url) router.get(link.url, {}, { preserveScroll: true, preserveState: true }); }}
                    style={{ borderRadius: 8, border: link.active ? 'none' : '1px solid var(--admin-border-strong)', padding: '0.35rem 0.85rem', fontSize: '0.82rem', cursor: link.url ? 'pointer' : 'not-allowed', background: link.active ? 'var(--admin-accent)' : 'transparent', color: link.active ? '#fff' : 'var(--admin-text-primary)', opacity: !link.url ? 0.45 : 1, fontWeight: link.active ? 700 : 400 }}
                    dangerouslySetInnerHTML={{ __html: link.label }} />
            ))}
        </div>
    );
}

function Skeleton() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <style>{`@keyframes pulse { 0%,100% { opacity: 0.4; } 50% { opacity: 0.8; } }`}</style>
            {Array.from({ length: 8 }).map((_, i) => <div key={i} style={{ height: 52, borderRadius: 10, background: 'var(--admin-bg-secondary)', animation: 'pulse 1.2s ease-in-out infinite' }} />)}
        </div>
    );
}

export default function Index() {
    const { activities, filters = {}, logNames = [], events = [], causers = [], stats = {} } = usePage().props;
    const bp = useBreakpoint();

    const [search, setSearch] = useState(filters.search || '');
    const [logName, setLogName] = useState(filters.log_name || '');
    const [event, setEvent] = useState(filters.event || '');
    const [causer, setCauser] = useState(filters.causer || '');
    const [dateFrom, setDateFrom] = useState(filters.date_from || '');
    const [dateTo, setDateTo] = useState(filters.date_to || '');
    const [expanded, setExpanded] = useState(() => new Set());
    const [navigating, setNavigating] = useState(false);

    const firstRender = useRef(true);
    const debounceRef = useRef(null);

    useEffect(() => {
        const off1 = router.on('start', () => setNavigating(true));
        const off2 = router.on('finish', () => setNavigating(false));
        return () => { off1(); off2(); };
    }, []);

    function applyFilters() {
        router.get(BASE, {
            search: search || undefined,
            log_name: logName || undefined,
            event: event || undefined,
            causer: causer || undefined,
            date_from: dateFrom || undefined,
            date_to: dateTo || undefined,
        }, { preserveState: true, preserveScroll: true, replace: true });
    }

    // Debounced reaction to any filter change
    useEffect(() => {
        if (firstRender.current) { firstRender.current = false; return; }
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(applyFilters, 300);
        return () => clearTimeout(debounceRef.current);
    }, [search, logName, event, causer, dateFrom, dateTo]);

    function resetFilters() {
        setSearch(''); setLogName(''); setEvent(''); setCauser(''); setDateFrom(''); setDateTo('');
        router.get(BASE, {}, { preserveState: false, preserveScroll: true, replace: true });
    }

    function toggle(id) {
        setExpanded((cur) => {
            const next = new Set(cur);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }

    const list = activities?.data || [];
    const hasFilters = search || logName || event || causer || dateFrom || dateTo;

    return (
        <AppLayout title="Audit Logs">
            <Head title="Audit Logs" />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {/* Header */}
                <div style={card}>
                    <p style={statLabel}>Monitoring &amp; Security</p>
                    <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--admin-text-primary)', letterSpacing: '-0.02em' }}>Audit Logs</h1>
                    <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--admin-text-secondary)', maxWidth: 640 }}>
                        A full trail of system activity — who changed what, and when. Records create, update, and delete events across core records.
                    </p>
                </div>

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem' }}>
                    {[
                        { label: 'Total Events', value: stats.total ?? 0 },
                        { label: 'Today', value: stats.today ?? 0 },
                        { label: 'Created', value: stats.created ?? 0, color: '#4ade80' },
                        { label: 'Updated', value: stats.updated ?? 0, color: '#ca8a04' },
                        { label: 'Deleted', value: stats.deleted ?? 0, color: '#f87171' },
                    ].map((s) => (
                        <div key={s.label} style={card}>
                            <p style={statLabel}>{s.label}</p>
                            <p style={{ ...statValue, color: s.color || 'var(--admin-text-primary)' }}>{s.value}</p>
                        </div>
                    ))}
                </div>

                {/* Filters */}
                <div style={card}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                        <p style={{ ...cardHeader, marginBottom: 0 }}>Filters</p>
                        {hasFilters && <button type="button" onClick={resetFilters} style={actionSecondary}><i className="bi bi-x-circle" /> Reset</button>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.55rem 0.8rem', borderRadius: 10, border: '1px solid var(--admin-border-strong)', background: 'var(--admin-bg-secondary)', marginBottom: '0.75rem' }}>
                        <i className="bi bi-search" style={{ color: 'var(--admin-text-muted)' }} />
                        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search description, actor, subject…" style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--admin-text-primary)', fontSize: '0.85rem' }} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: bp === 'mobile' ? '1fr 1fr' : 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.6rem' }}>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                            <span style={fieldLabel}>Module</span>
                            <select value={logName} onChange={(e) => setLogName(e.target.value)} style={inputStyle}>
                                <option value="">All modules</option>
                                {logNames.map((n) => <option key={n} value={n}>{n}</option>)}
                            </select>
                        </label>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                            <span style={fieldLabel}>Event</span>
                            <select value={event} onChange={(e) => setEvent(e.target.value)} style={inputStyle}>
                                <option value="">All events</option>
                                {events.map((ev) => <option key={ev} value={ev}>{prettyEvent(ev)}</option>)}
                            </select>
                        </label>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                            <span style={fieldLabel}>Actor</span>
                            <select value={causer} onChange={(e) => setCauser(e.target.value)} style={inputStyle}>
                                <option value="">All actors</option>
                                {causers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </label>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                            <span style={fieldLabel}>From</span>
                            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={inputStyle} />
                        </label>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                            <span style={fieldLabel}>To</span>
                            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={inputStyle} />
                        </label>
                    </div>
                </div>

                {/* Trail */}
                <div style={card}>
                    <p style={cardHeader}>Activity Trail</p>
                    {navigating ? (
                        <Skeleton />
                    ) : list.length === 0 ? (
                        <div style={{ padding: '2rem 0', textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: '0.875rem' }}>
                            <i className="bi bi-clipboard-x" style={{ fontSize: '1.6rem', display: 'block', marginBottom: '0.5rem' }} />
                            No activity found{hasFilters ? ' for these filters' : ' yet'}.
                        </div>
                    ) : bp === 'desktop' ? (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ minWidth: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead style={{ background: 'var(--admin-bg-secondary)' }}>
                                    <tr>
                                        {['When', 'Actor', 'Event', 'Subject', 'Summary', ''].map((h, i) => (
                                            <th key={h || i} style={{ padding: '0.7rem 1rem', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--admin-text-muted)', borderBottom: '1px solid var(--admin-border)' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {list.map((a) => {
                                        const open = expanded.has(a.id);
                                        return (
                                            <Fragment key={a.id}>
                                                <tr onClick={() => toggle(a.id)} style={{ borderBottom: open ? 'none' : '1px solid var(--admin-border)', cursor: 'pointer' }}>
                                                    <td style={{ padding: '0.7rem 1rem', fontSize: '0.78rem', color: 'var(--admin-text-secondary)', whiteSpace: 'nowrap' }} title={a.created_at}>{a.created_human}</td>
                                                    <td style={{ padding: '0.7rem 1rem' }}><Actor causer={a.causer} /></td>
                                                    <td style={{ padding: '0.7rem 1rem' }}><Badge style={eventStyle(a.event)}>{prettyEvent(a.event)}</Badge></td>
                                                    <td style={{ padding: '0.7rem 1rem' }}>
                                                        {a.subject_type ? (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                                <Badge style={SUBJECT_BADGE}>{a.subject_type}</Badge>
                                                                {a.subject_label && <span style={{ fontSize: '0.76rem', color: 'var(--admin-text-muted)' }}>{a.subject_label}</span>}
                                                            </div>
                                                        ) : <span style={{ color: 'var(--admin-text-muted)' }}>—</span>}
                                                    </td>
                                                    <td style={{ padding: '0.7rem 1rem', fontSize: '0.82rem', color: 'var(--admin-text-primary)' }}>{a.description}</td>
                                                    <td style={{ padding: '0.7rem 1rem', textAlign: 'right', color: 'var(--admin-text-muted)' }}><i className={`bi ${open ? 'bi-chevron-up' : 'bi-chevron-down'}`} /></td>
                                                </tr>
                                                {open && (
                                                    <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                                                        <td colSpan={6} style={{ padding: '0.5rem 1rem 1rem', background: 'var(--admin-bg-secondary)' }}>
                                                            <ChangeDiff changes={a.changes} properties={a.properties} />
                                                        </td>
                                                    </tr>
                                                )}
                                            </Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                            {list.map((a) => {
                                const open = expanded.has(a.id);
                                return (
                                    <div key={a.id} style={{ border: '1px solid var(--admin-border)', borderRadius: 10, padding: '0.85rem' }}>
                                        <div onClick={() => toggle(a.id)} style={{ cursor: 'pointer' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                                <Badge style={eventStyle(a.event)}>{prettyEvent(a.event)}</Badge>
                                                <span style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)' }} title={a.created_at}>{a.created_human}</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                                                <Actor causer={a.causer} />
                                                <i className={`bi ${open ? 'bi-chevron-up' : 'bi-chevron-down'}`} style={{ color: 'var(--admin-text-muted)' }} />
                                            </div>
                                            <p style={{ marginTop: '0.5rem', fontSize: '0.82rem', color: 'var(--admin-text-primary)' }}>{a.description}</p>
                                            {a.subject_type && (
                                                <div style={{ marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                    <Badge style={SUBJECT_BADGE}>{a.subject_type}</Badge>
                                                    {a.subject_label && <span style={{ fontSize: '0.76rem', color: 'var(--admin-text-muted)' }}>{a.subject_label}</span>}
                                                </div>
                                            )}
                                        </div>
                                        {open && (
                                            <div style={{ marginTop: '0.75rem', borderTop: '1px solid var(--admin-border)', paddingTop: '0.75rem' }}>
                                                <ChangeDiff changes={a.changes} properties={a.properties} />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {!navigating && list.length > 0 && (
                        <div style={{ marginTop: '1rem' }}><Pagination links={activities?.links || []} /></div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
