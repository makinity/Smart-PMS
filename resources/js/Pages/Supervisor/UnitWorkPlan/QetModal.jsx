import { useState, useEffect } from 'react';

const RATINGS   = [5, 4, 3, 2, 1];
const RATING_LABELS = { 5: 'Outstanding', 4: 'Very Satisfactory', 3: 'Satisfactory', 2: 'Unsatisfactory', 1: 'Poor' };
const DIMS      = ['q', 'e', 't'];
const DIM_LABELS = { q: 'Quality', e: 'Efficiency', t: 'Timeliness' };
const DIM_ICONS  = { q: 'bi-patch-check', e: 'bi-lightning-charge', t: 'bi-clock' };

function useBreakpoint() {
    const [w, setW] = useState(() => window.innerWidth);
    useEffect(() => {
        const h = () => setW(window.innerWidth);
        window.addEventListener('resize', h);
        return () => window.removeEventListener('resize', h);
    }, []);
    if (w >= 1024) return 'desktop';
    if (w >= 768) return 'tablet';
    return 'mobile';
}

function buildInitial(existing = []) {
    const grid = {};
    DIMS.forEach(d => {
        grid[d] = {};
        RATINGS.forEach(r => { grid[d][r] = ''; });
    });
    existing.forEach(({ dimension, rating, standard_text }) => {
        const d = dimension?.toLowerCase();
        if (grid[d] !== undefined) grid[d][rating] = standard_text ?? '';
    });
    return grid;
}

export default function QetModal({ indicator, onSave, onClose }) {
    const [grid, setGrid] = useState(() => buildInitial(indicator.qetStandards));
    const bp = useBreakpoint();

    function set(dim, rating, val) {
        setGrid(g => ({ ...g, [dim]: { ...g[dim], [rating]: val } }));
    }

    function handleSave() {
        const standards = [];
        DIMS.forEach(d => RATINGS.forEach(r => {
            if (grid[d][r].trim()) standards.push({ dimension: d, rating: r, standard_text: grid[d][r] });
        }));
        onSave(indicator.id, standards);
    }

    if (bp === 'mobile' || bp === 'tablet') {
        return (
            <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 1099, background: 'rgba(0,0,0,0.5)' }} onClick={onClose} />
                <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1100, background: 'var(--admin-card)', borderRadius: '20px 20px 0 0', boxShadow: '0 -8px 32px rgba(0,0,0,0.3)', height: '88vh', display: 'flex', flexDirection: 'column', animation: 'slideUp 0.25s ease' }}>
                    <div style={{ padding: '10px 1.25rem 0', flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
                        <div style={{ width: 36, height: 4, borderRadius: 99, background: 'var(--admin-border-strong)' }} />
                    </div>
                    <div style={{ padding: '0.75rem 1.25rem 0.75rem', flexShrink: 0, borderBottom: '1px solid var(--admin-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ minWidth: 0, paddingRight: '1rem' }}>
                            <div style={s.headerSub}>PERFORMANCE STANDARDS</div>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--admin-text-primary)' }}>QET Standards</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)', marginTop: '0.15rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                "{indicator.indicator_text || 'Untitled indicator'}"
                            </div>
                        </div>
                        <button style={s.closeBtn} onClick={onClose}>✕</button>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead style={{ position: 'sticky', top: 0, background: 'var(--admin-bg-secondary)', zIndex: 1 }}>
                                <tr>
                                    <th style={sMob.th}>DIM</th>
                                    <th style={{ ...sMob.th, textAlign: 'center', width: 52 }}>RATING</th>
                                    <th style={sMob.th}>STANDARD</th>
                                </tr>
                            </thead>
                            <tbody>
                                {DIMS.flatMap(dim => RATINGS.map(r => (
                                    <tr key={`${dim}-${r}`} style={{ borderBottom: '1px solid var(--admin-border)' }}>
                                        <td style={{ padding: '0.6rem 0.75rem', verticalAlign: 'top', width: 40 }}>
                                            <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--admin-accent)' }}>{dim.toUpperCase()}</span>
                                        </td>
                                        <td style={{ padding: '0.6rem 0.25rem', verticalAlign: 'top', textAlign: 'center' }}>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: '50%', background: ratingColor(r), fontSize: '0.75rem', fontWeight: 700, color: 'var(--admin-text-primary)' }}>{r}</span>
                                        </td>
                                        <td style={{ padding: '0.5rem 0.75rem 0.5rem 0.25rem', verticalAlign: 'top' }}>
                                            <textarea
                                                style={{ ...s.textarea, width: '100%', minHeight: 56 }}
                                                value={grid[dim][r]}
                                                placeholder={`${DIM_LABELS[dim]} — rating ${r}…`}
                                                onChange={e => set(dim, r, e.target.value)}
                                                rows={2}
                                            />
                                        </td>
                                    </tr>
                                )))}
                            </tbody>
                        </table>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', padding: '0.75rem 1.25rem', borderTop: '1px solid var(--admin-border)', flexShrink: 0 }}>
                        <button style={{ ...s.btnCancel, flex: 1 }} onClick={onClose}>Cancel</button>
                        <button style={{ ...s.btnSave, flex: 2 }} onClick={handleSave}><i className="bi bi-floppy" style={{ marginRight: '0.4rem' }} />Save Standards</button>
                    </div>
                </div>
                <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
            </>
        );
    }

    return (
        <div style={{ ...s.overlay }} onClick={e => e.target === e.currentTarget && onClose()}>
            <div style={s.modal}>
                {/* Header */}
                <div style={s.header}>
                    <div>
                        <div style={s.headerSub}>PERFORMANCE STANDARDS</div>
                        <div style={s.headerTitle}>QET Standards — <em style={{ color: 'var(--admin-text-muted)', fontStyle: 'normal' }}>"{indicator.indicator_text || 'Untitled indicator'}"</em></div>
                    </div>
                    <button style={s.closeBtn} onClick={onClose}>✕</button>
                </div>

                {/* Grid */}
                <div style={s.tableWrap}>
                    {(bp === 'tablet' || bp === 'mobile') && (
                        <div style={s.hint}>Swipe right to see all rating columns</div>
                    )}
                    <table style={s.table}>
                        <thead>
                            <tr>
                                <th style={{ ...s.th, width: 110, textAlign: 'left', background: 'var(--admin-bg-secondary)' }}>DIMENSION</th>
                                {RATINGS.map(r => (
                                    <th key={r} style={{ ...s.th, background: ratingColor(r) }}>
                                        <div style={s.ratingHeader}>
                                            <span style={{ ...s.ratingScore, background: ratingColorSolid(r), color: '#fff' }}>{r}</span>
                                            <span style={s.ratingLabel}>{RATING_LABELS[r]}</span>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {DIMS.map(dim => (
                                <tr key={dim} style={s.row}>
                                    <td style={{ padding: '1rem 0.75rem', verticalAlign: 'middle', background: 'var(--admin-bg-secondary)', borderRight: '1px solid var(--admin-border)', textAlign: 'center' }}>
                                        <i className={`bi ${DIM_ICONS[dim]}`} style={s.dimIcon} />
                                        <div style={s.dimLabel}>{DIM_LABELS[dim]}</div>
                                    </td>
                                    {RATINGS.map(r => (
                                        <td key={r} style={{ ...s.cell, background: `${ratingColor(r)}22` }}>
                                            <textarea
                                                style={s.textarea}
                                                value={grid[dim][r]}
                                                placeholder={`${DIM_LABELS[dim]} standard for rating ${r}…`}
                                                onChange={e => set(dim, r, e.target.value)}
                                                rows={5}
                                            />
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div style={s.footer}>
                    <button style={s.btnCancel} onClick={onClose}>Cancel</button>
                    <button style={s.btnSave} onClick={handleSave}><i className="bi bi-floppy" style={{ marginRight: '0.4rem' }} />Save Standards</button>
                </div>
            </div>
        </div>
    );
}

function ratingColor(r) {
    return { 5: 'rgba(74,222,128,0.15)', 4: 'rgba(59,130,246,0.15)', 3: 'rgba(234,179,8,0.15)', 2: 'rgba(249,115,22,0.15)', 1: 'rgba(239,68,68,0.15)' }[r];
}

function ratingColorSolid(r) {
    return { 5: '#22c55e', 4: '#3b82f6', 3: '#eab308', 2: '#f97316', 1: '#ef4444' }[r];
}

const sMob = {
    th: { padding: '0.5rem 0.75rem', fontSize: '0.65rem', fontWeight: 700, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left' },
};

const s = {
    overlay:      { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' },
    modal:        { background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)', borderRadius: 'var(--admin-radius-lg)', width: '100%', maxWidth: 960, maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: 'var(--admin-shadow)' },
    header:       { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '1.25rem 1.75rem', borderBottom: '1px solid var(--admin-border)' },
    headerSub:    { fontSize: '0.68rem', fontWeight: 700, color: 'var(--admin-accent)', letterSpacing: '0.1em', marginBottom: '0.25rem' },
    headerTitle:  { fontWeight: 700, fontSize: '1.05rem', color: 'var(--admin-text-primary)', lineHeight: 1.4 },
    closeBtn:     { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-muted)', fontSize: '1.1rem', padding: '0.2rem' },
    tableWrap:    { overflowX: 'auto', overflowY: 'auto', flex: 1, padding: '0 0 0 0' },
    hint:         { marginBottom: '0.75rem', fontSize: '0.72rem', color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' },
    table:        { width: '100%', borderCollapse: 'collapse', minWidth: 760 },
    th:           { padding: '0.75rem 1rem', textAlign: 'center', fontSize: '0.7rem', fontWeight: 700, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '2px solid var(--admin-border)' },
    ratingHeader: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem' },
    ratingScore:  { width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 700, color: 'var(--admin-text-primary)' },
    ratingLabel:  { fontSize: '0.62rem', color: 'var(--admin-text-muted)', textAlign: 'center', lineHeight: 1.2 },
    row:          { borderBottom: '1px solid var(--admin-border)' },
    dimCell:      { padding: '0.75rem 0.5rem', verticalAlign: 'top', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', minWidth: 80 },
    dimIcon:      { fontSize: '1.25rem', color: 'var(--admin-accent)' },
    dimLabel:     { fontSize: '0.78rem', fontWeight: 700, color: 'var(--admin-text-secondary)', marginTop: '0.15rem' },
    cell:         { padding: '0.75rem 0.6rem', verticalAlign: 'top' },
    textarea:     { width: '100%', background: 'var(--admin-bg-secondary)', border: '1px solid var(--admin-border)', borderRadius: 8, color: 'var(--admin-text-primary)', fontSize: '0.82rem', padding: '0.6rem 0.75rem', resize: 'vertical', outline: 'none', lineHeight: 1.6, fontFamily: 'inherit', minHeight: 100, transition: 'border-color 0.15s' },
    footer:       { display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', padding: '1rem 1.75rem', borderTop: '1px solid var(--admin-border)' },
    btnCancel:    { padding: '0.55rem 1.5rem', borderRadius: 8, border: '1px solid var(--admin-border-strong)', background: 'transparent', color: 'var(--admin-text-primary)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 },
    btnSave:      { padding: '0.55rem 1.5rem', borderRadius: 8, border: 'none', background: 'var(--admin-accent)', color: '#fff', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' },
};
