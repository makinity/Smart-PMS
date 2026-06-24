import { usePage, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';

export default function SmporPreview() {
    const { opcraId, submission, table } = usePage().props;
    const months = table?.months ?? [], sections = table?.sections ?? [];
    const th = { padding: '0.5rem 0.75rem', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--admin-text-muted)', whiteSpace: 'nowrap', background: 'var(--admin-bg-secondary)', borderBottom: '1px solid var(--admin-border)' };
    const td = { padding: '0.55rem 0.75rem', fontSize: '0.82rem', color: 'var(--admin-text-primary)', borderBottom: '1px solid var(--admin-border)', whiteSpace: 'nowrap' };

    return (
        <AppLayout title="SMPOR Preview" description={submission?.employee_name}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)', borderRadius: 'var(--admin-radius)', padding: '1rem 1.25rem' }}>
                    <button onClick={() => router.visit(`/pmt/opcr-accomplishment/${opcraId}/employee/${submission?.id}`)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-muted)', fontSize: '0.82rem', padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg> Back to Review
                    </button>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--admin-text-primary)', marginTop: 8 }}>SMPOR — {submission?.employee_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>{submission?.period}</div>
                </div>
                {sections.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--admin-text-muted)' }}>
                        <i className="bi bi-table" style={{ fontSize: '2rem', display: 'block', marginBottom: 8 }} />No rated ORS data found.
                    </div>
                ) : sections.map(section => (
                    <div key={section.type} style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)', borderRadius: 'var(--admin-radius)', overflow: 'hidden' }}>
                        <div style={{ padding: '0.6rem 1rem', background: 'rgba(59,130,246,0.05)', borderBottom: '1px solid var(--admin-border)', fontWeight: 700, fontSize: '0.82rem', textTransform: 'capitalize', color: 'var(--admin-text-primary)' }}>
                            {section.type}{section.weight ? ` (${section.weight}%)` : ''}
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead><tr>
                                    <th style={{ ...th, position: 'sticky', left: 0, zIndex: 2, minWidth: 200, textAlign: 'left' }}>Expected Output</th>
                                    {months.map(m => <th key={m} style={{ ...th, textAlign: 'center', minWidth: 60 }}>{m}</th>)}
                                    <th style={{ ...th, textAlign: 'center', minWidth: 70, color: 'var(--admin-accent)' }}>Total</th>
                                </tr></thead>
                                <tbody>
                                    {section.rows.map((row, i) => (
                                        <tr key={i}>
                                            <td style={{ ...td, position: 'sticky', left: 0, background: 'var(--admin-card)', fontWeight: 500 }}>{row.output}</td>
                                            {months.map(m => <td key={m} style={{ ...td, textAlign: 'center' }}>{row.months[m]?.qty || '—'}</td>)}
                                            <td style={{ ...td, textAlign: 'center', fontWeight: 700, borderLeft: '1px solid var(--admin-border-strong)' }}>{row.total_qty || '—'}</td>
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
