import { useState, useEffect, useRef } from 'react';
import { router } from '@inertiajs/react';

function CustomSelect({ value, onChange, options, placeholder, disabled, error }) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const ref = useRef(null);
    const searchRef = useRef(null);
    const selected = options.find(o => String(o.value) === String(value));
    const filtered = search ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase())) : options;

    useEffect(() => {
        const handler = e => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setSearch(''); } };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    function handleOpen() {
        if (disabled) return;
        setOpen(v => !v);
        setSearch('');
        setTimeout(() => searchRef.current?.focus(), 0);
    }

    return (
        <div ref={ref} style={{ position: 'relative' }}>
            <button type="button"
                style={{ ...cs.trigger, opacity: disabled ? 0.5 : 1, cursor: disabled ? 'not-allowed' : 'pointer', borderColor: error ? '#f87171' : undefined }}
                onClick={handleOpen}>
                <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: selected ? 'var(--admin-text-primary)' : 'var(--admin-text-muted)' }}>
                    {selected ? selected.label : placeholder}
                </span>
                <i className={`bi bi-chevron-${open ? 'up' : 'down'}`} style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)', flexShrink: 0 }} />
            </button>
            {open && (
                <div style={cs.dropdown}>
                    <div style={cs.searchWrap}>
                        <i className="bi bi-search" style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)', flexShrink: 0 }} />
                        <input ref={searchRef} type="text" value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Search..." style={cs.searchInput} />
                    </div>
                    <div style={cs.list}>
                        {filtered.length === 0 && <div style={cs.empty}>No results</div>}
                        {filtered.map(o => (
                            <button key={o.value} type="button"
                                style={{ ...cs.option, background: String(o.value) === String(value) ? 'rgba(59,130,246,0.12)' : 'var(--admin-card)', color: String(o.value) === String(value) ? 'var(--admin-accent)' : 'var(--admin-text-primary)' }}
                                onMouseEnter={e => e.currentTarget.style.background = 'var(--admin-bg-secondary)'}
                                onMouseLeave={e => e.currentTarget.style.background = String(o.value) === String(value) ? 'rgba(59,130,246,0.12)' : 'var(--admin-card)'}
                                onClick={() => { onChange(o.value); setOpen(false); setSearch(''); }}>
                                {o.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

const cs = {
    trigger:     { width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 0.85rem', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--admin-border)', borderRadius: 8, fontSize: '0.9rem', outline: 'none' },
    dropdown:    { position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)', borderRadius: 8, boxShadow: 'var(--admin-shadow)', zIndex: 10, display: 'flex', flexDirection: 'column' },
    searchWrap:  { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--admin-border)', flexShrink: 0 },
    searchInput: { flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: '0.82rem', color: 'var(--admin-text-primary)', fontFamily: 'inherit' },
    list:        { maxHeight: 200, overflowY: 'auto' },
    option:      { width: '100%', display: 'block', padding: '0.6rem 0.85rem', textAlign: 'left', fontSize: '0.85rem', border: 'none', background: 'var(--admin-card)', cursor: 'pointer', lineHeight: 1.4, whiteSpace: 'normal', wordBreak: 'break-word' },
    empty:       { padding: '0.75rem 0.85rem', fontSize: '0.82rem', color: 'var(--admin-text-muted)', textAlign: 'center' },
};

function formatDate(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

export default function LogTaskModal({ date, orsOptions, supervisors, onClose }) {
    const [outputKey, setOutputKey] = useState('');
    const [ipcrItemId, setIpcrItemId] = useState('');
    const [supervisorId, setSupervisorId] = useState('');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState({});

    const group = orsOptions.find(g => g.output_key === outputKey);
    useEffect(() => setIpcrItemId(''), [outputKey]);

    function handleSubmit() {
        const errs = {};
        if (!outputKey) errs.output = 'Required';
        if (!ipcrItemId) errs.ipcr_item_id = 'Required';
        if (!supervisorId) errs.supervisor_id = 'Required';
        if (Object.keys(errs).length) { setErrors(errs); return; }
        setSubmitting(true);
        router.post('/employee/ors', {
            work_date: date,
            ipcr_item_id: parseInt(ipcrItemId),
            supervisor_id: parseInt(supervisorId),
            notes
        }, {
            preserveScroll: true,
            onSuccess: () => { setSubmitting(false); onClose(true); },
            onError: e => { setErrors(e); setSubmitting(false); },
        });
    }

    return (
        <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
            <div style={s.modal}>
                {/* Header */}
                <div style={s.header}>
                    <div>
                        <div style={s.headerSub}>DAILY ACTIVITY RECORD</div>
                        <div style={s.headerTitle}>Log New Task</div>
                    </div>
                    <button style={s.closeBtn} onClick={() => onClose()}>✕</button>
                </div>

                {/* Body */}
                <div style={s.body}>
                    {/* Work Date */}
                    <div style={s.field}>
                        <div style={s.label}>WORK DATE</div>
                        <div style={s.readonlyBox}>
                            <i className="bi bi-calendar3" style={{ color: 'var(--admin-accent)' }} />
                            <span>{formatDate(date)}</span>
                        </div>
                    </div>

                    {/* UWP Output */}
                    <div style={s.field}>
                        <div style={s.label}>UWP OUTPUT / MAJOR FINAL OUTPUT</div>
                        <CustomSelect
                            value={outputKey}
                            onChange={setOutputKey}
                            placeholder="— Select Major Output —"
                            options={orsOptions.map(g => ({ value: g.output_key, label: g.output_title }))}
                            error={!!errors.output}
                        />
                        {errors.output && <span style={s.errText}>{errors.output}</span>}
                    </div>

                    {/* Task */}
                    <div style={s.field}>
                        <div style={s.label}>TASK / ACTIVITY</div>
                        <CustomSelect
                            value={ipcrItemId}
                            onChange={setIpcrItemId}
                            disabled={!group}
                            placeholder="— Select Task based on Output —"
                            options={group?.indicators.map(ind => ({ value: ind.ipcr_item_id, label: ind.indicator_text })) ?? []}
                            error={!!errors.ipcr_item_id}
                        />
                        {errors.ipcr_item_id && <span style={s.errText}>{errors.ipcr_item_id}</span>}
                    </div>

                    {/* Supervisor */}
                    <div style={s.field}>
                        <div style={s.label}>SUPERVISOR</div>
                        <CustomSelect
                            value={supervisorId}
                            onChange={setSupervisorId}
                            placeholder="— Select Supervisor —"
                            options={supervisors.map(sup => ({ value: sup.id, label: sup.label }))}
                            error={!!errors.supervisor_id}
                        />
                        {errors.supervisor_id && <span style={s.errText}>{errors.supervisor_id}</span>}
                    </div>

                    {/* Notes */}
                    <div style={s.field}>
                        <div style={s.label}>NOTES <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></div>
                        <textarea style={s.textarea} rows={3} maxLength={1000}
                            placeholder="Enter specific details about the task..."
                            value={notes} onChange={e => setNotes(e.target.value)} />
                        <div style={{ textAlign: 'right', fontSize: '0.72rem', color: 'var(--admin-text-muted)' }}>{notes.length}/1000</div>
                    </div>
                </div>

                {/* Footer */}
                <div style={s.footer}>
                    {Object.keys(errors).some(k => !['output','ipcr_item_id','supervisor_id'].includes(k)) && (
                        <div style={{ fontSize: '0.75rem', color: '#f87171', flex: 1 }}>
                            {Object.entries(errors).filter(([k]) => !['output','ipcr_item_id','supervisor_id'].includes(k)).map(([k,v]) => <div key={k}>{v}</div>)}
                        </div>
                    )}
                    <button style={s.btnCancel} onClick={() => onClose()}>Cancel</button>
                    <button style={s.btnSave} onClick={handleSubmit} disabled={submitting}>
                        <i className="bi bi-play-fill" style={{ marginRight: '0.4rem' }} />
                        {submitting ? 'Starting…' : 'Start Timer'}
                    </button>
                </div>
            </div>
        </div>
    );
}

const s = {
    overlay:    { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' },
    modal:      { background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)', borderRadius: 'var(--admin-radius-lg)', width: '100%', maxWidth: 520, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: 'var(--admin-shadow)' },
    header:     { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--admin-border)' },
    headerSub:  { fontSize: '0.68rem', fontWeight: 700, color: 'var(--admin-accent)', letterSpacing: '0.1em', marginBottom: '0.25rem' },
    headerTitle:{ fontWeight: 700, fontSize: '1rem', color: 'var(--admin-text-primary)' },
    closeBtn:   { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-muted)', fontSize: '1.1rem', padding: '0.2rem' },
    body:       { flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' },
    field:      { display: 'flex', flexDirection: 'column', gap: '0.35rem' },
    label:      { fontSize: '0.68rem', fontWeight: 700, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' },
    readonlyBox:{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.85rem', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--admin-border)', borderRadius: 8, color: 'var(--admin-text-muted)', fontSize: '0.9rem' },
    select:     { width: '100%', padding: '0.6rem 2rem 0.6rem 0.85rem', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--admin-border)', borderRadius: 8, color: 'var(--admin-text-primary)', fontSize: '0.9rem', outline: 'none', appearance: 'none', cursor: 'pointer' },
    selectIcon: { position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--admin-text-muted)', fontSize: '0.72rem' },
    textarea:   { width: '100%', padding: '0.6rem 0.85rem', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--admin-border)', borderRadius: 8, color: 'var(--admin-text-primary)', fontSize: '0.9rem', outline: 'none', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 },
    errText:    { fontSize: '0.72rem', color: '#f87171' },
    footer:     { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderTop: '1px solid var(--admin-border)' },
    btnCancel:  { padding: '0.5rem 1.25rem', borderRadius: 8, border: '1px solid var(--admin-border-strong)', background: 'transparent', color: 'var(--admin-accent)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 },
    btnSave:    { padding: '0.5rem 1.25rem', borderRadius: 8, border: 'none', background: 'var(--admin-accent)', color: '#fff', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 },
};
