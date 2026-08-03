import { useState } from 'react';
import { usePage, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import PeriodSelector from '@/Components/PeriodSelector';

const RATING_COLOR = {
    'Outstanding': '#3b82f6', 'Very Satisfactory': '#10b981',
    'Satisfactory': '#f59e0b', 'Fair': '#eab308',
    'Poor': '#ef4444', 'Unsatisfactory': '#eab308',
};
const RATING_BG = {
    'Outstanding': 'rgba(59,130,246,0.08)', 'Very Satisfactory': 'rgba(16,185,129,0.08)',
    'Satisfactory': 'rgba(245,158,11,0.08)', 'Fair': 'rgba(234,179,8,0.08)',
    'Poor': 'rgba(239,68,68,0.08)', 'Unsatisfactory': 'rgba(234,179,8,0.08)',
};

const STATUS_FILTERS = [
    { key: 'all',            label: 'All' },
    { key: 'pending',        label: 'For Review' },
    { key: 'submitted_to_ld', label: 'Sent to L&D' },
];

function matchesFilter(office, filter) {
    if (filter === 'all') return true;
    if (filter === 'pending') return (office.submitted_to_pmt ?? 0) > 0;
    if (filter === 'submitted_to_ld') return (office.submitted_to_ld ?? 0) > 0;
    return true;
}

function OfficeCard({ office }) {
    const color = RATING_COLOR[office.office_rating] ?? '#60a5fa';
    const bg    = RATING_BG[office.office_rating]    ?? 'rgba(96,165,250,0.08)';
    const pending = office.submitted_to_pmt ?? 0;
    const done    = office.submitted_to_ld  ?? 0;
    const total   = office.total            ?? 0;

    return (
        <div
            onClick={() => router.visit(`/pmt/idp/office/${office.office_id}`)}
            style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)', borderTop: `3px solid ${color}`, borderRadius: 'var(--admin-radius)', boxShadow: 'var(--admin-shadow)', padding: '1.25rem', cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'var(--admin-shadow)'; }}>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', marginBottom: '0.85rem' }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: bg, border: `1px solid ${color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className="bi bi-building" style={{ color, fontSize: '0.9rem' }} />
                </div>
                <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--admin-text-primary)', lineHeight: 1.3 }}>{office.office_name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)', marginTop: 2 }}>{office.period_name}</div>
                </div>
            </div>

            {office.office_score != null ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.85rem' }}>
                    <span style={{ fontSize: '1.5rem', fontWeight: 800, color, lineHeight: 1 }}>{office.office_score.toFixed(2)}</span>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 9px', borderRadius: 99, color, background: bg, border: `1px solid ${color}33`, textTransform: 'uppercase' }}>{office.office_rating}</span>
                </div>
            ) : (
                <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)', marginBottom: '0.85rem' }}>Office score not available</div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '0.85rem' }}>
                {[['Total', total, 'var(--admin-text-primary)'], ['For Review', pending, '#a78bfa'], ['Sent to L&D', done, '#4ade80']].map(([label, val, c]) => (
                    <div key={label} style={{ background: 'var(--admin-bg-secondary)', border: '1px solid var(--admin-border)', borderRadius: 8, padding: '0.5rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: c }}>{val}</div>
                        <div style={{ fontSize: '0.6rem', color: 'var(--admin-text-muted)', marginTop: 2 }}>{label}</div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: 'var(--admin-accent)', fontWeight: 600 }}>
                View IDPs <i className="bi bi-arrow-right" />
            </div>
        </div>
    );
}

export default function Index() {
    const { offices = [], period, allPeriods = [] } = usePage().props;
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');
    const isPastPeriod = period && !period.is_active;

    const filtered = offices.filter(o => {
        const matchSearch = !search || o.office_name.toLowerCase().includes(search.toLowerCase());
        return matchSearch && matchesFilter(o, filter);
    });

    const card = { background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)', borderRadius: 'var(--admin-radius)', boxShadow: 'var(--admin-shadow)' };

    return (
        <AppLayout title="IDP Review" description="Individual Development Plans — Office Level">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                {/* Header container */}
                <div style={{ ...card, padding: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: 8 }}>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--admin-text-primary)' }}>IDP Review</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)', marginTop: 2 }}>
                                {offices.length} office{offices.length !== 1 ? 's' : ''} with submitted IDPs
                            </div>
                        </div>
                        <PeriodSelector period={period} allPeriods={allPeriods} route="/pmt/idp" />
                    </div>

                    {/* Live search */}
                    <div style={{ position: 'relative', marginBottom: '0.6rem' }}>
                        <i className="bi bi-search" style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--admin-text-muted)', fontSize: '0.78rem', pointerEvents: 'none' }} />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search by office name…"
                            style={{ width: '100%', boxSizing: 'border-box', padding: '0.42rem 0.75rem 0.42rem 2rem', background: 'var(--admin-bg-secondary)', border: '1px solid var(--admin-border)', borderRadius: 8, color: 'var(--admin-text-primary)', fontSize: '0.78rem', outline: 'none', fontFamily: 'inherit' }}
                        />
                    </div>

                    {/* Status filters */}
                    <div style={{ display: 'flex', gap: 4, overflowX: 'auto', scrollbarWidth: 'none' }}>
                        {STATUS_FILTERS.map(({ key, label }) => {
                            const count = key === 'all' ? offices.length
                                : key === 'pending' ? offices.filter(o => (o.submitted_to_pmt ?? 0) > 0).length
                                : offices.filter(o => (o.submitted_to_ld ?? 0) > 0).length;
                            return (
                                <button key={key} onClick={() => setFilter(key)} style={{
                                    flexShrink: 0, padding: '0.35rem 0.85rem', borderRadius: 99, border: '1px solid',
                                    fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
                                    borderColor: filter === key ? 'var(--admin-accent)' : 'var(--admin-border)',
                                    background: filter === key ? 'rgba(59,130,246,0.12)' : 'transparent',
                                    color: filter === key ? 'var(--admin-accent)' : 'var(--admin-text-muted)',
                                }}>{label}{count > 0 ? ` (${count})` : ''}</button>
                            );
                        })}
                    </div>
                </div>

                {/* Office card grid */}
                {filtered.length === 0 ? (
                    <div style={{ ...card, padding: '4rem', textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: '0.85rem' }}>
                        <i className="bi bi-building" style={{ fontSize: '2.5rem', display: 'block', marginBottom: 12 }} />
                        {search || filter !== 'all' ? 'No offices match your search.' : 'No offices have submitted IDPs to PMT yet.'}
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                        {filtered.map(o => <OfficeCard key={o.office_id} office={o} />)}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
