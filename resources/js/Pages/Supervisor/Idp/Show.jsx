import { useState } from 'react';
import { usePage, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { useToast } from '@/Components/Snackbar';
import { useConfirm } from '@/Components/ConfirmDialog';
import { avatarSrc, onAvatarError } from '@/Components/defaultAvatar';
import useBreakpoint from '@/Components/useBreakpoint';

const RATING_COLOR = { 'Poor': '#ef4444', 'Unsatisfactory': '#f97316' };

const STATUS_CFG = {
    submitted:              { label: 'Pending Review',   c: '#f59e0b', bg: 'rgba(245,158,11,0.12)', bc: 'rgba(245,158,11,0.3)' },
    returned:               { label: 'Returned',         c: '#f87171', bg: 'rgba(239,68,68,0.12)',  bc: 'rgba(239,68,68,0.3)' },
    supervisor_recommended: { label: 'Recommended',      c: '#60a5fa', bg: 'rgba(59,130,246,0.12)', bc: 'rgba(59,130,246,0.3)' },
    submitted_to_ld:        { label: 'Submitted to L&D', c: '#4ade80', bg: 'rgba(74,222,128,0.12)', bc: 'rgba(74,222,128,0.3)' },
};

function ScoreRing({ score, rating, size = 52 }) {
    const color = RATING_COLOR[rating] ?? '#ef4444';
    const r = size / 2 - 5, circ = 2 * Math.PI * r, pct = Math.min((score / 5) * 100, 100);
    return (
        <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
            <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
                <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--admin-border)" strokeWidth="4" />
                <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="4"
                    strokeDasharray={`${circ * pct / 100} ${circ}`} strokeLinecap="round" />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800, color }}>
                {score?.toFixed(2)}
            </div>
        </div>
    );
}

function Field({ label, children }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <label style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.08em', color: 'var(--admin-text-muted)' }}>{label}</label>
            {children}
        </div>
    );
}

const roBox = {
    background: 'var(--admin-bg-secondary)', border: '1px solid var(--admin-border)',
    borderRadius: 8, padding: '0.55rem 0.75rem', fontSize: '0.85rem',
    color: 'var(--admin-text-secondary)', lineHeight: 1.5, minHeight: 38,
};

function GoalCard({ index, row, isMobile }) {
    return (
        <div style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)',
            borderRadius: 'var(--admin-radius)', padding: isMobile ? '1rem' : '1.25rem', boxShadow: 'var(--admin-shadow)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(59,130,246,0.12)',
                    border: '1px solid rgba(59,130,246,0.25)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: '0.72rem', fontWeight: 800, color: 'var(--admin-accent)' }}>
                    {index + 1}
                </div>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--admin-text-primary)' }}>Development Goal</span>
            </div>
            <div style={isMobile ? { display: 'flex', flexDirection: 'column', gap: '0.9rem' }
                : { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                    <Field label="Performance Gap"><div style={{ ...roBox, minHeight: 80 }}>{row.performance_gap || '—'}</div></Field>
                    <Field label="Support Needed"><div style={roBox}>{row.support_needed || '—'}</div></Field>
                    <Field label="Support from Immediate Supervisor"><div style={roBox}>{row.support_from_supervisor || '—'}</div></Field>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                    <Field label="Developmental Activities"><div style={{ ...roBox, minHeight: 80 }}>{row.developmental_activity || '—'}</div></Field>
                    <Field label="Expected Date of Completion"><div style={roBox}>{row.expected_completion || '—'}</div></Field>
                    <Field label="Results"><div style={roBox}>{row.results || '—'}</div></Field>
                </div>
            </div>
        </div>
    );
}

function ReturnModal({ planId, onClose }) {
    const [remarks, setRemarks] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const toast = useToast();

    function submit() {
        if (!remarks.trim()) return;
        setSubmitting(true);
        router.post(`/supervisor/idp/${planId}/return`, { remarks }, {
            preserveScroll: true,
            onSuccess: () => { toast?.('IDP returned to employee.', 'success'); onClose(); },
            onError:   () => { toast?.('Failed.', 'error'); setSubmitting(false); },
        });
    }

    return (
        <>
            <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.5)' }} />
            <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 1101,
                background: 'var(--admin-card)', borderRadius: 'var(--admin-radius)', border: '1px solid var(--admin-border-strong)',
                boxShadow: 'var(--admin-shadow)', width: '90%', maxWidth: 480 }}>
                <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--admin-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--admin-text-primary)' }}>Return IDP</div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-muted)', fontSize: '1rem' }}>
                        <i className="bi bi-x-lg" />
                    </button>
                </div>
                <div style={{ padding: '1rem 1.25rem' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--admin-text-muted)', marginBottom: '0.5rem' }}>
                        Reason / Remarks <span style={{ color: '#ef4444' }}>*</span>
                    </div>
                    <textarea rows={4} maxLength={2000} value={remarks} onChange={e => setRemarks(e.target.value)}
                        placeholder="Explain why this IDP is being returned..."
                        style={{ width: '100%', boxSizing: 'border-box', padding: '0.65rem 0.9rem',
                            background: 'var(--admin-bg-secondary)',
                            border: `1px solid ${!remarks.trim() ? 'rgba(239,68,68,0.4)' : 'var(--admin-border)'}`,
                            borderRadius: 8, color: 'var(--admin-text-primary)', fontSize: '0.85rem',
                            outline: 'none', resize: 'vertical', fontFamily: 'inherit' }} />
                    <div style={{ textAlign: 'right', fontSize: '0.65rem', color: 'var(--admin-text-muted)', marginTop: 3 }}>{remarks.length}/2000</div>
                </div>
                <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid var(--admin-border)', display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <button onClick={onClose} style={{ padding: '0.5rem 1.1rem', borderRadius: 8, border: '1px solid var(--admin-border-strong)', background: 'transparent', color: 'var(--admin-text-primary)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>Cancel</button>
                    <button onClick={submit} disabled={!remarks.trim() || submitting}
                        style={{ padding: '0.5rem 1.25rem', borderRadius: 8, border: 'none',
                            background: !remarks.trim() ? 'var(--admin-bg-secondary)' : '#ef4444',
                            color: !remarks.trim() ? 'var(--admin-text-muted)' : '#fff',
                            cursor: !remarks.trim() || submitting ? 'not-allowed' : 'pointer',
                            fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <i className="bi bi-arrow-counterclockwise" />
                        {submitting ? 'Returning…' : 'Return to Employee'}
                    </button>
                </div>
            </div>
        </>
    );
}

export default function Show() {
    const { plan, employee } = usePage().props;
    const toast   = useToast();
    const confirm = useConfirm();
    const bp      = useBreakpoint();
    const isMobile = bp === 'mobile';

    const [showReturn, setShowReturn] = useState(false);
    const [loading, setLoading]       = useState(false);

    const ratingColor = RATING_COLOR[plan.source_rating] ?? '#ef4444';
    const statusCfg   = STATUS_CFG[plan.status] ?? STATUS_CFG.submitted;
    const isActioned  = !['submitted'].includes(plan.status);

    const handleRecommend = async () => {
        const ok = await confirm?.('Recommend this IDP? The employee will be notified.');
        if (!ok) return;
        setLoading(true);
        router.post(`/supervisor/idp/${plan.id}/recommend`, {}, {
            preserveScroll: true,
            onSuccess: () => toast?.('IDP recommended.', 'success'),
            onError:   () => toast?.('Failed.', 'error'),
            onFinish:  () => setLoading(false),
        });
    };

    return (
        <AppLayout title="Review IDP" description={`${employee.name}'s Individual Development Plan`}>
            <div style={{ paddingBottom: isActioned ? '1rem' : '5rem' }}>
                {/* Employee info card — contains back, export, employee details */}
                <div style={{ background: 'var(--admin-card)', borderLeft: `3px solid ${ratingColor}`,
                    border: '1px solid var(--admin-border)', borderLeftWidth: 3,
                    borderRadius: 'var(--admin-radius)', padding: isMobile ? '1rem' : '1.25rem 1.5rem',
                    marginBottom: '1rem', boxShadow: 'var(--admin-shadow)' }}>

                    {/* Back + Export row */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <button onClick={() => router.visit('/supervisor/idp')}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                                background: 'none', border: 'none', cursor: 'pointer',
                                color: 'var(--admin-text-muted)', fontSize: '0.82rem', padding: 0 }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg> Back to Team IDPs
                        </button>
                        <a href={`/employee/idp/${plan.id}/export`} style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                            padding: '0.45rem 1rem', borderRadius: 10, fontSize: '0.82rem', fontWeight: 600,
                            border: '1px solid #16a34a', color: '#16a34a',
                            background: 'transparent', textDecoration: 'none', whiteSpace: 'nowrap',
                        }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                            {!isMobile && 'Export Excel'}
                        </a>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                            <img src={avatarSrc(employee.avatar)} alt={employee.name} onError={onAvatarError}
                                style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover',
                                    border: '2px solid var(--admin-border-strong)', flexShrink: 0 }} />
                            <div>
                                <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--admin-text-primary)' }}>{employee.name}</div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--admin-text-muted)', marginTop: 2 }}>
                                    {employee.position} · {employee.office}
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                            <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '3px 10px', borderRadius: 99,
                                color: statusCfg.c, background: statusCfg.bg, border: `1px solid ${statusCfg.bc}`,
                                textTransform: 'uppercase' }}>{statusCfg.label}</span>
                            {plan.source_score && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <ScoreRing score={plan.source_score} rating={plan.source_rating} />
                                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: ratingColor,
                                        background: `${ratingColor}1a`, border: `1px solid ${ratingColor}33`,
                                        padding: '2px 9px', borderRadius: 99, textTransform: 'uppercase' }}>
                                        {plan.source_rating}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {plan.pmt_remarks && (
                        <div style={{ marginTop: '0.9rem', background: 'rgba(245,158,11,0.08)',
                            border: '1px solid rgba(245,158,11,0.25)', borderRadius: 8,
                            padding: '0.6rem 0.85rem', display: 'flex', gap: '0.6rem' }}>
                            <i className="bi bi-exclamation-triangle-fill" style={{ color: '#f59e0b', flexShrink: 0, marginTop: 1 }} />
                            <p style={{ margin: 0, fontSize: '0.82rem', color: '#f59e0b', lineHeight: 1.5 }}>
                                <strong>PMT Remarks:</strong> {plan.pmt_remarks}
                            </p>
                        </div>
                    )}

                    {isActioned && plan.supervisor_remarks && (
                        <div style={{ marginTop: '0.75rem', background: 'rgba(59,130,246,0.07)',
                            border: '1px solid rgba(59,130,246,0.2)', borderRadius: 8,
                            padding: '0.55rem 0.85rem', display: 'flex', gap: '0.5rem' }}>
                            <i className="bi bi-chat-left-text" style={{ color: 'var(--admin-accent)', flexShrink: 0, marginTop: 1 }} />
                            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--admin-text-secondary)', lineHeight: 1.5 }}>
                                <strong>Your Remarks:</strong> {plan.supervisor_remarks}
                            </p>
                        </div>
                    )}
                </div>

                {/* Goal cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>
                    {plan.idp_rows?.length ? plan.idp_rows.map((row, i) => (
                        <GoalCard key={i} index={i} row={row} isMobile={isMobile} />
                    )) : (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--admin-text-muted)', fontSize: '0.85rem' }}>
                            No development goals entered yet.
                        </div>
                    )}
                </div>

                {/* Action bar */}
                {!isActioned && (
                    <div style={{
                        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
                        background: 'var(--admin-card)', borderTop: '2px solid var(--admin-border-strong)',
                        boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
                        padding: isMobile ? '0.75rem 1rem' : '0.85rem 2rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.6rem',
                    }}>
                        <button onClick={() => setShowReturn(true)} style={{
                            padding: '0.55rem 1.25rem', borderRadius: 8, fontWeight: 600, fontSize: '0.875rem',
                            cursor: 'pointer', background: 'transparent', border: '1.5px solid #ef4444', color: '#ef4444',
                        }}>
                            <i className="bi bi-arrow-counterclockwise" style={{ marginRight: 5 }} />
                            Return to Employee
                        </button>
                        <button onClick={handleRecommend} disabled={loading} style={{
                            padding: '0.55rem 1.5rem', borderRadius: 8, fontWeight: 700, fontSize: '0.875rem',
                            cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
                            background: 'var(--admin-accent)', border: 'none', color: '#fff',
                            display: 'flex', alignItems: 'center', gap: '0.4rem',
                            boxShadow: '0 4px 14px rgba(59,130,246,0.35)',
                        }}>
                            <i className="bi bi-check-lg" />
                            {loading ? 'Recommending…' : 'Recommend IDP'}
                        </button>
                    </div>
                )}
            </div>

            {showReturn && <ReturnModal planId={plan.id} onClose={() => setShowReturn(false)} />}
        </AppLayout>
    );
}
