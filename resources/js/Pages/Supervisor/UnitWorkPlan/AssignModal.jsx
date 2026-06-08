import { useState, useMemo } from 'react';

// Map the backend AI prediction (App\Services\AssignmentAi) to the shape the UI uses.
// The numbers are computed server-side — see SimulatedAssignmentPredictor (prototype)
// or MlAssignmentPredictor (real model) in Laravel.
function toAiData(employee) {
    const p = employee.ai_prediction ?? {};
    return {
        load: p.load ?? 0,
        successProb: p.success_prob ?? 0,
        risk: p.risk ?? 'High',
        status: p.status ?? 'Available',
        warning: p.warning ?? false,
    };
}

const statusColor = {
    Available: { bg: 'rgba(74,222,128,0.15)', color: '#4ade80', border: 'rgba(74,222,128,0.3)' },
    Busy:      { bg: 'rgba(234,179,8,0.15)',  color: '#facc15', border: 'rgba(234,179,8,0.3)' },
    Critical:  { bg: 'rgba(239,68,68,0.15)',  color: '#f87171', border: 'rgba(239,68,68,0.3)' },
};

export default function AssignModal({ indicator, employees, onSave, onClose }) {
    const initialIds = new Set((indicator.assignments ?? []).map(a => a.employee_id));
    const [selected, setSelected] = useState(initialIds);
    const [search, setSearch]     = useState('');
    const [warning, setWarning]   = useState(null); // { employee } — pending high-load selection

    // Map the backend AI prediction onto each employee for rendering
    const enriched = useMemo(() => employees.map(e => ({
        ...e,
        _ai: toAiData(e),
    })), [employees]);

    const filtered = enriched.filter(e =>
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        (e.position ?? '').toLowerCase().includes(search.toLowerCase())
    );

    // Find the recommended employee (lowest load, available)
    const recommended = [...enriched]
        .filter(e => !selected.has(e.id))
        .sort((a, b) => a._ai.load - b._ai.load)[0];

    function toggle(emp) {
        if (!selected.has(emp.id) && emp._ai.warning) {
            setWarning(emp); // show AI warning before adding
            return;
        }
        commit(emp.id);
    }

    function commit(id) {
        setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
        setWarning(null);
    }

    function handleSave() {
        onSave(indicator.id, employees.filter(e => selected.has(e.id)));
    }

    // ── AI Warning state ──
    if (warning) {
        const ai = warning._ai;
        return (
            <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
                <div style={s.modal}>
                    <div style={s.header}>
                        <div>
                            <div style={s.title}>Assign Employees</div>
                            <div style={s.sub}>KPI: {indicator.indicator_text?.slice(0, 50)}…</div>
                        </div>
                        <button style={s.closeBtn} onClick={onClose}>✕</button>
                    </div>

                    {/* Warning banner */}
                    <div style={s.warnBanner}>
                        <div style={s.warnHeader}>
                            <span style={s.warnIcon}>⚠</span>
                            <span style={s.warnLabel}>AI RISK WARNING</span>
                        </div>
                        <p style={s.warnText}>
                            Assigning <strong>{warning.name}</strong> to this indicator carries a high risk of non-completion based on current workload and historical performance.
                        </p>
                        <div style={s.warnStats}>
                            <div style={s.warnStat}>
                                <div style={s.warnStatLabel}>Risk Level</div>
                                <div style={{ ...s.warnStatVal, color: '#f87171' }}>{warning._ai.risk} ●</div>
                            </div>
                            <div style={s.warnStat}>
                                <div style={s.warnStatLabel}>Success Probability</div>
                                <div style={{ ...s.warnStatVal, color: '#f97316' }}>{warning._ai.successProb}%</div>
                            </div>
                        </div>
                    </div>

                    {/* Employee rows */}
                    <div style={s.list}>
                        <div style={s.listHeader}>SELECT TEAM MEMBERS</div>
                        {filtered.map(emp => (
                            <label key={emp.id} style={{ ...s.empRow, ...(emp.id === warning.id ? s.empRowWarn : selected.has(emp.id) ? s.empRowChecked : {}) }}>
                                <input type="checkbox" checked={selected.has(emp.id) || emp.id === warning.id} onChange={() => {}} style={s.checkbox} />
                                <div style={s.avatar}>{emp.name.charAt(0)}</div>
                                <div style={s.empInfo}>
                                    <div style={{ ...s.empName, ...(emp.id === warning.id ? { color: '#f97316' } : {}) }}>{emp.name}</div>
                                    <div style={s.empPos}>{emp.position} • Load: {emp._ai.load}%</div>
                                </div>
                                {emp.id === warning.id && <span style={{ color: '#f97316', fontSize: '1rem' }}>⚠</span>}
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

    // ── Normal / AI-safe state ──
    const safeRec = recommended && recommended._ai.load < 50;

    return (
        <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
            <div style={s.modal}>
                <div style={s.header}>
                    <div>
                        <div style={s.title}>Assign Employees</div>
                        <div style={s.sub}>Indicator: {indicator.indicator_text?.slice(0, 60)}…</div>
                    </div>
                    <button style={s.closeBtn} onClick={onClose}>✕</button>
                </div>

                {/* AI Safe recommendation */}
                {safeRec && (
                    <div style={s.safeBanner}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                            <span style={s.safeLabel}>✦ SAFE TO ASSIGN</span>
                            <span style={s.safeConf}>Success Probability: {recommended._ai.successProb}%</span>
                        </div>
                        <p style={s.safeText}>
                            <strong>{recommended.name}</strong> is recommended for this indicator based on low risk level and high historical success rate.
                        </p>
                    </div>
                )}

                {/* Search */}
                <div style={s.searchWrap}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, color: 'var(--admin-text-muted)' }}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                    <input style={s.search} placeholder="Search by name, role, or skill..." value={search} onChange={e => setSearch(e.target.value)} autoFocus />
                </div>

                {/* Table header */}
                <div style={s.tableHead}>
                    <span style={{ flex: 2 }}>EMPLOYEE</span>
                    <span style={{ flex: 1, textAlign: 'center' }}>SUCCESS PROB.</span>
                    <span style={{ flex: 1, textAlign: 'center' }}>RISK</span>
                    <span style={{ flex: 0.5, textAlign: 'center' }}>ACTION</span>
                </div>

                {/* Employee rows */}
                <div style={s.list}>
                    {filtered.map(emp => {
                        const ai = emp._ai;
                        const riskColor = { Low: { bg: 'rgba(74,222,128,0.15)', color: '#4ade80', border: 'rgba(74,222,128,0.3)' }, Medium: { bg: 'rgba(234,179,8,0.15)', color: '#facc15', border: 'rgba(234,179,8,0.3)' }, High: { bg: 'rgba(239,68,68,0.15)', color: '#f87171', border: 'rgba(239,68,68,0.3)' } }[ai.risk];
                        const checked = selected.has(emp.id);
                        return (
                            <div key={emp.id} style={{ ...s.empRow, ...(checked ? s.empRowChecked : {}), cursor: 'pointer' }} onClick={() => toggle(emp)}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 2 }}>
                                    <input type="checkbox" checked={checked} onChange={() => {}} style={s.checkbox} />
                                    <div style={s.avatar}>{emp.name.charAt(0)}</div>
                                    <div>
                                        <div style={s.empName}>{emp.name}</div>
                                        <div style={s.empPos}>{emp.position}</div>
                                    </div>
                                </div>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3, padding: '0 0.5rem' }}>
                                    <div style={{ height: 6, borderRadius: 3, background: 'var(--admin-border)', overflow: 'hidden' }}>
                                        <div style={{ height: '100%', width: `${ai.successProb}%`, borderRadius: 3, background: ai.successProb >= 75 ? '#4ade80' : ai.successProb >= 50 ? '#facc15' : '#f87171', transition: 'width 0.3s' }} />
                                    </div>
                                    <span style={{ fontSize: '0.65rem', color: 'var(--admin-text-muted)' }}>{ai.successProb}%</span>
                                </div>
                                <div style={{ flex: 1, textAlign: 'center' }}>
                                    <span style={{ padding: '0.15rem 0.6rem', borderRadius: 4, fontSize: '0.72rem', fontWeight: 600, background: riskColor.bg, color: riskColor.color, border: `1px solid ${riskColor.border}` }}>{ai.risk}</span>
                                </div>
                                <div style={{ flex: 0.5, textAlign: 'center' }}>
                                    <button style={s.infoBtn} onClick={e => e.stopPropagation()} title="View employee info">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                    {filtered.length === 0 && <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: '0.82rem' }}>No employees found</div>}
                </div>

                <div style={s.footer}>
                    <div style={s.aiActive}>
                        <span style={{ color: 'var(--admin-accent)', fontSize: '0.72rem' }}>✦</span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)', fontWeight: 600 }}>AI OPTIMIZATION ACTIVE</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button style={s.btnOutline} onClick={onClose}>Cancel</button>
                        <button style={s.btnPrimary} onClick={handleSave}>
                            Assign Selected
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/></svg>
                        </button>
                    </div>
                </div>
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

    // AI Safe banner
    safeBanner:    { margin: '0.75rem 1.5rem 0', padding: '0.85rem 1rem', background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.25)', borderRadius: 10 },
    safeLabel:     { fontSize: '0.68rem', fontWeight: 700, color: '#4ade80', letterSpacing: '0.07em' },
    safeConf:      { fontSize: '0.68rem', fontWeight: 700, color: '#4ade80' },
    safeText:      { fontSize: '0.8rem', color: 'var(--admin-text-secondary)', margin: 0, lineHeight: 1.5 },

    // AI Warning banner
    warnBanner:    { margin: '0.75rem 1.5rem 0', padding: '0.85rem 1rem', background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.3)', borderRadius: 10, borderLeft: '3px solid #f97316' },
    warnHeader:    { display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' },
    warnIcon:      { color: '#f97316', fontSize: '0.9rem' },
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
    infoBtn:       { background: 'none', border: '1px solid var(--admin-border)', borderRadius: '50%', width: 24, height: 24, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--admin-text-muted)' },

    footer:        { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 1.5rem', borderTop: '1px solid var(--admin-border)' },
    aiActive:      { display: 'flex', alignItems: 'center', gap: '0.4rem' },
    btnOutline:    { padding: '0.5rem 1.1rem', borderRadius: 8, border: '1px solid var(--admin-border-strong)', background: 'transparent', color: 'var(--admin-text-primary)', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 },
    btnPrimary:    { display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1.1rem', borderRadius: 8, border: 'none', background: 'var(--admin-accent)', color: '#fff', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 },
};
