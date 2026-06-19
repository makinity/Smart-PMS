import { useState } from 'react';
import { usePage, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { avatarSrc, onAvatarError } from '@/Components/defaultAvatar';
import { useToast } from '@/Components/Snackbar';
import { useConfirm } from '@/Components/ConfirmDialog';

const STATUS_CFG = {
    pending_details:        { label: 'Pending Fill-up',        c: '#f59e0b', bg: 'rgba(245,158,11,0.12)', bc: 'rgba(245,158,11,0.3)' },
    submitted:              { label: 'Under Review',           c: '#60a5fa', bg: 'rgba(59,130,246,0.12)', bc: 'rgba(59,130,246,0.3)' },
    supervisor_recommended: { label: 'Sup. Recommended',       c: '#a78bfa', bg: 'rgba(139,92,246,0.12)', bc: 'rgba(139,92,246,0.3)' },
    returned:               { label: 'Returned',               c: '#f87171', bg: 'rgba(239,68,68,0.12)',  bc: 'rgba(239,68,68,0.3)' },
    approved:               { label: 'Approved',               c: '#10b981', bg: 'rgba(16,185,129,0.12)', bc: 'rgba(16,185,129,0.3)' },
    submitted_to_ld:        { label: 'Submitted to L&D',       c: '#4ade80', bg: 'rgba(74,222,128,0.12)', bc: 'rgba(74,222,128,0.3)' },
};
const RATING_COLOR = { 'Poor': '#ef4444', 'Unsatisfactory': '#f97316' };
const FILTERS = [
    { key: '', label: 'All' },
    { key: 'approved', label: 'Approved' },
    { key: 'supervisor_recommended', label: 'Sup. Recommended' },
    { key: 'submitted', label: 'Under Review' },
    { key: 'pending_details', label: 'Pending Fill-up' },
    { key: 'submitted_to_ld', label: 'Submitted to L&D' },
];

function relTime(iso) {
    if (!iso) return '—';
    const d = Math.floor((Date.now() - new Date(iso)) / 1000);
    if (d < 60) return 'just now';
    if (d < 3600) return `${Math.floor(d/60)}m ago`;
    if (d < 86400) return `${Math.floor(d/3600)}h ago`;
    return `${Math.floor(d/86400)}d ago`;
}

export default function Index() {
    const { plans = [], counts = {}, search: s0 = '', status: st0 = '' } = usePage().props;
    const toast = useToast();
    const confirm = useConfirm();
    const [search, setSearch] = useState(s0);
    const [filter, setFilter] = useState(st0);
    const [selected, setSelected] = useState([]);
    const [submitting, setSubmitting] = useState(false);

    const approvedIds = plans.filter(p => p.status === 'approved').map(p => p.id);
    const allApproved = approvedIds.length > 0 && approvedIds.every(id => selected.includes(id));
    const selectedCount = selected.filter(id => plans.find(p => p.id === id)?.status === 'approved').length;

    const doSearch = (val) => { setSearch(val); router.get('/pmt/idp', { search: val, status: filter }, { preserveState: true, replace: true }); };
    const doFilter = (key) => { setFilter(key); setSelected([]); router.get('/pmt/idp', { search, status: key }, { preserveState: true, replace: true }); };

    const bulkSubmit = async () => {
        const ids = selected.filter(id => plans.find(p => p.id === id)?.status === 'approved');
        if (!ids.length) { toast?.('Select approved IDPs.', 'warning'); return; }
        const ok = await confirm?.(`Submit ${ids.length} approved IDP(s) to L&D?`);
        if (!ok) return;
        setSubmitting(true);
        router.post('/pmt/idp/bulk-submit', { ids }, {
            preserveScroll: true,
            onSuccess: () => { toast?.('Submitted to L&D.', 'success'); setSelected([]); },
            onError:   () => toast?.('Some failed.', 'error'),
            onFinish:  () => setSubmitting(false),
        });
    };

    const card = { background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)', borderRadius: 'var(--admin-radius)', boxShadow: 'var(--admin-shadow)' };

    return (
        <AppLayout title="IDP" description="Individual Development Plans — Monitoring & L&D Submission">
            <div style={{ ...card, padding: '1.25rem' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: 8 }}>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--admin-text-primary)' }}>Individual Development Plans</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)', marginTop: 2 }}>
                            {counts.approved ?? 0} approved · {counts.submitted_to_ld ?? 0} submitted to L&D · {counts.all ?? 0} total
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        {approvedIds.length > 0 && (
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: 'var(--admin-text-muted)', cursor: 'pointer' }}>
                                <input type="checkbox" checked={allApproved} onChange={() => setSelected(allApproved ? [] : approvedIds)} />
                                Select all approved ({approvedIds.length})
                            </label>
                        )}
                        {selectedCount > 0 && (
                            <button onClick={bulkSubmit} disabled={submitting} style={{
                                padding: '0.5rem 1.1rem', borderRadius: 8, fontWeight: 700, fontSize: '0.82rem',
                                cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.6 : 1,
                                background: 'var(--admin-accent)', border: 'none', color: '#fff',
                                display: 'flex', alignItems: 'center', gap: '0.4rem',
                            }}>
                                <i className="bi bi-send" />
                                {submitting ? 'Submitting…' : `Submit to L&D (${selectedCount})`}
                            </button>
                        )}
                    </div>
                </div>

                {/* Search */}
                <div style={{ position: 'relative', marginBottom: '0.6rem' }}>
                    <i className="bi bi-search" style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--admin-text-muted)', fontSize: '0.78rem', pointerEvents: 'none' }} />
                    <input type="text" value={search} onChange={e => doSearch(e.target.value)} placeholder="Search by name or position…"
                        style={{ width: '100%', boxSizing: 'border-box', padding: '0.42rem 0.75rem 0.42rem 2rem', background: 'var(--admin-bg-secondary)', border: '1px solid var(--admin-border)', borderRadius: 8, color: 'var(--admin-text-primary)', fontSize: '0.78rem', outline: 'none', fontFamily: 'inherit' }} />
                </div>

                {/* Filters */}
                <div style={{ display: 'flex', gap: 4, marginBottom: '1rem', overflowX: 'auto', scrollbarWidth: 'none' }}>
                    {FILTERS.map(({ key, label }) => (
                        <button key={key} onClick={() => doFilter(key)} style={{
                            flexShrink: 0, padding: '0.35rem 0.85rem', borderRadius: 99, border: '1px solid',
                            fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
                            borderColor: filter === key ? 'var(--admin-accent)' : 'var(--admin-border)',
                            background: filter === key ? 'rgba(59,130,246,0.12)' : 'transparent',
                            color: filter === key ? 'var(--admin-accent)' : 'var(--admin-text-muted)',
                        }}>{label}{counts[key] ? ` (${counts[key]})` : ''}</button>
                    ))}
                </div>

                {/* List */}
                {plans.length === 0 ? (
                    <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: '0.85rem' }}>
                        <i className="bi bi-journal-bookmark" style={{ fontSize: '2rem', display: 'block', marginBottom: 8 }} />No IDPs found.
                    </div>
                ) : plans.map(p => {
                    const sc = STATUS_CFG[p.status] ?? STATUS_CFG.pending_details;
                    const rc = RATING_COLOR[p.source_rating] ?? '#ef4444';
                    const isApproved = p.status === 'approved';
                    const isChecked = selected.includes(p.id);
                    return (
                        <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 0.75rem', borderRadius: 10, borderLeft: `3px solid ${sc.c}`, background: isChecked ? 'rgba(59,130,246,0.06)' : 'transparent', marginBottom: '0.4rem', transition: 'background 0.15s' }}
                            onMouseEnter={e => { if (!isChecked) e.currentTarget.style.background = 'var(--admin-bg-secondary)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = isChecked ? 'rgba(59,130,246,0.06)' : 'transparent'; }}>
                            {isApproved && <input type="checkbox" checked={isChecked} onChange={() => setSelected(prev => prev.includes(p.id) ? prev.filter(x => x !== p.id) : [...prev, p.id])} style={{ flexShrink: 0, cursor: 'pointer' }} />}
                            <img src={avatarSrc(p.employee_avatar)} alt={p.employee_name} onError={onAvatarError}
                                style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid var(--admin-border-strong)', cursor: 'pointer' }}
                                onClick={() => router.visit(`/pmt/idp/${p.id}`)} />
                            <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => router.visit(`/pmt/idp/${p.id}`)}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--admin-text-primary)' }}>{p.employee_name}</span>
                                    <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '1px 8px', borderRadius: 99, color: sc.c, background: sc.bg, border: `1px solid ${sc.bc}` }}>{sc.label}</span>
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)', marginTop: 2 }}>{p.position} · {p.employee_office}</div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)', marginTop: 1 }}>{p.period} · {relTime(p.updated_at)}</div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem', flexShrink: 0, cursor: 'pointer' }} onClick={() => router.visit(`/pmt/idp/${p.id}`)}>
                                {p.source_score && <span style={{ fontSize: '0.85rem', fontWeight: 800, color: rc }}>{p.source_score}</span>}
                                {p.source_rating && <span style={{ fontSize: '0.62rem', fontWeight: 700, color: rc, background: `${rc}1a`, border: `1px solid ${rc}33`, padding: '1px 7px', borderRadius: 99, textTransform: 'uppercase' }}>{p.source_rating}</span>}
                                <i className="bi bi-chevron-right" style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)', marginTop: 2 }} />
                            </div>
                        </div>
                    );
                })}
            </div>
        </AppLayout>
    );
}
