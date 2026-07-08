import { useState } from 'react';

const SMPOR_TABS = [
    { key: 'qty',  label: 'Efficiency / Quantity' },
    { key: 'qual', label: 'Quality / Effectiveness' },
    { key: 'time', label: 'Timeliness' },
];

export function scoreColor(score) {
    if (!score) return 'var(--admin-text-muted)';
    if (score >= 5.0) return '#3b82f6';
    if (score >= 4.0) return '#10b981';
    if (score >= 3.0) return '#f59e0b';
    if (score >= 2.0) return '#eab308';
    return '#ef4444';
}

// ── SMPOR Table ───────────────────────────────────────────────────────────────
export function SmporTable({ table }) {
    const [tab, setTab] = useState('qty');
    const months = table?.months ?? [], sections = table?.sections ?? [];
    const th = { padding: '0.5rem 0.75rem', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--admin-text-muted)', whiteSpace: 'nowrap', background: 'var(--admin-bg-secondary)', borderBottom: '1px solid var(--admin-border)' };
    const td = { padding: '0.55rem 0.75rem', fontSize: '0.82rem', color: 'var(--admin-text-primary)', borderBottom: '1px solid var(--admin-border)', whiteSpace: 'nowrap' };

    if (!sections.length) return (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: '0.82rem' }}>
            <i className="bi bi-table" style={{ fontSize: '1.5rem', display: 'block', marginBottom: 6 }} />No rated ORS data found.
        </div>
    );

    function val(row, m) {
        const d = row.months[m] ?? {};
        return tab === 'qty' ? d.qty : tab === 'qual' ? d.qual_pts : d.time_pts;
    }
    function total(row) { return tab === 'qty' ? row.total_qty : tab === 'qual' ? row.avg_qual : row.avg_time; }

    return (
        <>
            <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--admin-border)', marginBottom: '0.75rem', overflowX: 'auto', scrollbarWidth: 'none' }}>
                {SMPOR_TABS.map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)} style={{ padding: '0.5rem 0.9rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: tab === t.key ? 700 : 500, whiteSpace: 'nowrap', color: tab === t.key ? 'var(--admin-accent)' : 'var(--admin-text-muted)', borderBottom: `2px solid ${tab === t.key ? 'var(--admin-accent)' : 'transparent'}`, marginBottom: -1 }}>{t.label}</button>
                ))}
            </div>
            {sections.map(section => (
                <div key={section.type} style={{ marginBottom: '0.75rem', border: '1px solid var(--admin-border)', borderRadius: 8, overflow: 'hidden' }}>
                    <div style={{ padding: '0.5rem 0.85rem', background: 'rgba(59,130,246,0.05)', borderBottom: '1px solid var(--admin-border)', fontSize: '0.78rem', fontWeight: 700, color: 'var(--admin-text-primary)', textTransform: 'capitalize' }}>
                        {section.type}{section.weight ? ` (${section.weight}%)` : ''}
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead><tr>
                                <th style={{ ...th, position: 'sticky', left: 0, zIndex: 2, minWidth: 200, textAlign: 'left' }}>Expected Output</th>
                                {months.map(m => <th key={m} style={{ ...th, textAlign: 'center', minWidth: 60 }}>{m}</th>)}
                                <th style={{ ...th, textAlign: 'center', minWidth: 70, color: 'var(--admin-accent)' }}>{tab === 'qty' ? 'Total' : 'Avg'}</th>
                            </tr></thead>
                            <tbody>
                                {section.rows.map((row, i) => (
                                    <tr key={i}>
                                        <td style={{ ...td, position: 'sticky', left: 0, zIndex: 1, background: 'var(--admin-card)', fontWeight: 500, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis' }} title={row.output}>{row.output}</td>
                                        {months.map(m => <td key={m} style={{ ...td, textAlign: 'center' }}>{val(row, m) || '—'}</td>)}
                                        <td style={{ ...td, textAlign: 'center', fontWeight: 700, borderLeft: '1px solid var(--admin-border-strong)' }}>{total(row) || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ))}
        </>
    );
}

// ── IPCR Sections ─────────────────────────────────────────────────────────────
function RatingBadge({ label, value }) {
    const color = !value ? 'var(--admin-text-muted)' : scoreColor(value);
    return (
        <div style={{ textAlign: 'center', minWidth: 40 }}>
            <div style={{ fontSize: '0.58rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--admin-text-muted)', marginBottom: 2 }}>{label}</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 800, color, lineHeight: 1 }}>{value != null ? Number(value).toFixed(2) : '—'}</div>
        </div>
    );
}

export function IpcrSections({ sections }) {
    if (!sections?.length) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: '0.82rem' }}>No IPCR data available.</div>;
    return sections.map(fn => (
        <div key={fn.id} style={{ marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.6rem 0.85rem', background: 'rgba(59,130,246,0.05)', borderRadius: '8px 8px 0 0', border: '1px solid var(--admin-border)' }}>
                <i className="bi bi-house-door" style={{ color: 'var(--admin-accent)' }} />
                <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--admin-text-primary)', flex: 1 }}>{fn.name}</span>
                {fn.weight && <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: 'rgba(59,130,246,0.10)', color: 'var(--admin-accent)' }}>{fn.weight}%</span>}
            </div>
            {fn.mfos.map(mfo => (
                <div key={mfo.id} style={{ border: '1px solid var(--admin-border)', borderTop: 'none' }}>
                    <div style={{ padding: '0.55rem 0.85rem', background: 'var(--admin-bg-secondary)', borderBottom: '1px solid var(--admin-border)', fontSize: '0.82rem', fontWeight: 600, color: 'var(--admin-text-primary)' }}>{mfo.title}</div>
                    {mfo.indicators.map((ind, i) => (
                        <div key={ind.id} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', padding: '0.7rem 0.85rem', borderBottom: '1px solid var(--admin-border)', flexWrap: 'wrap' }}>
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
    ));
}

// ── MPOR List ─────────────────────────────────────────────────────────────────
const MPOR_STATUS_CFG = {
    draft:     { label: 'Draft',     c: '#94a3b8', bg: 'rgba(148,163,184,0.14)' },
    submitted: { label: 'Submitted', c: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
    approved:  { label: 'Approved',  c: '#10b981', bg: 'rgba(16,185,129,0.12)' },
    endorsed:  { label: 'Endorsed',  c: '#059669', bg: 'rgba(5,150,105,0.12)' },
    returned:  { label: 'Returned',  c: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
};

export function MporList({ mpors }) {
    if (!mpors?.length) return (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: '0.82rem' }}>
            <i className="bi bi-calendar3" style={{ fontSize: '1.5rem', display: 'block', marginBottom: 6 }} />No monthly POR records for this period.
        </div>
    );
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {mpors.map(m => {
                const cfg = MPOR_STATUS_CFG[m.status] ?? { label: m.status, c: '#94a3b8', bg: 'rgba(148,163,184,0.14)' };
                return (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.7rem 0.9rem', borderRadius: 8, border: '1px solid var(--admin-border)', background: 'var(--admin-bg-secondary)' }}>
                        <i className="bi bi-calendar-month" style={{ color: 'var(--admin-accent)', fontSize: '1rem', flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--admin-text-primary)' }}>{m.month_label}</div>
                            {m.submitted_at && <div style={{ fontSize: '0.68rem', color: 'var(--admin-text-muted)' }}>Submitted {new Date(m.submitted_at).toLocaleDateString()}</div>}
                        </div>
                        <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '2px 9px', borderRadius: 99, background: cfg.bg, color: cfg.c, flexShrink: 0 }}>{cfg.label}</span>
                    </div>
                );
            })}
        </div>
    );
}
