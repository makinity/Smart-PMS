import { useState, useEffect } from 'react';
import { usePage } from '@inertiajs/react';
import Sidebar from '@/Components/Sidebar';
import Topbar from '@/Components/Topbar';
import { ToastProvider } from '@/Components/Snackbar';
import { ConfirmProvider } from '@/Components/ConfirmDialog';
import LoginLoadingScreen from '@/Components/LoginLoadingScreen';

export default function AppLayout({ children, title, description }) {
    const page = usePage();
    const [showLoader] = useState(() => !!page?.props?.flash?.just_logged_in);
    const [darkMode, setDarkMode] = useState(() => (localStorage.getItem('theme') ?? 'dark') === 'dark');
    const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sb-collapsed') === '1');
    const [mobileOpen, setMobileOpen] = useState(false);

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
            />

            {/* Main content — full width on mobile, offset by sidebar on desktop */}
            <div className="app-main" style={{ marginLeft: sidebarWidth, flex: 1, display: 'flex', flexDirection: 'column', transition: 'margin-left 0.2s ease', minWidth: 0 }}>
                <Topbar
                    title={title}
                    description={description}
                    darkMode={darkMode}
                    onToggleDarkMode={() => setDarkMode(v => !v)}
                    onMobileMenuToggle={() => setMobileOpen(v => !v)}
                />
                <main className="admin-content">
                    {children}
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
