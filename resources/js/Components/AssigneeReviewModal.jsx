import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { avatarSrc, onAvatarError } from '@/Components/defaultAvatar';

function fitColor(label) {
    if (label === 'Strong fit')   return '#4ade80';
    if (label === 'Moderate fit') return '#facc15';
    return '#f87171';
}

export default function AssigneeReviewModal({ indicator, periodId = 1, employees, onClose, suggestionsUrl = '/supervisor/uwp/suggestions' }) {
    const [mlData, setMlData]       = useState(null);
    const [mlLoading, setMlLoading] = useState(true);

    useEffect(() => {
        if (!indicator?.id) { setMlLoading(false); return; }
        axios.get(suggestionsUrl, {
            params: { indicator_id: indicator.id, period_id: periodId }
        }).then(({ data }) => setMlData(data)).catch(() => {}).finally(() => setMlLoading(false));
    }, [indicator?.id, periodId]);

    const mlOnline = mlData?.ml_online === true;

    const recMap = useMemo(() => {
        const map = {};
        (mlData?.recommendations ?? []).forEach(r => { map[r.employee_id] = r; });
        return map;
    }, [mlData]);

    const riskColors = {
        Low:    { bg: 'rgba(74,222,128,0.15)',  color: '#4ade80', border: 'rgba(74,222,128,0.3)' },
        Medium: { bg: 'rgba(234,179,8,0.15)',   color: '#facc15', border: 'rgba(234,179,8,0.3)' },
        High:   { bg: 'rgba(239,68,68,0.15)',   color: '#f87171', border: 'rgba(239,68,68,0.3)' },
    };

    return (
        <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
            <div style={s.modal}>
                {/* Header */}
                <div style={s.header}>
                    <div>
                        <div style={s.title}>Assigned Employees</div>
                        <div style={s.sub}>{indicator?.indicator_text?.slice(0, 60)}…</div>
                    </div>
                    <button style={s.closeBtn} onClick={onClose}>&#x2715;</button>
                </div>

                {/* Body */}
                {mlLoading ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', padding: '2.5rem', color: 'var(--admin-text-muted)', fontSize: '0.875rem' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--admin-accent)" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'pms-spin 0.7s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/><style>{`@keyframes pms-spin{to{transform:rotate(360deg)}}`}</style></svg>
                        Analyzing with AI…
                    </div>
                ) : (
                    <>
                        {/* Table head */}
                        <div style={s.tableHead}>
                            <span style={{ flex: 2 }}>EMPLOYEE</span>
                            {mlOnline && <>
                                <span style={{ flex: 1, textAlign: 'center' }}>SUCCESS PROB.</span>
                                <span style={{ flex: 1, textAlign: 'center' }}>RISK</span>
                            </>}
                        </div>

                        <div style={s.list}>
                            {employees.length === 0 && (
                                <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: '0.82rem' }}>No employees assigned.</div>
                            )}
                            {employees.map(emp => {
                                const rec   = recMap[emp.id] ?? {};
                                const score = rec.fit_score ?? 0;
                                const risk  = rec.risk_level ?? (score >= 75 ? 'Low' : score >= 50 ? 'Medium' : 'High');
                                const rc    = riskColors[risk];
                                return (
                                    <div key={emp.id} style={s.empRow}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 2 }}>
                                            <img src={avatarSrc(emp.avatar, emp.profile_photo_url)} onError={onAvatarError} alt={emp.name} style={s.avatar} />
                                            <div>
                                                <div style={s.empName}>{emp.name}</div>
                                                <div style={s.empPos}>{emp.position}</div>
                                            </div>
                                        </div>
                                        {mlOnline && <>
                                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3, padding: '0 0.5rem' }}>
                                                <div style={{ height: 6, borderRadius: 3, background: 'var(--admin-border)', overflow: 'hidden' }}>
                                                    <div style={{ height: '100%', width: `${score}%`, borderRadius: 3, background: score >= 75 ? '#4ade80' : score >= 50 ? '#facc15' : '#f87171' }} />
                                                </div>
                                                <span style={{ fontSize: '0.65rem', color: 'var(--admin-text-muted)' }}>{score}%</span>
                                            </div>
                                            <div style={{ flex: 1, textAlign: 'center' }}>
                                                <span style={{ padding: '0.15rem 0.6rem', borderRadius: 4, fontSize: '0.72rem', fontWeight: 600, background: rc.bg, color: rc.color, border: `1px solid ${rc.border}` }}>{risk}</span>
                                            </div>
                                        </>}
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}

                {/* Footer */}
                <div style={s.footer}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ color: mlOnline ? 'var(--admin-accent)' : '#f87171', fontSize: '0.72rem' }}>●</span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)', fontWeight: 600 }}>
                            {mlOnline ? 'AI OPTIMIZATION ACTIVE' : 'AI OFFLINE'}
                        </span>
                    </div>
                    <button style={s.btnClose} onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
}

const s = {
    overlay:  { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' },
    modal:    { background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)', borderRadius: 'var(--admin-radius-lg)', width: '100%', maxWidth: 520, maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: 'var(--admin-shadow)' },
    header:   { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--admin-border)' },
    title:    { fontWeight: 700, fontSize: '1rem', color: 'var(--admin-text-primary)', marginBottom: '0.2rem' },
    sub:      { fontSize: '0.75rem', color: 'var(--admin-text-muted)' },
    closeBtn: { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-muted)', fontSize: '1rem' },
    tableHead:{ display: 'flex', padding: '0.5rem 1.5rem', fontSize: '0.62rem', fontWeight: 700, color: 'var(--admin-text-muted)', letterSpacing: '0.07em', borderBottom: '1px solid var(--admin-border)' },
    list:     { flex: 1, overflowY: 'auto' },
    empRow:   { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.7rem 1.5rem', borderBottom: '1px solid var(--admin-border)' },
    avatar:   { width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 },
    empName:  { fontWeight: 600, fontSize: '0.85rem', color: 'var(--admin-text-primary)' },
    empPos:   { fontSize: '0.72rem', color: 'var(--admin-text-muted)', marginTop: '0.1rem' },
    footer:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 1.5rem', borderTop: '1px solid var(--admin-border)' },
    btnClose: { padding: '0.5rem 1.1rem', borderRadius: 8, border: '1px solid var(--admin-border-strong)', background: 'transparent', color: 'var(--admin-text-primary)', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' },
};
