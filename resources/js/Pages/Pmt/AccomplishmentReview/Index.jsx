import { useState, useEffect } from 'react';
import { usePage, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';

const STATUS_CFG = {
    dept_head_endorsed:   { label: 'Pending Review',  c: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    pmt_calibrated:       { label: 'Calibrating',     c: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
    released_by_pmt:      { label: 'Released',        c: '#4ade80', bg: 'rgba(74,222,128,0.12)' },
    returned_to_employee: { label: 'Returned',        c: '#f87171', bg: 'rgba(239,68,68,0.12)' },
};

function relativeTime(iso) {
    if (!iso) return '—';
    const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

function useIsMobile() {
    const [mobile, setMobile] = useState(() => window.innerWidth < 640);
    useEffect(() => {
        const h = () => setMobile(window.innerWidth < 640);
        window.addEventListener('resize', h);
        return () => window.removeEventListener('resize', h);
    }, []);
    return mobile;
}

function SubmissionRow({ s, isMobile }) {
    const sc = STATUS_CFG[s.status] ?? { label: s.status, c: '#94a3b8', bg: 'rgba(100,116,139,0.12)' };
    const pending  = s.status === 'dept_head_endorsed';
    const accentColor = s.dept_head_flagged_for_calibration ? '#a78bfa' : pending ? '#f59e0b' : sc.c;
    const initials = s.employee_name?.slice(0, 2).toUpperCase();

    if (isMobile) {
        return (
            <div onClick={() => router.visit(`/pmt/accomplishment-review/${s.id}`)}
                style={{ padding: '0.9rem 1rem', borderRadius: 10, cursor: 'pointer', marginBottom: 8,
                    background: 'var(--admin-bg-secondary)', border: '1px solid var(--admin-border)',
                    borderLeft: `3px solid ${accentColor}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                        background: 'var(--admin-accent)', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: '0.68rem', fontWeight: 700, color: '#fff' }}>
                        {initials}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--admin-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {s.employee_name}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {s.employee_office}
                        </div>
                    </div>
                    <i className="bi bi-chevron-right" style={{ color: 'var(--admin-text-muted)', fontSize: '0.75rem', flexShrink: 0 }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap', paddingLeft: '2.5rem' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--admin-text-muted)' }}>
                        {s.period} · {relativeTime(s.dept_head_action_at)}
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {s.final_adjectival_rating && (
                            <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: 'rgba(74,222,128,0.12)', color: '#4ade80' }}>
                                {s.final_adjectival_rating}
                            </span>
                        )}
                        <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: sc.bg, color: sc.c }}>
                            {sc.label}
                        </span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div onClick={() => router.visit(`/pmt/accomplishment-review/${s.id}`)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1rem',
                borderRadius: 10, cursor: 'pointer', marginBottom: 6,
                background: 'var(--admin-bg-secondary)', border: '1px solid var(--admin-border)',
                borderLeft: `3px solid ${accentColor}`,
                transition: 'background 0.1s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.05)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--admin-bg-secondary)'}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                background: 'var(--admin-accent)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, color: '#fff' }}>
                {initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--admin-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.employee_name}
                    <span style={{ fontWeight: 400, color: 'var(--admin-text-muted)', fontSize: '0.8rem' }}> — {s.employee_office}</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)', marginTop: 2 }}>
                    {s.period} · Endorsed {relativeTime(s.dept_head_action_at)}
                </div>
            </div>
            {s.final_adjectival_rating && (
                <span style={{ flexShrink: 0, fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: 'rgba(74,222,128,0.12)', color: '#4ade80' }}>
                    {s.final_adjectival_rating}
                </span>
            )}
            <span style={{ flexShrink: 0, fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: sc.bg, color: sc.c }}>
                {sc.label}
            </span>
            <i className="bi bi-chevron-right" style={{ color: 'var(--admin-text-muted)', fontSize: '0.75rem', flexShrink: 0 }} />
        </div>
    );
}

export default function Index() {
    const { submissions = [] } = usePage().props;
    const [search, setSearch] = useState('');
    const isMobile = useIsMobile();

    const q = search.toLowerCase();
    const filtered = submissions.filter(s =>
        !q || s.employee_name.toLowerCase().includes(q) || s.employee_office.toLowerCase().includes(q)
    );

    const flagged   = filtered.filter(s => s.dept_head_flagged_for_calibration && s.status === 'dept_head_endorsed');
    const standard  = filtered.filter(s => !s.dept_head_flagged_for_calibration && s.status === 'dept_head_endorsed');
    const processed = filtered.filter(s => s.status !== 'dept_head_endorsed');

    const pendingCount = submissions.filter(s => s.status === 'dept_head_endorsed').length;
    const card = { background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)', borderRadius: 'var(--admin-radius)', boxShadow: 'var(--admin-shadow)' };
    const groupHeader = (label, count, color) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.65rem', marginTop: '0.25rem' }}>
            <div style={{ height: 1, flex: 1, background: 'var(--admin-border)' }} />
            <span style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color, whiteSpace: 'nowrap' }}>
                {label} · {count}
            </span>
            <div style={{ height: 1, flex: 1, background: 'var(--admin-border)' }} />
        </div>
    );

    return (
        <AppLayout title="Accomplishment Review" description="Review, calibrate, and release employee accomplishment submissions">
            <div style={{ ...card, padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: 8 }}>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--admin-text-primary)' }}>Accomplishment Submissions</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)', marginTop: 2 }}>
                            {pendingCount} pending · {submissions.length} total
                        </div>
                    </div>
                    {pendingCount > 0 && (
                        <span style={{ fontSize: '0.62rem', fontWeight: 800, padding: '2px 10px', borderRadius: 99, background: '#f59e0b', color: '#fff' }}>
                            {pendingCount} TO REVIEW
                        </span>
                    )}
                </div>

                <div style={{ position: 'relative', marginBottom: '1rem' }}>
                    <i className="bi bi-search" style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--admin-text-muted)', fontSize: '0.78rem', pointerEvents: 'none' }} />
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search by employee or office…"
                        style={{ width: '100%', boxSizing: 'border-box', padding: '0.42rem 0.75rem 0.42rem 2rem',
                            background: 'var(--admin-bg-secondary)', border: '1px solid var(--admin-border)',
                            borderRadius: 8, color: 'var(--admin-text-primary)', fontSize: '0.78rem', outline: 'none', fontFamily: 'inherit' }} />
                </div>

                {filtered.length === 0 && (
                    <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: '0.85rem' }}>
                        <i className="bi bi-inbox" style={{ fontSize: '2rem', display: 'block', marginBottom: 8 }} />
                        No submissions found.
                    </div>
                )}

                {flagged.length > 0 && (
                    <>
                        {groupHeader('Needs Calibration', flagged.length, '#a78bfa')}
                        <div style={{ padding: '0.75rem', marginBottom: '0.5rem', borderRadius: 10, background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.2)' }}>
                            <div style={{ fontSize: '0.72rem', color: '#a78bfa', marginBottom: '0.65rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <i className="bi bi-flag-fill" />
                                Flagged by Department Head for PMT calibration session before release.
                            </div>
                            {flagged.map(s => <SubmissionRow key={s.id} s={s} isMobile={isMobile} />)}
                        </div>
                    </>
                )}

                {standard.length > 0 && (
                    <>
                        {groupHeader('Standard Review', standard.length, '#f59e0b')}
                        {standard.map(s => <SubmissionRow key={s.id} s={s} isMobile={isMobile} />)}
                    </>
                )}

                {processed.length > 0 && (
                    <>
                        {groupHeader('Processed', processed.length, '#94a3b8')}
                        {processed.map(s => <SubmissionRow key={s.id} s={s} isMobile={isMobile} />)}
                    </>
                )}
            </div>
        </AppLayout>
    );
}


