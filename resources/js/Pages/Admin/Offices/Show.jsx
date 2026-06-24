import AppLayout from '@/Layouts/AppLayout';
import { Head, router, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { avatarSrc, onAvatarError } from '@/Components/defaultAvatar';
import useBreakpoint from '@/Components/useBreakpoint';
import { useToast } from '@/Components/Snackbar';
import { useConfirm } from '@/Components/ConfirmDialog';

const BASE = '/administrator/offices';

// ── shared styles ─────────────────────────────────────────────────────────────
const card = { background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)', borderRadius: 'var(--admin-radius)', padding: '1.25rem 1.5rem', boxShadow: 'var(--admin-shadow)' };
const statLabel = { fontSize: '0.72rem', fontWeight: 600, color: 'var(--admin-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.25rem' };
const statValue = { fontSize: '1.5rem', fontWeight: 800, color: 'var(--admin-text-primary)', letterSpacing: '-0.02em', lineHeight: 1.1 };
const cardHeader = { fontWeight: 700, fontSize: '0.9rem', color: 'var(--admin-text-primary)', marginBottom: '1rem' };
const fieldLabel = { fontSize: '0.72rem', fontWeight: 700, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' };
const inputStyle = { width: '100%', boxSizing: 'border-box', padding: '0.7rem 0.9rem', borderRadius: 12, border: '1px solid var(--admin-border-strong)', background: 'var(--admin-bg-secondary)', color: 'var(--admin-text-primary)', fontSize: '0.875rem', outline: 'none' };
const actionPrimary = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.7rem 1rem', borderRadius: 12, border: 'none', background: 'var(--admin-accent)', color: '#fff', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer', textDecoration: 'none', minHeight: 42 };
const actionSecondary = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.7rem 1rem', borderRadius: 12, border: '1px solid var(--admin-border-strong)', background: 'transparent', color: 'var(--admin-text-primary)', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer', textDecoration: 'none', minHeight: 42 };

const STATUS_BADGE = {
    active: { background: 'rgba(74,222,128,0.12)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)' },
    inactive: { background: 'rgba(234,179,8,0.12)', color: '#ca8a04', border: '1px solid rgba(234,179,8,0.3)' },
};
const CODE_BADGE = { background: 'rgba(59,130,246,0.12)', color: 'var(--admin-accent)', border: '1px solid rgba(59,130,246,0.3)' };
const NEUTRAL_BADGE = { background: 'var(--admin-bg-secondary)', color: 'var(--admin-text-muted)', border: '1px solid var(--admin-border)' };

function Badge({ children, style }) {
    return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, borderRadius: 999, padding: '0.2rem 0.65rem', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap', ...style }}>{children}</span>;
}

function prettyStatus(s) {
    if (!s) return '—';
    return String(s).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function ratingColor(score) {
    const n = parseFloat(score);
    if (Number.isNaN(n)) return { color: 'var(--admin-text-muted)' };
    if (n >= 4.5) return { color: '#4ade80' };
    if (n >= 3.5) return { color: 'var(--admin-accent)' };
    if (n >= 2.5) return { color: '#ca8a04' };
    return { color: '#f87171' };
}

function fmtDate(value) {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(d);
}

// ── Form modal (local) ────────────────────────────────────────────────────────
function OfficeFormModal({ open, value, heads, bp, onClose, onChange, onSubmit, saving, errors }) {
    useEffect(() => {
        if (!open) return undefined;
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [open, onClose]);
    if (!open) return null;
    const isMobile = bp === 'mobile';
    const locked = Boolean(value.hris_id);
    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1200, display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', padding: isMobile ? 0 : '1rem' }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div style={{ width: '100%', maxWidth: isMobile ? '100%' : 520, borderRadius: isMobile ? '18px 18px 0 0' : 'var(--admin-radius-lg)', border: '1px solid var(--admin-border-strong)', background: 'var(--admin-card)', boxShadow: 'var(--admin-shadow)', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid var(--admin-border)', padding: '1.1rem 1.5rem' }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--admin-text-primary)' }}>Edit Office</h3>
                    <button type="button" onClick={onClose} style={{ background: 'none', border: '1px solid var(--admin-border-strong)', borderRadius: 8, padding: '0.4rem 0.6rem', cursor: 'pointer', color: 'var(--admin-text-muted)' }}><i className="bi bi-x-lg" /></button>
                </div>
                <form onSubmit={onSubmit} style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <span style={fieldLabel}>Office Name {locked && <i className="bi bi-lock-fill" />}</span>
                        <input value={value.name || ''} onChange={(e) => onChange('name', e.target.value)} style={{ ...inputStyle, opacity: locked ? 0.6 : 1 }} disabled={locked} />
                        {errors?.name && <span style={{ fontSize: '0.75rem', color: '#f87171' }}>{errors.name}</span>}
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <span style={fieldLabel}>Code {locked && <i className="bi bi-lock-fill" />}</span>
                        <input value={value.code || ''} onChange={(e) => onChange('code', e.target.value)} style={{ ...inputStyle, opacity: locked ? 0.6 : 1 }} disabled={locked} />
                        {errors?.code && <span style={{ fontSize: '0.75rem', color: '#f87171' }}>{errors.code}</span>}
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <span style={fieldLabel}>Department Head</span>
                        <select value={value.head_id || ''} onChange={(e) => onChange('head_id', e.target.value)} style={inputStyle}>
                            <option value="">No head assigned</option>
                            {heads.map((h) => <option key={h.id} value={h.id}>{h.name}{h.position ? ` — ${h.position}` : ''}</option>)}
                        </select>
                    </label>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--admin-border)', paddingTop: '1rem' }}>
                        <button type="button" onClick={onClose} style={actionSecondary}>Cancel</button>
                        <button type="submit" disabled={saving} style={{ ...actionPrimary, opacity: saving ? 0.7 : 1 }}>{saving ? 'Saving…' : 'Save Changes'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
const TABS = [
    { key: 'overview', label: 'Overview', icon: 'bi-grid-1x2' },
    { key: 'people', label: 'People', icon: 'bi-people' },
    { key: 'history', label: 'Performance History', icon: 'bi-graph-up' },
    { key: 'settings', label: 'Settings', icon: 'bi-gear' },
];

function Sparkline({ points }) {
    if (!points || points.length < 2) return null;
    const w = 320, h = 70, pad = 8;
    const xs = points.map((_, i) => pad + (i * (w - pad * 2)) / (points.length - 1));
    const min = Math.min(...points), max = Math.max(...points);
    const range = max - min || 1;
    const ys = points.map((p) => h - pad - ((p - min) / range) * (h - pad * 2));
    const path = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ');
    return (
        <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', maxWidth: w, height: 'auto' }}>
            <path d={path} fill="none" stroke="var(--admin-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            {xs.map((x, i) => <circle key={i} cx={x} cy={ys[i]} r="3" fill="var(--admin-accent)" />)}
        </svg>
    );
}

// ── Overview tab ──────────────────────────────────────────────────────────────
function OverviewTab({ office, stats, bp }) {
    const cols = bp === 'desktop' ? 'repeat(4, 1fr)' : 'repeat(2, 1fr)';
    const cards = [
        { label: 'Total Employees', value: stats.total_employees ?? 0, icon: 'bi-people' },
        { label: 'Active UWPs', value: stats.active_uwp ?? 0, icon: 'bi-journal-check' },
        { label: 'OPCR Status', value: prettyStatus(stats.opcr_status), icon: 'bi-clipboard-data', small: true },
        { label: 'Latest Rating', value: stats.latest_rating != null ? Number(stats.latest_rating).toFixed(2) : '—', icon: 'bi-star', color: stats.latest_rating != null ? ratingColor(stats.latest_rating).color : undefined },
    ];
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: cols, gap: '0.75rem' }}>
                {cards.map((c) => (
                    <div key={c.label} style={card}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <p style={statLabel}>{c.label}</p>
                            <i className={`bi ${c.icon}`} style={{ color: 'var(--admin-text-muted)' }} />
                        </div>
                        <p style={{ ...statValue, fontSize: c.small ? '1.05rem' : '1.5rem', color: c.color || 'var(--admin-text-primary)' }}>{c.value}</p>
                        {c.label === 'Latest Rating' && stats.latest_adjectival && <p style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)', marginTop: '0.2rem' }}>{stats.latest_adjectival}</p>}
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: bp === 'mobile' ? '1fr' : '1.2fr 1fr', gap: '0.75rem' }}>
                {/* Department Head */}
                <div style={card}>
                    <p style={cardHeader}>Department Head</p>
                    {office.head ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <img src={avatarSrc(office.head.profile_photo_url)} onError={onAvatarError} alt={office.head.name} style={{ width: 56, height: 56, borderRadius: 14, objectFit: 'cover' }} />
                            <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: 700, color: 'var(--admin-text-primary)' }}>{office.head.name}</div>
                                {office.head.position && <div style={{ fontSize: '0.8rem', color: 'var(--admin-text-secondary)' }}>{office.head.position}</div>}
                                {office.head.email && <div style={{ fontSize: '0.78rem', color: 'var(--admin-text-muted)' }}>{office.head.email}</div>}
                                <a href={`/administrator/users?search=${encodeURIComponent(office.head.name)}`} style={{ fontSize: '0.78rem', color: 'var(--admin-accent)', textDecoration: 'none', marginTop: '0.3rem', display: 'inline-block' }}>View Profile →</a>
                            </div>
                        </div>
                    ) : (
                        <p style={{ color: 'var(--admin-text-muted)', fontSize: '0.85rem' }}>No department head assigned.</p>
                    )}
                </div>

                {/* Office info */}
                <div style={card}>
                    <p style={cardHeader}>Office Information</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        <InfoRow label="Created" value={fmtDate(office.created_at)} />
                        <InfoRow label="HRIS ID" value={office.hris_id || 'Manual office'} icon={office.hris_id ? 'bi-lock-fill' : null} />
                        <InfoRow label="Last Sync" value={office.hris_synced_at ? fmtDate(office.hris_synced_at) : 'Never'} />
                    </div>
                </div>
            </div>
        </div>
    );
}

function InfoRow({ label, value, icon }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--admin-text-muted)' }}>{label}</span>
            <span style={{ fontSize: '0.82rem', color: 'var(--admin-text-primary)', fontWeight: 600 }}>{icon && <i className={`bi ${icon}`} style={{ marginRight: 4, color: 'var(--admin-text-muted)' }} />}{value}</span>
        </div>
    );
}

// ── People tab ────────────────────────────────────────────────────────────────
function PeopleTab({ office, people, bp, filters }) {
    const [empSearch, setEmpSearch] = useState(filters.emp_search || '');
    const firstRender = useRef(true);
    const debounceRef = useRef(null);

    useEffect(() => {
        if (firstRender.current) { firstRender.current = false; return; }
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            router.get(`${BASE}/${office.id}`, { emp_search: empSearch || undefined, tab: 'people' }, { preserveState: true, preserveScroll: true, replace: true, only: ['people', 'filters'] });
        }, 300);
        return () => clearTimeout(debounceRef.current);
    }, [empSearch]);

    const employees = people.employees?.data || [];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {/* Head */}
            <div style={card}>
                <p style={cardHeader}>Department Head</p>
                {office.head ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                        <img src={avatarSrc(office.head.profile_photo_url)} onError={onAvatarError} alt={office.head.name} style={{ width: 44, height: 44, borderRadius: 12, objectFit: 'cover' }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, color: 'var(--admin-text-primary)' }}>{office.head.name}</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--admin-text-muted)' }}>{office.head.position || 'Department Head'}{office.head.email ? ` · ${office.head.email}` : ''}</div>
                        </div>
                        <Badge style={{ background: 'rgba(168,85,247,0.15)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.3)' }}>Dept Head</Badge>
                    </div>
                ) : <p style={{ color: 'var(--admin-text-muted)', fontSize: '0.85rem' }}>No department head assigned.</p>}
            </div>

            {/* Supervisors */}
            <div style={card}>
                <p style={cardHeader}>Supervisors ({people.supervisors.length})</p>
                {people.supervisors.length === 0 ? (
                    <p style={{ color: 'var(--admin-text-muted)', fontSize: '0.85rem' }}>No supervisors assigned.</p>
                ) : bp === 'desktop' ? (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead><tr>{['Name', 'Position', 'Manages'].map((h) => <th key={h} style={{ textAlign: 'left', padding: '0.5rem 0.75rem', fontSize: '0.68rem', textTransform: 'uppercase', color: 'var(--admin-text-muted)', borderBottom: '1px solid var(--admin-border)' }}>{h}</th>)}</tr></thead>
                        <tbody>
                            {people.supervisors.map((s) => (
                                <tr key={s.id} style={{ borderBottom: '1px solid var(--admin-border)' }}>
                                    <td style={{ padding: '0.6rem 0.75rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                            <img src={avatarSrc(s.profile_photo_url)} onError={onAvatarError} alt={s.name} style={{ width: 30, height: 30, borderRadius: 8, objectFit: 'cover' }} />
                                            <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--admin-text-primary)' }}>{s.name}</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '0.6rem 0.75rem', fontSize: '0.82rem', color: 'var(--admin-text-secondary)' }}>{s.position || '—'}</td>
                                    <td style={{ padding: '0.6rem 0.75rem', fontSize: '0.82rem', color: 'var(--admin-text-secondary)' }}>{s.manages_count} employees</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div style={{ display: 'flex', gap: '0.6rem', overflowX: 'auto', paddingBottom: '0.3rem' }}>
                        {people.supervisors.map((s) => (
                            <div key={s.id} style={{ minWidth: 200, border: '1px solid var(--admin-border)', borderRadius: 10, padding: '0.85rem', flexShrink: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                                    <img src={avatarSrc(s.profile_photo_url)} onError={onAvatarError} alt={s.name} style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover' }} />
                                    <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--admin-text-primary)' }}>{s.name}</span>
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>{s.position || '—'}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-secondary)', marginTop: '0.3rem' }}>Manages {s.manages_count}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Employees */}
            <div style={card}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                    <p style={{ ...cardHeader, marginBottom: 0 }}>Employees</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.45rem 0.75rem', borderRadius: 10, border: '1px solid var(--admin-border-strong)', background: 'var(--admin-bg-secondary)', minWidth: 200 }}>
                        <i className="bi bi-search" style={{ color: 'var(--admin-text-muted)' }} />
                        <input value={empSearch} onChange={(e) => setEmpSearch(e.target.value)} placeholder="Search employees…" style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--admin-text-primary)', fontSize: '0.82rem' }} />
                    </div>
                </div>

                {employees.length === 0 ? (
                    <p style={{ color: 'var(--admin-text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem 0' }}>No employees found.</p>
                ) : bp === 'desktop' ? (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead><tr>{['Name', 'Position', 'Latest IPCR', 'Rating'].map((h) => <th key={h} style={{ textAlign: 'left', padding: '0.5rem 0.75rem', fontSize: '0.68rem', textTransform: 'uppercase', color: 'var(--admin-text-muted)', borderBottom: '1px solid var(--admin-border)' }}>{h}</th>)}</tr></thead>
                        <tbody>
                            {employees.map((e) => (
                                <tr key={e.id} style={{ borderBottom: '1px solid var(--admin-border)' }}>
                                    <td style={{ padding: '0.6rem 0.75rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                            <img src={avatarSrc(e.profile_photo_url)} onError={onAvatarError} alt={e.name} style={{ width: 30, height: 30, borderRadius: 8, objectFit: 'cover' }} />
                                            <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--admin-text-primary)' }}>{e.name}</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '0.6rem 0.75rem', fontSize: '0.82rem', color: 'var(--admin-text-secondary)' }}>{e.position || '—'}</td>
                                    <td style={{ padding: '0.6rem 0.75rem', fontSize: '0.85rem', fontWeight: 700, ...(e.ipcr_score != null ? ratingColor(e.ipcr_score) : { color: 'var(--admin-text-muted)' }) }}>{e.ipcr_score != null ? Number(e.ipcr_score).toFixed(2) : '—'}</td>
                                    <td style={{ padding: '0.6rem 0.75rem' }}>{e.ipcr_adjectival ? <Badge style={NEUTRAL_BADGE}>{e.ipcr_adjectival}</Badge> : <span style={{ color: 'var(--admin-text-muted)' }}>—</span>}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        {employees.map((e) => (
                            <div key={e.id} style={{ border: '1px solid var(--admin-border)', borderRadius: 10, padding: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <img src={avatarSrc(e.profile_photo_url)} onError={onAvatarError} alt={e.name} style={{ width: 38, height: 38, borderRadius: 10, objectFit: 'cover' }} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--admin-text-primary)' }}>{e.name}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>{e.position || '—'}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontWeight: 700, fontSize: '0.9rem', ...(e.ipcr_score != null ? ratingColor(e.ipcr_score) : { color: 'var(--admin-text-muted)' }) }}>{e.ipcr_score != null ? Number(e.ipcr_score).toFixed(2) : '—'}</div>
                                    {e.ipcr_adjectival && <div style={{ fontSize: '0.7rem', color: 'var(--admin-text-muted)' }}>{e.ipcr_adjectival}</div>}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div style={{ marginTop: '1rem' }}><Pagination links={people.employees?.links || []} extra={{ tab: 'people' }} /></div>
            </div>
        </div>
    );
}

function Pagination({ links, extra = {} }) {
    if (!links?.length) return null;
    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {links.map((link, i) => (
                <button key={`${link.label}-${i}`} type="button" disabled={!link.url}
                    onClick={() => { if (link.url) router.get(link.url, extra, { preserveScroll: true, preserveState: true }); }}
                    style={{ borderRadius: 8, border: link.active ? 'none' : '1px solid var(--admin-border-strong)', padding: '0.35rem 0.85rem', fontSize: '0.82rem', cursor: link.url ? 'pointer' : 'not-allowed', background: link.active ? 'var(--admin-accent)' : 'transparent', color: link.active ? '#fff' : 'var(--admin-text-primary)', opacity: !link.url ? 0.45 : 1, fontWeight: link.active ? 700 : 400 }}
                    dangerouslySetInnerHTML={{ __html: link.label }} />
            ))}
        </div>
    );
}

// ── History tab ───────────────────────────────────────────────────────────────
function HistoryTab({ office, history }) {
    const [open, setOpen] = useState(() => (history[0] ? { [history[0].period_id]: true } : {}));
    const rated = history.filter((h) => h.office_rating != null);
    const chrono = [...rated].reverse(); // oldest → newest for sparkline
    const points = chrono.map((h) => parseFloat(h.office_rating));

    if (history.length === 0) {
        return <div style={card}><p style={{ color: 'var(--admin-text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem 0' }}>No performance history recorded yet.</p></div>;
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={card}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <p style={{ ...cardHeader, marginBottom: 0 }}>Office Rating Trend</p>
                    <button type="button" onClick={() => window.open(`${BASE}/${office.id}/export-history`, '_blank')} style={{ ...actionSecondary, padding: '0.45rem 0.85rem', minHeight: 36, fontSize: '0.8rem' }}><i className="bi bi-download" /> Export CSV</button>
                </div>
                {points.length >= 2
                    ? <div style={{ marginTop: '0.75rem' }}><Sparkline points={points} /></div>
                    : <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--admin-text-muted)' }}>Need at least two rated periods to chart a trend.</p>}
            </div>

            {history.map((h) => {
                const isOpen = Boolean(open[h.period_id]);
                return (
                    <div key={h.period_id} style={card}>
                        <button type="button" onClick={() => setOpen((c) => ({ ...c, [h.period_id]: !c[h.period_id] }))}
                            style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                                <i className={`bi ${isOpen ? 'bi-chevron-down' : 'bi-chevron-right'}`} style={{ color: 'var(--admin-text-muted)' }} />
                                <span style={{ fontWeight: 700, color: 'var(--admin-text-primary)' }}>{h.period}</span>
                                <Badge style={NEUTRAL_BADGE}>UWP: {prettyStatus(h.uwp_status)}</Badge>
                                <Badge style={NEUTRAL_BADGE}>OPCR: {prettyStatus(h.opcr_status)}</Badge>
                                <Badge style={CODE_BADGE}>{h.dev_plans} Dev Plans</Badge>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '1.3rem', fontWeight: 800, ...(h.office_rating != null ? ratingColor(h.office_rating) : { color: 'var(--admin-text-muted)' }) }}>{h.office_rating != null ? Number(h.office_rating).toFixed(2) : '—'}</div>
                                {h.office_adjectival && <div style={{ fontSize: '0.7rem', color: 'var(--admin-text-muted)' }}>{h.office_adjectival}</div>}
                            </div>
                        </button>

                        {isOpen && (
                            <div style={{ marginTop: '0.85rem', borderTop: '1px solid var(--admin-border)', paddingTop: '0.85rem' }}>
                                {h.employees.length === 0 ? (
                                    <p style={{ fontSize: '0.82rem', color: 'var(--admin-text-muted)' }}>No employee ratings recorded for this period.</p>
                                ) : (
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead><tr>{['Employee', 'Score', 'Adjectival'].map((c) => <th key={c} style={{ textAlign: 'left', padding: '0.4rem 0.6rem', fontSize: '0.68rem', textTransform: 'uppercase', color: 'var(--admin-text-muted)' }}>{c}</th>)}</tr></thead>
                                        <tbody>
                                            {h.employees.map((emp, idx) => (
                                                <tr key={idx} style={{ borderTop: '1px solid var(--admin-border)' }}>
                                                    <td style={{ padding: '0.4rem 0.6rem', fontSize: '0.82rem', color: 'var(--admin-text-primary)' }}>{emp.name}</td>
                                                    <td style={{ padding: '0.4rem 0.6rem', fontSize: '0.82rem', fontWeight: 700, ...(emp.score != null ? ratingColor(emp.score) : { color: 'var(--admin-text-muted)' }) }}>{emp.score != null ? Number(emp.score).toFixed(2) : '—'}</td>
                                                    <td style={{ padding: '0.4rem 0.6rem', fontSize: '0.82rem', color: 'var(--admin-text-secondary)' }}>{emp.adjectival || '—'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// ── Settings tab ──────────────────────────────────────────────────────────────
function SettingsTab({ office, heads, toast, confirm }) {
    const locked = Boolean(office.hris_id);
    const [form, setForm] = useState({ name: office.name, code: office.code || '', head_id: office.head?.id || '', is_active: office.is_active });
    const [saving, setSaving] = useState(false);

    function save(e) {
        e.preventDefault();
        setSaving(true);
        router.put(`${BASE}/${office.id}`, { name: form.name, code: form.code || null, head_id: form.head_id || null, is_active: form.is_active }, {
            preserveScroll: true,
            onFinish: () => setSaving(false),
        });
    }

    function handleDeactivate() {
        confirm(`${office.is_active ? 'Deactivate' : 'Activate'} "${office.name}"?`).then((ok) => {
            if (ok) router.post(`${BASE}/${office.id}/toggle-status`, {}, { preserveScroll: true });
        });
    }

    function handleDelete() {
        if (office.has_records) return;
        confirm(`Delete "${office.name}"? This cannot be undone.`).then((ok) => {
            if (ok) router.delete(`${BASE}/${office.id}`);
        });
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {/* Edit form */}
            <form onSubmit={save} style={card}>
                <p style={cardHeader}>Office Details</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <span style={fieldLabel}>Name {locked && <i className="bi bi-lock-fill" />}</span>
                        <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} style={{ ...inputStyle, opacity: locked ? 0.6 : 1 }} disabled={locked} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <span style={fieldLabel}>Code {locked && <i className="bi bi-lock-fill" />}</span>
                        <input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} style={{ ...inputStyle, opacity: locked ? 0.6 : 1 }} disabled={locked} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <span style={fieldLabel}>Department Head</span>
                        <select value={form.head_id} onChange={(e) => setForm((f) => ({ ...f, head_id: e.target.value }))} style={inputStyle}>
                            <option value="">No head assigned</option>
                            {heads.map((h) => <option key={h.id} value={h.id}>{h.name}{h.position ? ` — ${h.position}` : ''}</option>)}
                        </select>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: 12, border: '1px solid var(--admin-border-strong)', padding: '0.75rem 1rem', background: 'var(--admin-bg-secondary)' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--admin-text-primary)', fontWeight: 500 }}>Active</span>
                        <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} style={{ width: 16, height: 16, accentColor: 'var(--admin-accent)' }} />
                    </label>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button type="submit" disabled={saving} style={{ ...actionPrimary, opacity: saving ? 0.7 : 1 }}>{saving ? 'Saving…' : 'Save Changes'}</button>
                    </div>
                </div>
            </form>

            {/* HRIS */}
            <div style={card}>
                <p style={cardHeader}>HRIS Integration</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span style={{ width: 10, height: 10, borderRadius: 999, background: office.hris_id ? '#4ade80' : 'var(--admin-text-muted)', display: 'inline-block' }} />
                        <div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--admin-text-primary)', fontWeight: 600 }}>{office.hris_id ? 'Synced with HRIS' : 'Manual office (not synced)'}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>Last sync: {office.hris_synced_at ? fmtDate(office.hris_synced_at) : 'Never'}</div>
                        </div>
                    </div>
                    <button type="button" onClick={() => toast('HRIS sync triggered', 'info')} style={{ ...actionSecondary, padding: '0.5rem 0.9rem', minHeight: 38, fontSize: '0.82rem' }}><i className="bi bi-arrow-repeat" /> Manual Sync</button>
                </div>
            </div>

            {/* Danger zone */}
            <div style={{ ...card, border: '1px solid rgba(239,68,68,0.4)' }}>
                <p style={{ ...cardHeader, color: '#f87171' }}><i className="bi bi-exclamation-triangle" style={{ marginRight: 6 }} />Danger Zone</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--admin-text-primary)' }}>{office.is_active ? 'Deactivate office' : 'Activate office'}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>Employees remain but cannot create new work plans while inactive.</div>
                        </div>
                        <button type="button" onClick={handleDeactivate} style={{ ...actionSecondary, color: '#ca8a04', borderColor: 'rgba(234,179,8,0.4)', padding: '0.5rem 0.9rem', minHeight: 38, fontSize: '0.82rem' }}>{office.is_active ? 'Deactivate' : 'Activate'}</button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap', borderTop: '1px solid var(--admin-border)', paddingTop: '0.75rem' }}>
                        <div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--admin-text-primary)' }}>Delete office</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>{office.has_records ? 'Disabled — office still has people or records attached.' : 'Permanently remove this office.'}</div>
                        </div>
                        <button type="button" onClick={handleDelete} disabled={office.has_records} title={office.has_records ? 'Office has related records' : ''}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.9rem', minHeight: 38, fontSize: '0.82rem', borderRadius: 10, border: 'none', background: '#ef4444', color: '#fff', fontWeight: 700, cursor: office.has_records ? 'not-allowed' : 'pointer', opacity: office.has_records ? 0.45 : 1 }}>
                            <i className="bi bi-trash" /> Delete
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Show() {
    const { office, people, history = [], stats = {}, heads = [], filters = {}, flash = {}, errors = {} } = usePage().props;
    const bp = useBreakpoint();
    const isCompact = bp !== 'desktop';
    const toast = useToast();
    const confirm = useConfirm();

    const initialTab = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '').get('tab') || 'overview';
    const [tab, setTab] = useState(TABS.some((t) => t.key === initialTab) ? initialTab : 'overview');
    const [editor, setEditor] = useState(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (flash?.success) toast(flash.success, 'success');
        if (flash?.error) toast(flash.error, 'error');
    }, [flash?.success, flash?.error]);

    function openEdit() {
        if (office.hris_id) toast('Name and code are managed by HRIS.', 'warning');
        setEditor({ name: office.name, code: office.code || '', head_id: office.head?.id || '', hris_id: office.hris_id });
    }

    function submitEditor(e) {
        e.preventDefault();
        setSaving(true);
        router.put(`${BASE}/${office.id}`, { name: editor.name, code: editor.code || null, head_id: editor.head_id || null }, {
            preserveScroll: true,
            onFinish: () => setSaving(false),
            onSuccess: () => setEditor(null),
        });
    }

    return (
        <AppLayout title={office.name}>
            <Head title={office.name} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {/* Sticky header */}
                <div style={{ ...card, position: 'sticky', top: 0, zIndex: 50, padding: isCompact ? '1rem' : '1.25rem 1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: isCompact ? '0.6rem' : '0.85rem', minWidth: 0 }}>
                            <button type="button" onClick={() => router.visit(BASE)} title="Back to offices" style={{ ...actionSecondary, padding: '0.5rem 0.7rem', minHeight: 38, flexShrink: 0 }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg></button>
                            <div style={{ minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    <h1 style={{ fontSize: isCompact ? '1.1rem' : '1.35rem', fontWeight: 800, color: 'var(--admin-text-primary)', letterSpacing: '-0.02em', lineHeight: 1.2, wordBreak: 'break-word' }}>{office.name}</h1>
                                    {office.code && <Badge style={CODE_BADGE}>{office.code}</Badge>}
                                    <span title={office.hris_id ? 'Synced with HRIS' : 'Manual office'} style={{ width: 10, height: 10, borderRadius: 999, background: office.hris_id ? '#4ade80' : 'var(--admin-text-muted)', display: 'inline-block', flexShrink: 0 }} />
                                </div>
                                <div style={{ marginTop: '0.4rem' }}>
                                    <Badge style={office.is_active ? STATUS_BADGE.active : STATUS_BADGE.inactive}>{office.is_active ? 'Active' : 'Inactive'}</Badge>
                                </div>
                            </div>
                        </div>
                        <button type="button" onClick={openEdit} title="Edit office" style={{ ...actionPrimary, flexShrink: 0, padding: isCompact ? '0.5rem 0.7rem' : '0.7rem 1rem' }}>
                            <i className="bi bi-pencil" />{!isCompact && ' Edit'}
                        </button>
                    </div>

                    {/* Tabs — icons only on mobile/tablet, full labels on desktop */}
                    <div style={{ display: 'flex', gap: '0.4rem', marginTop: '1rem', overflowX: 'auto', borderTop: '1px solid var(--admin-border)', paddingTop: '0.85rem', justifyContent: isCompact ? 'space-between' : 'flex-start' }}>
                        {TABS.map((t) => {
                            const active = tab === t.key;
                            return (
                                <button key={t.key} type="button" onClick={() => setTab(t.key)} title={t.label} aria-label={t.label}
                                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', padding: isCompact ? '0.55rem' : '0.45rem 0.9rem', width: isCompact ? 44 : 'auto', height: isCompact ? 44 : 'auto', borderRadius: isCompact ? 12 : 8, fontSize: isCompact ? '1.05rem' : '0.82rem', fontWeight: 600, whiteSpace: 'nowrap', cursor: 'pointer', flexShrink: 0, border: active ? 'none' : '1px solid var(--admin-border)', background: active ? 'var(--admin-accent)' : 'transparent', color: active ? '#fff' : 'var(--admin-text-secondary)' }}>
                                    <i className={`bi ${t.icon}`} />{!isCompact && ` ${t.label}`}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Tab content */}
                {tab === 'overview' && <OverviewTab office={office} stats={stats} bp={bp} />}
                {tab === 'people' && <PeopleTab office={office} people={people} bp={bp} filters={filters} />}
                {tab === 'history' && <HistoryTab office={office} history={history} />}
                {tab === 'settings' && <SettingsTab office={office} heads={heads} toast={toast} confirm={confirm} />}
            </div>

            <OfficeFormModal
                open={Boolean(editor)}
                value={editor || {}}
                heads={heads}
                bp={bp}
                errors={errors}
                onClose={() => setEditor(null)}
                onChange={(field, val) => setEditor((c) => ({ ...c, [field]: val }))}
                onSubmit={submitEditor}
                saving={saving}
            />
        </AppLayout>
    );
}
