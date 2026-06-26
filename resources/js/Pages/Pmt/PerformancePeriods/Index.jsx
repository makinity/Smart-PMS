import { useState, useEffect } from 'react';
import { router, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { useToast } from '@/Components/Snackbar';
import { useConfirm } from '@/Components/ConfirmDialog';
import ValidationModal from '@/Components/ValidationModal';

function useBreakpoint() {
    const [w, setW] = useState(() => typeof window !== 'undefined' ? window.innerWidth : 1200);
    useEffect(() => { const h = () => setW(window.innerWidth); window.addEventListener('resize', h); return () => window.removeEventListener('resize', h); }, []);
    return w >= 1024 ? 'desktop' : w >= 640 ? 'tablet' : 'mobile';
}

function StatusBadge({ period }) {
    const today = new Date().toISOString().slice(0, 10);
    let label, bg, color, border;
    if (period.is_active) {
        [label, bg, color, border] = ['Active', 'rgba(16,185,129,0.15)', '#10b981', 'rgba(16,185,129,0.3)'];
    } else if (period.end_date < today) {
        [label, bg, color, border] = ['Ended', 'rgba(100,116,139,0.12)', 'var(--admin-text-muted)', 'rgba(100,116,139,0.25)'];
    } else if (period.start_date > today) {
        [label, bg, color, border] = ['Upcoming', 'rgba(234,179,8,0.13)', '#ca8a04', 'rgba(234,179,8,0.3)'];
    } else {
        [label, bg, color, border] = ['In Range', 'rgba(59,130,246,0.13)', 'var(--admin-accent)', 'rgba(59,130,246,0.3)'];
    }
    return (
        <span style={{ padding: '0.2rem 0.65rem', borderRadius: 99, fontSize: '0.67rem', fontWeight: 700,
            letterSpacing: '0.06em', textTransform: 'uppercase', background: bg, color, border: `1px solid ${border}`, whiteSpace: 'nowrap' }}>
            {label}
        </span>
    );
}

function PeriodModal({ period, onClose, onSubmit, saving }) {
    const [form, setForm] = useState({ name: period?.name ?? '', start_date: period?.start_date ?? '', end_date: period?.end_date ?? '' });
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    return (
        <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
            <div style={s.modal}>
                <div style={s.modalHeader}>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--admin-text-primary)' }}>
                        {period ? 'Edit Period' : 'New Performance Period'}
                    </span>
                    <button style={s.closeBtn} onClick={onClose}>✕</button>
                </div>
                <form onSubmit={e => { e.preventDefault(); onSubmit(form); }} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <label style={s.fieldLabel}>
                        Period Name
                        <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Jan–Jun 2026"
                            required style={{ ...s.input, marginTop: '0.35rem' }} />
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <label style={s.fieldLabel}>
                            Start Date
                            <input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)}
                                required style={{ ...s.input, marginTop: '0.35rem' }} />
                        </label>
                        <label style={s.fieldLabel}>
                            End Date
                            <input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)}
                                required style={{ ...s.input, marginTop: '0.35rem' }} />
                        </label>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '0.25rem' }}>
                        <button type="button" onClick={onClose} style={s.btnSecondary} disabled={saving}>Cancel</button>
                        <button type="submit" style={s.btnPrimary} disabled={saving}>
                            {saving ? 'Saving…' : period ? 'Save Changes' : 'Create Period'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// Converts { 'OPCR not yet approved': 3, ... } → ValidationModal items array
function pendingToItems(counts) {
    return Object.entries(counts).map(([label, count]) => ({
        name: label,
        sub:  `${count} item${count !== 1 ? 's' : ''} pending`,
    }));
}

export default function Index({ periods, hasActive }) {
    const bp = useBreakpoint();
    const isMobile = bp === 'mobile';
    const toast   = useToast();
    const confirm = useConfirm();
    const { flash } = usePage().props;

    const [modal,   setModal]   = useState(null);
    const [saving,  setSaving]  = useState(false);
    // pending warning: { title, description, items, onProceed }
    const [warning, setWarning] = useState(null);

    useEffect(() => {
        if (flash?.success) toast(flash.success, 'success');
        if (flash?.error)   toast(flash.error,   'error');
    }, [flash]);

    // ── New Period: block if active exists ────────────────────────────────────
    function handleNewPeriod() {
        if (hasActive) {
            setWarning({
                title: 'Active Period Exists',
                description: 'There is already an active performance period. You must deactivate it before creating a new one.',
                items: [],
                onProceed: null, // no proceed — hard block
            });
            return;
        }
        setModal({ type: 'create' });
    }

    // ── Activate: warn if current active period has pending ops ──────────────
    async function handleActivate(period) {
        const activePeriod = periods.find(p => p.is_active);

        if (activePeriod) {
            // Check pending on the period being deactivated (the current active one)
            const res = await fetch(`/pmt/performance-periods/${activePeriod.id}/check-pending`);
            const counts = await res.json();

            if (Object.keys(counts).length > 0) {
                setWarning({
                    title: 'Pending Operations on Current Active Period',
                    description: `"${activePeriod.name}" still has unfinished operations. Switching to "${period.name}" will leave these unresolved.`,
                    items: pendingToItems(counts),
                    onProceed: () => doActivate(period),
                });
                return;
            }
        }

        doActivate(period);
    }

    function doActivate(period) {
        router.patch(`/pmt/performance-periods/${period.id}/activate`, {}, { preserveScroll: true });
    }

    // ── Deactivate: warn if period has pending ops ────────────────────────────
    async function handleDeactivate(period) {
        const res = await fetch(`/pmt/performance-periods/${period.id}/check-pending`);
        const counts = await res.json();

        if (Object.keys(counts).length > 0) {
            setWarning({
                title: 'Pending Operations',
                description: `"${period.name}" still has unfinished operations. Deactivating will leave these unresolved.`,
                items: [
                    ...pendingToItems(counts),
                    {
                        name: 'Notify affected users',
                        sub:  'Sends role-targeted reminders to employees, supervisors, and dept heads with pending tasks.',
                        notifyPayload: { _url: `/pmt/performance-periods/${period.id}/notify-pending` },
                    },
                ],
                onProceed: () => doDeactivate(period),
            });
            return;
        }

        doDeactivate(period);
    }

    function doDeactivate(period) {
        router.patch(`/pmt/performance-periods/${period.id}/deactivate`, {}, { preserveScroll: true });
    }

    // ── Delete ────────────────────────────────────────────────────────────────
    async function handleDelete(period) {
        const ok = await confirm(`Delete "${period.name}"? This cannot be undone.`);
        if (!ok) return;
        router.delete(`/pmt/performance-periods/${period.id}`, { preserveScroll: true });
    }

    // ── Form submit ───────────────────────────────────────────────────────────
    function handleSubmit(form) {
        setSaving(true);
        const isEdit = modal?.type === 'edit';
        const url    = isEdit ? `/pmt/performance-periods/${modal.period.id}` : '/pmt/performance-periods';
        router[isEdit ? 'patch' : 'post'](url, form, {
            preserveScroll: true,
            onSuccess: () => { setSaving(false); setModal(null); },
            onError:   () => { setSaving(false); toast('Please check the form fields.', 'error'); },
        });
    }

    // ── Row actions ───────────────────────────────────────────────────────────
    function Actions({ p, inline = false }) {
        return (
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', justifyContent: inline ? 'flex-end' : 'flex-start' }}>
                {!p.is_active
                    ? <button onClick={() => handleActivate(p)} style={s.btnActivate}><i className="bi bi-lightning-charge-fill" /> Activate</button>
                    : <button onClick={() => handleDeactivate(p)} style={s.btnDeactivate}><i className="bi bi-pause-circle" /> Deactivate</button>
                }
                <button onClick={() => setModal({ type: 'edit', period: p })} style={s.btnIcon}><i className="bi bi-pencil" /></button>
                {!p.is_active && <button onClick={() => handleDelete(p)} style={s.btnDanger}><i className="bi bi-trash" /></button>}
            </div>
        );
    }

    return (
        <AppLayout title="Performance Periods" description="Manage appraisal cycle periods">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

                {/* Header */}
                <div style={card}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                            <div style={iconBox}><i className="bi bi-calendar-range-fill" style={{ fontSize: '1rem' }} /></div>
                            <div>
                                <p style={statLabel}>PMT Management</p>
                                <h1 style={{ fontWeight: 700, fontSize: '1.35rem', color: 'var(--admin-text-primary)', lineHeight: 1.1 }}>Performance Periods</h1>
                            </div>
                        </div>
                        <button onClick={handleNewPeriod} style={{ ...s.btnPrimary, marginLeft: 'auto' }}>
                            <i className="bi bi-plus-lg" /> New Period
                        </button>
                    </div>
                </div>

                {/* Active-period notice */}
                {hasActive && (
                    <div style={{ padding: '0.75rem 1.1rem', background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 10, fontSize: '0.82rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <i className="bi bi-info-circle-fill" />
                        A period is currently active. Deactivate it first before creating a new one.
                    </div>
                )}

                {/* List */}
                {periods.length === 0 ? (
                    <div style={{ ...card, padding: '3rem', textAlign: 'center', color: 'var(--admin-text-muted)' }}>
                        <i className="bi bi-calendar-x" style={{ fontSize: '2.5rem', opacity: 0.25, display: 'block', marginBottom: '0.75rem' }} />
                        <p style={{ fontSize: '0.9rem' }}>No performance periods yet.</p>
                        <p style={{ fontSize: '0.78rem', opacity: 0.6, marginTop: '0.25rem' }}>Create one to define the appraisal cycle.</p>
                    </div>
                ) : isMobile ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        {periods.map(p => (
                            <div key={p.id} style={card}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.65rem' }}>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--admin-text-primary)' }}>{p.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)', marginTop: 2 }}>{p.start_date} → {p.end_date}</div>
                                    </div>
                                    <StatusBadge period={p} />
                                </div>
                                <Actions p={p} />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: 'var(--admin-bg-secondary)' }}>
                                    {['Period Name', 'Start Date', 'End Date', 'Status', ''].map((h, i) => (
                                        <th key={i} style={{ padding: '0.6rem 1.1rem', fontSize: '0.67rem', fontWeight: 700,
                                            textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--admin-text-muted)',
                                            textAlign: i === 4 ? 'right' : 'left', borderBottom: '1px solid var(--admin-border)', whiteSpace: 'nowrap' }}>
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {periods.map(p => (
                                    <tr key={p.id}
                                        onMouseEnter={e => e.currentTarget.style.background = 'var(--admin-bg-secondary)'}
                                        onMouseLeave={e => e.currentTarget.style.background = ''}>
                                        <td style={td}><span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--admin-text-primary)' }}>{p.name}</span></td>
                                        <td style={td}><span style={{ fontSize: '0.85rem', color: 'var(--admin-text-secondary)' }}>{p.start_date}</span></td>
                                        <td style={td}><span style={{ fontSize: '0.85rem', color: 'var(--admin-text-secondary)' }}>{p.end_date}</span></td>
                                        <td style={td}><StatusBadge period={p} /></td>
                                        <td style={{ ...td, textAlign: 'right' }}><Actions p={p} inline /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Create / Edit modal */}
            {(modal?.type === 'create' || modal?.type === 'edit') && (
                <PeriodModal
                    period={modal.type === 'edit' ? modal.period : null}
                    onClose={() => setModal(null)}
                    onSubmit={handleSubmit}
                    saving={saving}
                />
            )}

            {/* Pending-ops warning modal */}
            {warning && (
                <ValidationModal
                    title={warning.title}
                    description={warning.description}
                    items={warning.items}
                    onClose={() => setWarning(null)}
                    // Extend ValidationModal with optional proceed action
                    extra={warning.onProceed && (
                        <button
                            onClick={() => { setWarning(null); warning.onProceed(); }}
                            style={{ padding: '0.5rem 1.25rem', borderRadius: 8, border: 'none', background: '#f59e0b', color: '#fff', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', marginRight: '0.5rem' }}>
                            Proceed Anyway
                        </button>
                    )}
                />
            )}
        </AppLayout>
    );
}

const card      = { background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)', borderRadius: 'var(--admin-radius)', padding: '1.25rem 1.5rem', boxShadow: 'var(--admin-shadow)' };
const iconBox   = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 42, height: 42, borderRadius: 12, border: '1px solid var(--admin-border)', background: 'rgba(59,130,246,0.08)', color: 'var(--admin-accent)', flexShrink: 0 };
const statLabel = { fontSize: '0.72rem', fontWeight: 600, color: 'var(--admin-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.15rem' };
const td        = { padding: '0.85rem 1.1rem', borderBottom: '1px solid var(--admin-border)', verticalAlign: 'middle' };

const s = {
    overlay:      { position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' },
    modal:        { background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)', borderRadius: 14, width: '100%', maxWidth: 460, boxShadow: '0 24px 60px rgba(0,0,0,0.5)' },
    modalHeader:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: '1px solid var(--admin-border)' },
    closeBtn:     { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-muted)', fontSize: '1rem' },
    fieldLabel:   { display: 'flex', flexDirection: 'column', fontSize: '0.78rem', fontWeight: 600, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' },
    input:        { padding: '0.55rem 0.85rem', borderRadius: 10, border: '1px solid var(--admin-border-strong)', background: 'var(--admin-bg-secondary)', color: 'var(--admin-text-primary)', fontSize: '0.88rem', outline: 'none' },
    btnPrimary:   { display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.5rem 1.1rem', borderRadius: 8, border: 'none', background: 'var(--admin-accent)', color: '#fff', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' },
    btnSecondary: { padding: '0.5rem 1.1rem', borderRadius: 8, border: '1px solid var(--admin-border-strong)', background: 'transparent', color: 'var(--admin-text-secondary)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' },
    btnActivate:  { display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.38rem 0.85rem', borderRadius: 7, border: '1px solid rgba(16,185,129,0.35)', background: 'rgba(16,185,129,0.1)', color: '#10b981', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' },
    btnDeactivate:{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.38rem 0.85rem', borderRadius: 7, border: '1px solid rgba(100,116,139,0.3)', background: 'rgba(100,116,139,0.08)', color: 'var(--admin-text-muted)', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' },
    btnIcon:      { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 7, border: '1px solid var(--admin-border-strong)', background: 'transparent', color: 'var(--admin-text-secondary)', fontSize: '0.85rem', cursor: 'pointer' },
    btnDanger:    { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 7, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#f87171', fontSize: '0.85rem', cursor: 'pointer' },
};
