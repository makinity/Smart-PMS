import { formatDuration, statusCfg } from './orsHelpers';

function formatDateHeader(dateStr) {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

export default function DaySummaryModal({ date, entries, onClose, onOpenEntry, onLogTask }) {
    return (
        <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
            <div style={s.modal}>
                {/* Header */}
                <div style={s.header}>
                    <div>
                        <div style={s.headerSub}>DAILY SUMMARY</div>
                        <div style={s.headerTitle}>{formatDateHeader(date)}</div>
                    </div>
                    <button style={s.closeBtn} onClick={onClose}>✕</button>
                </div>

                {/* List */}
                <div style={s.list}>
                    {entries.length === 0 && (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: '0.88rem' }}>
                            No tasks logged for this day.
                        </div>
                    )}
                    {entries.map(entry => {
                        const c = statusCfg(entry.status);
                        return (
                            <div key={entry.id} style={s.row}
                                onClick={() => onOpenEntry(entry)}
                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'var(--admin-border)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.borderColor = 'transparent'; }}>
                                <div style={{ ...s.rowIcon, background: c.bg, color: c.color }}>
                                    <i className={`bi ${c.icon}`} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={s.rowTitle}>{entry.indicator_text}</div>
                                    <div style={s.rowMeta}>
                                        <i className="bi bi-stopwatch" />
                                        <span>{formatDuration(entry.total_seconds)}</span>
                                        {entry.evidence_count > 0 && <>
                                            <span style={{ opacity: 0.4 }}>·</span>
                                            <i className="bi bi-paperclip" />
                                            <span>{entry.evidence_count} file{entry.evidence_count !== 1 ? 's' : ''}</span>
                                        </>}
                                    </div>
                                </div>
                                <span style={{ ...s.badge, background: c.bg, color: c.color }}>{c.label}</span>
                                <i className="bi bi-chevron-right" style={{ color: 'var(--admin-text-muted)', fontSize: '0.78rem' }} />
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div style={s.footer}>
                    <button style={s.btnSave} onClick={() => onLogTask(date)}>
                        <i className="bi bi-plus-circle-fill" style={{ marginRight: '0.4rem' }} />
                        Log Task for this date
                    </button>
                </div>
            </div>
        </div>
    );
}

const s = {
    overlay:    { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' },
    modal:      { background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)', borderRadius: 'var(--admin-radius-lg)', width: '100%', maxWidth: 520, maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: 'var(--admin-shadow)' },
    header:     { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--admin-border)' },
    headerSub:  { fontSize: '0.68rem', fontWeight: 700, color: 'var(--admin-accent)', letterSpacing: '0.1em', marginBottom: '0.25rem' },
    headerTitle:{ fontWeight: 700, fontSize: '1rem', color: 'var(--admin-text-primary)' },
    closeBtn:   { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-muted)', fontSize: '1.1rem', padding: '0.2rem' },
    list:       { flex: 1, overflowY: 'auto', padding: '0.5rem 1rem' },
    row:        { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 0.6rem', borderRadius: 8, cursor: 'pointer', border: '1px solid transparent', marginBottom: '0.2rem', transition: 'background 0.1s' },
    rowIcon:    { width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.95rem' },
    rowTitle:   { fontWeight: 600, fontSize: '0.88rem', color: 'var(--admin-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
    rowMeta:    { display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', color: 'var(--admin-text-muted)', marginTop: 2 },
    badge:      { padding: '0.18rem 0.55rem', borderRadius: 99, fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0 },
    footer:     { display: 'flex', justifyContent: 'flex-end', padding: '1rem 1.5rem', borderTop: '1px solid var(--admin-border)' },
    btnSave:    { padding: '0.5rem 1.25rem', borderRadius: 8, border: 'none', background: 'var(--admin-accent)', color: '#fff', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 },
};
