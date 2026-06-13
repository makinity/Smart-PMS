import { useState, useRef, useEffect } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import { avatarSrc, onAvatarError } from '@/Components/defaultAvatar';
import NotificationPanel from '@/Components/NotificationPanel';

// Build breadcrumb segments from description string like "Analytics / Performance"
// or fall back to just [title]
function Breadcrumb({ title, description }) {
    const segments = description
        ? description.split(/[\/\·>]+/).map(s => s.trim()).filter(Boolean)
        : [];

    return (
        <nav className="tb-breadcrumb" aria-label="breadcrumb">
            <Link href="/" className="tb-bc-item tb-bc-link">
                <i className="bi bi-house-door" style={{ fontSize: '0.72rem' }} />
                <span>Home</span>
            </Link>
            {segments.map((seg, i) => (
                <span key={i} className="tb-bc-item">
                    <i className="bi bi-chevron-right tb-bc-sep" />
                    <span className="tb-bc-link tb-bc-past">{seg}</span>
                </span>
            ))}
            <span className="tb-bc-item">
                <i className="bi bi-chevron-right tb-bc-sep" />
                <span className="tb-bc-current">{title}</span>
            </span>
        </nav>
    );
}

export default function Topbar({ title, description, darkMode, onToggleDarkMode, onMobileMenuToggle }) {
    const { auth } = usePage().props;
    const user = auth?.user;
    const [open, setOpen] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);

    const handleLogout = (e) => {
        e.preventDefault();
        setOpen(false);
        setLoggingOut(true);
        setTimeout(() => router.visit('/logout'), 1000);
    };
    const ref = useRef(null);

    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const userAvatar = avatarSrc(user?.avatar, user?.profile_photo_url);

    return (
        <>
        <header className="tb-root">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
                <button className="tb-hamburger" onClick={onMobileMenuToggle} title="Menu">
                    <i className="bi bi-list" style={{ fontSize: '1.1rem' }} />
                </button>
                <Breadcrumb title={title} description={description} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <NotificationPanel />

                <div className="tb-user" ref={ref}>
                    <button className="tb-pill" onClick={() => setOpen(v => !v)}>
                        <div className="tb-avatar">
                            <img src={userAvatar} alt={user?.name ?? 'User'} onError={onAvatarError} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <div className="tb-info">
                            <span className="tb-name">{user?.name ?? 'Guest'}</span>
                            <span className="tb-role">{user?.roles?.[0]?.replace('-', ' ') ?? 'Admin'}</span>
                        </div>
                        <i className="bi bi-chevron-down tb-chevron" />
                    </button>

                    {open && (
                        <div className="tb-dropdown">
                            <button className="tb-dd-item" onClick={onToggleDarkMode}>
                                <div style={{
                                    width: 36, height: 20, borderRadius: 10,
                                    background: darkMode ? 'var(--admin-accent)' : '#cbd5e1',
                                    position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                                    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)',
                                }}>
                                    <div style={{
                                        position: 'absolute', top: 2, left: darkMode ? 18 : 2,
                                        width: 16, height: 16, borderRadius: '50%',
                                        background: '#fff', transition: 'left 0.2s',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        {darkMode
                                            ? <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                                            : <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="6.34" y2="6.34"/><line x1="17.66" y1="17.66" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="6.34" y2="17.66"/><line x1="17.66" y1="6.34" x2="19.07" y2="4.93"/></svg>
                                        }
                                    </div>
                                </div>
                                {darkMode ? 'Light Mode' : 'Dark Mode'}
                            </button>
                            <div className="tb-dd-divider" />
                            <button className="tb-dd-item tb-dd-logout" onClick={handleLogout}>
                                <i className="bi bi-box-arrow-right" />
                                Logout
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                .tb-root {
                    position: sticky;
                    top: 0;
                    z-index: 900;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 0.45rem 1.25rem;
                    background: rgba(10,15,26,0.88);
                    border-bottom: 1px solid var(--admin-border);
                    backdrop-filter: blur(16px);
                    min-height: 44px;
                }
                :root[data-theme="light"] .tb-root {
                    background: var(--admin-sidebar);
                    border-bottom-color: rgba(59,130,246,0.14);
                }

                /* ── Breadcrumb ── */
                .tb-breadcrumb {
                    display: flex;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 0;
                    font-size: 0.78rem;
                    line-height: 1;
                }
                .tb-bc-item {
                    display: flex;
                    align-items: center;
                    gap: 3px;
                }
                .tb-bc-sep {
                    font-size: 0.58rem;
                    color: var(--admin-text-muted);
                    margin: 0 3px;
                }
                .tb-bc-link {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    color: var(--admin-text-muted);
                    text-decoration: none;
                    font-weight: 500;
                    transition: color 0.12s;
                    font-size: 0.78rem;
                }
                .tb-bc-link:hover { color: var(--admin-accent); }
                .tb-bc-past { color: var(--admin-text-muted); font-weight: 500; }
                .tb-bc-current {
                    color: var(--admin-text-primary);
                    font-weight: 700;
                    font-size: 0.8rem;
                }

                /* ── User pill ── */
                .tb-user { position: relative; }
                .tb-pill {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    background: var(--admin-card);
                    border: 1px solid var(--admin-border);
                    border-radius: 50px;
                    padding: 0.2rem 0.65rem 0.2rem 0.2rem;
                    cursor: pointer;
                    transition: border-color 0.15s;
                }
                .tb-pill:hover { border-color: var(--admin-border-strong); }
                .tb-avatar {
                    width: 28px;
                    height: 28px;
                    border-radius: 50%;
                    background: rgba(59,130,246,0.12);
                    border: 2px solid rgba(59,130,246,0.45);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    overflow: hidden;
                    flex-shrink: 0;
                }
                .tb-info { display: flex; flex-direction: column; text-align: left; }
                .tb-name { font-size: 0.78rem; font-weight: 600; color: var(--admin-text-primary); line-height: 1.3; }
                .tb-role { font-size: 0.65rem; color: var(--admin-text-muted); text-transform: capitalize; }
                .tb-chevron { font-size: 0.65rem; color: var(--admin-text-muted); }

                /* ── Dropdown ── */
                .tb-dropdown {
                    position: absolute;
                    top: calc(100% + 0.4rem);
                    right: 0;
                    min-width: 190px;
                    background: var(--admin-card);
                    border: 1px solid var(--admin-border);
                    border-radius: var(--admin-radius);
                    box-shadow: var(--admin-shadow);
                    overflow: hidden;
                    z-index: 1000;
                }
                .tb-dd-divider { height: 1px; background: var(--admin-border); }
                .tb-dd-item {
                    display: flex;
                    align-items: center;
                    gap: 0.6rem;
                    padding: 0.65rem 1rem;
                    font-size: 0.82rem;
                    color: var(--admin-text-secondary);
                    text-decoration: none;
                    background: none;
                    border: none;
                    width: 100%;
                    cursor: pointer;
                    font-family: inherit;
                    transition: background 0.12s;
                }
                .tb-dd-item:hover { background: rgba(59,130,246,0.08); color: var(--admin-text-primary); }
                .tb-dd-badge {
                    margin-left: auto;
                    font-size: 0.62rem;
                    font-weight: 700;
                    padding: 0.1rem 0.35rem;
                    border-radius: 4px;
                    background: rgba(59,130,246,0.15);
                    color: var(--admin-accent);
                }
                .tb-dd-logout { color: #f87171; }
                .tb-dd-logout:hover { background: rgba(239,68,68,0.1); color: #fca5a5; }
                @keyframes plsSlide{0%{transform:translateX(-100%)}50%{transform:translateX(200%)}100%{transform:translateX(200%)}}

                /* ── Hamburger ── */
                .tb-hamburger {
                    display: none;
                    align-items: center;
                    justify-content: center;
                    background: none;
                    border: 1px solid var(--admin-border);
                    border-radius: 7px;
                    width: 30px;
                    height: 30px;
                    cursor: pointer;
                    color: var(--admin-text-secondary);
                    flex-shrink: 0;
                }
                .tb-hamburger:hover { background: rgba(59,130,246,0.08); color: var(--admin-accent); }

                @media (max-width: 767px) {
                    .tb-hamburger { display: flex; }
                    .tb-root { padding: 0.4rem 0.85rem; }
                    .tb-info { display: none; }
                    .tb-bc-past { display: none; }
                    .tb-bc-sep { display: none; }
                }
            `}</style>
        </header>
        {loggingOut && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: darkMode ? '#0f1117' : '#f0f4f8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem', padding: '2.5rem 3rem', background: darkMode ? '#1a1d27' : '#ffffff', border: `1px solid ${darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`, borderRadius: 20, boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}>
                    <img src="/images/pms-logo.png" alt="Smart PMS" style={{ width: 64, height: 64, objectFit: 'contain', borderRadius: 14, marginBottom: 4 }} />
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: darkMode ? '#f1f5f9' : '#0f172a', letterSpacing: '-0.03em', lineHeight: 1 }}>Smart PMS</div>
                    <div style={{ fontSize: '0.82rem', color: darkMode ? 'rgba(241,245,249,0.45)' : 'rgba(15,23,42,0.45)', marginBottom: 8 }}>Signing out…</div>
                    <div style={{ width: 180, height: 4, borderRadius: 99, background: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: '45%', borderRadius: 99, background: 'linear-gradient(90deg,#3b82f6,#6366f1)', animation: 'plsSlide 1.1s ease-in-out infinite' }} />
                    </div>
                </div>
            </div>
        )}
        </>
    );
}
