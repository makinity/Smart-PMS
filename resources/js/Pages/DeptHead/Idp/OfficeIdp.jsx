import { useState } from 'react';
import { usePage, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { avatarSrc, onAvatarError } from '@/Components/defaultAvatar';
import { useToast } from '@/Components/Snackbar';
import ValidationModal from '@/Components/ValidationModal';
import useBreakpoint from '@/Components/useBreakpoint';
import PeriodSelector from '@/Components/PeriodSelector';

const STATUS_CFG = {
    supervisor_recommended: { label: 'Awaiting Your Approval', c: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  bc: 'rgba(245,158,11,0.3)' },
    returned:               { label: 'Returned to Employee',   c: '#f87171', bg: 'rgba(239,68,68,0.1)',   bc: 'rgba(239,68,68,0.3)' },
    dept_head_approved:     { label: 'Approved — Draft',       c: '#10b981', bg: 'rgba(16,185,129,0.1)',  bc: 'rgba(16,185,129,0.3)' },
    submitted_to_pmt:       { label: 'Submitted to PMT',       c: '#a78bfa', bg: 'rgba(139,92,246,0.1)',  bc: 'rgba(139,92,246,0.3)' },
    submitted_to_ld:        { label: 'Submitted to L&D',       c: '#4ade80', bg: 'rgba(74,222,128,0.1)',  bc: 'rgba(74,222,128,0.3)' },
};

const RATING_COLOR = { 'Poor': '#ef4444', 'Unsatisfactory': '#eab308' };

const OFFICE_RATING_COLOR = {
    'Outstanding': '#3b82f6', 'Very Satisfactory': '#10b981',
    'Satisfactory': '#f59e0b', 'Fair': '#eab308',
    'Poor': '#ef4444', 'Unsatisfactory': '#eab308',
};

function StatusBadge({ status }) {
    const cfg = STATUS_CFG[status] ?? STATUS_CFG.supervisor_recommended;
    return (
        <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 9px', borderRadius: 99, color: cfg.c, background: cfg.bg, border: `1px solid ${cfg.bc}`, whiteSpace: 'nowrap' }}>
            {cfg.label}
        </span>
    );
}

function ScoreChip({ score, rating }) {
    const color = RATING_COLOR[rating] ?? '#ef4444';
    if (!score) return null;
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 800, color }}>{score}</span>
            <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '1px 7px', borderRadius: 99, color, background: `${color}18`, border: `1px solid ${color}30`, textTransform: 'uppercase' }}>{rating}</span>
        </div>
    );
}

function relTime(iso) {
    if (!iso) return '—';
    const d = Math.floor((Date.now() - new Date(iso)) / 1000);
    if (d < 60) return 'just now';
    if (d < 3600) return `${Math.floor(d / 60)}m ago`;
    if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
    return `${Math.floor(d / 86400)}d ago`;
}

function blockerReason(status) {
    if (status === 'returned') return 'Returned — awaiting employee revision';
    if (status === 'submitted' || status === 'supervisor_recommended') return 'Awaiting supervisor recommendation';
    if (!status || status === 'pending_details' || status === 'draft') return 'Employee has not submitted IDP';
    return 'Pending';
}

export default function OfficeIdp() {
    const { plans = [], approvedCount = 0, pendingCount = 0, returnedCount = 0, office, period, allPeriods = [] } = usePage().props;
    const flash   = usePage().props.flash ?? {};
    const toast   = useToast();
    const bp      = useBreakpoint();
    const isMobile = bp === 'mobile';

    const [submitting,   setSubmitting]   = useState(false);
    const [showBlockers, setShowBlockers] = useState(false);

    const blockers     = flash.validation_blockers ?? [];
    const draftPlans   = plans.filter(p => p.status === 'dept_head_approved');
    const submittedPlans = plans.filter(p => p.status === 'submitted_to_pmt' || p.status === 'submitted_to_ld');
    const pendingPlans = plans.filter(p => !['dept_head_approved', 'submitted_to_pmt', 'submitted_to_ld'].includes(p.status));

    const officeColor  = OFFICE_RATING_COLOR[office?.office_rating] ?? '#60a5fa';
    const isPastPeriod = period && !period.is_active;
    const card = { background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)', borderRadius: 'var(--admin-radius)', boxShadow: 'var(--admin-shadow)' };

    const handleSubmitToPmt = () => {
        setSubmitting(true);
        router.post('/dept-head/idp/submit-to-pmt', {}, {
            preserveScroll: true,
            onSuccess: (page) => {
                const fb = page.props.flash ?? {};
                if (fb.validation_blockers?.length) setShowBlockers(true);
                else toast?.(fb.success ?? 'Submitted to PMT.', 'success');
            },
            onError:  () => toast?.('Failed to submit.', 'error'),
            onFinish: () => setSubmitting(false),
        });
    };

    const modalItems = blockers.map(item => ({
        name: item.employee_name,
        sub: item.position,
        avatar: item.avatar,
        reason: blockerReason(item.status),
        notifyPayload: {
            _url: '/api/notify/reminder',
            user_id: (item.status === 'submitted' || item.status === 'supervisor_recommended') ? item.supervisor_id : item.employee_id,
            message: (item.status === 'submitted' || item.status === 'supervisor_recommended')
                ? `Please review ${item.employee_name}'s IDP.`
                : 'Please submit or revise your Individual Development Plan.',
        },
    }));

    const EmployeeRow = ({ p }) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: isMobile ? '0.75rem' : '0.85rem 1rem', borderRadius: 10, borderLeft: `3px solid ${STATUS_CFG[p.status]?.c ?? '#f59e0b'}`, background: 'var(--admin-bg-secondary)', marginBottom: '0.5rem', flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
            <img src={avatarSrc(p.employee_avatar)} alt={p.employee_name} onError={onAvatarError}
                style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid var(--admin-border-strong)' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--admin-text-primary)' }}>{p.employee_name}</span>
                    <StatusBadge status={p.status} />
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)', marginTop: 2 }}>{p.position}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--admin-text-muted)', marginTop: 1 }}>{p.period} · {relTime(p.updated_at)}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                <ScoreChip score={p.source_score} rating={p.source_rating} />
                <button onClick={() => router.visit(`/dept-head/idp/${p.id}`)}
                    style={{ padding: '0.35rem 0.8rem', borderRadius: 7, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', background: 'transparent', border: '1px solid var(--admin-border-strong)', color: 'var(--admin-text-secondary)', whiteSpace: 'nowrap' }}>
                    View
                </button>
            </div>
        </div>
    );

    return (
        <AppLayout title="Office IDP" description="Office-level Individual Development Plan — Draft Review">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                {/* Office header */}
                {office && (
                    <div style={{ ...card, borderTop: `4px solid ${officeColor}`, padding: isMobile ? '1rem' : '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                            {/* Left: office name + period */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                                <div style={{ width: 46, height: 46, borderRadius: 12, background: `${officeColor}18`, border: `1px solid ${officeColor}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <i className="bi bi-building-fill" style={{ color: officeColor, fontSize: '1.1rem' }} />
                                </div>
                                <div>
                                    <div style={{ fontWeight: 800, fontSize: isMobile ? '0.95rem' : '1.1rem', color: 'var(--admin-text-primary)', lineHeight: 1.2 }}>{office.name}</div>
                                    {office.period_name && <div style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)', marginTop: 3 }}>{office.period_name}</div>}
                                </div>
                            </div>

                            {/* Right: score + counts + submit btn */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                                <PeriodSelector period={period} allPeriods={allPeriods} route="/dept-head/idp/office" />
                                {office.office_score != null && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span style={{ fontSize: isMobile ? '1.4rem' : '1.75rem', fontWeight: 800, color: officeColor, lineHeight: 1 }}>{office.office_score.toFixed(2)}</span>
                                        <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '3px 10px', borderRadius: 99, color: officeColor, background: `${officeColor}18`, border: `1px solid ${officeColor}40`, textTransform: 'uppercase' }}>{office.office_rating}</span>
                                    </div>
                                )}

                                {/* Stat pills */}
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    {[
                                        { label: 'Total',    value: plans.length,  color: 'var(--admin-text-primary)' },
                                        { label: 'Approved', value: plans.filter(p => ['dept_head_approved','submitted_to_pmt','submitted_to_ld'].includes(p.status)).length, color: '#10b981' },
                                        { label: 'Pending',  value: pendingCount,  color: '#f59e0b' },
                                        { label: 'Returned', value: returnedCount, color: '#f87171' },
                                    ].map(({ label, value, color }) => (
                                        <div key={label} style={{ background: 'var(--admin-bg-secondary)', border: '1px solid var(--admin-border)', borderRadius: 9, padding: isMobile ? '0.35rem 0.55rem' : '0.45rem 0.85rem', textAlign: 'center', minWidth: isMobile ? 44 : 56 }}>
                                            <div style={{ fontSize: isMobile ? '0.95rem' : '1.1rem', fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
                                            <div style={{ fontSize: '0.58rem', color: 'var(--admin-text-muted)', marginTop: 2 }}>{label}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Draft batch — approved IDPs ready to submit — only show when actionable */}
                {(draftPlans.length > 0 || (submittedPlans.length === 0 && pendingPlans.length === 0)) && (
                <div style={{ ...card, padding: isMobile ? '1rem' : '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', flexShrink: 0 }} />
                                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--admin-text-primary)' }}>Draft — Ready for PMT Submission</span>
                                <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '1px 8px', borderRadius: 99, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981' }}>
                                    {approvedCount} IDP{approvedCount !== 1 ? 's' : ''}
                                </span>
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)', marginTop: 3 }}>
                                Approved IDPs waiting to be forwarded to PMT
                            </div>
                        </div>

                        {approvedCount > 0 && (
                            <button onClick={handleSubmitToPmt} disabled={submitting} style={{
                                padding: isMobile ? '0.55rem 1rem' : '0.6rem 1.5rem', borderRadius: 9, fontWeight: 700, fontSize: '0.85rem',
                                cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.65 : 1,
                                background: 'linear-gradient(135deg, #3b82f6, #6366f1)', border: 'none', color: '#fff',
                                display: 'flex', alignItems: 'center', gap: '0.45rem', whiteSpace: 'nowrap',
                                boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
                            }}>
                                <i className="bi bi-send-fill" style={{ fontSize: '0.8rem' }} />
                                {submitting ? 'Submitting…' : `Submit (${approvedCount})`}
                            </button>
                        )}
                    </div>

                    {draftPlans.length === 0 ? (
                        <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: '0.85rem' }}>
                            <i className="bi bi-inbox" style={{ fontSize: '2rem', display: 'block', marginBottom: 8, opacity: 0.5 }} />
                            {submittedPlans.length > 0
                                ? 'All approved IDPs have already been forwarded to PMT or L&D.'
                                : 'No approved IDPs yet. Approve employee IDPs from the IDP Approval page.'
                            }
                        </div>
                    ) : draftPlans.map(p => <EmployeeRow key={p.id} p={p} />)}
                </div>
                )}

                {/* Pending — not yet approved */}
                {pendingPlans.length > 0 && (
                    <div style={{ ...card, padding: isMobile ? '1rem' : '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', flexShrink: 0 }} />
                            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--admin-text-primary)' }}>Pending Action</span>
                            <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '1px 8px', borderRadius: 99, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b' }}>
                                {pendingPlans.length}
                            </span>
                        </div>
                        {pendingPlans.map(p => <EmployeeRow key={p.id} p={p} />)}
                    </div>
                )}

                {/* Submitted — already sent to PMT or L&D */}
                {submittedPlans.length > 0 && (
                    <div style={{ ...card, padding: isMobile ? '1rem' : '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80', flexShrink: 0 }} />
                            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--admin-text-primary)' }}>Submitted</span>
                            <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '1px 8px', borderRadius: 99, background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.3)', color: '#4ade80' }}>
                                {submittedPlans.length}
                            </span>
                        </div>
                        {submittedPlans.map(p => <EmployeeRow key={p.id} p={p} />)}
                    </div>
                )}
            </div>

            {showBlockers && blockers.length > 0 && (
                <ValidationModal
                    title="Cannot Submit to PMT"
                    description="The following employees still have incomplete or unreviewed IDPs. Notify them to resolve before submitting."
                    items={modalItems}
                    onClose={() => setShowBlockers(false)}
                />
            )}
        </AppLayout>
    );
}
