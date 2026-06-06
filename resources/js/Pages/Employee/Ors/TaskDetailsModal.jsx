import { useState, useEffect, useRef } from 'react';
import { router } from '@inertiajs/react';
import { formatDuration, statusCfg } from './orsHelpers';

function LiveTimer({ entry }) {
    const [, tick] = useState(0);
    const ref = useRef(null);
    useEffect(() => {
        clearInterval(ref.current);
        if (entry.status === 'recording' && entry.started_at) {
            ref.current = setInterval(() => tick(v => v + 1), 1000);
        }
        return () => clearInterval(ref.current);
    }, [entry.id, entry.status, entry.started_at]);

    let secs = entry.total_seconds;
    if (entry.status === 'recording' && entry.started_at) {
        secs += Math.floor((Date.now() - new Date(entry.started_at).getTime()) / 1000);
    }
    return (
        <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '1.1rem', color: entry.status === 'recording' ? '#ef4444' : 'var(--admin-text-primary)' }}>
            {formatDuration(Math.max(0, secs))}
        </span>
    );
}

export default function TaskDetailsModal({ entry, onClose }) {
    const [quantity, setQuantity] = useState(entry.quantity ?? '');
    const [notes, setNotes] = useState(entry.notes ?? '');
    const [submitting, setSubmitting] = useState(false);
    const [pendingFiles, setPendingFiles] = useState([]);
    const [errs, setErrs] = useState({});
    const fileRef = useRef(null);
    const locked = ['submitted', 'rated'].includes(entry.status);
    const cfg = statusCfg(entry.status);

    function timerAction(action) {
        router.post(`/employee/ors/${entry.id}/timer`, { action }, {
            preserveScroll: true,
            onSuccess: () => router.reload({ only: ['calendarEntries', 'activeEntry', 'stats'] }),
        });
    }

    function saveField() {
        if (!locked) router.patch(`/employee/ors/${entry.id}`, { quantity, notes }, { preserveScroll: true });
    }

    function handleSubmit() {
        const e = {};
        if (!quantity.trim()) e.quantity = 'Quantity is required.';
        if (pendingFiles.length === 0 && entry.evidence_count === 0) e.evidence = 'At least one evidence file is required.';
        if (Object.keys(e).length) { setErrs(e); return; }
        setErrs({});
        setSubmitting(true);
        const data = new FormData();
        data.append('quantity', quantity);
        data.append('notes', notes);
        pendingFiles.forEach(f => data.append('evidence[]', f));
        router.post(`/employee/ors/${entry.id}/submit`, data, {
            forceFormData: true,
            onSuccess: () => onClose(true),
            onError: () => setSubmitting(false),
            onFinish: () => setSubmitting(false),
        });
    }

    return (
        <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
            <div style={s.modal}>
                {/* Header */}
                <div style={s.header}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                            <span style={{ ...s.badge, background: cfg.bg, color: cfg.color }}>
                                <i className={`bi ${cfg.icon}`} style={{ marginRight: '0.3rem' }} />{cfg.label}
                            </span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)' }}>{entry.work_date}</span>
                        </div>
                        <div style={s.headerTitle}>{entry.indicator_text}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)', marginTop: '0.2rem' }}>
                            <i className="bi bi-diagram-3" style={{ marginRight: '0.3rem' }} />{entry.output_title}
                            <span style={{ margin: '0 0.5rem', opacity: 0.4 }}>·</span>
                            <i className="bi bi-person" style={{ marginRight: '0.3rem' }} />{entry.supervisor_name}
                        </div>
                    </div>
                    <button style={s.closeBtn} onClick={() => onClose()}>✕</button>
                </div>

                {/* Body */}
                <div style={s.body}>
                    {/* Quantity + Duration */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div style={s.field}>
                            <div style={s.label}>QUANTITY</div>
                            <input style={{ ...s.input, opacity: locked ? 0.6 : 1, borderColor: errs.quantity ? '#ef4444' : undefined }} value={quantity}
                                onChange={e => { setQuantity(e.target.value); if (errs.quantity) setErrs(v => ({...v, quantity: null})); }}
                                onBlur={saveField}
                                disabled={locked} placeholder="e.g. 12 documents" />
                            {errs.quantity && <span style={s.errText}>{errs.quantity}</span>}
                        </div>
                        <div style={s.field}>
                            <div style={s.label}>TOTAL DURATION</div>
                            <div style={s.infoBox}>
                                <i className="bi bi-stopwatch" style={{ color: 'var(--admin-accent)' }} />
                                <LiveTimer entry={entry} />
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    <div style={s.field}>
                        <div style={s.label}>NOTES</div>
                        <textarea style={{ ...s.textarea, opacity: locked ? 0.6 : 1 }} rows={3}
                            value={notes} onChange={e => setNotes(e.target.value)}
                            onBlur={saveField} disabled={locked} placeholder="Task details or remarks…" />
                    </div>

                    {/* Evidence */}
                    <div style={s.field}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={s.label}>EVIDENCE & ATTACHMENTS</div>
                            <span style={{ fontSize: '0.68rem', color: 'var(--admin-text-muted)' }}>max 10 MB each</span>
                        </div>

                        {!locked && (
                            <>
                                <div style={{ ...s.uploadZone, borderColor: errs.evidence ? '#ef4444' : undefined }}
                                    onClick={() => { fileRef.current?.click(); if (errs.evidence) setErrs(v => ({...v, evidence: null})); }}
                                    onDragOver={e => e.preventDefault()}
                                    onDrop={e => { e.preventDefault(); setPendingFiles(p => [...p, ...e.dataTransfer.files]); setErrs(v => ({...v, evidence: null})); }}>
                                    <i className="bi bi-cloud-upload" style={{ fontSize: '1.6rem', color: 'var(--admin-accent)' }} />
                                    <span style={{ fontSize: '0.8rem', color: 'var(--admin-accent)', fontWeight: 600 }}>Click or drag & drop</span>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--admin-text-muted)' }}>PDF, PNG, JPG, DOC, XLSX</span>
                                </div>
                                <input ref={fileRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xlsx"
                                    style={{ display: 'none' }} onChange={e => { setPendingFiles(p => [...p, ...e.target.files]); setErrs(v => ({...v, evidence: null})); }} />
                                {errs.evidence && <span style={s.errText}>{errs.evidence}</span>}
                                {pendingFiles.length > 0 && pendingFiles.map((f, i) => (
                                    <div key={i} style={s.fileRow}>
                                        <i className="bi bi-file-earmark" style={{ color: 'var(--admin-accent)' }} />
                                        <span style={{ flex: 1, fontSize: '0.82rem', color: 'var(--admin-text-primary)' }}>{f.name}</span>
                                        <button style={s.btnDanger} onClick={() => setPendingFiles(p => p.filter((_, j) => j !== i))}>
                                            <i className="bi bi-trash3" />
                                        </button>
                                    </div>
                                ))}
                            </>
                        )}

                        {entry.evidences?.map(ev => (
                            <div key={ev.id} style={s.fileRow}>
                                <i className="bi bi-paperclip" style={{ color: 'var(--admin-accent)' }} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--admin-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.file_name}</div>
                                    <div style={{ fontSize: '0.68rem', color: 'var(--admin-text-muted)' }}>{ev.uploaded_at}</div>
                                </div>
                                <a href={ev.file_path} target="_blank" rel="noreferrer" style={s.btnGhost}><i className="bi bi-box-arrow-up-right" /></a>
                            </div>
                        ))}
                    </div>

                    {locked && (
                        <div style={s.lockNotice}>
                            <i className="bi bi-lock-fill" style={{ color: 'var(--admin-accent)', marginRight: '0.4rem' }} />
                            {entry.status === 'rated' ? 'Validated by supervisor.' : 'Submitted & locked — awaiting review.'}
                            {entry.submitted_at && <span style={{ marginLeft: '0.5rem', opacity: 0.6 }}>Submitted {new Date(entry.submitted_at).toLocaleDateString()}</span>}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={s.footer}>
                    {!locked ? (
                        <>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                {entry.status === 'draft' && <button style={s.btnGreen} onClick={() => timerAction('start')}><i className="bi bi-play-fill" style={{ marginRight: '0.3rem' }} />Start</button>}
                                {entry.status === 'recording' && <button style={s.btnPurple} onClick={() => timerAction('pause')}><i className="bi bi-pause-fill" style={{ marginRight: '0.3rem' }} />Pause</button>}
                                {entry.status === 'paused' && <button style={s.btnGreen} onClick={() => timerAction('resume')}><i className="bi bi-play-fill" style={{ marginRight: '0.3rem' }} />Resume</button>}
                                {['recording', 'paused'].includes(entry.status) && <button style={s.btnCancel} onClick={() => timerAction('stop')}><i className="bi bi-stop-fill" style={{ marginRight: '0.3rem' }} />Stop</button>}
                            </div>
                            <button style={s.btnSave} onClick={handleSubmit} disabled={submitting}>
                                <i className="bi bi-send-fill" style={{ marginRight: '0.4rem' }} />
                                {submitting ? 'Submitting…' : 'Submit for Review'}
                            </button>
                        </>
                    ) : (
                        <button style={s.btnCancel} onClick={() => onClose()}>Close</button>
                    )}
                </div>
            </div>
        </div>
    );
}

const s = {
    overlay:    { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' },
    modal:      { background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)', borderRadius: 'var(--admin-radius-lg)', width: '100%', maxWidth: 600, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: 'var(--admin-shadow)' },
    header:     { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--admin-border)' },
    headerTitle:{ fontWeight: 700, fontSize: '1rem', color: 'var(--admin-text-primary)', lineHeight: 1.4 },
    closeBtn:   { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-muted)', fontSize: '1.1rem', padding: '0.2rem', flexShrink: 0 },
    body:       { flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' },
    field:      { display: 'flex', flexDirection: 'column', gap: '0.4rem' },
    label:      { fontSize: '0.68rem', fontWeight: 700, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' },
    input:      { width: '100%', padding: '0.6rem 0.85rem', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--admin-border)', borderRadius: 8, color: 'var(--admin-text-primary)', fontSize: '0.9rem', outline: 'none', fontFamily: 'inherit' },
    textarea:   { width: '100%', padding: '0.6rem 0.85rem', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--admin-border)', borderRadius: 8, color: 'var(--admin-text-primary)', fontSize: '0.9rem', outline: 'none', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 },
    infoBox:    { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 0.85rem', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--admin-border)', borderRadius: 8 },
    badge:      { display: 'inline-flex', alignItems: 'center', padding: '0.2rem 0.6rem', borderRadius: 99, fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' },
    uploadZone: { border: '2px dashed var(--admin-border)', borderRadius: 8, padding: '1.25rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', textAlign: 'center' },
    errText:    { fontSize: '0.72rem', color: '#ef4444', marginTop: '0.2rem' },
    fileRow:    { display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--admin-border)', borderRadius: 8 },
    lockNotice: { padding: '0.7rem 0.85rem', background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 8, fontSize: '0.82rem', color: 'var(--admin-text-secondary)' },
    footer:     { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', padding: '1rem 1.5rem', borderTop: '1px solid var(--admin-border)' },
    btnSave:    { padding: '0.5rem 1.25rem', borderRadius: 8, border: 'none', background: 'var(--admin-accent)', color: '#fff', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 },
    btnCancel:  { padding: '0.5rem 1.25rem', borderRadius: 8, border: '1px solid var(--admin-border-strong)', background: 'transparent', color: 'var(--admin-text-primary)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 },
    btnGreen:   { padding: '0.45rem 1rem', borderRadius: 8, border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.12)', color: '#10b981', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 },
    btnPurple:  { padding: '0.45rem 1rem', borderRadius: 8, border: '1px solid rgba(139,92,246,0.3)', background: 'rgba(139,92,246,0.12)', color: '#8b5cf6', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 },
    btnGhost:   { padding: '0.25rem 0.5rem', borderRadius: 6, border: '1px solid var(--admin-border)', background: 'transparent', color: 'var(--admin-text-muted)', cursor: 'pointer', textDecoration: 'none', fontSize: '0.82rem' },
    btnDanger:  { padding: '0.25rem 0.5rem', borderRadius: 6, border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.1)', color: '#ef4444', cursor: 'pointer', fontSize: '0.82rem' },
};
