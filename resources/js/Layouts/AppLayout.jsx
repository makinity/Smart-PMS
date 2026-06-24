import { useState, useEffect, useCallback, useRef } from 'react';
import { usePage, router } from '@inertiajs/react';
import Sidebar from '@/Components/Sidebar';
import Topbar from '@/Components/Topbar';
import { ToastProvider } from '@/Components/Snackbar';
import { ConfirmProvider } from '@/Components/ConfirmDialog';
import LoginLoadingScreen from '@/Components/LoginLoadingScreen';
import { useNotificationListener } from '@/Components/useNotificationListener';
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

// ── Page skeleton map (keyed by URL prefix) ───────────────────────────────────
function PageSkeleton({ url }) {
    const sk = { background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)', borderRadius: 'var(--admin-radius)', padding: '1.25rem' };
    const sh = (h, w = '100%', r = 6) => (
        <div style={{ height: h, width: w, borderRadius: r, marginBottom: 8,
            background: 'linear-gradient(90deg,var(--admin-border) 25%,var(--admin-bg-secondary) 50%,var(--admin-border) 75%)',
            backgroundSize: '800px 100%', animation: 'sk-shimmer 1.4s infinite linear' }} />
    );

    // ORS — stat cards + calendar grid
    if (url.match(/\/ors$/)) return (
        <>
            <style>{`@keyframes sk-shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}`}</style>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.75rem', marginBottom: '0.75rem' }}>
                {[0,1,2,3].map(i => <div key={i} style={sk}>{sh(10,'50%')}{sh(28,'40%')}</div>)}
            </div>
            <div style={{ ...sk, marginBottom: '0.75rem' }}>{sh(18)}</div>
            <div style={sk}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>{sh(20,160)}{sh(32,110,8)}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '0.35rem' }}>
                    {Array.from({length:35}).map((_,i) => <div key={i} style={{ height:80, borderRadius:8, background:'var(--admin-border)', animation:'sk-shimmer 1.4s infinite linear', backgroundSize:'800px 100%', background:'linear-gradient(90deg,var(--admin-border) 25%,var(--admin-bg-secondary) 50%,var(--admin-border) 75%)' }} />)}
                </div>
            </div>
        </>
    );

    // UWP Index — table rows
    if (url.match(/\/uwp$/)) return (
        <>
            <style>{`@keyframes sk-shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}`}</style>
            <div style={sk}>
                {sh(20,'30%')}{sh(36,undefined,8)}
                <div style={{ display:'flex', gap:5, margin:'0.75rem 0' }}>{[0,1,2,3,4].map(i=><div key={i} style={{ width:72, height:28, borderRadius:99, background:'linear-gradient(90deg,var(--admin-border) 25%,var(--admin-bg-secondary) 50%,var(--admin-border) 75%)', backgroundSize:'800px 100%', animation:'sk-shimmer 1.4s infinite linear' }} />)}</div>
                {[0,1,2,3].map(i=>(
                    <div key={i} style={{ display:'flex', gap:'1rem', padding:'0.75rem 0', borderBottom:'1px solid var(--admin-border)', alignItems:'center' }}>
                        {sh(14,'20%')}{sh(14,'30%')}{sh(22,60,99)}{sh(12,'15%')}
                        <div style={{ marginLeft:'auto' }}>{sh(30,64,6)}</div>
                    </div>
                ))}
            </div>
        </>
    );

    // MPOR — header + table
    if (url.match(/\/mpor$/)) return (
        <>
            <style>{`@keyframes sk-shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}`}</style>
            <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
                <div style={sk}>{sh(28,'40%')}</div>
                <div style={sk}>
                    <div style={{ display:'flex', gap:'0.5rem', marginBottom:'1rem' }}>{[0,1,2].map(i=><div key={i} style={{ width:90, height:32, borderRadius:6, background:'linear-gradient(90deg,var(--admin-border) 25%,var(--admin-bg-secondary) 50%,var(--admin-border) 75%)', backgroundSize:'800px 100%', animation:'sk-shimmer 1.4s infinite linear' }} />)}</div>
                    {[0,1,2,3,4].map(i=>(
                        <div key={i} style={{ display:'flex', gap:'1rem', padding:'0.6rem 0', borderBottom:'1px solid var(--admin-border)' }}>
                            {sh(13,'35%')}{sh(13,'12%')}{sh(13,'12%')}{sh(13,'12%')}
                        </div>
                    ))}
                </div>
            </div>
        </>
    );

    // Team Tasks — card grid
    if (url.match(/\/team-tasks$/)) return (
        <>
            <style>{`@keyframes sk-shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}`}</style>
            <div style={sk}>
                {sh(20,'40%')}{sh(34,undefined,8)}
                <div style={{ display:'flex', gap:4, margin:'0.75rem 0' }}>{[0,1,2,3,4,5].map(i=><div key={i} style={{ width:72, height:28, borderRadius:99, background:'linear-gradient(90deg,var(--admin-border) 25%,var(--admin-bg-secondary) 50%,var(--admin-border) 75%)', backgroundSize:'800px 100%', animation:'sk-shimmer 1.4s infinite linear' }} />)}</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'0.75rem' }}>
                    {Array.from({length:8}).map((_,i)=>(
                        <div key={i} style={{ ...sk, padding:'1rem', display:'flex', flexDirection:'column', gap:'0.5rem' }}>
                            <div style={{ display:'flex', gap:'0.5rem', alignItems:'center' }}>{sh(28,28,28)}{sh(12,'50%')}</div>
                            {sh(12)}{sh(12,'80%')}
                        </div>
                    ))}
                </div>
            </div>
        </>
    );

    // ORS Monitoring — two-column
    if (url.match(/\/ors-monitoring$/)) return (
        <>
            <style>{`@keyframes sk-shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}`}</style>
            <div style={{ display:'grid', gridTemplateColumns:'380px 1fr', gap:'1rem', height:'calc(100vh - 120px)' }}>
                <div style={{ ...sk, display:'flex', flexDirection:'column', gap:'0.75rem' }}>
                    {sh(16,'60%')}{sh(34,undefined,8)}
                    <div style={{ display:'flex', gap:4 }}>{sh(30,undefined,8)}{sh(30,undefined,8)}</div>
                    {[0,1,2,3,4].map(i=>(
                        <div key={i} style={{ padding:'0.75rem', borderRadius:10, border:'1px solid var(--admin-border)', display:'flex', flexDirection:'column', gap:'0.5rem' }}>
                            <div style={{ display:'flex', gap:'0.5rem' }}>{sh(24,24,24)}{sh(13,'60%')}</div>
                            {sh(11)}{sh(11,'70%')}
                        </div>
                    ))}
                </div>
                <div style={{ ...sk, display:'flex', flexDirection:'column', gap:'1rem' }}>
                    {sh(18,'40%')}{sh(13,'70%')}{sh(120,undefined,10)}{sh(80,undefined,10)}
                </div>
            </div>
        </>
    );

    // Generic fallback — just a content placeholder
    return (
        <>
            <style>{`@keyframes sk-shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}`}</style>
            <div style={sk}>{sh(20,'40%')}{sh(14)}{sh(14,'80%')}{sh(14,'60%')}</div>
        </>
    );
}

export default function AppLayout({ children, title, description }) {
    const page = usePage();
    const userId = page?.props?.auth?.user?.id;
    const [showLoader] = useState(() => !!page?.props?.flash?.just_logged_in);
    const [darkMode, setDarkMode] = useState(() => (localStorage.getItem('theme') ?? 'dark') === 'dark');
    const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sb-collapsed') === '1');
    const [mobileOpen, setMobileOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [navTarget, setNavTarget] = useState(null); // URL we're navigating TO

    useEffect(() => {
        const offStart  = router.on('start',  (e) => setNavTarget(e.detail.visit.url.pathname));
        const offFinish = router.on('finish', ()  => setNavTarget(null));
        return () => { offStart(); offFinish(); };
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
                    --admin-bg-primary: #f0f4ff;
                    --admin-bg-secondary: #e8edf8;
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
                    background:
                        radial-gradient(circle at top left, rgba(59,130,246,0.12), transparent 26%),
                        linear-gradient(180deg, var(--admin-bg-primary) 0%, var(--admin-bg-secondary) 100%);
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
