import { useState, useEffect } from 'react';
import { router, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';

// ── helpers ───────────────────────────────────────────────────────────────────
const RATING_LABELS = ['', 'Unsatisfactory', 'Needs Improvement', 'Satisfactory', 'Very Satisfactory', 'Outstanding'];

function relativeTime(iso) {
    if (!iso) return '—';
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60)    return 'just now';
    if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}
function formatDuration(secs) {
    if (!secs) return '00:00:00';
    const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60), s = secs % 60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}
function formatBytes(bytes) {
    if (!bytes) return '';
    if (bytes < 1024)    return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
}
function fileIcon(mime) {
    if (!mime) return 'bi-file-earmark';
    if (mime.includes('pdf'))    return 'bi-file-earmark-pdf';
    if (mime.includes('image'))  return 'bi-file-earmark-image';
    if (mime.includes('word') || mime.includes('document')) return 'bi-file-earmark-word';
    if (mime.includes('sheet') || mime.includes('excel'))   return 'bi-file-earmark-excel';
    return 'bi-file-earmark';
}
function fileIconColor(mime) {
    if (!mime) return 'var(--admin-text-muted)';
    if (mime.includes('pdf'))   return '#ef4444';
    if (mime.includes('image')) return '#8b5cf6';
    if (mime.includes('word'))  return '#3b82f6';
    if (mime.includes('sheet')) return '#10b981';
    return 'var(--admin-accent)';
}

// ── useBreakpoint ─────────────────────────────────────────────────────────────
function useBreakpoint() {
    const [w, setW] = useState(() => window.innerWidth);
    useEffect(() => {
        const h = () => setW(window.innerWidth);
        window.addEventListener('resize', h);
        return () => window.removeEventListener('resize', h);
    }, []);
    // desktop ≥1024, tablet 768–1023, mobile <768
    if (w >= 1024) return 'desktop';
    if (w >= 768)  return 'tablet';
    return 'mobile';
}

// ── StarRating ────────────────────────────────────────────────────────────────
function StarRating({ value, onChange, disabled }) {
    const [hover, setHover] = useState(0);
    const active = hover || value;
    return (
        <div>
            <div style={{ display: 'flex', gap: 6 }}>
                {[1,2,3,4,5].map(n => (
                    <button key={n} type="button" disabled={disabled}
                        onMouseEnter={() => !disabled && setHover(n)}
                        onMouseLeave={() => setHover(0)}
                        onClick={() => !disabled && onChange(n)}
                        style={{ background: 'none', border: 'none', cursor: disabled ? 'default' : 'pointer',
                            padding: 0, fontSize: '1.6rem', lineHeight: 1,
                            color: active >= n ? '#f59e0b' : 'var(--admin-border-strong)',
                            transform: active === n ? 'scale(1.15)' : 'scale(1)',
                            transition: 'color 0.12s, transform 0.1s' }}>
                        ★
                    </button>
                ))}
            </div>
            {value > 0 && (
                <div style={{ marginTop: 4, fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em',
                    color: 'var(--admin-accent)', textTransform: 'uppercase' }}>
                    {value} / 5 — {RATING_LABELS[value]}
                </div>
            )}
        </div>
    );
}

// ── QueueCard ─────────────────────────────────────────────────────────────────
function QueueCard({ entry, selected, onClick }) {
    const urgent = entry.status === 'submitted';
    return (
        <div onClick={onClick} style={{
            padding: '0.85rem 1rem', borderRadius: 10, cursor: 'pointer', marginBottom: 6,
            background: selected ? 'rgba(59,130,246,0.10)' : 'var(--admin-bg-secondary)',
            border: `1px solid ${selected ? 'var(--admin-accent)' : 'var(--admin-border)'}`,
            borderLeft: `3px solid ${urgent ? '#ef4444' : '#10b981'}`,
            transition: 'background 0.12s, border-color 0.12s',
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 5 }}>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '2px 7px', borderRadius: 99,
                        letterSpacing: '0.08em',
                        background: urgent ? 'rgba(239,68,68,0.12)' : 'rgba(100,116,139,0.12)',
                        color: urgent ? '#ef4444' : '#94a3b8' }}>
                        {urgent ? 'URGENT' : 'STANDARD'}
                    </span>
                    <span style={{ fontSize: '0.6rem', fontWeight: 600, padding: '2px 7px', borderRadius: 99,
                        background: urgent ? 'rgba(251,191,36,0.15)' : 'rgba(16,185,129,0.12)',
                        color: urgent ? '#d97706' : '#10b981',
                        display: 'flex', alignItems: 'center', gap: 3 }}>
                        <i className={`bi ${urgent ? 'bi-clock-history' : 'bi-check-circle-fill'}`} />
                        {urgent ? 'Requires Rating' : 'Rated'}
                    </span>
                </div>
                <span style={{ fontSize: '0.68rem', color: 'var(--admin-text-muted)', flexShrink: 0, marginLeft: 6 }}>
                    {relativeTime(entry.submitted_at)}
                </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
                {entry.employee_avatar ? (
                    <img src={entry.employee_avatar} alt=""
                        style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover',
                            flexShrink: 0, border: '1px solid var(--admin-border)' }} />
                ) : (
                    <div style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                        background: 'var(--admin-accent)', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: '0.55rem', fontWeight: 700, color: '#fff' }}>
                        {entry.employee_name?.slice(0,2).toUpperCase()}
                    </div>
                )}
                <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--admin-text-primary)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {entry.employee_name}
                    {entry.employee_office && (
                        <span style={{ fontWeight: 400, color: 'var(--admin-text-muted)' }}> — {entry.employee_office}</span>
                    )}
                </div>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {entry.indicator_text}
            </div>
        </div>
    );
}

// ── EvidenceCard ──────────────────────────────────────────────────────────────
function EvidenceCard({ ev }) {
    const [hovered, setHovered] = useState(false);
    const isUrl = ev.file_path?.startsWith('http');
    return (
        <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.75rem',
                background: hovered ? 'rgba(59,130,246,0.06)' : 'var(--admin-bg-secondary)',
                borderRadius: 8, border: '1px solid var(--admin-border)', transition: 'background 0.12s' }}>
            <div style={{ width: 40, height: 40, borderRadius: 8, flexShrink: 0,
                background: 'rgba(59,130,246,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className={`bi ${fileIcon(ev.mime_type)}`} style={{ fontSize: '1.2rem', color: fileIconColor(ev.mime_type) }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--admin-text-primary)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.file_name}</div>
                {ev.file_size && <div style={{ fontSize: '0.68rem', color: 'var(--admin-text-muted)' }}>{formatBytes(ev.file_size)}</div>}
            </div>
            <a href={ev.file_path} target="_blank" rel="noreferrer"
                style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid var(--admin-border)',
                    background: hovered ? 'var(--admin-accent)' : 'transparent',
                    color: hovered ? '#fff' : 'var(--admin-text-muted)',
                    textDecoration: 'none', fontSize: '0.8rem', transition: 'background 0.12s, color 0.12s', flexShrink: 0 }}>
                <i className={`bi ${isUrl ? 'bi-box-arrow-up-right' : 'bi-download'}`} />
            </a>
        </div>
    );
}

// ── RatingPanelContent ────────────────────────────────────────────────────────
function RatingPanelContent({ entry, onSaved, isMobile }) {
    const isRated = entry.status === 'rated' && entry.rating !== null;
    const [editing,    setEditing]    = useState(!isRated);
    const [quality,    setQuality]    = useState(entry.rating?.quality_rating    ?? 0);
    const [timeliness, setTimeliness] = useState(entry.rating?.timeliness_rating ?? 0);
    const [remarks,    setRemarks]    = useState(entry.rating?.remarks           ?? '');
    const [saving,     setSaving]     = useState(false);
    const [errs,       setErrs]       = useState({});

    useEffect(() => {
        const rated = entry.status === 'rated' && entry.rating !== null;
        setEditing(!rated);
        setQuality(entry.rating?.quality_rating    ?? 0);
        setTimeliness(entry.rating?.timeliness_rating ?? 0);
        setRemarks(entry.rating?.remarks           ?? '');
        setErrs({});
    }, [entry.id]);

    function discard() {
        setQuality(entry.rating?.quality_rating    ?? 0);
        setTimeliness(entry.rating?.timeliness_rating ?? 0);
        setRemarks(entry.rating?.remarks           ?? '');
        setErrs({});
        setEditing(false);
    }

    function save() {
        const e = {};
        if (!quality)    e.quality    = 'Quality rating is required (1–5).';
        if (!timeliness) e.timeliness = 'Timeliness rating is required (1–5).';
        if (Object.keys(e).length) { setErrs(e); return; }
        setSaving(true);
        router.post(`/supervisor/ors-monitoring/${entry.id}/rate`,
            { quality_rating: quality, timeliness_rating: timeliness, remarks },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setSaving(false); setEditing(false);
                    onSaved(entry.id, { quality_rating: quality, timeliness_rating: timeliness, remarks, rated_at: new Date().toISOString() });
                },
                onError: () => setSaving(false),
            }
        );
    }

    const card = { background: 'var(--admin-card)', border: '1px solid var(--admin-border)',
        borderRadius: 12, padding: '1.1rem 1.25rem', marginBottom: '0.85rem' };

    // On mobile, action row is sticky — wrap edit content in scrollable div
    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

            {/* Scrollable body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '0 0 1rem' : '0' }}>

                {/* Header */}
                <div style={{ marginBottom: '1.1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--admin-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--admin-accent)',
                            textTransform: 'uppercase', letterSpacing: '0.1em' }}>Task Review In Progress</span>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--admin-text-primary)', marginBottom: 3 }}>
                        Reviewing: {entry.employee_name}
                        {entry.employee_office && (
                            <span style={{ fontWeight: 400, color: 'var(--admin-text-muted)', fontSize: '0.85rem' }}>
                                {' '}— {entry.employee_office}
                            </span>
                        )}
                    </div>
                    <div style={{ fontSize: '0.87rem', color: 'var(--admin-text-secondary)', marginBottom: 6 }}>
                        {entry.indicator_text}
                        {entry.output_title && entry.output_title !== '—' && (
                            <span style={{ marginLeft: 8, fontSize: '0.72rem', fontWeight: 600, padding: '2px 8px',
                                borderRadius: 99, background: 'rgba(59,130,246,0.10)', color: 'var(--admin-accent)' }}>
                                {entry.output_title}
                            </span>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        {[
                            { icon: 'bi-calendar3', text: entry.work_date },
                            { icon: 'bi-stopwatch',  text: formatDuration(entry.total_seconds) },
                            entry.quantity && { icon: 'bi-stack', text: `QTY: ${entry.quantity}` },
                            entry.submitted_at && { icon: 'bi-send', text: `Submitted ${relativeTime(entry.submitted_at)}` },
                        ].filter(Boolean).map((m, i) => (
                            <span key={i} style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <i className={`bi ${m.icon}`} />{m.text}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Evidence */}
                <div style={card}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <i className="bi bi-paperclip" style={{ color: 'var(--admin-text-muted)' }} />
                            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--admin-text-muted)',
                                textTransform: 'uppercase', letterSpacing: '0.08em' }}>View Evidence</span>
                        </div>
                        <span style={{ fontSize: '0.68rem', color: 'var(--admin-text-muted)', fontFamily: 'monospace' }}>
                            {entry.evidences?.length ?? 0} attachment{(entry.evidences?.length ?? 0) !== 1 ? 's' : ''}
                        </span>
                    </div>
                    {entry.evidences?.length > 0 ? (
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
                            {entry.evidences.map(ev => <EvidenceCard key={ev.id} ev={ev} />)}
                        </div>
                    ) : (
                        <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: '0.8rem' }}>
                            <i className="bi bi-folder2-open" style={{ fontSize: '1.5rem', display: 'block', marginBottom: 6 }} />
                            No evidence files attached.
                        </div>
                    )}
                </div>

                {/* Notes */}
                {entry.notes && (
                    <div style={{ ...card, fontSize: '0.82rem', color: 'var(--admin-text-secondary)', fontStyle: 'italic' }}>
                        <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--admin-text-muted)',
                            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4, fontStyle: 'normal' }}>Notes</div>
                        {entry.notes}
                    </div>
                )}

                {/* Rating section */}
                {!editing ? (
                    <div style={{ ...card, background: 'var(--admin-bg-secondary)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <i className="bi bi-check2-circle" style={{ color: '#10b981', fontSize: '1rem' }} />
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10b981' }}>Rating Submitted</span>
                                {entry.rating?.rated_at && (
                                    <span style={{ fontSize: '0.68rem', color: 'var(--admin-text-muted)' }}>
                                        · {relativeTime(entry.rating.rated_at)}
                                    </span>
                                )}
                            </div>
                            <button onClick={() => setEditing(true)} style={{
                                padding: '4px 12px', borderRadius: 6, border: '1px solid var(--admin-border-strong)',
                                background: 'transparent', color: 'var(--admin-text-muted)',
                                cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600,
                                display: 'flex', alignItems: 'center', gap: 4 }}>
                                <i className="bi bi-pencil" /> Edit
                            </button>
                        </div>
                        {/* Stars: 2-col on desktop, stacked on mobile */}
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--admin-text-muted)',
                                    textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Quality Rating</div>
                                <StarRating value={entry.rating?.quality_rating ?? 0} disabled />
                            </div>
                            <div>
                                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--admin-text-muted)',
                                    textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Timeliness Rating</div>
                                <StarRating value={entry.rating?.timeliness_rating ?? 0} disabled />
                            </div>
                        </div>
                        {entry.rating?.remarks && (
                            <div style={{ marginTop: '1rem', paddingTop: '0.85rem', borderTop: '1px solid var(--admin-border)' }}>
                                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--admin-text-muted)',
                                    textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Remarks</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--admin-text-secondary)', lineHeight: 1.55 }}>
                                    {entry.rating.remarks}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <>
                        <div style={{ ...card, background: 'var(--admin-bg-secondary)' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1.5rem' }}>
                                <div>
                                    <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--admin-text-muted)',
                                        textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Quality Rating</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)', marginBottom: 10, lineHeight: 1.45 }}>
                                        Degree to which expectations were met based on standards.
                                    </div>
                                    <StarRating value={quality} onChange={v => { setQuality(v); setErrs(e => ({...e, quality: null})); }} />
                                    {errs.quality && <div style={{ fontSize: '0.7rem', color: '#ef4444', marginTop: 4 }}>{errs.quality}</div>}
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--admin-text-muted)',
                                        textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Timeliness Rating</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)', marginBottom: 10, lineHeight: 1.45 }}>
                                        Adherence to the scheduled deadline and milestones.
                                    </div>
                                    <StarRating value={timeliness} onChange={v => { setTimeliness(v); setErrs(e => ({...e, timeliness: null})); }} />
                                    {errs.timeliness && <div style={{ fontSize: '0.7rem', color: '#ef4444', marginTop: 4 }}>{errs.timeliness}</div>}
                                </div>
                            </div>
                        </div>
                        <div style={card}>
                            <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--admin-text-primary)', marginBottom: 6 }}>
                                Remarks & Feedback{' '}
                                <span style={{ fontWeight: 400, color: 'var(--admin-text-muted)', fontSize: '0.78rem' }}>(optional)</span>
                            </div>
                            <textarea rows={4} maxLength={2000} value={remarks}
                                onChange={e => setRemarks(e.target.value)}
                                placeholder={`Provide constructive feedback for ${entry.employee_name} regarding this task submission...`}
                                style={{ width: '100%', padding: '0.65rem 0.9rem', boxSizing: 'border-box',
                                    background: 'var(--admin-bg-secondary)', border: '1px solid var(--admin-border)',
                                    borderRadius: 8, color: 'var(--admin-text-primary)', fontSize: '0.85rem',
                                    outline: 'none', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.55 }}
                            />
                            <div style={{ textAlign: 'right', fontSize: '0.68rem', color: 'var(--admin-text-muted)', marginTop: 3 }}>
                                {remarks.length} / 2000
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Action row — only shown in edit mode */}
            {editing && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    gap: '0.75rem', paddingTop: '0.75rem',
                    borderTop: isMobile ? '1px solid var(--admin-border)' : 'none',
                    background: isMobile ? 'var(--admin-card)' : 'transparent',
                    flexShrink: 0 }}>
                    <button onClick={discard} style={{ padding: '0.55rem 1.25rem', borderRadius: 8,
                        border: '1px solid var(--admin-border-strong)', background: 'transparent',
                        color: 'var(--admin-text-primary)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                        {entry.status === 'rated' ? 'Cancel' : 'Discard Changes'}
                    </button>
                    <button onClick={save} disabled={saving} style={{ padding: '0.55rem 1.6rem', borderRadius: 8,
                        border: 'none', background: 'var(--admin-accent)', color: '#fff',
                        cursor: saving ? 'not-allowed' : 'pointer', fontSize: '0.85rem', fontWeight: 700,
                        opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <i className="bi bi-star-fill" />
                        {saving ? 'Saving…' : entry.status === 'rated' ? 'Update Rating' : 'Save Rating'}
                    </button>
                </div>
            )}
        </div>
    );
}

// ── BottomSheet ───────────────────────────────────────────────────────────────
function useSidebarLeft() {
    const getLeft = () => {
        if (window.innerWidth < 768) return 0;
        const el = document.querySelector('.app-main');
        return el ? parseInt(getComputedStyle(el).marginLeft) || 0 : 0;
    };
    const [left, setLeft] = useState(getLeft);
    useEffect(() => {
        const update = () => setLeft(getLeft());
        window.addEventListener('resize', update);
        // Poll briefly after mount to catch sidebar transition (200ms)
        const t = setTimeout(update, 250);
        return () => { window.removeEventListener('resize', update); clearTimeout(t); };
    }, []);
    return left;
}

function BottomSheet({ entry, onClose, onSaved }) {
    const left = useSidebarLeft();
    return (
        <>
            {/* Backdrop — only covers the content area */}
            <div onClick={onClose} style={{
                position: 'fixed', top: 0, bottom: 0, left, right: 0, zIndex: 100,
                background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)',
            }} />
            {/* Sheet */}
            <div style={{
                position: 'fixed', bottom: 0, left, right: 0, zIndex: 101,
                background: 'var(--admin-card)',
                borderRadius: '20px 20px 0 0',
                boxShadow: '0 -8px 32px rgba(0,0,0,0.3)',
                height: '82vh',
                display: 'flex', flexDirection: 'column',
                animation: 'slideUp 0.25s ease',
            }}>
                {/* Drag handle + close */}
                <div style={{ padding: '10px 1.25rem 0', flexShrink: 0, display: 'flex', justifyContent: 'center', position: 'relative' }}>
                    <div style={{ width: 36, height: 4, borderRadius: 99, background: 'var(--admin-border-strong)' }} />
                    <button onClick={onClose} style={{ position: 'absolute', right: '1rem', top: 6,
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--admin-text-muted)', fontSize: '1.1rem', padding: 4 }}>
                        <i className="bi bi-x-lg" />
                    </button>
                </div>
                {/* Content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 1.25rem 1rem', display: 'flex', flexDirection: 'column' }}>
                    <RatingPanelContent entry={entry} onSaved={(id, data) => { onSaved(id, data); onClose(); }} isMobile={true} />
                </div>
            </div>
            <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
        </>
    );
}

// ── QueuePanel ────────────────────────────────────────────────────────────────
function QueuePanel({ entries, filtered, selectedId, setSelectedId, pendingCount, ratedCount, search, setSearch, statusFilter, setStatusFilter, cardBase }) {
    return (
        <div style={{ ...cardBase, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{ padding: '0.9rem 1rem', borderBottom: '1px solid var(--admin-border)', flexShrink: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--admin-text-primary)' }}>Submission Queue</div>
                    {pendingCount > 0 && (
                        <span style={{ fontSize: '0.62rem', fontWeight: 800, padding: '2px 8px',
                            borderRadius: 99, background: '#ef4444', color: '#fff', letterSpacing: '0.05em' }}>
                            {pendingCount} NEW
                        </span>
                    )}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)', marginTop: 3 }}>
                    {pendingCount} pending · {ratedCount} rated
                </div>
                <div style={{ marginTop: '0.6rem', display: 'flex', gap: 6 }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <i className="bi bi-search" style={{ position: 'absolute', left: 9, top: '50%',
                            transform: 'translateY(-50%)', color: 'var(--admin-text-muted)', fontSize: '0.78rem', pointerEvents: 'none' }} />
                        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Search employee or task…"
                            style={{ width: '100%', boxSizing: 'border-box', padding: '0.42rem 0.75rem 0.42rem 2rem',
                                background: 'var(--admin-bg-secondary)', border: '1px solid var(--admin-border)',
                                borderRadius: 8, color: 'var(--admin-text-primary)', fontSize: '0.78rem',
                                outline: 'none', fontFamily: 'inherit' }} />
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                        {[{ key: 'all', label: 'All' }, { key: 'submitted', label: 'Pending' }, { key: 'rated', label: 'Rated' }].map(({ key, label }) => (
                            <button key={key} onClick={() => setStatusFilter(key)} style={{
                                padding: '0.38rem 0.7rem', borderRadius: 7, border: '1px solid', fontSize: '0.72rem',
                                fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                                borderColor: statusFilter === key ? 'var(--admin-accent)' : 'var(--admin-border)',
                                background: statusFilter === key ? 'rgba(59,130,246,0.12)' : 'transparent',
                                color: statusFilter === key ? 'var(--admin-accent)' : 'var(--admin-text-muted)' }}>
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem' }}>
                {filtered.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: '0.8rem', padding: '2rem 0' }}>
                        No results{search ? ` for "${search}"` : ''}
                    </div>
                ) : filtered.map(entry => (
                    <QueueCard key={entry.id} entry={entry} selected={selectedId === entry.id} onClick={() => setSelectedId(entry.id)} />
                ))}
            </div>
        </div>
    );
}

// ── EmptyState ────────────────────────────────────────────────────────────────
function EmptyState() {
    return (
        <div style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)',
            borderRadius: 'var(--admin-radius)', padding: '4rem 2rem', textAlign: 'center' }}>
            <i className="bi bi-inbox" style={{ fontSize: '2.5rem', color: 'var(--admin-text-muted)', display: 'block', marginBottom: '0.75rem' }} />
            <div style={{ fontWeight: 600, color: 'var(--admin-text-primary)', marginBottom: 6 }}>No Submissions Yet</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--admin-text-muted)' }}>
                Submitted task entries from your team will appear here for review.
            </div>
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Index() {
    const { entries: initialEntries, autoOpenEntryId } = usePage().props;
    const [entries,      setEntries]      = useState(initialEntries ?? []);
    const [selectedId,   setSelectedId]   = useState(autoOpenEntryId ?? initialEntries?.[0]?.id ?? null);
    const [search,       setSearch]       = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sheetOpen,    setSheetOpen]    = useState(!!autoOpenEntryId);

    const bp = useBreakpoint();
    const isMobileOrTablet = bp !== 'desktop';

    const filtered = entries.filter(e => {
        const matchStatus = statusFilter === 'all' || e.status === statusFilter;
        const q = search.trim().toLowerCase();
        return matchStatus && (!q || e.employee_name.toLowerCase().includes(q) || e.indicator_text.toLowerCase().includes(q));
    });

    const selected = entries.find(e => e.id === selectedId) ?? null;
    const pendingCount = entries.filter(e => e.status === 'submitted').length;
    const ratedCount   = entries.filter(e => e.status === 'rated').length;

    function onSaved(entryId, ratingData) {
        setEntries(prev => prev.map(e => e.id === entryId ? { ...e, status: 'rated', rating: ratingData } : e));
        router.reload({ only: ['entries'] });
    }

    function handleCardClick(entryId) {
        setSelectedId(entryId);
        if (isMobileOrTablet) setSheetOpen(true);
    }

    const cardBase = {
        background: 'var(--admin-card)',
        border: '1px solid var(--admin-border-strong)',
        borderRadius: 'var(--admin-radius)',
        boxShadow: 'var(--admin-shadow)',
    };

    const queueProps = { entries, filtered, selectedId, setSelectedId: handleCardClick,
        pendingCount, ratedCount, search, setSearch, statusFilter, setStatusFilter, cardBase };

    if (entries.length === 0) return (
        <AppLayout title="ORS Monitoring" description="Review and rate submitted task entries">
            <EmptyState />
        </AppLayout>
    );

    return (
        <AppLayout title="ORS Monitoring" description="Review and rate submitted task entries">

            {/* ── DESKTOP: two-column ── */}
            {bp === 'desktop' && (
                <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '1rem',
                    height: 'calc(100vh - 120px)', minHeight: 0 }}>
                    <QueuePanel {...queueProps} />
                    <div style={{ ...cardBase, padding: '1.25rem', display: 'flex', flexDirection: 'column',
                        minHeight: 0, overflowY: 'auto' }}>
                        {selected ? (
                            <RatingPanelContent key={selected.id} entry={selected} onSaved={onSaved} isMobile={false} />
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flex: 1, color: 'var(--admin-text-muted)', fontSize: '0.88rem',
                                flexDirection: 'column', gap: 8 }}>
                                <i className="bi bi-arrow-left-circle" style={{ fontSize: '1.8rem' }} />
                                Select an entry from the queue to start reviewing.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── TABLET: queue full width + bottom sheet ── */}
            {bp === 'tablet' && (
                <div style={{ height: 'calc(100vh - 120px)', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                    <QueuePanel {...queueProps} />
                    {sheetOpen && selected && (
                        <BottomSheet entry={selected} onClose={() => setSheetOpen(false)} onSaved={onSaved} />
                    )}
                </div>
            )}

            {/* ── MOBILE: queue full width + bottom sheet ── */}
            {bp === 'mobile' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <QueuePanel {...queueProps} />
                    {sheetOpen && selected && (
                        <BottomSheet entry={selected} onClose={() => setSheetOpen(false)} onSaved={onSaved} />
                    )}
                </div>
            )}

        </AppLayout>
    );
}
