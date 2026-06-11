import { Link, usePage } from '@inertiajs/react';
import { useState, useEffect } from 'react';

const roleLinks = {
    admin: [
        { href: '/administrator', label: 'Dashboard', icon: 'bi-grid-1x2-fill' },
        { href: '/administrator/users', label: 'Users', icon: 'bi-people-fill' },
        { href: '/administrator/offices', label: 'Offices', icon: 'bi-building-fill' },
        { href: '/administrator/reports', label: 'Reports', icon: 'bi-bar-chart-fill' },
        { href: '/administrator/hris-integration', label: 'HRIS Integration', icon: 'bi-plug-fill' },
        { href: '/administrator/database', label: 'Database', icon: 'bi-hdd-stack-fill' },
        { href: '/administrator/audit-logs', label: 'Audit Logs', icon: 'bi-journal-text' },
        { href: '/administrator/profile', label: 'Profile', icon: 'bi-person-badge-fill' },
    ],
    pmt: [
        { href: '/pmt', label: 'Dashboard', icon: 'bi-grid-1x2-fill' },
        { href: '/pmt/opcr-review', label: 'OPCR Review', icon: 'bi-clipboard-check-fill' },
        { href: '/pmt/qar', label: 'QAR', icon: 'bi-file-earmark-check-fill' },
        { href: '/pmt/development-planning', label: 'Development', icon: 'bi-graph-up-arrow' },
        { href: '/pmt/top-performers', label: 'Top Performers', icon: 'bi-trophy-fill' },
        { href: '/pmt/accomplishment-review', label: 'Accomplishment Review', icon: 'bi-award-fill' },
        { href: '/pmt/opcr-accomplishment', label: 'OPCR Accomplishment', icon: 'bi-building-check' },
        { href: '/pmt/profile', label: 'Profile', icon: 'bi-person-badge-fill' },
    ],
    'dept-head': [
        { href: '/dept-head', label: 'Dashboard', icon: 'bi-grid-1x2-fill' },
        { href: '/dept-head/opcr', label: 'OPCR', icon: 'bi-clipboard-check-fill' },
        { href: '/dept-head/qar', label: 'QAR', icon: 'bi-file-earmark-check-fill' },
        { href: '/dept-head/uwp', label: 'UWP', icon: 'bi-kanban-fill' },
        { href: '/dept-head/accomplishment-review', label: 'Accomplishment Review', icon: 'bi-award-fill' },
        { href: '/dept-head/opcr-accomplishment', label: 'OPCR Accomplishment', icon: 'bi-building-check' },
        { href: '/dept-head/profile', label: 'Profile', icon: 'bi-person-badge-fill' },
    ],
    supervisor: [
        { href: '/supervisor', label: 'Dashboard', icon: 'bi-grid-1x2-fill' },
        { href: '/supervisor/uwp', label: 'UWP', icon: 'bi-kanban-fill' },
        { href: '/supervisor/mpor', label: 'MPOR', icon: 'bi-file-text-fill' },
        { href: '/supervisor/accomplishment', label: 'Accomplishment', icon: 'bi-award-fill' },
        { href: '/supervisor/team-tasks', label: 'Team Tasks', icon: 'bi-people-fill' },
        { href: '/supervisor/ors-monitoring', label: 'ORS Monitoring', icon: 'bi-activity' },
        { href: '/supervisor/profile', label: 'Profile', icon: 'bi-person-badge-fill' },
    ],
    employee: [
        { href: '/employee', label: 'Dashboard', icon: 'bi-grid-1x2-fill' },
        { href: '/employee/ipcr-target', label: 'IPCR Target', icon: 'bi-bullseye' },
        { href: '/employee/accomplishment', label: 'Accomplishment', icon: 'bi-award-fill' },
        { href: '/employee/mpor', label: 'MPOR', icon: 'bi-file-text-fill' },
        { href: '/employee/my-tasks', label: 'My Tasks', icon: 'bi-check2-square' },
        { href: '/employee/ors', label: 'ORS', icon: 'bi-activity' },
        { href: '/employee/profile', label: 'Profile', icon: 'bi-person-badge-fill' },
    ],
};

const roleHeaders = {
    admin: { icon: 'bi-shield-lock-fill', label: 'Admin Portal' },
    pmt: { icon: 'bi-shield-check', label: 'PMT Portal' },
    'dept-head': { icon: 'bi-building-fill', label: 'Dept Head Portal' },
    supervisor: { icon: 'bi-people-fill', label: 'Supervisor Portal' },
    employee: { icon: 'bi-person-fill', label: 'Employee Portal' },
};

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }) {
    const { url, props } = usePage();
    const role = props.auth?.user?.roles?.[0] ?? 'employee';
    const links = roleLinks[role] ?? roleLinks.employee;
    const header = roleHeaders[role] ?? roleHeaders.employee;

    // On mobile the sidebar is always "expanded" (full labels) regardless of desktop collapsed state
    const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
    useEffect(() => {
        const h = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', h);
        return () => window.removeEventListener('resize', h);
    }, []);
    const showFull = !collapsed || isMobile;

    return (
        <aside className={`admin-sidebar${collapsed && !isMobile ? ' sb-collapsed' : ''}${mobileOpen ? ' sb-mobile-open' : ''}`}>
            {/* Brand + toggle */}
            <div className="sb-brand">
                <i className={`bi ${header.icon} sb-brand-icon`} />
                {showFull && (
                    <div className="sb-brand-text">
                        <div className="sb-app-name">Smart PMS</div>
                        <div className="sb-sub">{header.label}</div>
                    </div>
                )}
                {/* Desktop collapse toggle */}
                <button className="sb-toggle sb-desktop-only" onClick={onToggle} title={collapsed ? 'Expand' : 'Collapse'}>
                    <i className={`bi ${collapsed ? 'bi-chevron-right' : 'bi-chevron-left'}`} />
                </button>
                {/* Mobile close button */}
                <button className="sb-toggle sb-mobile-only" onClick={onMobileClose} title="Close">
                    <i className="bi bi-x-lg" />
                </button>
            </div>

            {/* Nav */}
            <nav className="sb-nav">
                {links.map(({ href, label, icon }) => {
                    const isRoot = links[0].href === href;
                    const active = isRoot ? url === href || url.startsWith(href + '?') : url === href || url.startsWith(href + '/') || url.startsWith(href + '?');
                    return (
                        <Link
                            key={href}
                            href={href}
                            className={`sb-link${active ? ' sb-link-active' : ''}`}
                            title={collapsed && !isMobile ? label : undefined}
                            onClick={isMobile ? onMobileClose : undefined}
                        >
                            <i className={`bi ${icon} sb-link-icon`} />
                            {showFull && <span>{label}</span>}
                        </Link>
                    );
                })}
            </nav>

            <style>{`
                .admin-sidebar {
                    position: fixed;
                    top: 0; left: 0; bottom: 0;
                    width: 280px;
                    padding: 1.5rem 1rem;
                    background: linear-gradient(180deg, var(--admin-sidebar), rgba(8,14,22,0.98));
                    border-right: 1px solid var(--admin-border);
                    backdrop-filter: blur(16px);
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                    overflow-y: auto;
                    overflow-x: hidden;
                    z-index: 1000;
                    transition: width 0.2s ease, padding 0.2s ease;
                }

                .admin-sidebar.sb-collapsed {
                    width: 68px;
                    padding: 1.5rem 0.5rem;
                }

                :root[data-theme="light"] .admin-sidebar {
                    background: linear-gradient(180deg, var(--admin-sidebar), rgba(240,244,255,0.98));
                }

                .sb-brand {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 0.25rem 0.25rem 1rem;
                    border-bottom: 1px solid var(--admin-border);
                    flex-shrink: 0;
                    min-width: 0;
                }

                .sb-collapsed .sb-brand {
                    flex-direction: column;
                    gap: 0.5rem;
                    padding: 0.25rem 0 1rem;
                    align-items: center;
                }

                .sb-brand-icon {
                    font-size: 1.75rem;
                    color: var(--admin-accent);
                    flex-shrink: 0;
                }

                .sb-brand-text { min-width: 0; flex: 1; }

                .sb-app-name {
                    font-weight: 700;
                    font-size: 1rem;
                    color: var(--admin-text-primary);
                    line-height: 1.3;
                    white-space: nowrap;
                }

                .sb-sub {
                    font-size: 0.72rem;
                    color: var(--admin-text-muted);
                    white-space: nowrap;
                }

                .sb-toggle {
                    margin-left: auto;
                    background: rgba(59,130,246,0.08);
                    border: 1px solid var(--admin-border);
                    border-radius: 8px;
                    width: 28px;
                    height: 28px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    color: var(--admin-text-muted);
                    flex-shrink: 0;
                    transition: background 0.15s, color 0.15s;
                }

                .sb-collapsed .sb-toggle {
                    margin-left: 0;
                }

                .sb-toggle:hover {
                    background: rgba(59,130,246,0.18);
                    color: var(--admin-accent);
                }

                .sb-nav {
                    display: flex;
                    flex-direction: column;
                    gap: 0.15rem;
                    flex: 1;
                }

                .sb-link {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 0.8rem 0.95rem;
                    border-radius: 12px;
                    color: var(--admin-text-secondary);
                    text-decoration: none;
                    font-size: 0.875rem;
                    font-weight: 500;
                    border: 1px solid transparent;
                    transition: background 0.15s, color 0.15s;
                    white-space: nowrap;
                    overflow: hidden;
                }

                .sb-collapsed .sb-link {
                    padding: 0.8rem;
                    justify-content: center;
                    gap: 0;
                }

                .sb-link:hover {
                    background: rgba(59,130,246,0.08);
                    color: var(--admin-text-primary);
                }

                .sb-link-active {
                    background: rgba(59,130,246,0.12);
                    border-color: rgba(59,130,246,0.22);
                    color: var(--admin-accent);
                }

                .sb-link-icon {
                    font-size: 1.1rem;
                    width: 1.25rem;
                    text-align: center;
                    flex-shrink: 0;
                }

                .admin-sidebar::-webkit-scrollbar { width: 4px; }
                .admin-sidebar::-webkit-scrollbar-track { background: transparent; }
                .admin-sidebar::-webkit-scrollbar-thumb { background: var(--admin-border); border-radius: 4px; }

                /* Mobile: always show full sidebar (never collapsed), hidden off-screen */
                @media (max-width: 767px) {
                    .admin-sidebar {
                        transform: translateX(-100%);
                        transition: transform 0.22s ease;
                        z-index: 1000;
                        width: 280px !important;
                        padding: 1.5rem 1rem !important;
                    }
                    .admin-sidebar.sb-mobile-open {
                        transform: translateX(0);
                    }
                    /* Force full labels visible regardless of collapsed state */
                    .admin-sidebar .sb-brand-text,
                    .admin-sidebar .sb-link span { display: block !important; }
                    .admin-sidebar .sb-link { padding: 0.8rem 0.95rem !important; justify-content: flex-start !important; gap: 0.75rem !important; }
                    .admin-sidebar .sb-brand { flex-direction: row !important; gap: 0.75rem !important; align-items: center !important; }
                    .sb-desktop-only { display: none !important; }
                }
                @media (min-width: 768px) {
                    .sb-mobile-only { display: none !important; }
                }
            `}</style>
        </aside>
    );
}
