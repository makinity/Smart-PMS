import { useState } from 'react';
import { usePage, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { useToast } from '@/Components/Snackbar';
import { avatarSrc, onAvatarError } from '@/Components/defaultAvatar';
import useBreakpoint from '@/Components/useBreakpoint';

const RATING_COLOR = { 'Poor': '#ef4444', 'Unsatisfactory': '#eab308' };
const STATUS_CFG = {
    pending_details:        { label: 'Pending Fill-up',        c: '#f59e0b', bg: 'rgba(245,158,11,0.12)', bc: 'rgba(245,158,11,0.3)' },
    submitted:              { label: 'Under Review',           c: '#60a5fa', bg: 'rgba(59,130,246,0.12)', bc: 'rgba(59,130,246,0.3)' },
    supervisor_recommended: { label: 'Supervisor Recommended', c: '#a78bfa', bg: 'rgba(139,92,246,0.12)', bc: 'rgba(139,92,246,0.3)' },
    returned:               { label: 'Returned',               c: '#f87171', bg: 'rgba(239,68,68,0.12)',  bc: 'rgba(239,68,68,0.3)' },
    dept_head_approved:     { label: 'Dept Head Approved',     c: '#10b981', bg: 'rgba(16,185,129,0.12)', bc: 'rgba(16,185,129,0.3)' },
    submitted_to_pmt:       { label: 'Submitted to PMT',       c: '#a78bfa', bg: 'rgba(139,92,246,0.12)', bc: 'rgba(139,92,246,0.3)' },
    submitted_to_ld:        { label: 'Submitted to L&D',       c: '#4ade80', bg: 'rgba(74,222,128,0.12)', bc: 'rgba(74,222,128,0.3)' },
};

function ScoreRing({ score, rating, size = 52 }) {
    const color = RATING_COLOR[rating] ?? '#ef4444';
    const r = size/2-5, circ = 2*Math.PI*r, pct = Math.min((score/5)*100, 100);
    return (
        <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
            <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
                <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--admin-border)" strokeWidth="4" />
                <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="4" strokeDasharray={`${circ*pct/100} ${circ}`} strokeLinecap="round" />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800, color }}>{score?.toFixed(2)}</div>
        </div>
    );
}

function Field({ label, children }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <label style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--admin-text-muted)' }}>{label}</label>
            {children}
        </div>
    );
}

const roBox = { background: 'var(--admin-bg-secondary)', border: '1px solid var(--admin-border)', borderRadius: 8, padding: '0.55rem 0.75rem', fontSize: '0.85rem', color: 'var(--admin-text-secondary)', lineHeight: 1.5, minHeight: 38 };
const card  = { background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)', borderRadius: 'var(--admin-radius)', boxShadow: 'var(--admin-shadow)' };

function GoalCard({ index, row, isMobile }) {
    return (
        <div style={{ ...card, padding: isMobile ? '1rem' : '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 800, color: 'var(--admin-accent)' }}>{index+1}</div>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--admin-text-primary)' }}>Development Goal</span>
            </div>
            <div style={isMobile ? { display: 'flex', flexDirection: 'column', gap: '0.9rem' } : { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                    <Field label="Performance Gap"><div style={{ ...roBox, minHeight: 80 }}>{row.performance_gap || '—'}</div></Field>
                    <Field label="Support Needed"><div style={roBox}>{row.support_needed || '—'}</div></Field>
                    <Field label="Support from Supervisor"><div style={roBox}>{row.support_from_supervisor || '—'}</div></Field>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                    <Field label="Developmental Activities"><div style={{ ...roBox, minHeight: 80 }}>{row.developmental_activity || '—'}</div></Field>
                    <Field label="Expected Date"><div style={roBox}>{row.expected_completion || '—'}</div></Field>
                    <Field label="Results"><div style={roBox}>{row.results || '—'}</div></Field>
                </div>
            </div>
        </div>
    );
}

export default function Show() {
    const { plan, employee } = usePage().props;
    const toast = useToast();
    const bp    = useBreakpoint();
    const isMobile = bp === 'mobile';

    const [remarks, setRemarks] = useState(plan.pmt_remarks ?? '');
    const [saving, setSaving]   = useState(false);
    const [showRevert, setShowRevert] = useState(false);
    const [reverting, setReverting]   = useState(false);

    const ratingColor = RATING_COLOR[plan.source_rating] ?? '#ef4444';
    const statusCfg   = STATUS_CFG[plan.status] ?? STATUS_CFG.pending_details;

    const saveRemarks = () => {
        setSaving(true);
        router.patch(`/pmt/idp/${plan.id}/remarks`, { pmt_remarks: remarks }, {
            preserveScroll: true,
            onSuccess: () => toast?.('Remarks saved.', 'success'),
            onError:   () => toast?.('Failed.', 'error'),
            onFinish:  () => setSaving(false),
        });
    };

    const handleRevert = () => {
        setReverting(true);
        router.post(`/pmt/idp/${plan.id}/revert-ld`, {}, {
            preserveScroll: true,
            onSuccess: () => { setShowRevert(false); toast?.('L&D submission reverted. Employee account unlocked.', 'success'); },
            onError:   (e) => { toast?.(e?.message ?? 'Revert failed.', 'error'); },
            onFinish:  () => setReverting(false),
        });
    };

    return (
        <AppLayout title="IDP Review" description={`${employee.name}'s Individual Development Plan`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                {/* Header card */}
                <div style={{ ...card, borderLeft: `3px solid ${ratingColor}`, borderLeftWidth: 3, padding: isMobile ? '1rem' : '1.25rem 1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <button onClick={() => router.visit(plan.office_id ? `/pmt/idp/office/${plan.office_id}` : '/pmt/idp')}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-muted)', fontSize: '0.82rem', padding: 0 }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg> Back to office IDPs
                        </button>
                        <a href={`/employee/idp/${plan.id}/export`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 1rem', borderRadius: 10, fontSize: '0.82rem', fontWeight: 600, border: '1px solid #16a34a', color: '#16a34a', background: 'transparent', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                            {!isMobile && 'Download'}
                        </a>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                            <img src={avatarSrc(employee.avatar)} alt={employee.name} onError={onAvatarError}
                                style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--admin-border-strong)', flexShrink: 0 }} />
                            <div>
                                <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--admin-text-primary)' }}>{employee.name}</div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--admin-text-muted)', marginTop: 2 }}>{employee.position} · {employee.office}</div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                            <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '3px 10px', borderRadius: 99, color: statusCfg.c, background: statusCfg.bg, border: `1px solid ${statusCfg.bc}`, textTransform: 'uppercase' }}>{statusCfg.label}</span>
                            {plan.source_score && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <ScoreRing score={plan.source_score} rating={plan.source_rating} />
                                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: ratingColor, background: `${ratingColor}1a`, border: `1px solid ${ratingColor}33`, padding: '2px 9px', borderRadius: 99, textTransform: 'uppercase' }}>{plan.source_rating}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Remarks banners */}
                    {plan.supervisor_remarks && (
                        <div style={{ marginTop: '0.75rem', background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 8, padding: '0.55rem 0.85rem', display: 'flex', gap: '0.5rem' }}>
                            <i className="bi bi-person-check" style={{ color: 'var(--admin-accent)', flexShrink: 0, marginTop: 1 }} />
                            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--admin-text-secondary)', lineHeight: 1.5 }}><strong>Supervisor:</strong> {plan.supervisor_remarks}</p>
                        </div>
                    )}
                    {plan.dept_head_remarks && (
                        <div style={{ marginTop: '0.5rem', background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8, padding: '0.55rem 0.85rem', display: 'flex', gap: '0.5rem' }}>
                            <i className="bi bi-building-check" style={{ color: '#10b981', flexShrink: 0, marginTop: 1 }} />
                            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--admin-text-secondary)', lineHeight: 1.5 }}><strong>Dept Head:</strong> {plan.dept_head_remarks}</p>
                        </div>
                    )}
                    {plan.status === 'submitted_to_ld' && (
                        <div style={{ marginTop: '0.5rem' }}>
                            {/* ── L&D sync status banner ── */}
                            {plan.lnd_sync_status === 'failed' ? (
                                // ❌ Failed — show the actual error so PMT can act
                                <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '0.65rem 0.85rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: plan.lnd_last_error ? '0.4rem' : 0 }}>
                                        <i className="bi bi-x-circle-fill" style={{ color: '#ef4444', flexShrink: 0 }} />
                                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ef4444', flex: 1 }}>
                                            L&amp;D Sync Failed
                                        </span>
                                        <button onClick={() => setShowRevert(true)}
                                            style={{ flexShrink: 0, padding: '0.3rem 0.75rem', borderRadius: 6, border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}>
                                            <i className="bi bi-arrow-counterclockwise" style={{ marginRight: 4 }} />Revert
                                        </button>
                                    </div>
                                    {plan.lnd_last_error && (
                                        <div style={{ marginLeft: '1.5rem', fontSize: '0.78rem', color: 'var(--admin-text-secondary)', lineHeight: 1.55, wordBreak: 'break-word' }}>
                                            {plan.lnd_last_error}
                                        </div>
                                    )}
                                    <div style={{ marginLeft: '1.5rem', marginTop: '0.35rem', fontSize: '0.72rem', color: 'var(--admin-text-muted)' }}>
                                        The plan was marked as Submitted to L&amp;D on PMS but the L&amp;D system did not receive it.
                                        Check the HRMO Hub connection or contact your system administrator.
                                    </div>
                                </div>
                            ) : plan.lnd_sync_status === 'acknowledged' ? (
                                // ✅ Acknowledged by L&D
                                <div style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.25)', borderRadius: 8, padding: '0.5rem 0.85rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                                    <i className="bi bi-check-circle-fill" style={{ color: '#4ade80', flexShrink: 0, marginTop: 2 }} />
                                    <div style={{ flex: 1 }}>
                                        <span style={{ fontSize: '0.82rem', color: '#4ade80', fontWeight: 600 }}>
                                            Submitted &amp; acknowledged by L&amp;D{plan.submitted_to_ld_at ? ` on ${plan.submitted_to_ld_at}` : ''}.
                                        </span>
                                        {plan.lnd_reference_id && (
                                            <div style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)', marginTop: 2 }}>
                                                Reference: <code style={{ fontSize: '0.7rem' }}>{plan.lnd_reference_id}</code>
                                            </div>
                                        )}
                                    </div>
                                    <button onClick={() => setShowRevert(true)}
                                        style={{ flexShrink: 0, padding: '0.3rem 0.75rem', borderRadius: 6, border: '1px solid rgba(74,222,128,0.35)', background: 'rgba(74,222,128,0.08)', color: '#4ade80', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', marginTop: 1 }}>
                                        <i className="bi bi-arrow-counterclockwise" style={{ marginRight: 4 }} />Revert
                                    </button>
                                </div>
                            ) : (
                                // 🟡 Sent but not yet acknowledged (or status unknown)
                                <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.28)', borderRadius: 8, padding: '0.5rem 0.85rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                                    <i className="bi bi-send-check" style={{ color: '#f59e0b', flexShrink: 0, marginTop: 2 }} />
                                    <div style={{ flex: 1 }}>
                                        <span style={{ fontSize: '0.82rem', color: '#f59e0b', fontWeight: 600 }}>
                                            Submitted to L&amp;D{plan.submitted_to_ld_at ? ` on ${plan.submitted_to_ld_at}` : ''} — awaiting acknowledgement.
                                        </span>
                                        {plan.lnd_reference_id && (
                                            <div style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)', marginTop: 2 }}>
                                                Reference: <code style={{ fontSize: '0.7rem' }}>{plan.lnd_reference_id}</code>
                                            </div>
                                        )}
                                        <div style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)', marginTop: 2 }}>
                                            The L&amp;D system has not yet confirmed receipt. This may resolve automatically.
                                        </div>
                                    </div>
                                    <button onClick={() => setShowRevert(true)}
                                        style={{ flexShrink: 0, padding: '0.3rem 0.75rem', borderRadius: 6, border: '1px solid rgba(245,158,11,0.35)', background: 'rgba(245,158,11,0.08)', color: '#f59e0b', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', marginTop: 1 }}>
                                        <i className="bi bi-arrow-counterclockwise" style={{ marginRight: 4 }} />Revert
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Goal cards */}
                {plan.idp_rows?.length > 0 ? plan.idp_rows.map((row, i) => (
                    <GoalCard key={i} index={i} row={row} isMobile={isMobile} />
                )) : (
                    <div style={{ ...card, padding: '2rem', textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: '0.85rem' }}>
                        Employee has not filled out their IDP yet.
                    </div>
                )}

                {/* PMT Remarks */}
                <div style={{ ...card, padding: '1.25rem' }}>
                    <div style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--admin-text-muted)', marginBottom: '0.4rem' }}>
                        PMT Remarks <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(visible to employee)</span>
                    </div>
                    <textarea rows={3} value={remarks} onChange={e => setRemarks(e.target.value)}
                        placeholder="Add remarks for the employee..."
                        style={{ width: '100%', boxSizing: 'border-box', padding: '0.55rem 0.75rem', background: 'var(--admin-bg-secondary)', border: '1px solid var(--admin-border-strong)', borderRadius: 8, color: 'var(--admin-text-primary)', fontSize: '0.85rem', outline: 'none', resize: 'vertical', fontFamily: 'inherit', marginBottom: '0.75rem' }} />
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button onClick={saveRemarks} disabled={saving} style={{ padding: '0.5rem 1.25rem', borderRadius: 8, fontWeight: 600, fontSize: '0.875rem', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1, background: 'var(--admin-accent)', border: 'none', color: '#fff', boxShadow: '0 4px 12px rgba(59,130,246,0.3)' }}>
                            {saving ? 'Saving…' : 'Save Remarks'}
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Revert L&D Submission Confirm Modal ── */}
            {showRevert && (
                <>
                    {/* Backdrop */}
                    <div onClick={() => !reverting && setShowRevert(false)}
                        style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)' }} />

                    {/* Dialog */}
                    <div style={{
                        position: 'fixed', top: '50%', left: '50%',
                        transform: 'translate(-50%,-50%)',
                        zIndex: 1101,
                        background: 'var(--admin-card)',
                        borderRadius: 'var(--admin-radius)',
                        border: '1px solid var(--admin-border-strong)',
                        boxShadow: 'var(--admin-shadow)',
                        width: '90%', maxWidth: 440,
                        overflow: 'hidden',
                    }}>
                        {/* Orange top accent bar — signals a destructive/warning action */}
                        <div style={{ height: 4, background: '#f59e0b' }} />

                        <div style={{ padding: '1.75rem 1.75rem 1.25rem', textAlign: 'center' }}>
                            {/* Icon badge */}
                            <div style={{
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                width: 56, height: 56, borderRadius: '50%',
                                background: 'rgba(245,158,11,0.12)',
                                border: '1.5px solid rgba(245,158,11,0.3)',
                                marginBottom: '1.1rem',
                            }}>
                                <i className="bi bi-arrow-counterclockwise" style={{ color: '#f59e0b', fontSize: '1.5rem' }} />
                            </div>

                            <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--admin-text-primary)', letterSpacing: '-0.01em', marginBottom: '0.55rem' }}>
                                Revert L&amp;D Submission?
                            </div>

                            <p style={{ fontSize: '0.875rem', color: 'var(--admin-text-muted)', lineHeight: 1.65, margin: 0 }}>
                                This will set{' '}
                                <strong style={{ color: 'var(--admin-text-secondary)' }}>{employee.name}</strong>'s
                                plan back to <strong style={{ color: 'var(--admin-text-secondary)' }}>Submitted to PMT</strong> and
                                clear all L&amp;D sync data.
                            </p>

                            {/* Impact list */}
                            <div style={{
                                marginTop: '1rem', textAlign: 'left',
                                background: 'rgba(245,158,11,0.06)',
                                border: '1px solid rgba(245,158,11,0.2)',
                                borderRadius: 8, padding: '0.75rem 1rem',
                                display: 'flex', flexDirection: 'column', gap: '0.45rem',
                            }}>
                                {[
                                    'Plan status → Submitted to PMT',
                                    'L&D sync data cleared (reference ID, sync date, error)',
                                    "Employee's PMS account unlocked — they can log back in",
                                    'Employee will be notified of the recall',
                                ].map((item, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                                        <i className="bi bi-check2" style={{ color: '#f59e0b', fontSize: '0.8rem', marginTop: 2, flexShrink: 0 }} />
                                        <span style={{ fontSize: '0.8rem', color: 'var(--admin-text-secondary)', lineHeight: 1.5 }}>{item}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Divider */}
                        <div style={{ borderTop: '1px solid var(--admin-border)', margin: '0 1.75rem' }} />

                        {/* Footer */}
                        <div style={{ padding: '1rem 1.75rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                            <button
                                onClick={handleRevert}
                                disabled={reverting}
                                style={{
                                    width: '100%', padding: '0.65rem',
                                    borderRadius: 'var(--admin-radius)',
                                    border: 'none',
                                    background: '#f59e0b',
                                    color: '#fff',
                                    cursor: reverting ? 'not-allowed' : 'pointer',
                                    fontSize: '0.9rem', fontWeight: 700,
                                    opacity: reverting ? 0.7 : 1,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                                    transition: 'opacity 0.15s',
                                }}
                            >
                                {reverting
                                    ? <><i className="bi bi-hourglass-split" /> Reverting…</>
                                    : <><i className="bi bi-arrow-counterclockwise" /> Confirm Revert</>
                                }
                            </button>
                            <button
                                onClick={() => setShowRevert(false)}
                                disabled={reverting}
                                style={{
                                    width: '100%', padding: '0.65rem',
                                    borderRadius: 'var(--admin-radius)',
                                    border: '1px solid var(--admin-border-strong)',
                                    background: 'transparent',
                                    color: 'var(--admin-text-secondary)',
                                    cursor: reverting ? 'not-allowed' : 'pointer',
                                    fontSize: '0.88rem', fontWeight: 500,
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </>
            )}
        </AppLayout>
    );
}
