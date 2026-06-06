import { useState, useEffect } from 'react';
import { usePage, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { useToast } from '@/Components/Snackbar';
import { useConfirm } from '@/Components/ConfirmDialog';

function useBreakpoint() {
    const [w, setW] = useState(() => window.innerWidth);
    useEffect(() => {
        const h = () => setW(window.innerWidth);
        window.addEventListener('resize', h);
        return () => window.removeEventListener('resize', h);
    }, []);
    return w >= 1024 ? 'desktop' : w >= 768 ? 'tablet' : 'mobile';
}

function StatusBadge({ status }) {
    const map = {
        draft:     { label: 'Draft',     bg: 'rgba(234,179,8,0.15)',  color: '#ca8a04', border: 'rgba(234,179,8,0.3)' },
        submitted: { label: 'Submitted', bg: 'rgba(59,130,246,0.15)', color: 'var(--admin-accent)', border: 'rgba(59,130,246,0.3)' },
        approved:  { label: 'Approved',  bg: 'rgba(74,222,128,0.15)', color: '#22c55e', border: 'rgba(74,222,128,0.3)' },
        endorsed:  { label: 'Endorsed',  bg: 'rgba(139,92,246,0.15)', color: '#a78bfa', border: 'rgba(139,92,246,0.3)' },
        returned:  { label: 'Returned',  bg: 'rgba(239,68,68,0.15)',  color: '#f87171', border: 'rgba(239,68,68,0.3)' },
    };
    const c = map[status] ?? map.draft;
    return (
        <span style={{ padding: '0.2rem 0.7rem', borderRadius: 99, fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>
            {c.label}
        </span>
    );
}

function ZeroOrValue({ v }) {
    if (!v) return <span style={{ color: 'var(--admin-text-muted)', opacity: 0.35 }}>0</span>;
    return <span>{v}</span>;
}

function MporTable({ sections, grandQty, grandQualAvg, grandTimeAvg, grandQtyTotal }) {
    const W = [1, 2, 3, 4];
    const th = { padding: '0.55rem 0.4rem', fontSize: '0.63rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--admin-text-muted)', textAlign: 'center', borderBottom: '1px solid var(--admin-border)', whiteSpace: 'nowrap' };
    const td = { padding: '0.5rem 0.4rem', textAlign: 'center', fontSize: '0.8rem', borderBottom: '1px solid var(--admin-border)' };
    const stickyLeft = { position: 'sticky', left: 0, zIndex: 1 };

    return (
        <div style={{ overflowX: 'auto', borderRadius: 'var(--admin-radius)', border: '1px solid var(--admin-border-strong)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 880 }}>
                <thead>
                    <tr style={{ background: 'var(--admin-bg-secondary)' }}>
                        <th style={{ ...th, textAlign: 'left', minWidth: 220, ...stickyLeft, background: 'var(--admin-bg-secondary)' }}>OUTPUT / TASK</th>
                        <th colSpan={5} style={{ ...th, color: 'var(--admin-accent)', borderLeft: '1px solid var(--admin-border)' }}>QUANTITY / EFFICIENCY</th>
                        <th colSpan={5} style={{ ...th, color: '#22c55e', borderLeft: '1px solid var(--admin-border)' }}>QUALITY / EFFECTIVENESS</th>
                        <th colSpan={5} style={{ ...th, color: '#f59e0b', borderLeft: '1px solid var(--admin-border)' }}>TIMELINESS</th>
                    </tr>
                    <tr style={{ background: 'var(--admin-bg-secondary)' }}>
                        <th style={{ ...th, textAlign: 'left', ...stickyLeft, background: 'var(--admin-bg-secondary)' }}></th>
                        {[...W.map(w=>`W${w}`),'TOTAL',...W.map(w=>`W${w}`),'AVG',...W.map(w=>`W${w}`),'AVG'].map((h,i) => (
                            <th key={i} style={{ ...th, borderLeft: [0,5,10].includes(i) ? '1px solid var(--admin-border)' : undefined }}>{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {sections.map(sec => (
                        <>
                            <tr key={sec.key} style={{ background: 'var(--admin-bg-secondary)' }}>
                                <td colSpan={16} style={{ padding: '0.4rem 0.75rem', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--admin-text-muted)', textTransform: 'uppercase', ...stickyLeft, background: 'var(--admin-bg-secondary)' }}>
                                    {sec.label} ({sec.weight}%)
                                </td>
                            </tr>
                            {sec.rows.map((row, ri) => (
                                <tr key={ri}>
                                    <td style={{ ...td, textAlign: 'left', fontWeight: 500, color: 'var(--admin-text-primary)', ...stickyLeft, background: 'var(--admin-card)', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {row.title}
                                    </td>
                                    {W.map(w => <td key={w} style={{ ...td, borderLeft: w===1?'1px solid var(--admin-border)':undefined }}><ZeroOrValue v={row.qty[w]} /></td>)}
                                    <td style={{ ...td, fontWeight: 700, color: 'var(--admin-accent)' }}>{row.qty_total}</td>
                                    {W.map(w => <td key={w} style={{ ...td, borderLeft: w===1?'1px solid var(--admin-border)':undefined }}><ZeroOrValue v={row.quality[w]} /></td>)}
                                    <td style={{ ...td, fontWeight: 700, color: '#22c55e' }}>{row.qual_avg || '—'}</td>
                                    {W.map(w => <td key={w} style={{ ...td, borderLeft: w===1?'1px solid var(--admin-border)':undefined }}><ZeroOrValue v={row.timeliness[w]} /></td>)}
                                    <td style={{ ...td, fontWeight: 700, color: '#f59e0b' }}>{row.time_avg || '—'}</td>
                                </tr>
                            ))}
                        </>
                    ))}
                    <tr style={{ background: 'rgba(59,130,246,0.07)', borderTop: '2px solid var(--admin-accent)' }}>
                        <td style={{ ...td, textAlign: 'left', fontWeight: 700, fontSize: '0.72rem', color: 'var(--admin-accent)', textTransform: 'uppercase', ...stickyLeft, background: 'rgba(59,130,246,0.07)' }}>
                            Grand Totals / Monthly Averages
                        </td>
                        {W.map(w => <td key={w} style={{ ...td, fontWeight: 600, borderLeft: w===1?'1px solid var(--admin-border)':undefined }}>{grandQty[w]||0}</td>)}
                        <td style={{ ...td, fontWeight: 800, color: 'var(--admin-accent)', background: 'rgba(59,130,246,0.15)' }}>{grandQtyTotal}</td>
                        <td colSpan={4} style={{ ...td, borderLeft: '1px solid var(--admin-border)', fontSize: '0.68rem', color: 'var(--admin-text-muted)' }}>Quality Score:</td>
                        <td style={{ ...td, fontWeight: 700, color: '#22c55e' }}>{grandQualAvg||'—'}</td>
                        <td colSpan={4} style={{ ...td, borderLeft: '1px solid var(--admin-border)', fontSize: '0.68rem', color: 'var(--admin-text-muted)' }}>Timeliness Score:</td>
                        <td style={{ ...td, fontWeight: 700, color: '#f59e0b' }}>{grandTimeAvg||'—'}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}

function MobileCards({ sections, metric, setMetric }) {
    const metricColor = { qty: 'var(--admin-accent)', quality: '#22c55e', timeliness: '#f59e0b' };
    return (
        <>
            <div style={{ display: 'flex', borderBottom: '1px solid var(--admin-border)', marginBottom: '1rem' }}>
                {['qty','quality','timeliness'].map(m => (
                    <button key={m} onClick={() => setMetric(m)} style={{ flex: 1, padding: '0.6rem', background: 'none', border: 'none', borderBottom: metric===m?`2px solid var(--admin-accent)`:'2px solid transparent', cursor: 'pointer', fontSize: '0.78rem', fontWeight: metric===m?700:500, color: metric===m?'var(--admin-accent)':'var(--admin-text-muted)' }}>
                        {m === 'qty' ? 'Quantity' : m === 'quality' ? 'Quality' : 'Timeliness'}
                    </button>
                ))}
            </div>
            {sections.map(sec => (
                <div key={sec.key}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--admin-text-muted)', textTransform: 'uppercase', margin: '0.5rem 0', paddingLeft: '0.25rem' }}>
                        {sec.label} ({sec.weight}%)
                    </div>
                    {sec.rows.map((row, i) => {
                        const data = metric==='qty' ? row.qty : metric==='quality' ? row.quality : row.timeliness;
                        const avg  = metric==='qty' ? row.qty_total : metric==='quality' ? row.qual_avg : row.time_avg;
                        const color = metricColor[metric];
                        return (
                            <div key={i} style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)', borderRadius: 'var(--admin-radius)', padding: '1rem', marginBottom: '0.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--admin-text-primary)', flex: 1, marginRight: '0.5rem' }}>{row.title}</span>
                                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color, background: `${color}22`, border: `1px solid ${color}44`, borderRadius: 99, padding: '0.15rem 0.6rem', whiteSpace: 'nowrap' }}>
                                        {metric==='qty' ? `Total: ${avg}` : `Avg: ${avg}`}
                                    </span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                                    {[1,2,3,4].map(w => (
                                        <div key={w} style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: '0.63rem', color: 'var(--admin-text-muted)', marginBottom: '0.15rem' }}>W{w}</div>
                                            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: (data[w]||0)>0 ? 'var(--admin-text-primary)' : 'var(--admin-text-muted)', opacity: (data[w]||0)>0 ? 1 : 0.35 }}>
                                                {data[w] ?? 0}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ))}
        </>
    );
}

export default function Index() {
    const { month, sections, grandQty, grandQualAvg, grandTimeAvg, grandQtyTotal,
            includedCount, excludedCount, hasIpcr, mpor, lastActivity, employee, supervisor } = usePage().props;

    const [metric, setMetric]     = useState('qty');
    const [submitting, setSubmitting] = useState(false);
    const toast   = useToast();
    const confirm = useConfirm();
    const bp      = useBreakpoint();

    const monthLabel = (() => {
        try { return new Date(month + '-02').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }); }
        catch { return month; }
    })();

    function navMonth(delta) {
        const [y, m] = month.split('-').map(Number);
        const d = new Date(y, m - 1 + delta, 1);
        router.get('/employee/mpor', { month: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}` }, { preserveState: false });
    }

    const canSubmit = hasIpcr && includedCount > 0 && (!mpor || mpor.status === 'draft' || mpor.status === 'returned');

    async function handleSubmit() {
        if (!await confirm(`Submit MPOR for ${monthLabel}? This will notify your supervisor for review.`)) return;
        setSubmitting(true);
        router.post('/employee/mpor/submit', { month }, {
            preserveScroll: true,
            onSuccess: () => toast('MPOR submitted successfully.', 'submitted'),
            onError:   () => toast('Failed to submit MPOR.', 'error'),
            onFinish:  () => setSubmitting(false),
        });
    }

    const initials = (name) => (name ?? '').split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase() || '?';

    return (
        <AppLayout title="MPOR">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

                {/* Header card */}
                <div style={card}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                            <div style={iconBox}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                            </div>
                            <div>
                                <p style={statLabel}>Monthly Performance Output Report</p>
                                <h1 style={{ fontWeight: 700, fontSize: '1.4rem', color: 'var(--admin-text-primary)', lineHeight: 1.1 }}>MPOR</h1>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                            {/* Month navigator */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid var(--admin-border-strong)', borderRadius: 10, padding: '0.4rem 0.65rem', background: 'var(--admin-bg-secondary)' }}>
                                <button onClick={() => navMonth(-1)} style={navBtn}>‹</button>
                                <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--admin-text-primary)', minWidth: 110, textAlign: 'center' }}>{monthLabel}</span>
                                <button onClick={() => navMonth(1)} style={navBtn}>›</button>
                            </div>
                            <a href={`/stage-two/forms/mpor-excel?month=${month}`} style={{ ...btnSecondary, textDecoration: 'none' }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                Export Excel
                            </a>
                            {canSubmit && (
                                <button onClick={handleSubmit} disabled={submitting} style={{ ...btnPrimary, opacity: submitting ? 0.7 : 1 }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                                    {submitting ? 'Submitting…' : 'Submit MPOR'}
                                </button>
                            )}
                            {mpor && !canSubmit && <StatusBadge status={mpor.status} />}
                        </div>
                    </div>
                </div>

                {/* Return banner */}
                {mpor?.status === 'returned' && (
                    <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderLeft: '4px solid #ef4444', borderRadius: 'var(--admin-radius)', padding: '0.85rem 1.25rem' }}>
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" style={{ flexShrink: 0, marginTop: 2 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                            <div>
                                <div style={{ fontWeight: 700, color: '#f87171', fontSize: '0.88rem', marginBottom: '0.15rem' }}>Returned by Supervisor</div>
                                {mpor.return_remarks && <div style={{ color: 'var(--admin-text-secondary)', fontSize: '0.82rem' }}>"{mpor.return_remarks}" — <strong>{mpor.returned_by}</strong></div>}
                            </div>
                        </div>
                    </div>
                )}

                {/* No IPCR warning */}
                {!hasIpcr && (
                    <div style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.3)', borderRadius: 'var(--admin-radius)', padding: '0.85rem 1.25rem', fontSize: '0.82rem', color: '#ca8a04', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                        No committed IPCR found. Commit your IPCR targets before submitting an MPOR.
                    </div>
                )}

                {/* Stats row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                    <div style={card}>
                        <p style={statLabel}>Rated ORS Entries</p>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginTop: '0.2rem' }}>
                            <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--admin-text-primary)' }}>{includedCount}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>Included</span>
                        </div>
                        {excludedCount > 0 && <div style={{ fontSize: '0.72rem', color: '#f87171', marginTop: '0.1rem' }}>⊘ {excludedCount} Excluded from rating</div>}
                    </div>
                    <div style={card}>
                        <p style={statLabel}>Overall Status</p>
                        <div style={{ marginTop: '0.4rem' }}>
                            <StatusBadge status={mpor?.status ?? 'draft'} />
                            {(mpor?.status === 'draft' || !mpor) && <div style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)', marginTop: '0.3rem' }}>Not yet submitted</div>}
                        </div>
                    </div>
                    {lastActivity && (
                        <div style={card}>
                            <p style={statLabel}>Last Activity</p>
                            <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--admin-text-primary)', marginTop: '0.2rem' }}>{lastActivity.label}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)', marginTop: '0.1rem' }}>{lastActivity.at}</div>
                        </div>
                    )}
                </div>

                {/* Table / Mobile cards */}
                {sections.length === 0 ? (
                    <div style={{ ...card, padding: '3rem', textAlign: 'center', color: 'var(--admin-text-muted)' }}>
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.3, marginBottom: '0.75rem', display: 'block', margin: '0 auto 0.75rem' }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                        <p style={{ fontSize: '0.9rem' }}>No rated ORS entries for <strong>{monthLabel}</strong>.</p>
                        <p style={{ fontSize: '0.78rem', marginTop: '0.35rem', opacity: 0.7 }}>Entries must be rated by your supervisor with quality and timeliness scores to appear here.</p>
                    </div>
                ) : (
                    <div style={card}>
                        <p style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--admin-text-primary)', marginBottom: '1rem', letterSpacing: '-0.01em' }}>Monthly Performance Records</p>
                        {bp === 'mobile'
                            ? <MobileCards sections={sections} metric={metric} setMetric={setMetric} />
                            : <MporTable sections={sections} grandQty={grandQty} grandQualAvg={grandQualAvg} grandTimeAvg={grandTimeAvg} grandQtyTotal={grandQtyTotal} />
                        }
                    </div>
                )}

                {/* Authorization footer */}
                {sections.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: bp === 'mobile' ? '1fr' : '1fr 1fr', gap: '0.75rem' }}>
                        <div style={card}>
                            <p style={{ ...statLabel, marginBottom: '0.75rem' }}>Submitted By</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ ...avatarBox, background: 'rgba(59,130,246,0.12)', color: 'var(--admin-accent)' }}>{initials(employee?.name)}</div>
                                <div>
                                    <div style={{ fontWeight: 700, color: 'var(--admin-text-primary)', fontSize: '0.9rem' }}>{employee?.name}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>{employee?.position}</div>
                                    {mpor?.submitted_at && <div style={{ fontSize: '0.72rem', color: 'var(--admin-accent)', marginTop: '0.15rem' }}>{mpor.submitted_at}</div>}
                                </div>
                            </div>
                        </div>
                        <div style={{ ...card, borderLeft: mpor?.status === 'returned' ? '3px solid #ef4444' : (mpor?.status === 'approved' || mpor?.status === 'endorsed') ? '3px solid #22c55e' : '3px solid var(--admin-border-strong)' }}>
                            <p style={{ ...statLabel, marginBottom: '0.75rem' }}>Reviewer</p>
                            {supervisor ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div style={{ ...avatarBox, background: 'rgba(74,222,128,0.12)', color: '#22c55e' }}>{initials(supervisor?.name)}</div>
                                    <div>
                                        <div style={{ fontWeight: 700, color: 'var(--admin-text-primary)', fontSize: '0.9rem' }}>{supervisor.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>{supervisor.position ?? 'Supervisor'}</div>
                                        {mpor?.status === 'returned'  && <div style={{ fontSize: '0.72rem', color: '#f87171', marginTop: '0.15rem' }}>Returned for revision</div>}
                                        {(mpor?.status === 'approved' || mpor?.status === 'endorsed') && <div style={{ fontSize: '0.72rem', color: '#22c55e', marginTop: '0.15rem' }}>✓ Approved</div>}
                                    </div>
                                </div>
                            ) : (
                                <div style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)' }}>No supervisor assigned to your office.</div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}

const card    = { background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)', borderRadius: 'var(--admin-radius)', padding: '1.25rem 1.5rem', boxShadow: 'var(--admin-shadow)' };
const iconBox = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 42, height: 42, borderRadius: 12, border: '1px solid var(--admin-border)', background: 'rgba(59,130,246,0.08)', color: 'var(--admin-accent)', flexShrink: 0 };
const avatarBox = { width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.82rem', flexShrink: 0 };
const statLabel = { fontSize: '0.72rem', fontWeight: 600, color: 'var(--admin-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.25rem' };
const navBtn    = { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-primary)', fontSize: '1.25rem', lineHeight: 1, padding: '0 0.2rem', display: 'flex', alignItems: 'center' };
const btnPrimary  = { display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1.1rem', borderRadius: 10, border: 'none', background: 'var(--admin-accent)', color: '#fff', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' };
const btnSecondary = { display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1.1rem', borderRadius: 10, border: '1px solid var(--admin-border-strong)', background: 'transparent', color: 'var(--admin-text-primary)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' };
