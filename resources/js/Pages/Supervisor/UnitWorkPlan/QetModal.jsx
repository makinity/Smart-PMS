import { useState } from 'react';

const RATINGS   = [5, 4, 3, 2, 1];
const RATING_LABELS = { 5: 'Outstanding', 4: 'Very Satisfactory', 3: 'Satisfactory', 2: 'Unsatisfactory', 1: 'Poor' };
const DIMS      = ['q', 'e', 't'];
const DIM_LABELS = { q: 'Quality', e: 'Efficiency', t: 'Timeliness' };
const DIM_ICONS  = { q: 'bi-patch-check', e: 'bi-lightning-charge', t: 'bi-clock' };

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

    return (
        <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
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
                    <table style={s.table}>
                        <thead>
                            <tr>
                                <th style={{ ...s.th, width: 100 }}>DIMENSION</th>
                                {RATINGS.map(r => (
                                    <th key={r} style={s.th}>
                                        <div style={s.ratingHeader}>
                                            <span style={{ ...s.ratingScore, background: ratingColor(r) }}>{r}</span>
                                            <span style={s.ratingLabel}>{RATING_LABELS[r]}</span>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {DIMS.map(dim => (
                                <tr key={dim} style={s.row}>
                                    <td style={s.dimCell}>
                                        <i className={`bi ${DIM_ICONS[dim]}`} style={s.dimIcon} />
                                        <span style={s.dimLabel}>{DIM_LABELS[dim]}</span>
                                    </td>
                                    {RATINGS.map(r => (
                                        <td key={r} style={s.cell}>
                                            <textarea
                                                style={s.textarea}
                                                value={grid[dim][r]}
                                                placeholder={`${DIM_LABELS[dim]} standard for rating ${r}…`}
                                                onChange={e => set(dim, r, e.target.value)}
                                                rows={3}
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
    return { 5: 'rgba(74,222,128,0.25)', 4: 'rgba(59,130,246,0.25)', 3: 'rgba(234,179,8,0.25)', 2: 'rgba(249,115,22,0.25)', 1: 'rgba(239,68,68,0.25)' }[r];
}

const s = {
    overlay:      { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' },
    modal:        { background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)', borderRadius: 'var(--admin-radius-lg)', width: '100%', maxWidth: 860, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: 'var(--admin-shadow)' },
    header:       { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--admin-border)' },
    headerSub:    { fontSize: '0.68rem', fontWeight: 700, color: 'var(--admin-accent)', letterSpacing: '0.1em', marginBottom: '0.25rem' },
    headerTitle:  { fontWeight: 700, fontSize: '1rem', color: 'var(--admin-text-primary)' },
    closeBtn:     { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-muted)', fontSize: '1.1rem', padding: '0.2rem' },
    tableWrap:    { overflowX: 'auto', overflowY: 'auto', flex: 1, padding: '1rem 1.5rem' },
    table:        { width: '100%', borderCollapse: 'collapse', minWidth: 640 },
    th:           { padding: '0.5rem 0.5rem', textAlign: 'left', fontSize: '0.68rem', fontWeight: 700, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--admin-border)' },
    ratingHeader: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem' },
    ratingScore:  { width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'var(--admin-text-primary)' },
    ratingLabel:  { fontSize: '0.62rem', color: 'var(--admin-text-muted)', textAlign: 'center', lineHeight: 1.2 },
    row:          { borderBottom: '1px solid var(--admin-border)' },
    dimCell:      { padding: '0.75rem 0.5rem', verticalAlign: 'top', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', minWidth: 80 },
    dimIcon:      { fontSize: '1.1rem', color: 'var(--admin-accent)' },
    dimLabel:     { fontSize: '0.72rem', fontWeight: 700, color: 'var(--admin-text-secondary)' },
    cell:         { padding: '0.5rem', verticalAlign: 'top' },
    textarea:     { width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--admin-border)', borderRadius: 6, color: 'var(--admin-text-primary)', fontSize: '0.75rem', padding: '0.4rem 0.5rem', resize: 'none', outline: 'none', lineHeight: 1.5, fontFamily: 'inherit' },
    footer:       { display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', padding: '1rem 1.5rem', borderTop: '1px solid var(--admin-border)' },
    btnCancel:    { padding: '0.5rem 1.25rem', borderRadius: 8, border: '1px solid var(--admin-border-strong)', background: 'transparent', color: 'var(--admin-text-primary)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 },
    btnSave:      { padding: '0.5rem 1.25rem', borderRadius: 8, border: 'none', background: 'var(--admin-accent)', color: '#fff', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 },
};
