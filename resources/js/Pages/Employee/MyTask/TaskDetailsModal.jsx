import { useEffect } from 'react';
import useBreakpoint from '@/Components/useBreakpoint';
import { formatDuration, statusCfg } from '../Ors/orsHelpers';

function formatDateTime(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date);
}

function formatDate(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function formatSize(bytes) {
    if (!bytes && bytes !== 0) return '—';
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(kb >= 10 ? 0 : 1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
}

function TimelineItem({ label, value, icon }) {
    return (
        <div style={s.timelineItem}>
            <div style={s.timelineIcon}><i className={`bi ${icon}`} /></div>
            <div style={{ minWidth: 0 }}>
                <div style={s.metaLabel}>{label}</div>
                <div style={s.metaValue}>{value}</div>
            </div>
        </div>
    );
}

// ── Shared inner content ──────────────────────────────────────────────────────
function ModalContent({ entry, onClose, cfg, compact }) {
    return (
        <>
            {/* Header */}
            <div style={s.header}>
                <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={s.kicker}>Task Details</div>
                    <div style={s.title}>{entry.output_title}</div>
                    <div style={s.subtitle}>{entry.indicator_text}</div>
                </div>
                {!compact && (
                    <button type="button" style={s.closeBtn} onClick={onClose} aria-label="Close">
                        <i className="bi bi-x-lg" />
                    </button>
                )}
            </div>

            {/* Body */}
            <div style={s.body}>
                <div style={s.heroCard}>
                    <div style={s.heroTop}>
                        <span style={{ ...s.statusPill, background: cfg.bg, color: cfg.color, borderColor: cfg.color }}>
                            {cfg.label}
                        </span>
                        <span style={s.heroDate}>{formatDate(entry.work_date)}</span>
                    </div>
                    <div style={s.heroGrid}>
                        <div>
                            <div style={s.metaLabel}>Supervisor</div>
                            <div style={s.metaValue}>{entry.supervisor_name || '—'}</div>
                            {entry.supervisor_office && <div style={s.metaSub}>{entry.supervisor_office}</div>}
                        </div>
                        <div>
                            <div style={s.metaLabel}>Quantity</div>
                            <div style={s.metaValue}>{entry.quantity || '—'}</div>
                        </div>
                        <div>
                            <div style={s.metaLabel}>Duration</div>
                            <div style={s.metaValueMono}>{formatDuration(entry.total_seconds ?? 0)}</div>
                        </div>
                        <div>
                            <div style={s.metaLabel}>Updated</div>
                            <div style={s.metaValue}>{formatDateTime(entry.last_updated_at)}</div>
                        </div>
                    </div>
                </div>

                <div style={s.sectionCard}>
                    <div style={s.sectionTitle}>ORS Timeline</div>
                    <div style={s.timelineGrid}>
                        <TimelineItem label="Started"   value={formatDateTime(entry.started_at)}   icon="bi-play-circle" />
                        <TimelineItem label="Stopped"   value={formatDateTime(entry.stopped_at)}   icon="bi-stop-circle" />
                        <TimelineItem label="Submitted" value={formatDateTime(entry.submitted_at)} icon="bi-send-check" />
                        <TimelineItem label="Locked"    value={formatDateTime(entry.locked_at)}    icon="bi-lock-fill" />
                    </div>
                </div>

                <div style={s.sectionCard}>
                    <div style={s.sectionTitle}>Task Notes</div>
                    <div style={s.noteBox}>{entry.notes || 'No notes recorded for this task.'}</div>
                </div>

                <div style={s.sectionCard}>
                    <div style={s.sectionHead}>
                        <div>
                            <div style={s.sectionTitle}>Evidence Attachments</div>
                            <div style={s.sectionHint}>{entry.evidences?.length || 0} file(s) attached</div>
                        </div>
                    </div>
                    <div style={s.attachmentList}>
                        {entry.evidences?.length > 0 ? entry.evidences.map(file => (
                            <a key={file.id} href={file.file_path} target="_blank" rel="noreferrer" style={s.attachmentRow}>
                                <div style={s.attachmentIcon}><i className="bi bi-paperclip" /></div>
                                <div style={{ minWidth: 0, flex: 1 }}>
                                    <div style={s.attachmentName}>{file.file_name}</div>
                                    <div style={s.attachmentMeta}>
                                        {formatSize(file.file_size)}<span style={{ opacity: 0.4 }}>·</span>{formatDateTime(file.uploaded_at)}
                                    </div>
                                </div>
                                <i className="bi bi-box-arrow-up-right" style={{ color: 'var(--admin-text-muted)' }} />
                            </a>
                        )) : <div style={s.emptyInline}>No evidence files uploaded yet.</div>}
                    </div>
                </div>

                <div style={s.sectionCard}>
                    <div style={s.sectionHead}>
                        <div>
                            <div style={s.sectionTitle}>Supervisor Review</div>
                            <div style={s.sectionHint}>Read-only rating and remarks from the supervisor</div>
                        </div>
                    </div>
                    {entry.rating ? (
                        <div style={s.reviewGrid}>
                            <div style={s.reviewStat}>
                                <div style={s.metaLabel}>Quality Rating</div>
                                <div style={s.reviewNumber}>{entry.rating.quality_rating ?? '—'}</div>
                            </div>
                            <div style={s.reviewStat}>
                                <div style={s.metaLabel}>Timeliness Rating</div>
                                <div style={s.reviewNumber}>{entry.rating.timeliness_rating ?? '—'}</div>
                            </div>
                            <div style={s.reviewStatWide}>
                                <div style={s.metaLabel}>Reviewer</div>
                                <div style={s.metaValue}>{entry.rating.reviewer_name || '—'}</div>
                                <div style={s.metaSub}>{formatDateTime(entry.rating.rated_at)}</div>
                            </div>
                            <div style={s.reviewRemarks}>
                                <div style={s.metaLabel}>Remarks</div>
                                <div style={s.noteBox}>{entry.rating.remarks || 'No remarks provided.'}</div>
                            </div>
                        </div>
                    ) : <div style={s.emptyInline}>This task has not been rated by the supervisor yet.</div>}
                </div>
            </div>

            {/* Footer */}
            <div style={s.footer}>
                {entry.status === 'rated' && (
                    <a href={`/stage-one/forms/ors-excel?ors_id=${entry.id}`}
                        style={{ ...s.closeAction, background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.28)', color: '#4ade80', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        Download
                    </a>
                )}
                <button type="button" style={s.closeAction} onClick={onClose}>Close</button>
            </div>
        </>
    );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function TaskDetailsModal({ entry, onClose }) {
    const bp      = useBreakpoint();
    const compact = bp !== 'desktop';
    const cfg     = statusCfg(entry.status);

    useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
    }, [onClose]);

    const sidebarLeft = (() => {
        if (window.innerWidth < 768) return 0;
        const el = document.querySelector('.app-main');
        return el ? parseInt(getComputedStyle(el).marginLeft) || 0 : 0;
    })();

    if (compact) return (
        <>
            <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }} />
            <div style={{ position: 'fixed', bottom: 0, left: sidebarLeft, right: 0, zIndex: 1101,
                background: 'var(--admin-card)', borderRadius: '20px 20px 0 0',
                boxShadow: '0 -8px 32px rgba(0,0,0,0.3)', maxHeight: '88vh',
                display: 'flex', flexDirection: 'column', animation: 'slideUp 0.25s ease' }}>
                {/* Drag handle */}
                <div style={{ padding: '10px 1.25rem 0', flexShrink: 0, display: 'flex', justifyContent: 'center', position: 'relative' }}>
                    <div style={{ width: 36, height: 4, borderRadius: 99, background: 'var(--admin-border-strong)' }} />
                    <button onClick={onClose} style={{ position: 'absolute', right: '1rem', top: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-muted)', fontSize: '1rem' }}>
                        <i className="bi bi-x-lg" />
                    </button>
                </div>
                <ModalContent entry={entry} onClose={onClose} cfg={cfg} compact />
            </div>
            <style>{`@keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }`}</style>
        </>
    );

    return (
        <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
            <div style={s.modal} onClick={e => e.stopPropagation()}>
                <ModalContent entry={entry} onClose={onClose} cfg={cfg} compact={false} />
            </div>
        </div>
    );
}

const s = {
    overlay:        { position: 'fixed', inset: 0, zIndex: 1200, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' },
    modal:          { width: '100%', maxWidth: 960, maxHeight: '92vh', display: 'flex', flexDirection: 'column', borderRadius: 'var(--admin-radius-lg)', border: '1px solid var(--admin-border-strong)', background: 'var(--admin-card)', boxShadow: 'var(--admin-shadow)', overflow: 'hidden' },
    header:         { display: 'flex', alignItems: 'flex-start', gap: '1rem', justifyContent: 'space-between', padding: '1.15rem 1.25rem', borderBottom: '1px solid var(--admin-border)' },
    kicker:         { fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--admin-accent)', marginBottom: '0.35rem' },
    title:          { fontSize: '1.25rem', fontWeight: 800, color: 'var(--admin-text-primary)', lineHeight: 1.25, marginBottom: '0.25rem' },
    subtitle:       { fontSize: '0.9rem', color: 'var(--admin-text-secondary)', lineHeight: 1.5 },
    closeBtn:       { width: 40, height: 40, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10, border: '1px solid var(--admin-border)', background: 'transparent', color: 'var(--admin-text-muted)', cursor: 'pointer', flexShrink: 0 },
    body:           { flex: 1, overflowY: 'auto', padding: '1rem 1.25rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.9rem' },
    heroCard:       { padding: '1rem', borderRadius: 'var(--admin-radius)', border: '1px solid var(--admin-border-strong)', background: 'linear-gradient(180deg, rgba(59,130,246,0.08), rgba(255,255,255,0.02))' },
    heroTop:        { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.9rem' },
    statusPill:     { display: 'inline-flex', alignItems: 'center', padding: '0.24rem 0.7rem', borderRadius: 999, border: '1px solid currentColor', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' },
    heroDate:       { fontSize: '0.84rem', color: 'var(--admin-text-muted)', fontWeight: 600 },
    heroGrid:       { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '0.85rem' },
    metaLabel:      { fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--admin-text-muted)', marginBottom: '0.3rem' },
    metaValue:      { color: 'var(--admin-text-primary)', fontSize: '0.92rem', fontWeight: 700, lineHeight: 1.4 },
    metaValueMono:  { color: 'var(--admin-text-primary)', fontSize: '1rem', fontWeight: 800, fontFamily: 'monospace' },
    metaSub:        { marginTop: '0.2rem', color: 'var(--admin-text-muted)', fontSize: '0.8rem', lineHeight: 1.4 },
    sectionCard:    { padding: '1rem', borderRadius: 'var(--admin-radius)', border: '1px solid var(--admin-border)', background: 'rgba(255,255,255,0.02)' },
    sectionHead:    { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.75rem' },
    sectionTitle:   { fontSize: '0.92rem', fontWeight: 800, color: 'var(--admin-text-primary)', marginBottom: '0.15rem' },
    sectionHint:    { fontSize: '0.82rem', color: 'var(--admin-text-muted)', lineHeight: 1.45 },
    timelineGrid:   { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.75rem' },
    timelineItem:   { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.8rem 0.85rem', borderRadius: 12, border: '1px solid var(--admin-border)', background: 'rgba(255,255,255,0.02)' },
    timelineIcon:   { width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(59,130,246,0.12)', color: 'var(--admin-accent)', flexShrink: 0 },
    noteBox:        { padding: '0.9rem 1rem', borderRadius: 12, border: '1px solid var(--admin-border)', background: 'rgba(255,255,255,0.02)', color: 'var(--admin-text-secondary)', lineHeight: 1.6, fontSize: '0.92rem', whiteSpace: 'pre-wrap' },
    attachmentList: { display: 'flex', flexDirection: 'column', gap: '0.65rem' },
    attachmentRow:  { display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.8rem 0.85rem', borderRadius: 12, border: '1px solid var(--admin-border)', background: 'rgba(255,255,255,0.02)', textDecoration: 'none', color: 'inherit' },
    attachmentIcon: { width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(59,130,246,0.12)', color: 'var(--admin-accent)', flexShrink: 0 },
    attachmentName: { fontSize: '0.9rem', fontWeight: 700, color: 'var(--admin-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
    attachmentMeta: { display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.15rem', fontSize: '0.75rem', color: 'var(--admin-text-muted)', flexWrap: 'wrap' },
    emptyInline:    { padding: '0.85rem 1rem', borderRadius: 12, border: '1px dashed var(--admin-border-strong)', color: 'var(--admin-text-muted)', fontSize: '0.9rem', background: 'rgba(255,255,255,0.02)' },
    reviewGrid:     { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.75rem' },
    reviewStat:     { padding: '0.85rem 0.9rem', borderRadius: 12, border: '1px solid var(--admin-border)', background: 'rgba(255,255,255,0.02)' },
    reviewStatWide: { gridColumn: '1 / -1', padding: '0.85rem 0.9rem', borderRadius: 12, border: '1px solid var(--admin-border)', background: 'rgba(255,255,255,0.02)' },
    reviewRemarks:  { gridColumn: '1 / -1' },
    reviewNumber:   { fontSize: '1.45rem', fontWeight: 800, color: 'var(--admin-text-primary)', lineHeight: 1 },
    footer:         { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.9rem 1.25rem 1.15rem', borderTop: '1px solid var(--admin-border)' },
    closeAction:    { minHeight: 42, padding: '0.55rem 1rem', borderRadius: 10, border: '1px solid var(--admin-border-strong)', background: 'transparent', color: 'var(--admin-text-primary)', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 700 },
};
