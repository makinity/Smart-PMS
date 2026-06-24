import { usePage, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';

function RatingBadge({ label, value }) {
    const color = !value ? 'var(--admin-text-muted)' : value >= 4.5 ? '#10b981' : value >= 3.5 ? '#3b82f6' : value >= 2.5 ? '#f59e0b' : '#ef4444';
    return (
        <div style={{ textAlign: 'center', minWidth: 40 }}>
            <div style={{ fontSize: '0.58rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--admin-text-muted)', marginBottom: 2 }}>{label}</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 800, color, lineHeight: 1 }}>{value != null ? Number(value).toFixed(2) : '—'}</div>
        </div>
    );
}

export default function IpcrPreview() {
    const { submission, sections, meta } = usePage().props;

    return (
        <AppLayout title="IPCR Preview" description={submission?.employee_name}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)', borderRadius: 'var(--admin-radius)', padding: '1rem 1.25rem' }}>
                    <button onClick={() => router.visit(`/dept-head/accomplishment-review/${submission?.id}`)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-muted)', fontSize: '0.82rem', padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg> Back to Review
                    </button>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--admin-text-primary)', marginTop: 8 }}>
                        IPCR — {submission?.employee_name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>{submission?.period}</div>
                </div>

                {(sections ?? []).map(fn => (
                    <div key={fn.id} style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)', borderRadius: 'var(--admin-radius)', overflow: 'hidden' }}>
                        <div style={{ padding: '0.6rem 1rem', background: 'rgba(59,130,246,0.05)', borderBottom: '1px solid var(--admin-border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--admin-text-primary)', flex: 1 }}>{fn.name}</span>
                            {fn.weight && <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: 'rgba(59,130,246,0.10)', color: 'var(--admin-accent)' }}>{fn.weight}%</span>}
                        </div>
                        {fn.mfos.map(mfo => (
                            <div key={mfo.id}>
                                <div style={{ padding: '0.5rem 1rem', background: 'var(--admin-bg-secondary)', borderBottom: '1px solid var(--admin-border)', fontSize: '0.82rem', fontWeight: 600 }}>{mfo.title}</div>
                                {mfo.indicators.map((ind, i) => (
                                    <div key={ind.id} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', padding: '0.7rem 1rem', borderBottom: '1px solid var(--admin-border)', flexWrap: 'wrap' }}>
                                        <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(59,130,246,0.12)', color: 'var(--admin-accent)', fontSize: '0.62rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>{i + 1}</div>
                                        <div style={{ flex: 1, minWidth: 160 }}>
                                            <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--admin-text-primary)', lineHeight: 1.45 }}>{ind.indicator_text}</div>
                                            {ind.target_timeline && <div style={{ fontSize: '0.7rem', color: 'var(--admin-text-muted)', marginTop: 2 }}><i className="bi bi-clock" style={{ marginRight: 3 }} />{ind.target_timeline}</div>}
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                                            {[['Q', ind.ratings?.Q], ['E', ind.ratings?.E], ['T', ind.ratings?.T], ['A', ind.ratings?.A]].map(([l, v]) => (
                                                <RatingBadge key={l} label={l} value={v} />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </AppLayout>
    );
}
