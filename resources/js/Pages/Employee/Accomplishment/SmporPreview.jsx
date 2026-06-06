import { useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';

const TABS = [
    { key: 'qty',  label: 'Efficiency / Quantity' },
    { key: 'qual', label: 'Quality / Effectiveness' },
    { key: 'time', label: 'Timeliness' },
];

function cellVal(row, month, tab) {
    const m = row.months[month] ?? { qty: 0, qual_pts: 0, time_pts: 0 };
    if (tab === 'qty')  return m.qty || '';
    if (tab === 'qual') return m.qual_pts || '';
    return m.time_pts || '';
}

function totalVal(row, tab) {
    if (tab === 'qty')  return row.total_qty || '';
    if (tab === 'qual') return row.total_qty > 0 ? row.avg_qual : '';
    return row.total_qty > 0 ? row.avg_time : '';
}

function totalLabel(tab) {
    return tab === 'qty' ? 'Total' : 'Avg Rating';
}

function cellColor(val) {
    if (!val || val === 0) return 'var(--admin-text-muted)';
    if (val >= 4) return '#10b981';
    if (val >= 3) return 'var(--admin-accent)';
    return 'var(--admin-text-primary)';
}

export default function SmporPreview() {
    const { period, employee, source, table } = usePage().props;
    const [tab, setTab] = useState('qty');

    const months   = table?.months ?? [];
    const sections = table?.sections ?? [];

    const th = { padding: '0.5rem 0.75rem', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.06em', color: 'var(--admin-text-muted)', whiteSpace: 'nowrap',
        background: 'var(--admin-bg-secondary)', borderBottom: '1px solid var(--admin-border)' };
    const td = { padding: '0.55rem 0.75rem', fontSize: '0.82rem', color: 'var(--admin-text-primary)',
        borderBottom: '1px solid var(--admin-border)', whiteSpace: 'nowrap' };

    return (
        <AppLayout title="SMPOR Preview" description={`Period: ${period?.name}`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                {/* Header + Tabs card */}
                <div style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)', borderRadius: 'var(--admin-radius)', boxShadow: 'var(--admin-shadow)', padding: '1.1rem 1.25rem 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: '1rem' }}>
                        <div>
                            <button onClick={() => router.visit('/employee/accomplishment')}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-muted)', fontSize: '0.85rem', padding: 0, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <i className="bi bi-arrow-left" /> Back
                            </button>
                            <h2 style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--admin-text-primary)', marginBottom: 2 }}>SMPOR</h2>
                            <div style={{ fontSize: '0.78rem', color: 'var(--admin-text-muted)' }}>
                                {employee?.name} · {employee?.office} · {period?.name}
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '3px 10px', borderRadius: 99,
                                background: source === 'qar_official' ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
                                color: source === 'qar_official' ? '#10b981' : '#f59e0b' }}>
                                {source === 'qar_official' ? 'QAR Official' : 'Preview'}
                            </span>
                            <a href={`/stage-two/forms/smpor-excel`}
                                style={{ padding: '0.45rem 0.9rem', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600,
                                    background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)',
                                    color: '#10b981', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <i className="bi bi-file-earmark-excel" /> Export
                            </a>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div style={{ display: 'flex', gap: 4, borderTop: '1px solid var(--admin-border)', overflowX: 'auto', scrollbarWidth: 'none' }}>
                        {TABS.map(t => (
                            <button key={t.key} onClick={() => setTab(t.key)} style={{
                                padding: '0.55rem 1rem', background: 'none', border: 'none', cursor: 'pointer',
                                fontSize: '0.82rem', fontWeight: tab === t.key ? 700 : 500, whiteSpace: 'nowrap',
                                color: tab === t.key ? 'var(--admin-accent)' : 'var(--admin-text-muted)',
                                borderBottom: `2px solid ${tab === t.key ? 'var(--admin-accent)' : 'transparent'}`,
                                marginBottom: -1,
                            }}>
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Table */}
                {sections.length === 0 ? (
                    <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: '0.85rem',
                        background: 'var(--admin-card)', borderRadius: 'var(--admin-radius)', border: '1px solid var(--admin-border-strong)' }}>
                        <i className="bi bi-table" style={{ fontSize: '2rem', display: 'block', marginBottom: 8 }} />
                        No rated ORS data found for this period.
                    </div>
                ) : sections.map(section => (
                    <div key={section.type} style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)',
                        borderRadius: 'var(--admin-radius)', overflow: 'hidden', boxShadow: 'var(--admin-shadow)' }}>
                        {/* Section header */}
                        <div style={{ padding: '0.6rem 0.85rem', background: 'rgba(59,130,246,0.06)', borderBottom: '1px solid var(--admin-border)',
                            display: 'flex', alignItems: 'center', gap: 6 }}>
                            <i className="bi bi-grid-3x3-gap" style={{ color: 'var(--admin-accent)', fontSize: '0.85rem' }} />
                            <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--admin-text-primary)', textTransform: 'capitalize' }}>
                                {section.type} Functions
                            </span>
                            <span style={{ marginLeft: 'auto', fontSize: '0.68rem', color: 'var(--admin-text-muted)' }}>
                                {section.rows.length} output{section.rows.length !== 1 ? 's' : ''}
                            </span>
                        </div>

                        {/* Scrollable table */}
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                                <thead>
                                    <tr>
                                        <th style={{ ...th, position: 'sticky', left: 0, zIndex: 2, minWidth: 200, textAlign: 'left' }}>
                                            Expected Output
                                        </th>
                                        {months.map(m => (
                                            <th key={m} style={{ ...th, textAlign: 'center', minWidth: 70 }}>{m}</th>
                                        ))}
                                        <th style={{ ...th, textAlign: 'center', minWidth: 80, color: 'var(--admin-accent)' }}>
                                            {totalLabel(tab)}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {section.rows.map((row, i) => (
                                        <tr key={i}>
                                            <td style={{ ...td, position: 'sticky', left: 0, zIndex: 1,
                                                background: 'var(--admin-card)', fontWeight: 500, maxWidth: 260,
                                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                                title={row.output}>
                                                {row.output}
                                            </td>
                                            {months.map(m => {
                                                const v = cellVal(row, m, tab);
                                                return (
                                                    <td key={m} style={{ ...td, textAlign: 'center',
                                                        color: tab === 'qty' ? (v ? 'var(--admin-text-primary)' : 'var(--admin-text-muted)') : cellColor(v),
                                                        fontWeight: v ? 600 : 400 }}>
                                                        {v || '—'}
                                                    </td>
                                                );
                                            })}
                                            <td style={{ ...td, textAlign: 'center', fontWeight: 700,
                                                color: tab === 'qty' ? 'var(--admin-text-primary)' : cellColor(totalVal(row, tab)),
                                                borderLeft: '1px solid var(--admin-border-strong)' }}>
                                                {totalVal(row, tab) || '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))}
            </div>
        </AppLayout>
    );
}
