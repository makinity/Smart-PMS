import AppLayout from '@/Layouts/AppLayout';
import { Head, router, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { avatarSrc, onAvatarError } from '@/Components/defaultAvatar';
import useBreakpoint from '@/Components/useBreakpoint';
import { useToast } from '@/Components/Snackbar';

const BASE = '/administrator/offices';

// ── shared styles ─────────────────────────────────────────────────────────────
const card = {
    background: 'var(--admin-card)',
    border: '1px solid var(--admin-border-strong)',
    borderRadius: 'var(--admin-radius)',
    padding: '1.25rem 1.5rem',
    boxShadow: 'var(--admin-shadow)',
};
const cardHeader = { fontWeight: 700, fontSize: '0.9rem', color: 'var(--admin-text-primary)', marginBottom: '1rem', letterSpacing: '-0.01em' };
const statLabel = { fontSize: '0.72rem', fontWeight: 600, color: 'var(--admin-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.25rem' };
const statValue = { fontSize: '1.6rem', fontWeight: 800, color: 'var(--admin-text-primary)', letterSpacing: '-0.03em', lineHeight: 1.1 };
const fieldLabel = { fontSize: '0.72rem', fontWeight: 700, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' };
const inputStyle = { width: '100%', boxSizing: 'border-box', padding: '0.7rem 0.9rem', borderRadius: 12, border: '1px solid var(--admin-border-strong)', background: 'var(--admin-bg-secondary)', color: 'var(--admin-text-primary)', fontSize: '0.875rem', outline: 'none' };
const actionPrimary = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.7rem 1rem', borderRadius: 12, border: 'none', background: 'var(--admin-accent)', color: '#fff', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer', textDecoration: 'none', minHeight: 42 };
const actionSecondary = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.7rem 1rem', borderRadius: 12, border: '1px solid var(--admin-border-strong)', background: 'transparent', color: 'var(--admin-text-primary)', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer', textDecoration: 'none', minHeight: 42 };

const STATUS_BADGE = {
    active: { background: 'rgba(74,222,128,0.12)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)' },
    inactive: { background: 'rgba(234,179,8,0.12)', color: '#ca8a04', border: '1px solid rgba(234,179,8,0.3)' },
};
const CODE_BADGE = { background: 'rgba(59,130,246,0.12)', color: 'var(--admin-accent)', border: '1px solid rgba(59,130,246,0.3)' };

function Badge({ children, style }) {
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, borderRadius: 999, padding: '0.2rem 0.65rem', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap', ...style }}>
            {children}
        </span>
    );
}

const FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'inactive', label: 'Inactive' },
    { key: 'hris', label: 'HRIS Synced' },
];

// ── Form modal ────────────────────────────────────────────────────────────────
function OfficeFormModal({ open, mode, value, heads, bp, onClose, onChange, onSubmit, saving, errors }) {
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
        <div
            style={{ position: 'fixed', inset: 0, zIndex: 1200, display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', padding: isMobile ? 0 : '1rem' }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div style={{ width: '100%', maxWidth: isMobile ? '100%' : 520, borderRadius: isMobile ? '18px 18px 0 0' : 'var(--admin-radius-lg)', border: '1px solid var(--admin-border-strong)', background: 'var(--admin-card)', boxShadow: 'var(--admin-shadow)', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid var(--admin-border)', padding: '1.1rem 1.5rem' }}>
                    <div>
                        <p style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--admin-accent)', marginBottom: '0.2rem' }}>
                            {mode === 'create' ? 'Create Office' : 'Edit Office'}
                        </p>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--admin-text-primary)' }}>
                            {mode === 'create' ? 'Add a new office' : value.name || 'Update office'}
                        </h3>
                    </div>
                    <button type="button" onClick={onClose} style={{ background: 'none', border: '1px solid var(--admin-border-strong)', borderRadius: 8, padding: '0.4rem 0.6rem', cursor: 'pointer', color: 'var(--admin-text-muted)' }}>
                        <i className="bi bi-x-lg" />
                    </button>
                </div>

                <form onSubmit={onSubmit} style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: isMobile ? '70vh' : 'auto', overflowY: 'auto' }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <span style={fieldLabel}>Office Name {locked && <i className="bi bi-lock-fill" style={{ marginLeft: 4 }} />}</span>
                        <input value={value.name || ''} onChange={(e) => onChange('name', e.target.value)} placeholder="Human Resource Management Office" style={{ ...inputStyle, opacity: locked ? 0.6 : 1 }} disabled={locked} />
                        {errors?.name && <span style={{ fontSize: '0.75rem', color: '#f87171' }}>{errors.name}</span>}
                    </label>

                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <span style={fieldLabel}>Code {locked && <i className="bi bi-lock-fill" style={{ marginLeft: 4 }} />}</span>
                        <input value={value.code || ''} onChange={(e) => onChange('code', e.target.value)} placeholder="HRMO" style={{ ...inputStyle, opacity: locked ? 0.6 : 1 }} disabled={locked} />
                        {errors?.code && <span style={{ fontSize: '0.75rem', color: '#f87171' }}>{errors.code}</span>}
                    </label>

                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <span style={fieldLabel}>Department Head</span>
                        <select value={value.head_id || ''} onChange={(e) => onChange('head_id', e.target.value)} style={inputStyle}>
                            <option value="">No head assigned</option>
                            {heads.map((h) => <option key={h.id} value={h.id}>{h.name}{h.position ? ` — ${h.position}` : ''}</option>)}
                        </select>
                        {errors?.head_id && <span style={{ fontSize: '0.75rem', color: '#f87171' }}>{errors.head_id}</span>}
                    </label>

                    {locked && (
                        <div style={{ borderRadius: 10, border: '1px solid rgba(234,179,8,0.3)', background: 'rgba(234,179,8,0.1)', padding: '0.7rem 0.9rem', fontSize: '0.78rem', color: '#ca8a04' }}>
                            <i className="bi bi-shield-lock" style={{ marginRight: 6 }} />Name and code are synced from HRIS and cannot be edited here.
                        </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--admin-border)', paddingTop: '1rem' }}>
                        <button type="button" onClick={onClose} style={actionSecondary}>Cancel</button>
                        <button type="submit" disabled={saving} style={{ ...actionPrimary, opacity: saving ? 0.7 : 1 }}>
                            {saving ? 'Saving…' : mode === 'create' ? 'Create Office' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ── Row pieces ────────────────────────────────────────────────────────────────
function HeadCell({ head }) {
    if (!head) return <span style={{ color: 'var(--admin-text-muted)', fontSize: '0.82rem' }}>Unassigned</span>;
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <img src={avatarSrc(head.profile_photo_url)} onError={onAvatarError} alt={head.name} style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
            <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--admin-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{head.name}</div>
                {head.position && <div style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)' }}>{head.position}</div>}
            </div>
        </div>
    );
}

function OfficeCard({ office, onView, onEdit, onToggle }) {
    return (
        <article style={{ ...card, padding: '1.1rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                <div style={{ minWidth: 0 }}>
                    <button type="button" onClick={onView} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', fontWeight: 700, fontSize: '0.95rem', color: 'var(--admin-text-primary)' }}>{office.name}</button>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
                        {office.code && <Badge style={CODE_BADGE}>{office.code}</Badge>}
                        <Badge style={office.is_active ? STATUS_BADGE.active : STATUS_BADGE.inactive}>{office.is_active ? 'Active' : 'Inactive'}</Badge>
                        {office.hris_id && <Badge style={{ background: 'rgba(74,222,128,0.12)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)' }}><i className="bi bi-cloud-check" /> HRIS</Badge>}
                    </div>
                </div>
                <span style={{ fontSize: '0.78rem', color: 'var(--admin-text-muted)', whiteSpace: 'nowrap' }}><i className="bi bi-people" /> {office.employees_count}</span>
            </div>

            <HeadCell head={office.head} />

            <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid var(--admin-border)', paddingTop: '0.75rem' }}>
                <button type="button" onClick={onView} style={{ ...actionSecondary, flex: 1, padding: '0.45rem', fontSize: '0.8rem', minHeight: 36 }}><i className="bi bi-eye" /> View</button>
                <button type="button" onClick={onEdit} style={{ ...actionSecondary, flex: 1, padding: '0.45rem', fontSize: '0.8rem', minHeight: 36 }} disabled={Boolean(office.hris_id)} title={office.hris_id ? 'Managed by HRIS' : ''}><i className="bi bi-pencil" /> Edit</button>
                <button type="button" onClick={onToggle} style={{ ...actionSecondary, flex: 1, padding: '0.45rem', fontSize: '0.8rem', minHeight: 36 }}>{office.is_active ? 'Deactivate' : 'Activate'}</button>
            </div>
        </article>
    );
}

function Pagination({ links }) {
    if (!links?.length) return null;
    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {links.map((link, i) => (
                <button
                    key={`${link.label}-${i}`}
                    type="button"
                    disabled={!link.url}
                    onClick={() => { if (link.url) router.get(link.url, {}, { preserveScroll: true, preserveState: true }); }}
                    style={{ borderRadius: 8, border: link.active ? 'none' : '1px solid var(--admin-border-strong)', padding: '0.35rem 0.85rem', fontSize: '0.82rem', cursor: link.url ? 'pointer' : 'not-allowed', background: link.active ? 'var(--admin-accent)' : 'transparent', color: link.active ? '#fff' : 'var(--admin-text-primary)', opacity: !link.url ? 0.45 : 1, fontWeight: link.active ? 700 : 400 }}
                    dangerouslySetInnerHTML={{ __html: link.label }}
                />
            ))}
        </div>
    );
}

function Skeleton() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <style>{`@keyframes pulse { 0%,100% { opacity: 0.4; } 50% { opacity: 0.8; } }`}</style>
            {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{ height: 56, borderRadius: 10, background: 'var(--admin-bg-secondary)', animation: 'pulse 1.2s ease-in-out infinite' }} />
            ))}
        </div>
    );
}

export default function Index() {
    const { offices, filters = {}, heads = [], headAssignments = {}, stats = {}, flash = {}, errors = {} } = usePage().props;
    const bp = useBreakpoint();
    const toast = useToast();

    const [search, setSearch] = useState(filters.search || '');
    const [filter, setFilter] = useState(filters.filter || 'all');
    const [navigating, setNavigating] = useState(false);
    const [editor, setEditor] = useState(null);
    const [saving, setSaving] = useState(false);
    const [headWarning, setHeadWarning] = useState(null);
    const firstRender = useRef(true);
    const debounceRef = useRef(null);

    // Flash toasts
    useEffect(() => {
        if (flash?.success) toast(flash.success, 'success');
        if (flash?.error) toast(flash.error, 'error');
    }, [flash?.success, flash?.error]);

    // Inertia navigation indicator
    useEffect(() => {
        const off1 = router.on('start', () => setNavigating(true));
        const off2 = router.on('finish', () => setNavigating(false));
        return () => { off1(); off2(); };
    }, []);

    // Debounced search + filter sync
    useEffect(() => {
        if (firstRender.current) { firstRender.current = false; return; }
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            router.get(BASE, { search: search || undefined, filter: filter !== 'all' ? filter : undefined }, { preserveState: true, preserveScroll: true, replace: true });
        }, 300);
        return () => clearTimeout(debounceRef.current);
    }, [search, filter]);

    const list = offices?.data || [];

    function openCreate() { setEditor({ id: null, name: '', code: '', head_id: '', hris_id: null }); }
    function openEdit(office) {
        if (office.hris_id) { toast('Name and code are managed by HRIS.', 'warning'); }
        setEditor({ id: office.id, name: office.name, code: office.code || '', head_id: office.head?.id || '', hris_id: office.hris_id });
    }
    function changeEditor(field, val) {
        if (field === 'head_id' && val && headAssignments[val]) {
            // Show warning modal — this head is already assigned to another office
            setHeadWarning({ headId: val, officeName: headAssignments[val] });
            return;
        }
        setEditor((c) => ({ ...c, [field]: val }));
    }

    function confirmHeadAssignment() {
        if (headWarning) {
            setEditor((c) => ({ ...c, head_id: headWarning.headId }));
            setHeadWarning(null);
        }
    }

    function submitEditor(e) {
        e.preventDefault();
        if (!editor) return;
        setSaving(true);
        const payload = { name: editor.name, code: editor.code || null, head_id: editor.head_id || null };
        const cfg = {
            preserveScroll: true,
            onFinish: () => setSaving(false),
            onSuccess: () => setEditor(null),
        };
        if (editor.id) router.put(`${BASE}/${editor.id}`, payload, cfg);
        else router.post(BASE, payload, cfg);
    }

    function toggleStatus(office) {
        router.post(`${BASE}/${office.id}/toggle-status`, {}, { preserveScroll: true, preserveState: true });
    }

    const gridCols = bp === 'tablet' ? 'repeat(2, 1fr)' : '1fr';

    return (
        <AppLayout title="Offices">
            <Head title="Offices" />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {/* Header */}
                <div style={card}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                        <div>
                            <p style={statLabel}>Organization</p>
                            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--admin-text-primary)', letterSpacing: '-0.02em' }}>Offices</h1>
                            <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--admin-text-secondary)', maxWidth: 620 }}>
                                Manage organizational offices, assign department heads, and review per-office performance history.
                            </p>
                        </div>
                        <button type="button" onClick={openCreate} style={actionPrimary}><i className="bi bi-plus-lg" /> Add Office</button>
                    </div>
                </div>

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
                    {[
                        { label: 'Total Offices', value: stats.total ?? offices?.total ?? list.length },
                        { label: 'Active', value: stats.active ?? '—' },
                        { label: 'Inactive', value: stats.inactive ?? '—' },
                        { label: 'HRIS Synced', value: stats.hris ?? '—' },
                    ].map((s) => (
                        <div key={s.label} style={card}>
                            <p style={statLabel}>{s.label}</p>
                            <p style={statValue}>{s.value}</p>
                        </div>
                    ))}
                </div>

                {/* Search + filters */}
                <div style={card}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 0.85rem', borderRadius: 10, border: '1px solid var(--admin-border-strong)', background: 'var(--admin-bg-secondary)', marginBottom: '0.85rem' }}>
                        <i className="bi bi-search" style={{ color: 'var(--admin-text-muted)' }} />
                        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or code…" style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--admin-text-primary)', fontSize: '0.875rem' }} />
                        {search && <button type="button" onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-muted)' }}><i className="bi bi-x-circle" /></button>}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {FILTERS.map((f) => {
                            const active = filter === f.key;
                            return (
                                <button key={f.key} type="button" onClick={() => setFilter(f.key)}
                                    style={{ padding: '0.4rem 0.9rem', borderRadius: 999, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', border: active ? 'none' : '1px solid var(--admin-border-strong)', background: active ? 'var(--admin-accent)' : 'transparent', color: active ? '#fff' : 'var(--admin-text-secondary)' }}>
                                    {f.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* List */}
                <div style={card}>
                    <p style={cardHeader}>Office Directory</p>
                    {navigating ? (
                        <Skeleton />
                    ) : list.length === 0 ? (
                        <div style={{ padding: '2rem 0', textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: '0.875rem' }}>
                            <i className="bi bi-building" style={{ fontSize: '1.6rem', display: 'block', marginBottom: '0.5rem' }} />
                            No offices found.
                        </div>
                    ) : bp === 'desktop' ? (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ minWidth: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead style={{ background: 'var(--admin-bg-secondary)' }}>
                                    <tr>
                                        {['Office', 'Code', 'Head', 'Employees', 'Status', 'HRIS', 'Actions'].map((h, i) => (
                                            <th key={h} style={{ padding: '0.7rem 1rem', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--admin-text-muted)', borderBottom: '1px solid var(--admin-border)', textAlign: i === 6 ? 'right' : 'left' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {list.map((office) => (
                                        <tr key={office.id} style={{ borderBottom: '1px solid var(--admin-border)' }}>
                                            <td style={{ padding: '0.8rem 1rem' }}>
                                                <button type="button" onClick={() => router.visit(`${BASE}/${office.id}`)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem', color: 'var(--admin-accent)', textAlign: 'left' }}>{office.name}</button>
                                            </td>
                                            <td style={{ padding: '0.8rem 1rem' }}>{office.code ? <Badge style={CODE_BADGE}>{office.code}</Badge> : <span style={{ color: 'var(--admin-text-muted)' }}>—</span>}</td>
                                            <td style={{ padding: '0.8rem 1rem' }}><HeadCell head={office.head} /></td>
                                            <td style={{ padding: '0.8rem 1rem', fontSize: '0.85rem', color: 'var(--admin-text-secondary)' }}>{office.employees_count}</td>
                                            <td style={{ padding: '0.8rem 1rem' }}><Badge style={office.is_active ? STATUS_BADGE.active : STATUS_BADGE.inactive}>{office.is_active ? 'Active' : 'Inactive'}</Badge></td>
                                            <td style={{ padding: '0.8rem 1rem', textAlign: 'center' }}>
                                                {office.hris_id
                                                    ? <i className="bi bi-cloud-check-fill" style={{ color: '#4ade80' }} title={`Synced${office.hris_synced_at ? ` ${office.hris_synced_at}` : ''}`} />
                                                    : <i className="bi bi-dash-circle" style={{ color: 'var(--admin-text-muted)' }} title="Manual" />}
                                            </td>
                                            <td style={{ padding: '0.8rem 1rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                                <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                                                    <button type="button" onClick={() => router.visit(`${BASE}/${office.id}`)} style={{ ...actionSecondary, padding: '0.35rem 0.7rem', fontSize: '0.78rem', minHeight: 32 }}>View</button>
                                                    <button type="button" onClick={() => openEdit(office)} disabled={Boolean(office.hris_id)} style={{ ...actionSecondary, padding: '0.35rem 0.7rem', fontSize: '0.78rem', minHeight: 32, opacity: office.hris_id ? 0.5 : 1 }} title={office.hris_id ? 'Managed by HRIS' : ''}>Edit</button>
                                                    <button type="button" onClick={() => toggleStatus(office)} style={{ ...actionSecondary, padding: '0.35rem 0.7rem', fontSize: '0.78rem', minHeight: 32 }}>{office.is_active ? 'Deactivate' : 'Activate'}</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: '0.75rem' }}>
                            {list.map((office) => (
                                <OfficeCard key={office.id} office={office} onView={() => router.visit(`${BASE}/${office.id}`)} onEdit={() => openEdit(office)} onToggle={() => toggleStatus(office)} />
                            ))}
                        </div>
                    )}

                    {!navigating && list.length > 0 && (
                        <div style={{ marginTop: '1rem' }}>
                            <Pagination links={offices?.links || []} />
                        </div>
                    )}
                </div>
            </div>

            <OfficeFormModal
                open={Boolean(editor)}
                mode={editor?.id ? 'edit' : 'create'}
                value={editor || {}}
                heads={heads}
                bp={bp}
                errors={errors}
                onClose={() => setEditor(null)}
                onChange={changeEditor}
                onSubmit={submitEditor}
                saving={saving}
            />

            {/* Head Assignment Warning Modal */}
            {headWarning && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 1300, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', padding: '1rem' }}
                    onClick={(e) => { if (e.target === e.currentTarget) setHeadWarning(null); }}>
                    <div style={{ width: '100%', maxWidth: 420, borderRadius: 'var(--admin-radius-lg)', border: '1px solid var(--admin-border-strong)', background: 'var(--admin-card)', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
                        {/* Header */}
                        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--admin-border)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ca8a04', flexShrink: 0 }}>
                                <i className="bi bi-exclamation-triangle-fill" style={{ fontSize: '1.1rem' }} />
                            </div>
                            <div>
                                <p style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#ca8a04', marginBottom: '0.2rem' }}>Validation Warning</p>
                                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--admin-text-primary)' }}>Head Already Assigned</h3>
                            </div>
                        </div>

                        {/* Body */}
                        <div style={{ padding: '1.25rem 1.5rem' }}>
                            <p style={{ fontSize: '0.875rem', color: 'var(--admin-text-secondary)', lineHeight: 1.6, marginBottom: '1rem' }}>
                                This person is already assigned as the Department Head of <strong>{headWarning.officeName}</strong>.
                            </p>
                            <div style={{ padding: '0.75rem 1rem', borderRadius: 10, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', fontSize: '0.82rem', color: '#f87171', lineHeight: 1.5 }}>
                                <i className="bi bi-shield-exclamation" style={{ marginRight: 6 }} />
                                Each person can only be the Department Head of <strong>one office</strong>. Please select a different person or unassign them from {headWarning.officeName} first.
                            </div>
                        </div>

                        {/* Footer */}
                        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--admin-border)', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                            <button onClick={() => setHeadWarning(null)} style={actionSecondary}>Cancel</button>
                            <button onClick={() => setHeadWarning(null)} style={{ ...actionPrimary, background: '#ca8a04' }}>
                                <i className="bi bi-check-lg" /> Understood
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
