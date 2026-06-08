import { useState } from 'react';
import { avatarSrc, onAvatarError } from '@/Components/defaultAvatar';

// Read-only viewer for employees assigned to a success indicator.
// Mirrors the Supervisor UWP AssignModal layout (success probability + risk),
// using the backend demo AI prediction attached to each employee.

const RISK_COLOR = {
    Low:    { bg: 'rgba(74,222,128,0.15)', color: '#4ade80', border: 'rgba(74,222,128,0.3)' },
    Medium: { bg: 'rgba(234,179,8,0.15)',  color: '#facc15', border: 'rgba(234,179,8,0.3)' },
    High:   { bg: 'rgba(239,68,68,0.15)',  color: '#f87171', border: 'rgba(239,68,68,0.3)' },
};

function probColor(p) {
    return p >= 75 ? '#4ade80' : p >= 50 ? '#facc15' : '#f87171';
}

export default function AssigneesModal({ assignees = [], title = 'Assigned Employees', subtitle, onClose }) {
    const [search, setSearch] = useState('');

    const employees = assignees
        .map(a => a.employee ?? a)
        .filter(Boolean);

    const filtered = employees.filter(e =>
        e.name?.toLowerCase().includes(search.toLowerCase()) ||
        (e.position ?? '').toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
            <div style={s.modal}>
                {/* Header */}
                <div style={s.header}>
                    <div style={{ minWidth: 0 }}>
                        <div style={s.title}>{title}</div>
                        {subtitle && <div style={s.sub}>{subtitle}</div>}
                    </div>
                    <button style={s.closeBtn} onClick={onClose}>✕</button>
                </div>

                {/* AI banner */}
                <div style={s.aiBanner}>
                    <span style={{ color: 'var(--admin-accent)', fontSize: '0.78rem' }}>✦</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)', fontWeight: 600 }}>
                        AI WORKLOAD INSIGHTS (DEMO)
                    </span>
                </div>

                {/* Search — only when there are enough rows to warrant it */}
                {employees.length > 4 && (
                    <div style={s.searchWrap}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, color: 'var(--admin-text-muted)' }}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                        <input style={s.search} placeholder="Search by name or role..." value={search} onChange={e => setSearch(e.target.value)} autoFocus />
                    </div>
                )}

                {/* Table header */}
                <div style={s.tableHead}>
                    <span style={{ flex: 2 }}>EMPLOYEE</span>
                    <span style={{ flex: 1, textAlign: 'center' }}>SUCCESS PROB.</span>
                    <span style={{ flex: 1, textAlign: 'center' }}>RISK</span>
                </div>

                {/* Rows */}
                <div style={s.list}>
                    {filtered.length === 0 ? (
                        <div style={s.empty}>{employees.length === 0 ? 'No employees assigned to this indicator.' : 'No employees match your search.'}</div>
                    ) : filtered.map(emp => {
                        const ai = emp.ai_prediction ?? {};
                        const prob = ai.success_prob ?? 0;
                        const risk = ai.risk ?? '—';
                        const rc = RISK_COLOR[risk] ?? { bg: 'var(--admin-bg-secondary)', color: 'var(--admin-text-muted)', border: 'var(--admin-border)' };
                        return (
                            <div key={emp.id} style={s.empRow}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 2, minWidth: 0 }}>
                                    <img src={avatarSrc(emp.avatar)} onError={onAvatarError} alt={emp.name} style={s.avatar} />
                                    <div style={{ minWidth: 0 }}>
                                        <div style={s.empName}>{emp.name}</div>
                                        <div style={s.empPos}>{emp.position ?? '—'}</div>
                                    </div>
                                </div>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3, padding: '0 0.5rem' }}>
                                    <div style={{ height: 6, borderRadius: 3, background: 'var(--admin-border)', overflow: 'hidden' }}>
                                        <div style={{ height: '100%', width: `${prob}%`, borderRadius: 3, background: probColor(prob), transition: 'width 0.3s' }} />
                                    </div>
                                    <span style={{ fontSize: '0.65rem', color: 'var(--admin-text-muted)' }}>{prob}%</span>
                                </div>
                                <div style={{ flex: 1, textAlign: 'center' }}>
                                    <span style={{ padding: '0.15rem 0.6rem', borderRadius: 4, fontSize: '0.72rem', fontWeight: 600, background: rc.bg, color: rc.color, border: `1px solid ${rc.border}` }}>{risk}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div style={s.footer}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)' }}>
                        {employees.length} employee{employees.length !== 1 ? 's' : ''} assigned
                    </span>
                    <button style={s.btnPrimary} onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
}

const s = {
    overlay:    { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' },
    modal:      { background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)', borderRadius: 14, width: '100%', maxWidth: 520, maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' },
    header:     { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '1.1rem 1.25rem', borderBottom: '1px solid var(--admin-border)' },
    title:      { fontWeight: 700, fontSize: '1rem', color: 'var(--admin-text-primary)' },
    sub:        { fontSize: '0.75rem', color: 'var(--admin-text-muted)', marginTop: '0.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
    closeBtn:   { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-muted)', fontSize: '1rem', flexShrink: 0, marginLeft: '0.5rem' },
    aiBanner:   { display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1.25rem', background: 'rgba(59,130,246,0.05)', borderBottom: '1px solid var(--admin-border)' },
    searchWrap: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.7rem 1.25rem', borderBottom: '1px solid var(--admin-border)' },
    search:     { flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--admin-text-primary)', fontSize: '0.85rem', fontFamily: 'inherit' },
    tableHead:  { display: 'flex', padding: '0.5rem 1.25rem', fontSize: '0.62rem', fontWeight: 700, color: 'var(--admin-text-muted)', letterSpacing: '0.07em', borderBottom: '1px solid var(--admin-border)' },
    list:       { flex: 1, overflowY: 'auto' },
    empRow:     { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.7rem 1.25rem', borderBottom: '1px solid var(--admin-border)' },
    avatar:     { width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 },
    empName:    { fontWeight: 600, fontSize: '0.85rem', color: 'var(--admin-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
    empPos:     { fontSize: '0.72rem', color: 'var(--admin-text-muted)', marginTop: '0.1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
    empty:      { padding: '2rem 1.25rem', textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: '0.85rem' },
    footer:     { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 1.25rem', borderTop: '1px solid var(--admin-border)' },
    btnPrimary: { padding: '0.5rem 1.1rem', borderRadius: 8, border: 'none', background: 'var(--admin-accent)', color: '#fff', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 },
};
