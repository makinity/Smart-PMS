import { useState } from 'react';
import { usePage, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import PeriodSelector from '@/Components/PeriodSelector';
import { avatarSrc, onAvatarError } from '@/Components/defaultAvatar';
import { useToast } from '@/Components/Snackbar';
import { useConfirm } from '@/Components/ConfirmDialog';

const STATUS_CFG = {
    submitted_to_pmt: { label: 'Awaiting L&D', c: '#a78bfa', bg: 'rgba(139,92,246,0.1)', bc: 'rgba(139,92,246,0.25)' },
    submitted_to_ld:  { label: 'Submitted to L&D', c: '#4ade80', bg: 'rgba(74,222,128,0.1)', bc: 'rgba(74,222,128,0.25)' },
};
const RATING_COLOR = { 'Poor': '#ef4444', 'Unsatisfactory': '#eab308' };
const OFFICE_RATING_COLOR = {
    'Outstanding': '#3b82f6', 'Very Satisfactory': '#10b981',
    'Satisfactory': '#f59e0b', 'Fair': '#eab308',
    'Poor': '#ef4444', 'Unsatisfactory': '#eab308',
};

function relTime(iso) {
    if (!iso) return '—';
    const d = Math.floor((Date.now() - new Date(iso)) / 1000);
    if (d < 60) return 'just now';
    if (d < 3600) return `${Math.floor(d/60)}m ago`;
    if (d < 86400) return `${Math.floor(d/3600)}h ago`;
    return `${Math.floor(d/86400)}d ago`;
}

export default function OfficeShow() {
    const { office, plans = [], period, allPeriods } = usePage().props;
    const toast   = useToast();
    const confirm = useConfirm();
    const [search, setSearch]     = useState('');
    const [submitting, setSubmitting] = useState(false);
    const isPastPeriod = period && !period.is_active;

    const submittableIds = plans.filter(p => p.status === 'submitted_to_pmt').map(p => p.id);

    const filtered = plans.filter(p =>
        !search || p.employee_name.toLowerCase().includes(search.toLowerCase())
            || p.position.toLowerCase().includes(search.toLowerCase())
    );

    const handleSubmit = async () => {
        if (!submittableIds.length) { toast?.('No IDPs ready for L&D submission.', 'warning'); return; }
        const ok = await confirm?.(`Submit all ${submittableIds.length} IDP(s) to L&D?`);
        if (!ok) return;
        setSubmitting(true);
        router.post('/pmt/idp/bulk-submit', { ids: submittableIds }, {
            preserveScroll: true,
            onSuccess: () => toast?.('Submitted to L&D.', 'success'),
            onError:   () => toast?.('Some failed.', 'error'),
            onFinish:  () => setSubmitting(false),
        });
    };

    const officeColor = OFFICE_RATING_COLOR[office.office_rating] ?? '#60a5fa';
    const card = { background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)', borderRadius: 'var(--admin-radius)', boxShadow: 'var(--admin-shadow)' };

    return (
        <AppLayout title="Office IDP Review" description={`${office.name} — Individual Development Plans`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                {/* Office header */}
                <div style={{ ...card, borderTop: `3px solid ${officeColor}`, padding: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                        <button onClick={() => router.visit('/pmt/idp')}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-muted)', fontSize: '0.82rem', padding: 0 }}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
                            Back to offices
                        </button>
                        <PeriodSelector period={period} allPeriods={allPeriods} route={`/pmt/idp/office/${office.id}`} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--admin-text-primary)' }}>{office.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)', marginTop: 2 }}>{office.period_name}</div>
                        </div>
                        {office.office_score != null && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <span style={{ fontSize: '1.75rem', fontWeight: 800, color: officeColor, lineHeight: 1 }}>{office.office_score.toFixed(2)}</span>
                                <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 99, color: officeColor, background: `${officeColor}14`, border: `1px solid ${officeColor}33`, textTransform: 'uppercase' }}>{office.office_rating}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Plans list */}
                <div style={{ ...card, padding: '1.25rem' }}>
                    {/* Header row */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', gap: 8, flexWrap: 'wrap' }}>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--admin-text-primary)' }}>Low Performing Employees</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)', marginTop: 2 }}>
                                {submittableIds.length} pending L&D submission · {plans.length} total
                            </div>
                        </div>
                        {submittableIds.length > 0 && !isPastPeriod && (
                            <button onClick={handleSubmit} disabled={submitting} style={{
                                marginLeft: 'auto',
                                padding: '0.52rem 1.1rem', borderRadius: 8, fontWeight: 700, fontSize: '0.82rem',
                                cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.65 : 1,
                                background: 'var(--admin-accent)', border: 'none', color: '#fff',
                                display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap',
                                boxShadow: '0 4px 12px rgba(59,130,246,0.3)',
                            }}>
                                <i className="bi bi-send-fill" style={{ fontSize: '0.75rem' }} />
                                {submitting ? 'Submitting…' : `Submit (${submittableIds.length})`}
                            </button>
                        )}
                    </div>

                    {/* Live search */}
                    <div style={{ position: 'relative', marginBottom: '0.85rem' }}>
                        <i className="bi bi-search" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--admin-text-muted)', fontSize: '0.78rem', pointerEvents: 'none' }} />
                        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Search by name or position…"
                            style={{ width: '100%', boxSizing: 'border-box', padding: '0.45rem 0.75rem 0.45rem 2rem', background: 'var(--admin-bg-secondary)', border: '1px solid var(--admin-border)', borderRadius: 8, color: 'var(--admin-text-primary)', fontSize: '0.78rem', outline: 'none', fontFamily: 'inherit' }} />
                    </div>

                    {/* Employee rows */}
                    {filtered.length === 0 ? (
                        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: '0.85rem' }}>
                            <i className="bi bi-journal-bookmark" style={{ fontSize: '2rem', display: 'block', marginBottom: 8, opacity: 0.5 }} />
                            {search ? 'No employees match your search.' : 'No IDPs found for this office.'}
                        </div>
                    ) : filtered.map(p => {
                        const sc = STATUS_CFG[p.status] ?? STATUS_CFG.submitted_to_pmt;
                        const rc = RATING_COLOR[p.source_rating] ?? '#ef4444';
                        return (
                            <div key={p.id}
                                onClick={() => router.visit(`/pmt/idp/${p.id}`)}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '0.85rem', borderRadius: 12, borderLeft: `3px solid ${sc.c}`, background: 'var(--admin-bg-secondary)', marginBottom: '0.5rem', cursor: 'pointer', transition: 'filter 0.15s' }}
                                onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.06)'}
                                onMouseLeave={e => e.currentTarget.style.filter = 'none'}>

                                <img src={avatarSrc(p.employee_avatar)} alt={p.employee_name} onError={onAvatarError}
                                    style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid var(--admin-border-strong)' }} />

                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--admin-text-primary)', marginBottom: 3 }}>{p.employee_name}</div>
                                    <div style={{ fontSize: '0.73rem', color: 'var(--admin-text-muted)' }}>{p.position}</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 5, flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '2px 8px', borderRadius: 99, color: sc.c, background: sc.bg, border: `1px solid ${sc.bc}` }}>{sc.label}</span>
                                        <span style={{ fontSize: '0.65rem', color: 'var(--admin-text-muted)' }}>{p.period} · {relTime(p.updated_at)}</span>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.3rem', flexShrink: 0 }}>
                                    {p.source_score && <span style={{ fontSize: '1rem', fontWeight: 800, color: rc, lineHeight: 1 }}>{p.source_score}</span>}
                                    {p.source_rating && <span style={{ fontSize: '0.6rem', fontWeight: 700, color: rc, background: `${rc}14`, border: `1px solid ${rc}30`, padding: '1px 7px', borderRadius: 99, textTransform: 'uppercase' }}>{p.source_rating}</span>}
                                    <i className="bi bi-chevron-right" style={{ fontSize: '0.7rem', color: 'var(--admin-text-muted)', marginTop: 2 }} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </AppLayout>
    );
}
