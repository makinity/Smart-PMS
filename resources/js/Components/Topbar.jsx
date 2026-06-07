import { useState, useRef, useEffect } from 'react';
import { Link, usePage } from '@inertiajs/react';

export default function Topbar({ title, description, darkMode, onToggleDarkMode, onMobileMenuToggle }) {
    const { auth } = usePage().props;
    const user = auth?.user;
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) ?? '?';

    return (
        <header className="tb-root">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                {/* Hamburger — mobile only */}
                <button className="tb-hamburger" onClick={onMobileMenuToggle} title="Menu">
                    <i className="bi bi-list" style={{ fontSize: '1.3rem' }} />
                </button>
                <div style={{ minWidth: 0 }}>
                    <h1 className="tb-title">{title}</h1>

                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {/* Notification bell — placeholder, wired up later */}
                <button className="tb-notif-btn" title="Notifications">
                    <i className="bi bi-bell-fill" />
                </button>

            <div className="tb-user" ref={ref}>
                <button className="tb-pill" onClick={() => setOpen(v => !v)}>
                    <div className="tb-avatar">
                        {user?.avatar
                            ? <img src={user.avatar} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--admin-accent)' }}>{initials}</span>
                        }
                    </div>
                    <div className="tb-info">
                        <span className="tb-name">{user?.name ?? 'Guest'}</span>
                        <span className="tb-role">{user?.roles?.[0]?.replace('-', ' ') ?? 'Admin'}</span>
                    </div>
                    <i className="bi bi-chevron-down tb-chevron" />
                </button>

                {open && (
                    <div className="tb-dropdown">
                        {/* Dark mode toggle */}
                        <button className="tb-dd-item" onClick={onToggleDarkMode}>
                            <i className={`bi ${darkMode ? 'bi-sun-fill' : 'bi-moon-fill'}`} />
                            {darkMode ? 'Light Mode' : 'Dark Mode'}
                            <span className="tb-dd-badge">{darkMode ? 'ON' : 'OFF'}</span>
                        </button>
                        <div className="tb-dd-divider" />
                        <Link
                            href="/logout"
                            method="post"
                            as="button"
                            className="tb-dd-item tb-dd-logout"
                            onClick={() => setOpen(false)}
                        >
                            <i className="bi bi-box-arrow-right" />
                            Logout
                        </Link>
                    </div>
                )}
            </div>{/* tb-user */}
            </div>{/* right-side flex */}

            <style>{`
                .tb-root {
                    position: sticky;
                    top: 0;
                    z-index: 900;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 1rem 1.75rem;
                    background: rgba(10,15,26,0.88);
                    border-bottom: 1px solid var(--admin-border);
                    backdrop-filter: blur(16px);
                }

                :root[data-theme="light"] .tb-root {
                    background: var(--admin-sidebar);
                    border-bottom-color: rgba(59,130,246,0.14);
                }

                .tb-title {
                    font-size: 1.35rem;
                    font-weight: 700;
                    color: var(--admin-text-primary);
                    line-height: 1.3;
                }

                .tb-desc {
                    font-size: 0.88rem;
                    color: var(--admin-text-muted);
                    margin-top: 0.15rem;
                }

                .tb-notif-btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 38px;
                    height: 38px;
                    border-radius: 50%;
                    background: var(--admin-card);
                    border: 1px solid var(--admin-border);
                    cursor: pointer;
                    color: var(--admin-text-secondary);
                    font-size: 1rem;
                    transition: background 0.15s, color 0.15s;
                    flex-shrink: 0;
                }
                .tb-notif-btn:hover {
                    background: rgba(59,130,246,0.08);
                    color: var(--admin-accent);
                }

                .tb-user { position: relative; }

                .tb-pill {
                    display: flex;
                    align-items: center;
                    gap: 0.65rem;
                    background: var(--admin-card);
                    border: 1px solid var(--admin-border);
                    border-radius: 50px;
                    padding: 0.35rem 0.85rem 0.35rem 0.35rem;
                    cursor: pointer;
                    transition: border-color 0.15s;
                }

                .tb-pill:hover { border-color: var(--admin-border-strong); }

                .tb-avatar {
                    width: 38px;
                    height: 38px;
                    border-radius: 50%;
                    background: rgba(59,130,246,0.12);
                    border: 2px solid rgba(59,130,246,0.45);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    overflow: hidden;
                    flex-shrink: 0;
                }

                .tb-info {
                    display: flex;
                    flex-direction: column;
                    text-align: left;
                }

                .tb-name {
                    font-size: 0.875rem;
                    font-weight: 600;
                    color: var(--admin-text-primary);
                    line-height: 1.3;
                }

                .tb-role {
                    font-size: 0.72rem;
                    color: var(--admin-text-muted);
                    text-transform: capitalize;
                }

                .tb-chevron {
                    font-size: 0.75rem;
                    color: var(--admin-text-muted);
                }

                .tb-dropdown {
                    position: absolute;
                    top: calc(100% + 0.5rem);
                    right: 0;
                    min-width: 200px;
                    background: var(--admin-card);
                    border: 1px solid var(--admin-border);
                    border-radius: var(--admin-radius);
                    box-shadow: var(--admin-shadow);
                    overflow: hidden;
                    z-index: 1000;
                }

                .tb-dd-divider {
                    height: 1px;
                    background: var(--admin-border);
                }

                .tb-dd-item {
                    display: flex;
                    align-items: center;
                    gap: 0.65rem;
                    padding: 0.75rem 1rem;
                    font-size: 0.875rem;
                    color: var(--admin-text-secondary);
                    text-decoration: none;
                    background: none;
                    border: none;
                    width: 100%;
                    cursor: pointer;
                    font-family: inherit;
                    transition: background 0.12s;
                }

                .tb-dd-item:hover {
                    background: rgba(59,130,246,0.08);
                    color: var(--admin-text-primary);
                }

                .tb-dd-badge {
                    margin-left: auto;
                    font-size: 0.65rem;
                    font-weight: 700;
                    padding: 0.1rem 0.4rem;
                    border-radius: 4px;
                    background: rgba(59,130,246,0.15);
                    color: var(--admin-accent);
                    letter-spacing: 0.04em;
                }

                .tb-dd-logout { color: #f87171; }
                .tb-dd-logout:hover { background: rgba(239,68,68,0.1); color: #fca5a5; }

                .tb-hamburger {
                    display: none;
                    align-items: center;
                    justify-content: center;
                    background: none;
                    border: 1px solid var(--admin-border);
                    border-radius: 8px;
                    width: 36px;
                    height: 36px;
                    cursor: pointer;
                    color: var(--admin-text-secondary);
                    flex-shrink: 0;
                }
                .tb-hamburger:hover { background: rgba(59,130,246,0.08); color: var(--admin-accent); }

                @media (max-width: 767px) {
                    .tb-hamburger { display: flex; }
                    .tb-root { padding: 0.75rem 1rem; }
                    .tb-title { font-size: 1.1rem; }
                    .tb-info { display: none; }
                }
            `}</style>
        </header>
    );
}
