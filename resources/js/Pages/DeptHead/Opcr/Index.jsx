import AppLayout from '@/Layouts/AppLayout';
import { usePage, router } from '@inertiajs/react';
import { useState, useMemo } from 'react';

const statusStyle = s => ({
    padding: '0.2rem 0.65rem', borderRadius: 999, fontSize: '0.7rem', fontWeight: 600, border: '1px solid',
    textTransform: 'capitalize',
    ...(s === 'submitted' ? { background: 'rgba(59,130,246,0.15)',  color: 'var(--admin-accent)',  borderColor: 'rgba(59,130,246,0.35)' } :
        s === 'approved'  ? { background: 'rgba(74,222,128,0.15)',  color: '#4ade80',              borderColor: 'rgba(74,222,128,0.35)' } :
                            { background: 'rgba(234,179,8,0.15)',   color: '#facc15',              borderColor: 'rgba(234,179,8,0.35)' }),
});

export default function Index() {
    const { opcrs = [], activePeriod } = usePage().props;
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return opcrs.filter(o =>
            (statusFilter === 'all' || o.status === statusFilter) &&
            (!q || o.period?.toLowerCase().includes(q))
        );
    }, [opcrs, search, statusFilter]);

    return (
        <AppLayout title="OPCR">
            <div style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                    <div>
                        <h4 style={h}>Office Performance Commitment and Review</h4>
                        <p style={sub}>Active period: <strong style={{ color: 'var(--admin-text-primary)' }}>{activePeriod}</strong></p>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                    <input
                        type="text" placeholder="Search period…" value={search}
                        onChange={e => setSearch(e.target.value)} style={searchInput}
                    />
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={selectInput}>
                        <option value="all">All statuses</option>
                        <option value="draft">Draft</option>
                        <option value="submitted">Submitted</option>
                        <option value="approved">Approved</option>
                    </select>
                </div>

                {filtered.length > 0 ? (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--admin-border-strong)' }}>
                                    {['Period', 'UWPs Consolidated', 'Status', 'Last Updated', ''].map(col => (
                                        <th key={col} style={th}>{col}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(o => (
                                    <tr key={o.id} style={{ borderBottom: '1px solid var(--admin-border)' }}>
                                        <td style={td}>{o.period}</td>
                                        <td style={td}>
                                            <span style={{ color: o.approved_count === o.uwp_count && o.uwp_count > 0 ? '#4ade80' : 'var(--admin-text-primary)' }}>
                                                {o.approved_count} / {o.uwp_count}
                                            </span>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)', marginLeft: '0.4rem' }}>approved</span>
                                        </td>
                                        <td style={td}><span style={statusStyle(o.status)}>{o.status}</span></td>
                                        <td style={{ ...td, color: 'var(--admin-text-muted)' }}>{o.updated_at}</td>
                                        <td style={{ ...td, textAlign: 'right' }}>
                                            <button onClick={() => router.visit(`/dept-head/opcr/${o.id}`)} style={iconBtn} title="View">
                                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div style={empty}>
                        <p style={{ fontWeight: 600, color: 'var(--admin-text-primary)', marginBottom: '0.25rem' }}>
                            {search || statusFilter !== 'all' ? 'No results found' : 'No OPCRs yet'}
                        </p>
                        <p style={{ fontSize: '0.82rem', color: 'var(--admin-text-muted)' }}>
                            {search || statusFilter !== 'all'
                                ? 'Try adjusting your search or filter.'
                                : 'OPCRs are created once UWPs from your office are approved.'}
                        </p>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}

const card        = { background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)', borderRadius: 'var(--admin-radius)', padding: '1.75rem', boxShadow: 'var(--admin-shadow)' };
const h           = { fontWeight: 700, fontSize: '1.1rem', color: 'var(--admin-text-primary)', marginBottom: '0.25rem' };
const sub         = { fontSize: '0.82rem', color: 'var(--admin-text-muted)' };
const th          = { padding: '0.6rem 0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.72rem', color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' };
const td          = { padding: '0.75rem', color: 'var(--admin-text-primary)' };
const iconBtn     = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '2rem', height: '2rem', borderRadius: 6, border: '1px solid var(--admin-border-strong)', color: 'var(--admin-accent)', background: 'none', cursor: 'pointer' };
const empty       = { padding: '3rem', textAlign: 'center', color: 'var(--admin-text-muted)' };
const searchInput = { flex: 1, minWidth: 220, padding: '0.5rem 0.85rem', fontSize: '0.85rem', background: 'var(--admin-bg-secondary)', border: '1px solid var(--admin-border-strong)', borderRadius: 8, color: 'var(--admin-text-primary)' };
const selectInput = { padding: '0.5rem 0.85rem', fontSize: '0.85rem', background: 'var(--admin-bg-secondary)', border: '1px solid var(--admin-border-strong)', borderRadius: 8, color: 'var(--admin-text-primary)', cursor: 'pointer' };
