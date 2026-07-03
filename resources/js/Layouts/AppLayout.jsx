import { useState, useEffect, useCallback, useRef } from 'react';
import { usePage, router } from '@inertiajs/react';
import Sidebar from '@/Components/Sidebar';
import Topbar from '@/Components/Topbar';
import { ToastProvider } from '@/Components/Snackbar';
import { ConfirmProvider } from '@/Components/ConfirmDialog';
import LoginLoadingScreen from '@/Components/LoginLoadingScreen';
import { useNotificationListener } from '@/Components/useNotificationListener';
import PageSkeleton from '@/Components/PageSkeletons';
import axios from 'axios';

const EVENT_ROUTE = {
    'uwp.returned':                          '/supervisor/uwp',
    'accomplishment.submitted_to_supervisor':'/supervisor/accomplishment',
    'ors.submitted_to_supervisor':           '/supervisor/ors-monitoring',
    'mpor.submitted_to_supervisor':          '/supervisor/mpor',
    'uwp.submitted':                         '/dept-head/uwp',
    'opcr.returned':                         '/dept-head/opcr',
    'accomplishment.supervisor_endorsed':    '/dept-head/accomplishment-review',
    'opcr.submitted':                        '/pmt/opcr-review',
    'accomplishment.dept_head_endorsed':     '/pmt/accomplishment-review',
    'qar.submitted_to_pmt':                  '/pmt/qar',
    'development_plan.submitted_to_ld':      '/pmt/performance-overview',
    'development_plan.submitted_to_ld_dh':   '/dept-head/idp',
    'mpor.approved':                         '/employee/mpor',
    'mpor.returned_to_employee':             '/employee/mpor',
    'accomplishment.returned_to_employee':   '/employee/accomplishment',
    'accomplishment.returned_by_dept_head':  '/employee/accomplishment',
    'opcr.approved':                         '/employee/ipcr-target',
    'ipcr.ready_for_commitment':             '/employee/ipcr-target',
    'ors.rated_by_supervisor':               '/employee/ors',
    'opcra.employee_rated':                  '/employee/accomplishment',
    'ipcr.final_score_ready':                '/employee/history',
    'development_plan.assigned_to_employee': '/employee/idp',
    'development_plan.submitted_to_supervisor': '/supervisor/idp',
    'development_plan.supervisor_recommended': '/employee/idp',
    'development_plan.returned_by_supervisor': '/employee/idp',
    'development_plan.submitted_to_dept_head': '/dept-head/idp',
    'development_plan.approved':               '/employee/idp',
    'development_plan.returned_by_dept_head':  '/employee/idp',
};

export default function AppLayout({ children, title, description }) {
    const page = usePage();
    const userId = page?.props?.auth?.user?.id;
    const [showLoader] = useState(() => !!page?.props?.flash?.just_logged_in);
    const [darkMode, setDarkMode] = useState(() => (localStorage.getItem('theme') ?? 'dark') === 'dark');
    const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sb-collapsed') === '1');
    const [mobileOpen, setMobileOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [navTarget, setNavTarget] = useState(null); // URL we're navigating TO
    const navStartAtRef = useRef(0);
    const navClearTimerRef = useRef(null);
    const suppressNextGetSkeletonUntilRef = useRef(0);
    const MIN_SKELETON_MS = 220;

    useEffect(() => {
        const offStart  = router.on('start',  (e) => {
            if (navClearTimerRef.current) {
                clearTimeout(navClearTimerRef.current);
                navClearTimerRef.current = null;
            }
            navStartAtRef.current = Date.now();
            const target = e.detail.visit.url.pathname;
            const method = String(e.detail.visit.method ?? 'get').toLowerCase();

            // Action submissions should not replace the current page with a full skeleton.
            if (method !== 'get') {
                suppressNextGetSkeletonUntilRef.current = Date.now() + 1000;
                setNavTarget(null);
                return;
            }

            // If a GET is the immediate redirect after an action submission, keep the
            // current page visible instead of flashing a page skeleton.
            if (Date.now() < suppressNextGetSkeletonUntilRef.current) {
                setNavTarget(null);
                return;
            }

            if (/^\/supervisor\/uwp\/\d+\/editor(?:[/?#]|$)/.test(target)) {
                setNavTarget(null);
                return;
            }
            if (target !== window.location.pathname) setNavTarget(target);
        });
        const offFinish = router.on('finish', () => {
            const elapsed = Date.now() - navStartAtRef.current;
            const remaining = Math.max(0, MIN_SKELETON_MS - elapsed);
            if (navClearTimerRef.current) clearTimeout(navClearTimerRef.current);
            navClearTimerRef.current = setTimeout(() => {
                requestAnimationFrame(() => setNavTarget(null));
                navClearTimerRef.current = null;
            }, remaining);
        });
        return () => {
            offStart();
            offFinish();
            if (navClearTimerRef.current) clearTimeout(navClearTimerRef.current);
        };
    }, []);

    const fetchNotifications = useCallback(async () => {
        try {
            const { data } = await axios.get('/api/notifications');
            setNotifications(data);
        } catch {}
    }, []);

    useEffect(() => { fetchNotifications(); }, []);
    useNotificationListener(userId, fetchNotifications);

    const markRouteRead = useCallback((href) => {
        const ids = notifications
            .filter(n => !n.is_read && EVENT_ROUTE[n.event] === href)
            .map(n => n.id);
        if (!ids.length) return;
        Promise.all(ids.map(id => axios.post(`/api/notifications/${id}/read`)))
            .then(() => setNotifications(prev => prev.map(n => ids.includes(n.id) ? { ...n, is_read: true } : n)));
    }, [notifications]);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
        localStorage.setItem('theme', darkMode ? 'dark' : 'light');
    }, [darkMode]);

    // Resize charts after sidebar transition
    useEffect(() => {
        const t = setTimeout(() => window.dispatchEvent(new Event('resize')), 220);
        return () => clearTimeout(t);
    }, [collapsed]);

    // Close mobile sidebar on viewport resize to desktop
    useEffect(() => {
        const h = () => { if (window.innerWidth >= 768) setMobileOpen(false); };
        window.addEventListener('resize', h);
        return () => window.removeEventListener('resize', h);
    }, []);

    const sidebarWidth = collapsed ? 68 : 280;

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            {showLoader && <LoginLoadingScreen />}
            {/* Mobile backdrop */}
            {mobileOpen && (
                <div
                    onClick={() => setMobileOpen(false)}
                    style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}
                />
            )}

            <Sidebar
                collapsed={collapsed}
                onToggle={() => setCollapsed(v => { const next = !v; localStorage.setItem('sb-collapsed', next ? '1' : '0'); return next; })}
                mobileOpen={mobileOpen}
                onMobileClose={() => setMobileOpen(false)}
                notifications={notifications}
                onLinkClick={markRouteRead}
            />

            {/* Main content — full width on mobile, offset by sidebar on desktop */}
            <div className="app-main" style={{ marginLeft: sidebarWidth, flex: 1, display: 'flex', flexDirection: 'column', transition: 'margin-left 0.2s ease', minWidth: 0 }}>
                <Topbar
                    title={title}
                    description={description}
                    darkMode={darkMode}
                    onToggleDarkMode={() => setDarkMode(v => !v)}
                    onMobileMenuToggle={() => setMobileOpen(v => !v)}
                    notifications={notifications}
                    onNotificationsChange={setNotifications}
                />
                <main className="admin-content">
                    {navTarget ? <PageSkeleton url={navTarget} /> : children}
                </main>
            </div>

            <style>{`
                :root[data-theme="dark"], :root {
                    --admin-bg-primary: #0a0f1a;
                    --admin-bg-secondary: #0f1724;
                    --admin-sidebar: rgba(7,16,25,0.98);
                    --admin-card: rgba(16,23,34,0.96);
                    --admin-border: rgba(140,171,214,0.12);
                    --admin-border-strong: rgba(59,130,246,0.22);
                    --admin-text-primary: #f4f8ff;
                    --admin-text-secondary: #a5b4cf;
                    --admin-text-muted: #6f83a6;
                    --admin-accent: #3b82f6;
                    --admin-radius: 12px;
                    --admin-radius-lg: 18px;
                    --admin-shadow: 0 18px 40px rgba(0,0,0,0.28);
                }
                :root[data-theme="light"] {
                    --admin-bg-primary: #f9f9fb;
                    --admin-bg-secondary: #f2f2f5;
                    --admin-sidebar: rgba(255,255,255,0.98);
                    --admin-card: rgba(255,255,255,0.96);
                    --admin-border: rgba(59,130,246,0.14);
                    --admin-border-strong: rgba(59,130,246,0.32);
                    --admin-text-primary: #0f172a;
                    --admin-text-secondary: #334155;
                    --admin-text-muted: #64748b;
                    --admin-accent: #2563eb;
                    --admin-shadow: 0 18px 40px rgba(0,0,0,0.08);
                }
                *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
                body {
                    font-family: 'Inter', system-ui, sans-serif;
                    color: var(--admin-text-primary);
                    min-height: 100vh;
                    background: var(--admin-bg-primary);
                }
                .admin-content { flex: 1; padding: 1rem 1.5rem; overflow: auto; }

                /* On mobile: sidebar is an overlay, main takes full width */
                @media (max-width: 767px) {
                    .app-main { margin-left: 0 !important; }
                    .admin-content { padding: 0.75rem 1rem; }
                }
            `}</style>
        </div>
    );
}
