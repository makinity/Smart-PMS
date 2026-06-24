import { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';
import GuestLayout from '@/Layouts/GuestLayout';

const ERRORS = {
    404: {
        icon: 'bi-map',
        title: 'Page Not Found',
        message: "The page you're looking for doesn't exist or has been moved.",
        color: '#3b82f6',
        bg: 'rgba(59,130,246,0.1)',
    },
    403: {
        icon: 'bi-shield-lock',
        title: 'Access Denied',
        message: "You don't have permission to view this page.",
        color: '#f59e0b',
        bg: 'rgba(245,158,11,0.1)',
    },
    419: {
        icon: 'bi-clock-history',
        title: 'Session Expired',
        message: 'Your session has expired. Please refresh the page and try again.',
        color: '#8b5cf6',
        bg: 'rgba(139,92,246,0.1)',
    },
    429: {
        icon: 'bi-speedometer2',
        title: 'Too Many Requests',
        message: "You've made too many requests. Please wait a moment before trying again.",
        color: '#f97316',
        bg: 'rgba(249,115,22,0.1)',
    },
    500: {
        icon: 'bi-exclamation-triangle',
        title: 'Server Error',
        message: 'Something went wrong on our end. Please try again later.',
        color: '#ef4444',
        bg: 'rgba(239,68,68,0.1)',
    },
};

export default function Error({ status }) {
    const err = ERRORS[status] ?? ERRORS[500];
    const [darkMode, setDarkMode] = useState(() => (localStorage.getItem('theme') ?? 'light') === 'dark');

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
        localStorage.setItem('theme', darkMode ? 'dark' : 'light');
    }, [darkMode]);

    return (
        <GuestLayout>
            {/* Dark mode toggle */}
            <button
                onClick={() => setDarkMode(v => !v)}
                title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                style={{ position: 'fixed', top: '1rem', right: '1rem', zIndex: 100, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
                <div style={{ width: 48, height: 26, borderRadius: 13, background: darkMode ? 'var(--admin-accent)' : '#cbd5e1', position: 'relative', transition: 'background 0.2s', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)' }}>
                    <div style={{ position: 'absolute', top: 3, left: darkMode ? 25 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {darkMode
                            ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                            : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="6.34" y2="6.34"/><line x1="17.66" y1="17.66" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="6.34" y2="17.66"/><line x1="17.66" y1="6.34" x2="19.07" y2="4.93"/></svg>
                        }
                    </div>
                </div>
            </button>

            <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>

                {/* Card */}
                <div style={{ width: '100%', maxWidth: 460, background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)', borderRadius: 'var(--admin-radius)', boxShadow: 'var(--admin-shadow)', padding: '2.5rem 2rem', textAlign: 'center' }}>

                    {/* Icon badge */}
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 72, height: 72, borderRadius: '50%', background: err.bg, border: `1.5px solid ${err.color}33`, marginBottom: '1.5rem' }}>
                        <i className={`bi ${err.icon}`} style={{ fontSize: '2rem', color: err.color }} />
                    </div>

                    {/* Status code */}
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: err.color, marginBottom: '0.5rem' }}>
                        Error {status}
                    </div>

                    {/* Title */}
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--admin-text-primary)', letterSpacing: '-0.02em', marginBottom: '0.65rem' }}>
                        {err.title}
                    </h1>

                    {/* Message */}
                    <p style={{ fontSize: '0.9rem', color: 'var(--admin-text-muted)', lineHeight: 1.6, marginBottom: '2rem' }}>
                        {err.message}
                    </p>

                    {/* Divider */}
                    <div style={{ borderTop: '1px solid var(--admin-border)', marginBottom: '1.5rem' }} />

                    {/* Actions */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        {status === 419 ? (
                            <button onClick={() => window.location.reload()} style={primaryBtn(err.color)}>
                                <i className="bi bi-arrow-clockwise" style={{ marginRight: '0.4rem' }} />
                                Refresh Page
                            </button>
                        ) : (
                            <button onClick={() => router.visit('/')} style={primaryBtn(err.color)}>
                                <i className="bi bi-house" style={{ marginRight: '0.4rem' }} />
                                Go to Home
                            </button>
                        )}
                        <button onClick={() => window.history.back()} style={ghostBtn}>
                            <i className="bi bi-arrow-left" style={{ marginRight: '0.4rem' }} />
                            Go Back
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <p style={{ marginTop: '1.5rem', fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>
                    © {new Date().getFullYear()} Smart PMS
                </p>
            </div>
        </GuestLayout>
    );
}

const primaryBtn = (color) => ({
    width: '100%',
    padding: '0.65rem',
    fontSize: '0.88rem',
    fontWeight: 600,
    background: color,
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--admin-radius)',
    cursor: 'pointer',
    transition: 'opacity 0.15s',
});

const ghostBtn = {
    width: '100%',
    padding: '0.65rem',
    fontSize: '0.88rem',
    fontWeight: 500,
    background: 'transparent',
    color: 'var(--admin-text-secondary)',
    border: '1px solid var(--admin-border-strong)',
    borderRadius: 'var(--admin-radius)',
    cursor: 'pointer',
    transition: 'opacity 0.15s',
};
