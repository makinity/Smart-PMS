import { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { avatarSrc as resolveAvatar, onAvatarError } from '@/Components/defaultAvatar';

function useBreakpoint() {
    const [w, setW] = useState(() => typeof window !== 'undefined' ? window.innerWidth : 1200);
    useEffect(() => { const h = () => setW(window.innerWidth); window.addEventListener('resize', h); return () => window.removeEventListener('resize', h); }, []);
    return w >= 1024 ? 'desktop' : w >= 640 ? 'tablet' : 'mobile';
}

function StatusBadge({ status }) {
    const map = {
        submitted:   { label: 'Submitted',    bg: 'rgba(59,130,246,0.15)',  color: 'var(--admin-accent)', border: 'rgba(59,130,246,0.3)' },
        pmt_approved:{ label: 'PMT Approved', bg: 'rgba(74,222,128,0.15)', color: '#22c55e',             border: 'rgba(74,222,128,0.3)' },
        returned:    { label: 'Returned',     bg: 'rgba(239,68,68,0.15)',  color: '#f87171',             border: 'rgba(239,68,68,0.3)' },
    };
    const c = map[status] ?? { label: status, bg: 'rgba(100,100,100,0.12)', color: 'var(--admin-text-muted)', border: 'rgba(100,100,100,0.2)' };
    return <span style={{ padding: '0.2rem 0.65rem', borderRadius: 99, fontSize: '0.67rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', background: c.bg, color: c.color, border: `1px solid ${c.border}`, whiteSpace: 'nowrap' }}>{c.label}</span>;
}

function Avatar({ name, src, size = 40 }) {
    return <img src={resolveAvatar(src)} alt={name} onError={onAvatarError} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid var(--admin-border)' }} />;
}

export default function Index({ qars, offices, search: iS, officeId: iO, status: iSt }) {
    const bp = useBreakpoint();
    const [search, setSearch]   = useState(iS ?? '');
    const [officeId, setOffice] = useState(iO ?? '');
    const [status, setStatus]   = useState(iSt ?? '');

    useEffect(() => {
        const t = setTimeout(() => router.get('/pmt/qar', { search, office_id: officeId, status }, { preserveState: true, replace: true }), 300);
        return () => clearTimeout(t);
    }, [search, officeId, status]);

    const isMobile = bp === 'mobile';

    return (
        <AppLayout title="QAR Review">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

                {/* Header */}
                <div style={card}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                        <div style={iconBox}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                        </div>
                        <div>
                            <p style={statLabel}>Quality Assurance Review</p>
                            <h1 style={{ fontWeight: 700, fontSize: '1.35rem', color: 'var(--admin-text-primary)', lineHeight: 1.1 }}>QAR Review</h1>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div style={{ ...card, padding: '1rem 1.25rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr auto auto', gap: '0.65rem' }}>
                        <div style={{ position: 'relative' }}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--admin-text-muted)" strokeWidth="2" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search office or dept head…" style={{ ...inputStyle, paddingLeft: '2.1rem', width: '100%' }} />
                        </div>
                        <select value={officeId} onChange={e => setOffice(e.target.value)} style={inputStyle}>
                            <option value="">All Offices</option>
                            {offices.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                        </select>
                        <select value={status} onChange={e => setStatus(e.target.value)} style={inputStyle}>
                            <option value="">All Status</option>
                            <option value="submitted">Submitted</option>
                            <option value="pmt_approved">Approved</option>
                            <option value="returned">Returned</option>
                        </select>
                    </div>
                </div>

                {/* List */}
                {qars.length === 0 ? (
                    <div style={{ ...card, padding: '3rem', textAlign: 'center', color: 'var(--admin-text-muted)' }}>
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.25, margin: '0 auto 0.75rem', display: 'block' }}><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                        <p style={{ fontSize: '0.9rem' }}>No QAR submissions found.</p>
                        <p style={{ fontSize: '0.78rem', opacity: 0.65, marginTop: '0.25rem' }}>Department Heads must submit QARs before they appear here.</p>
                    </div>
                ) : isMobile ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        {qars.map(q => (
                            <div key={q.id} style={card}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                                    <Avatar name={q.dept_head?.name ?? q.office.name} src={q.dept_head?.avatar} size={44} />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--admin-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.office.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>{q.dept_head?.name ?? '—'} · {q.quarter_key}</div>
                                    </div>
                                    <StatusBadge status={q.status} />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>Submitted {q.submitted_at ?? '—'}</span>
                                    <a href={`/pmt/qar/${q.id}`} style={btnView}>Review <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg></a>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: 'var(--admin-bg-secondary)' }}>
                                    {['Department Head', 'Office', 'Quarter', 'Submitted', 'Status', ''].map((h, i) => (
                                        <th key={i} style={{ padding: '0.6rem 1rem', fontSize: '0.67rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--admin-text-muted)', textAlign: i === 5 ? 'right' : 'left', borderBottom: '1px solid var(--admin-border)', whiteSpace: 'nowrap' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {qars.map(q => (
                                    <tr key={q.id} onMouseEnter={e => e.currentTarget.style.background = 'var(--admin-bg-secondary)'} onMouseLeave={e => e.currentTarget.style.background = ''}>
                                        <td style={td}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                                                <Avatar name={q.dept_head?.name ?? q.office.name} src={q.dept_head?.avatar} />
                                                <div>
                                                    <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--admin-text-primary)' }}>{q.dept_head?.name ?? '—'}</div>
                                                    <div style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)' }}>{q.dept_head?.position ?? 'Department Head'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={td}><span style={{ fontSize: '0.85rem', color: 'var(--admin-text-primary)' }}>{q.office.name}</span></td>
                                        <td style={td}><span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--admin-accent)' }}>{q.quarter_key}</span></td>
                                        <td style={td}><span style={{ fontSize: '0.82rem', color: 'var(--admin-text-muted)' }}>{q.submitted_at ?? '—'}</span></td>
                                        <td style={td}><StatusBadge status={q.status} /></td>
                                        <td style={{ ...td, textAlign: 'right' }}>
                                            <a href={`/pmt/qar/${q.id}`} style={btnView}>Review <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg></a>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}

const card      = { background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)', borderRadius: 'var(--admin-radius)', padding: '1.25rem 1.5rem', boxShadow: 'var(--admin-shadow)' };
const iconBox   = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 42, height: 42, borderRadius: 12, border: '1px solid var(--admin-border)', background: 'rgba(59,130,246,0.08)', color: 'var(--admin-accent)', flexShrink: 0 };
const statLabel = { fontSize: '0.72rem', fontWeight: 600, color: 'var(--admin-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.15rem' };
const inputStyle = { padding: '0.55rem 0.85rem', borderRadius: 10, border: '1px solid var(--admin-border-strong)', background: 'var(--admin-bg-secondary)', color: 'var(--admin-text-primary)', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' };
const td        = { padding: '0.85rem 1rem', borderBottom: '1px solid var(--admin-border)', verticalAlign: 'middle' };
const btnView   = { display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.45rem 0.9rem', borderRadius: 8, border: '1px solid var(--admin-border-strong)', background: 'transparent', color: 'var(--admin-text-primary)', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', textDecoration: 'none', whiteSpace: 'nowrap' };
