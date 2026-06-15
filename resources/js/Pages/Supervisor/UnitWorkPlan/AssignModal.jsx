import { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import { avatarSrc, onAvatarError } from '@/Components/defaultAvatar';

function toAiData(rec) {
    const score = rec.fit_score ?? 0;
    const risk = rec.risk_level ?? (score >= 75 ? 'Low' : score >= 50 ? 'Medium' : 'High');
    return {
        load:        0,
        successProb: score,
        risk,
        status:      'Available',
        warning:     rec.warning ?? (score < 50),
    };
}

function fitColor(label) {
    if (label === 'Strong fit')   return '#4ade80';
    if (label === 'Moderate fit') return '#facc15';
    return '#f87171';
}

export default function AssignModal({ indicator, periodId = 1, employees, allIndicators = [], onSave, onClose }) {
    const initialIds = new Set((indicator.assignments ?? []).map(a => a.employee_id));
    const [selected, setSelected]       = useState(initialIds);
    const [search, setSearch]           = useState('');
    const [warning, setWarning]         = useState(null);
    const [expandedEmp, setExpandedEmp] = useState(null);
    const [mlData, setMlData]           = useState(null);
    const [allMlData, setAllMlData]     = useState({}); // indicatorId → recommendations
    const [mlLoading, setMlLoading]     = useState(false);

    useEffect(() => {
        setMlData(null);
        if (!indicator.id) { return; }

        const indicatorIds = allIndicators.map(si => si.id).filter(Boolean);

        // First, quickly check if ML is online by fetching the main indicator
        axios.get('/supervisor/uwp/suggestions', { params: { indicator_id: indicator.id, period_id: periodId }, timeout: 5000 })
            .then(res => {
                const online = res.data?.ml_online === true;
                setMlData(res.data);
                if (online) {
                    // ML is online — show spinner while we fetch all the rest
                    setMlLoading(true);
                }
                // Fetch all indicator predictions in parallel
                return Promise.allSettled(
                    indicatorIds.map(id =>
                        axios.get('/supervisor/uwp/suggestions', { params: { indicator_id: id, period_id: periodId }, timeout: 5000 })
                            .then(r => ({ id, data: r.data }))
                            .catch(() => ({ id, data: null }))
                    )
                );
            })
            .then(rest => {
                if (!rest) return;
                const map = {};
                rest.forEach(r => { if (r.status === 'fulfilled' && r.value?.data) map[r.value.id] = r.value.data; });
                setAllMlData(map);
            })
            .catch(() => {})
            .finally(() => setMlLoading(false));
    }, [indicator.id, periodId]);

    const recMap = useMemo(() => {
        const map = {};
        (mlData?.recommendations ?? []).forEach(r => { map[r.employee_id] = r; });
        return map;
    }, [mlData]);

    const enriched = useMemo(() => employees.map(e => {
        const rec = recMap[e.id] ?? {};
        return {
            ...e,
            _ai: toAiData(rec),
            _suggestions: allIndicators.map(si => {
                const siPred = allMlData[si.id];
                const siRec  = siPred?.recommendations?.find(r => r.employee_id === e.id) ?? {};
                const siScore = siRec.fit_score ?? 0;
                const siLabel = siScore >= 75 ? 'Strong fit' : siScore >= 50 ? 'Moderate fit' : 'Weak fit';
                return {
                    id:             si.id,
                    indicator_text: si.indicator_text,
                    mfo_title:      si.mfo_title,
                    function_name:  si.function_name,
                    fitScore:       siScore,
                    fitLabel:       siLabel,
                    fitColor:       fitColor(siLabel),
                };
            }).sort((a, b) => b.fitScore - a.fitScore),
        };
    }), [employees, recMap, allMlData, allIndicators]);

    const filtered = enriched.filter(e =>
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        (e.position ?? '').toLowerCase().includes(search.toLowerCase())
    );

    const recommended = [...enriched]
        .filter(e => !selected.has(e.id))
        .sort((a, b) => a._ai.load - b._ai.load)[0];

    function toggle(emp) {
        if (mlData?.ml_online && !selected.has(emp.id) && (emp._ai.warning || emp._ai.risk === 'High')) { setWarning(emp); return; }
        commit(emp.id);
    }

    function commit(id) {
        setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
        setWarning(null);
    }

    function handleSave() {
        onSave(indicator.id, employees.filter(e => selected.has(e.id)));
    }

    const riskColors = {
        Low:    { bg: 'rgba(74,222,128,0.15)',  color: '#4ade80', border: 'rgba(74,222,128,0.3)' },
        Medium: { bg: 'rgba(234,179,8,0.15)',   color: '#facc15', border: 'rgba(234,179,8,0.3)' },
        High:   { bg: 'rgba(239,68,68,0.15)',   color: '#f87171', border: 'rgba(239,68,68,0.3)' },
    };

    // AI Warning screen
    if (warning) {
        return (
            <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
                <div style={s.modal}>
                    <div style={s.header}>
                        <div>
                            <div style={s.title}>Assign Employees</div>
                            <div style={s.sub}>KPI: {indicator.indicator_text?.slice(0, 50)}...</div>
                        </div>
                        <button style={s.closeBtn} onClick={onClose}>x</button>
                    </div>

                    <div style={s.warnBanner}>
                        <div style={s.warnHeader}>
                            <span style={s.warnIcon}>(!)</span>
                            <span style={s.warnLabel}>AI RISK WARNING</span>
                        </div>
                        <p style={s.warnText}>
                            Assigning <strong>{warning.name}</strong> to this indicator carries a high risk of non-completion based on current workload and historical performance.
                        </p>
                        <div style={s.warnStats}>
                            <div style={s.warnStat}>
                                <div style={s.warnStatLabel}>Risk Level</div>
                                <div style={{ ...s.warnStatVal, color: '#f87171' }}>{warning._ai.risk} &bull;</div>
                            </div>
                            <div style={s.warnStat}>
                                <div style={s.warnStatLabel}>Success Probability</div>
                                <div style={{ ...s.warnStatVal, color: '#f97316' }}>{warning._ai.successProb}%</div>
                            </div>
                        </div>
                    </div>

                    <div style={s.list}>
                        <div style={s.listHeader}>SELECT TEAM MEMBERS</div>
                        {filtered.map(emp => (
                            <label key={emp.id} style={{ ...s.empRow, ...(emp.id === warning.id ? s.empRowWarn : selected.has(emp.id) ? s.empRowChecked : {}) }}>
                                <input type="checkbox" checked={selected.has(emp.id) || emp.id === warning.id} onChange={() => {}} style={s.checkbox} />
                                <img src={avatarSrc(emp.avatar, emp.profile_photo_url)} onError={onAvatarError} alt={emp.name} style={{ ...s.avatar, objectFit: 'cover' }} />
                                <div style={s.empInfo}>
                                    <div style={{ ...s.empName, ...(emp.id === warning.id ? { color: '#f97316' } : {}) }}>{emp.name}</div>
                                    <div style={s.empPos}>{emp.position}</div>
                                </div>
                                {emp.id === warning.id && <span style={{ color: '#f97316', fontSize: '1rem' }}>(!)</span>}
                            </label>
                        ))}
                    </div>

                    <div style={s.footer}>
                        <button style={s.btnOutline} onClick={() => setWarning(null)}>Pick Another Employee</button>
                        <button style={{ ...s.btnPrimary, background: '#f97316' }} onClick={() => commit(warning.id)}>Assign Anyway</button>
                    </div>
                </div>
            </div>
        );
    }

        // Normal screen
    const mlOnline = mlData?.ml_online === true;
    const safeRec = mlOnline && recommended && recommended._ai.successProb >= 50 && recommended._ai.risk !== 'High';

    return (
        <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
            <div style={s.modal}>
                <div style={s.header}>
                    <div>
                        <div style={s.title}>Assign Employees</div>
                        <div style={s.sub}>Indicator: {indicator.indicator_text?.slice(0, 60)}...</div>
                    </div>
                    <button style={s.closeBtn} onClick={onClose}>&#x2715;</button>
                </div>

                {mlLoading && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '3rem', color: 'var(--admin-text-muted)', fontSize: '0.875rem' }}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--admin-accent)" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'pms-spin 0.7s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/><style>{`@keyframes pms-spin{to{transform:rotate(360deg)}}`}</style></svg>
                        <span>Analyzing with AI…</span>
                    </div>
                )}

                {!mlLoading && safeRec && (
                    <div style={s.safeBanner}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                            <span style={s.safeLabel}>* SAFE TO ASSIGN</span>
                            <span style={s.safeConf}>Success Probability: {recommended._ai.successProb}%</span>
                        </div>
                        <p style={s.safeText}>
                            <strong>{recommended.name}</strong> is recommended for this indicator based on low risk level and high historical success rate.
                        </p>
                    </div>
                )}

                {!mlLoading && <><div style={s.searchWrap}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, color: 'var(--admin-text-muted)' }}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                    <input style={s.search} placeholder="Search by name, role, or skill..." value={search} onChange={e => setSearch(e.target.value)} autoFocus />
                </div>

                <div style={s.tableHead}>
                    <span style={{ flex: 2 }}>EMPLOYEE</span>
                    {mlOnline && <><span style={{ flex: 1, textAlign: 'center' }}>SUCCESS PROB.</span>
                    <span style={{ flex: 1, textAlign: 'center' }}>RISK</span>
                    <span style={{ flex: 0.5, textAlign: 'center' }}>FIT</span></>}
                </div>

                <div style={s.list}>
                    {filtered.map(emp => {
                        const ai   = emp._ai;
                        const sugg = emp._suggestions;
                        const top  = sugg[0]; // best suggested indicator
                        const rc   = riskColors[ai.risk] ?? riskColors.High;
                        const checked    = selected.has(emp.id);
                        const isExpanded = expandedEmp === emp.id;
                        return (
                            <div key={emp.id}>
                                <div style={{ ...s.empRow, ...(checked ? s.empRowChecked : {}), cursor: 'pointer' }}
                                    onClick={() => toggle(emp)}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 2 }}>
                                        <input type="checkbox" checked={checked} onChange={() => {}} style={s.checkbox} />
                                        <img src={avatarSrc(emp.avatar, emp.profile_photo_url)} onError={onAvatarError} alt={emp.name} style={{ ...s.avatar, objectFit: 'cover' }} />
                                        <div>
                                            <div style={s.empName}>{emp.name}</div>
                                            <div style={s.empPos}>{emp.position}</div>
                                        </div>
                                    </div>
                                    {mlOnline && <>
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3, padding: '0 0.5rem' }}>
                                        <div style={{ height: 6, borderRadius: 3, background: 'var(--admin-border)', overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${ai.successProb}%`, borderRadius: 3, background: ai.successProb >= 75 ? '#4ade80' : ai.successProb >= 50 ? '#facc15' : '#f87171', transition: 'width 0.3s' }} />
                                        </div>
                                        <span style={{ fontSize: '0.65rem', color: 'var(--admin-text-muted)' }}>{ai.successProb}%</span>
                                    </div>
                                    <div style={{ flex: 1, textAlign: 'center' }}>
                                        <span style={{ padding: '0.15rem 0.6rem', borderRadius: 4, fontSize: '0.72rem', fontWeight: 600, background: rc.bg, color: rc.color, border: `1px solid ${rc.border}` }}>{ai.risk}</span>
                                    </div>
                                    <div style={{ flex: 0.5, textAlign: 'center' }}>
                                        <button
                                            style={{ ...s.infoBtn, background: isExpanded ? 'rgba(59,130,246,0.12)' : 'none', borderColor: isExpanded ? 'var(--admin-accent)' : 'var(--admin-border)', color: top?.fitColor ?? 'var(--admin-text-muted)' }}
                                            onClick={e => { e.stopPropagation(); setExpandedEmp(isExpanded ? null : emp.id); }}
                                            title="View suggested indicators">
                                            &#9733;
                                        </button>
                                    </div>
                                    </>}
                                </div>

                                {/* Suggested Success Indicators Panel */}
                                {isExpanded && (
                                    <div style={{ background: 'rgba(59,130,246,0.04)', borderBottom: '1px solid var(--admin-border)', borderLeft: `3px solid ${top?.fitColor ?? 'var(--admin-accent)'}`, padding: '0.85rem 1.25rem' }}>
                                        <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.6rem' }}>
                                            Suggested Success Indicators &mdash; {emp.name}
                                        </div>
                                        {sugg.length === 0 && (
                                            <div style={{ fontSize: '0.78rem', color: 'var(--admin-text-muted)' }}>No indicators available in this UWP.</div>
                                        )}
                                        {sugg.map((s2, idx) => (
                                            <div key={s2.id ?? idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', marginBottom: '0.5rem',
                                                padding: '0.5rem 0.65rem', borderRadius: 6,
                                                background: s2.id === indicator.id ? 'rgba(59,130,246,0.08)' : 'var(--admin-card)',
                                                border: `1px solid ${s2.id === indicator.id ? 'rgba(59,130,246,0.3)' : 'var(--admin-border)'}` }}>
                                                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: s2.fitColor, minWidth: 36 }}>{s2.fitScore}%</div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-primary)', lineHeight: 1.3 }}>
                                                        {s2.indicator_text?.slice(0, 80)}{s2.indicator_text?.length > 80 ? '...' : ''}
                                                    </div>
                                                    <div style={{ fontSize: '0.65rem', color: 'var(--admin-text-muted)', marginTop: 2 }}>
                                                        {s2.mfo_title} &bull; {s2.fitLabel}
                                                        {s2.id === indicator.id && <span style={{ marginLeft: 6, color: 'var(--admin-accent)', fontWeight: 700 }}>(current)</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        <div style={{ marginTop: '0.5rem', fontSize: '0.7rem', color: 'var(--admin-text-muted)', fontStyle: 'italic' }}>
                                            * Prototype ranking. FastAPI /suggest-indicators will use real IPCR history.
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    {!mlLoading && filtered.length === 0 && <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: '0.82rem' }}>No employees found</div>}
                </div>

                <div style={s.footer}>
                    <div style={s.aiActive}>
                        <span style={{ color: mlOnline ? 'var(--admin-accent)' : '#f87171', fontSize: '0.72rem' }}>●</span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)', fontWeight: 600 }}>{mlOnline ? 'AI OPTIMIZATION ACTIVE' : 'AI OFFLINE — Manual assignment mode'}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button style={s.btnOutline} onClick={onClose}>Cancel</button>
                        <button style={s.btnPrimary} onClick={handleSave}>
                            Assign Selected
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/></svg>
                        </button>
                    </div>
                </div>
                </>}
            </div>
        </div>
    );
}

const s = {
    overlay:       { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' },
    modal:         { background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)', borderRadius: 'var(--admin-radius-lg)', width: '100%', maxWidth: 560, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: 'var(--admin-shadow)' },
    header:        { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--admin-border)' },
    title:         { fontWeight: 700, fontSize: '1rem', color: 'var(--admin-text-primary)', marginBottom: '0.2rem' },
    sub:           { fontSize: '0.75rem', color: 'var(--admin-text-muted)' },
    closeBtn:      { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-muted)', fontSize: '1rem' },
    safeBanner:    { margin: '0.75rem 1.5rem 0', padding: '0.85rem 1rem', background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.25)', borderRadius: 10 },
    safeLabel:     { fontSize: '0.68rem', fontWeight: 700, color: '#4ade80', letterSpacing: '0.07em' },
    safeConf:      { fontSize: '0.68rem', fontWeight: 700, color: '#4ade80' },
    safeText:      { fontSize: '0.8rem', color: 'var(--admin-text-secondary)', margin: 0, lineHeight: 1.5 },
    warnBanner:    { margin: '0.75rem 1.5rem 0', padding: '0.85rem 1rem', background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.3)', borderRadius: 10, borderLeft: '3px solid #f97316' },
    warnHeader:    { display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' },
    warnIcon:      { color: '#f97316', fontSize: '0.9rem', fontWeight: 700 },
    warnLabel:     { fontSize: '0.68rem', fontWeight: 700, color: '#f97316', letterSpacing: '0.07em' },
    warnText:      { fontSize: '0.82rem', color: 'var(--admin-text-secondary)', margin: '0 0 0.75rem' },
    warnStats:     { display: 'flex', gap: '0.75rem' },
    warnStat:      { flex: 1, background: 'var(--admin-bg-secondary)', border: '1px solid var(--admin-border)', borderRadius: 8, padding: '0.5rem 0.75rem' },
    warnStatLabel: { fontSize: '0.65rem', color: 'var(--admin-text-muted)', marginBottom: '0.2rem' },
    warnStatVal:   { fontSize: '0.95rem', fontWeight: 700 },
    searchWrap:    { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', borderBottom: '1px solid var(--admin-border)' },
    search:        { flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--admin-text-primary)', fontSize: '0.85rem', fontFamily: 'inherit' },
    tableHead:     { display: 'flex', padding: '0.5rem 1.5rem', fontSize: '0.62rem', fontWeight: 700, color: 'var(--admin-text-muted)', letterSpacing: '0.07em', borderBottom: '1px solid var(--admin-border)' },
    listHeader:    { padding: '0.5rem 1.25rem', fontSize: '0.62rem', fontWeight: 700, color: 'var(--admin-text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase' },
    list:          { flex: 1, overflowY: 'auto' },
    empRow:        { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.5rem', borderBottom: '1px solid var(--admin-border)', transition: 'background 0.1s' },
    empRowChecked: { background: 'rgba(59,130,246,0.07)' },
    empRowWarn:    { background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)' },
    checkbox:      { accentColor: 'var(--admin-accent)', width: 15, height: 15, flexShrink: 0, cursor: 'pointer' },
    avatar:        { width: 32, height: 32, borderRadius: '50%', background: 'rgba(59,130,246,0.2)', color: 'var(--admin-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0 },
    empInfo:       { flex: 1, minWidth: 0 },
    empName:       { fontWeight: 600, fontSize: '0.85rem', color: 'var(--admin-text-primary)' },
    empPos:        { fontSize: '0.72rem', color: 'var(--admin-text-muted)', marginTop: '0.1rem' },
    infoBtn:       { background: 'none', border: '1px solid var(--admin-border)', borderRadius: '50%', width: 24, height: 24, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '0.75rem' },
    footer:        { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 1.5rem', borderTop: '1px solid var(--admin-border)' },
    aiActive:      { display: 'flex', alignItems: 'center', gap: '0.4rem' },
    btnOutline:    { padding: '0.5rem 1.1rem', borderRadius: 8, border: '1px solid var(--admin-border-strong)', background: 'transparent', color: 'var(--admin-text-primary)', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 },
    btnPrimary:    { display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1.1rem', borderRadius: 8, border: 'none', background: 'var(--admin-accent)', color: '#fff', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 },
};
