import { useState } from 'react';
import axios from 'axios';
import { avatarSrc, onAvatarError } from '@/Components/defaultAvatar';

/**
 * Reusable ValidationModal
 *
 * Props:
 *   title       {string}   Modal heading
 *   description {string}   Body text explaining the issue
 *   items       {Array}    Optional list of rows. Each item:
 *     { name, sub, avatar, reason, notifyPayload? }
 *     notifyPayload: if present, shows a Notify button that POSTs to /api/notify/reminder
 *   onClose     {fn}       Called when user closes the modal
 */
export default function ValidationModal({ title, description, items = [], onClose, extra }) {
    const [notified, setNotified] = useState({});   // key: index → bool
    const [loading,  setLoading]  = useState({});

    async function handleNotify(idx, payload) {
        setLoading(p => ({ ...p, [idx]: true }));
        try {
            const { _url, ...body } = payload;
            await axios.post(_url ?? '/api/notify/reminder', body);
            setNotified(p => ({ ...p, [idx]: true }));
        } catch {
            // silently fail — notify is best-effort
        } finally {
            setLoading(p => ({ ...p, [idx]: false }));
        }
    }

    return (
        <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
            <div style={s.modal}>
                {/* Header */}
                <div style={s.header}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <div style={s.iconWrap}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round">
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                            </svg>
                        </div>
                        <span style={s.title}>{title}</span>
                    </div>
                    <button style={s.closeBtn} onClick={onClose}>✕</button>
                </div>

                {/* Body */}
                <div style={s.body}>
                    {description && <p style={s.desc}>{description}</p>}

                    {items.length > 0 && (
                        <div style={s.list}>
                            {items.map((item, idx) => (
                                <div key={idx} style={s.row}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 1, minWidth: 0 }}>
                                        {(item.avatar !== undefined) && (
                                            <img
                                                src={avatarSrc(item.avatar)}
                                                onError={onAvatarError}
                                                alt={item.name}
                                                style={s.avatar}
                                            />
                                        )}
                                        <div style={{ minWidth: 0 }}>
                                            {item.name && <div style={s.name}>{item.name}</div>}
                                            {item.sub  && <div style={s.sub}>{item.sub}</div>}
                                            {item.reason && <div style={s.reason}>{item.reason}</div>}
                                        </div>
                                    </div>
                                    {item.notifyPayload && (
                                        <button
                                            style={{ ...s.notifyBtn, ...(notified[idx] ? s.notifyDone : {}) }}
                                            disabled={notified[idx] || loading[idx]}
                                            onClick={() => handleNotify(idx, item.notifyPayload)}
                                        >
                                            {loading[idx] ? (
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'vm-spin 0.7s linear infinite' }}>
                                                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                                                </svg>
                                            ) : notified[idx] ? '✓ Notified' : (
                                                <>
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                                                    Notify
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={s.footer}>
                    {extra}
                    <button style={s.closeFullBtn} onClick={onClose}>Understood</button>
                </div>
            </div>
            <style>{`@keyframes vm-spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}

const s = {
    overlay:      { position: 'fixed', inset: 0, zIndex: 9500, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' },
    modal:        { background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)', borderRadius: 14, width: '100%', maxWidth: 480, maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' },
    header:       { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: '1px solid var(--admin-border)' },
    iconWrap:     { width: 32, height: 32, borderRadius: 8, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    title:        { fontWeight: 700, fontSize: '0.95rem', color: 'var(--admin-text-primary)' },
    closeBtn:     { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-muted)', fontSize: '1rem', flexShrink: 0, marginLeft: '0.5rem' },
    body:         { flex: 1, overflowY: 'auto', padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' },
    desc:         { fontSize: '0.85rem', color: 'var(--admin-text-secondary)', lineHeight: 1.6, margin: 0 },
    list:         { display: 'flex', flexDirection: 'column', gap: '0.4rem' },
    row:          { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0.85rem', borderRadius: 10, background: 'var(--admin-bg-secondary)', border: '1px solid var(--admin-border)' },
    avatar:       { width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 },
    name:         { fontSize: '0.85rem', fontWeight: 600, color: 'var(--admin-text-primary)' },
    sub:          { fontSize: '0.72rem', color: 'var(--admin-text-muted)', marginTop: 1 },
    reason:       { fontSize: '0.75rem', color: '#f59e0b', fontWeight: 500, marginTop: 2 },
    notifyBtn:    { display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0, padding: '0.3rem 0.75rem', borderRadius: 6, border: '1px solid rgba(59,130,246,0.35)', background: 'rgba(59,130,246,0.08)', color: 'var(--admin-accent)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' },
    notifyDone:   { border: '1px solid rgba(74,222,128,0.35)', background: 'rgba(74,222,128,0.08)', color: '#4ade80', cursor: 'default' },
    footer:       { padding: '0.85rem 1.25rem', borderTop: '1px solid var(--admin-border)', display: 'flex', justifyContent: 'flex-end' },
    closeFullBtn: { padding: '0.5rem 1.5rem', borderRadius: 8, border: '1px solid var(--admin-border-strong)', background: 'transparent', color: 'var(--admin-text-primary)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' },
};
