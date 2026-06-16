import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

/* ── type → colour map (background + unread dot) ── */
const TYPE_CFG = {
    alert:   { bg: 'np-icon-alert',   dot: 'np-dot-alert'   },
    success: { bg: 'np-icon-success', dot: 'np-dot-success' },
    info:    { bg: 'np-icon-info',    dot: 'np-dot-info'    },
};

/* ── operation (event domain) → icon ── */
const DOMAIN_ICON = {
    uwp:              'bi bi-file-earmark-text-fill',
    opcr:             'bi bi-clipboard-data-fill',
    opcra:            'bi bi-clipboard-data-fill',
    ipcr:             'bi bi-person-vcard-fill',
    mpor:             'bi bi-calendar-check-fill',
    ors:              'bi bi-list-check',
    qar:              'bi bi-patch-check-fill',
    accomplishment:   'bi bi-trophy-fill',
    development_plan: 'bi bi-mortarboard-fill',
};

/* ── action verb → icon (overrides domain for clear outcomes) ── */
const ACTION_ICON = {
    approved:           'bi bi-check-circle-fill',
    pmt_approved:       'bi bi-check-circle-fill',
    ready_for_commitment:'bi bi-check-circle-fill',
    final_score_ready:  'bi bi-award-fill',
    returned:           'bi bi-arrow-counterclockwise',
    returned_to_employee:'bi bi-arrow-counterclockwise',
    returned_by_dept_head:'bi bi-arrow-counterclockwise',
    pmt_returned:       'bi bi-arrow-counterclockwise',
};

function iconForEvent(event) {
    if (!event) return 'bi bi-bell-fill';
    const [domain, ...rest] = event.split('.');
    const action = rest.join('.');
    return ACTION_ICON[action] ?? DOMAIN_ICON[domain] ?? 'bi bi-bell-fill';
}

function cfg(item) {
    const colour = TYPE_CFG[item.type] ?? TYPE_CFG.info;
    return { ...colour, icon: iconForEvent(item.event) };
}

export default function NotificationPanel({ notifications: items = [], onNotificationsChange }) {
    const [open, setOpen]   = useState(false);
    const panelRef          = useRef(null);

    const setItems = onNotificationsChange;

    /* ── close on outside click ── */
    useEffect(() => {
        const handler = (e) => {
            if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    /* ── close on Escape ── */
    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, []);

    /* ── mark all read ── */
    const markAllRead = async () => {
        await axios.post('/api/notifications/read-all');
        setItems(prev => prev.map(n => ({ ...n, is_read: true })));
    };

    /* ── mark single read + navigate ── */
    const handleItemClick = async (item) => {
        if (!item.is_read) {
            await axios.post(`/api/notifications/${item.id}/read`);
            setItems(prev => prev.map(n => n.id === item.id ? { ...n, is_read: true } : n));
        }
        if (item.url) {
            setOpen(false);
            try {
                const path = new URL(item.url).pathname + new URL(item.url).search;
                window.location.href = path;
            } catch {
                window.location.href = item.url;
            }
        }
    };

    const unread = items.filter(n => !n.is_read).length;

    return (
        <div className="np-wrap" ref={panelRef}>
            {/* ── Bell button ── */}
            <button
                className="np-bell"
                onClick={() => setOpen(v => !v)}
                title="Notifications"
                aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ''}`}
            >
                <i className="bi bi-bell-fill" />
                {unread > 0 && (
                    <span className="np-badge" aria-hidden="true">
                        {unread > 9 ? '9+' : unread}
                    </span>
                )}
            </button>

            {/* ── Dropdown panel ── */}
            {open && (
                <div className="np-panel" role="dialog" aria-label="Notifications">
                    {/* header */}
                    <div className="np-header">
                        <span className="np-header-title">
                            Notifications
                            {unread > 0 && <span className="np-header-count">{unread}</span>}
                        </span>
                        {unread > 0 && (
                            <button className="np-mark-all" onClick={markAllRead}>
                                Mark all read
                            </button>
                        )}
                    </div>

                    {/* list */}
                    <div className="np-list">
                        {items.length === 0 ? (
                            <div className="np-empty">
                                <i className="bi bi-bell-slash np-empty-icon" />
                                <span>You're all caught up.</span>
                            </div>
                        ) : (
                            items.map(item => {
                                const { icon, bg, dot } = cfg(item);
                                const Tag = item.url ? 'a' : 'button';
                                return (
                                    <Tag
                                        key={item.id}
                                        className={`np-item${item.is_read ? '' : ' np-item-unread'}`}
                                        onClick={() => handleItemClick(item)}
                                        href={item.url ?? undefined}
                                    >
                                        <span className={`np-icon-wrap ${bg}`}>
                                            <i className={icon} />
                                        </span>
                                        <span className="np-item-body">
                                            <span className="np-item-title">{item.title}</span>
                                            {item.body && (
                                                <span className="np-item-sub">{item.body}</span>
                                            )}
                                            <span className="np-item-time">{item.time}</span>
                                        </span>
                                        {!item.is_read && (
                                            <span className={`np-unread-dot ${dot}`} aria-hidden="true" />
                                        )}
                                    </Tag>
                                );
                            })
                        )}
                    </div>

                    {/* footer */}
                    {items.length > 0 && (
                        <div className="np-footer">
                            <span className="np-footer-hint">Showing last {items.length} notifications</span>
                        </div>
                    )}
                </div>
            )}

            <style>{`
                /* ── wrapper ── */
                .np-wrap { position: relative; }

                /* ── bell: self-contained button ── */
                .np-bell {
                    position: relative;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 30px;
                    height: 30px;
                    border-radius: 50%;
                    background: var(--admin-card);
                    border: 1px solid var(--admin-border);
                    cursor: pointer;
                    color: var(--admin-text-secondary);
                    font-size: 0.85rem;
                    transition: background 0.15s, color 0.15s;
                    flex-shrink: 0;
                }
                .np-bell:hover { background: rgba(59,130,246,0.08); color: var(--admin-accent); }

                .np-badge {
                    position: absolute;
                    top: -2px;
                    right: -2px;
                    min-width: 15px;
                    height: 15px;
                    padding: 0 3px;
                    border-radius: 8px;
                    background: #f43f5e;
                    color: #fff;
                    font-size: 0.58rem;
                    font-weight: 700;
                    line-height: 15px;
                    text-align: center;
                    pointer-events: none;
                    border: 2px solid var(--admin-bg-primary);
                }

                /* ── panel ── */
                .np-panel {
                    position: absolute;
                    top: calc(100% + 0.5rem);
                    right: 0;
                    width: 340px;
                    max-width: calc(100vw - 2rem);
                    background: var(--admin-card);
                    border: 1px solid var(--admin-border);
                    border-radius: var(--admin-radius);
                    box-shadow: var(--admin-shadow);
                    z-index: 1100;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                }

                /* ── header ── */
                .np-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 0.875rem 1rem;
                    border-bottom: 1px solid var(--admin-border);
                    flex-shrink: 0;
                }
                .np-header-title {
                    font-size: 0.875rem;
                    font-weight: 700;
                    color: var(--admin-text-primary);
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                .np-header-count {
                    font-size: 0.65rem;
                    font-weight: 700;
                    padding: 0.1rem 0.45rem;
                    border-radius: 99px;
                    background: rgba(244,63,94,0.15);
                    color: #f43f5e;
                    letter-spacing: 0.03em;
                }
                .np-mark-all {
                    font-size: 0.72rem;
                    font-weight: 600;
                    color: var(--admin-accent);
                    background: none;
                    border: none;
                    cursor: pointer;
                    font-family: inherit;
                    padding: 0;
                    opacity: 0.85;
                    transition: opacity 0.12s;
                }
                .np-mark-all:hover { opacity: 1; }

                /* ── list ── */
                .np-list {
                    overflow-y: auto;
                    max-height: 360px;
                    flex: 1;
                }

                /* ── empty ── */
                .np-empty {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 2.5rem 1rem;
                    color: var(--admin-text-muted);
                    font-size: 0.875rem;
                }
                .np-empty-icon {
                    font-size: 1.5rem;
                    opacity: 0.5;
                }

                /* ── notification item ── */
                .np-item {
                    display: flex;
                    align-items: flex-start;
                    gap: 0.75rem;
                    padding: 0.75rem 1rem;
                    text-decoration: none;
                    color: inherit;
                    background: none;
                    border: none;
                    border-bottom: 1px solid var(--admin-border);
                    width: 100%;
                    text-align: left;
                    cursor: pointer;
                    font-family: inherit;
                    transition: background 0.12s;
                }
                .np-item:last-child { border-bottom: none; }
                .np-item:hover { background: rgba(59,130,246,0.06); }
                .np-item-unread { background: rgba(59,130,246,0.04); }
                :root[data-theme="light"] .np-item-unread { background: rgba(37,99,235,0.04); }

                /* ── icon wrap ── */
                .np-icon-wrap {
                    flex-shrink: 0;
                    width: 34px;
                    height: 34px;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.875rem;
                    margin-top: 1px;
                }
                .np-icon-alert   { background: rgba(244,63,94,0.12);  color: #fda4af; }
                .np-icon-success { background: rgba(16,185,129,0.12); color: #6ee7b7; }
                .np-icon-info    { background: rgba(14,165,233,0.12); color: #7dd3fc; }

                :root[data-theme="light"] .np-icon-alert   { background: rgba(244,63,94,0.1);  color: #e11d48; }
                :root[data-theme="light"] .np-icon-success { background: rgba(16,185,129,0.1); color: #059669; }
                :root[data-theme="light"] .np-icon-info    { background: rgba(14,165,233,0.1); color: #0284c7; }

                /* ── item text ── */
                .np-item-body {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 0.15rem;
                    min-width: 0;
                }
                .np-item-title {
                    font-size: 0.825rem;
                    font-weight: 600;
                    color: var(--admin-text-primary);
                    line-height: 1.35;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .np-item-sub {
                    font-size: 0.76rem;
                    color: var(--admin-text-secondary);
                    line-height: 1.4;
                    overflow: hidden;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                }
                .np-item-time {
                    font-size: 0.7rem;
                    color: var(--admin-text-muted);
                    margin-top: 0.1rem;
                }

                /* ── unread dot ── */
                .np-unread-dot {
                    flex-shrink: 0;
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    margin-top: 6px;
                }
                .np-dot-alert   { background: #f43f5e; }
                .np-dot-success { background: #10b981; }
                .np-dot-info    { background: #0ea5e9; }

                /* ── footer ── */
                .np-footer {
                    padding: 0.6rem 1rem;
                    border-top: 1px solid var(--admin-border);
                    flex-shrink: 0;
                }
                .np-footer-hint {
                    font-size: 0.7rem;
                    color: var(--admin-text-muted);
                }

                /* ── mobile: full width panel ── */
                @media (max-width: 480px) {
                    .np-panel {
                        position: fixed;
                        top: 60px;
                        left: 0.75rem;
                        right: 0.75rem;
                        width: auto;
                    }
                }
            `}</style>
        </div>
    );
}
