import { useEffect, useState } from 'react';
import GuestLayout from '@/Layouts/GuestLayout';

/**
 * PillarDisconnected
 *
 * Reusable error page shown when a user is enrolled in an HRMO pillar
 * (e.g. L&D, RSP, RnR) but that pillar's system is not yet connected
 * to PMS, so PMS cannot redirect them there automatically.
 *
 * Props (all passed from PillarDisconnectedController):
 *  - pillar        {string}  Pillar code:  'ld' | 'rsp' | 'rnr' | …
 *  - pillarName    {string}  Human-readable pillar name, e.g. "Learning & Development"
 *  - pillarLabel   {string}  Short label,  e.g. "L&D"
 *  - contactEmail  {string}  Optional admin / IT e-mail address
 */

// ----- Per-pillar visual config -----------------------------------------------
const PILLAR_CONFIG = {
    ld: {
        icon: 'bi-mortarboard',
        color: '#3b82f6',
        bg: 'rgba(59,130,246,0.10)',
        border: 'rgba(59,130,246,0.22)',
        defaultName: 'Learning & Development',
        defaultLabel: 'L&D',
        headline: 'Training Portal Unavailable',
        body: "Your account has been enrolled in the Learning & Development programme. However, the L\u0026D system is not yet connected to PMS, so we can't redirect you automatically.",
    },
    rsp: {
        icon: 'bi-people',
        color: '#10b981',
        bg: 'rgba(16,185,129,0.10)',
        border: 'rgba(16,185,129,0.22)',
        defaultName: 'Recruitment, Selection & Placement',
        defaultLabel: 'RSP',
        headline: 'RSP Portal Unavailable',
        body: "Your account is linked to the Recruitment, Selection & Placement system. However, the RSP system is not yet connected to PMS, so we can't redirect you automatically.",
    },
    rnr: {
        icon: 'bi-award',
        color: '#f59e0b',
        bg: 'rgba(245,158,11,0.10)',
        border: 'rgba(245,158,11,0.22)',
        defaultName: 'Rewards & Recognition',
        defaultLabel: 'RnR',
        headline: 'Rewards & Recognition Portal Unavailable',
        body: "Your account is linked to the Rewards & Recognition system. However, the RnR system is not yet connected to PMS, so we can't redirect you automatically.",
    },
};

const FALLBACK_CONFIG = {
    icon: 'bi-plug',
    color: '#6366f1',
    bg: 'rgba(99,102,241,0.10)',
    border: 'rgba(99,102,241,0.22)',
    defaultName: 'External Pillar',
    defaultLabel: 'Pillar',
    headline: 'Pillar Not Connected',
    body: "Your account is linked to an external HRMO pillar system that is not yet connected to PMS. Please contact your administrator.",
};

// ----- Component ---------------------------------------------------------------
export default function PillarDisconnected({
    pillar = 'ld',
    pillarName,
    pillarLabel,
    contactEmail,
}) {
    const cfg = PILLAR_CONFIG[pillar] ?? FALLBACK_CONFIG;

    const resolvedName  = pillarName  ?? cfg.defaultName;
    const resolvedLabel = pillarLabel ?? cfg.defaultLabel;

    const [darkMode, setDarkMode] = useState(
        () => (localStorage.getItem('theme') ?? 'light') === 'dark',
    );

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
        localStorage.setItem('theme', darkMode ? 'dark' : 'light');
    }, [darkMode]);

    return (
        <GuestLayout>
            {/* Dark-mode toggle — identical to Error.jsx */}
            <button
                onClick={() => setDarkMode(v => !v)}
                title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                style={{
                    position: 'fixed', top: '1rem', right: '1rem', zIndex: 100,
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                }}
            >
                <div style={{
                    width: 48, height: 26, borderRadius: 13,
                    background: darkMode ? 'var(--admin-accent)' : '#cbd5e1',
                    position: 'relative', transition: 'background 0.2s',
                    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)',
                }}>
                    <div style={{
                        position: 'absolute', top: 3,
                        left: darkMode ? 25 : 3,
                        width: 20, height: 20, borderRadius: '50%',
                        background: '#fff', transition: 'left 0.2s',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        {darkMode
                            ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                            : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="6.34" y2="6.34"/><line x1="17.66" y1="17.66" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="6.34" y2="17.66"/><line x1="17.66" y1="6.34" x2="19.07" y2="4.93"/></svg>
                        }
                    </div>
                </div>
            </button>

            <div style={{
                minHeight: '100vh',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                padding: '2rem 1rem',
            }}>
                {/* ── Card ────────────────────────────────────────────────────── */}
                <div style={{
                    width: '100%', maxWidth: 480,
                    background: 'var(--admin-card)',
                    border: '1px solid var(--admin-border-strong)',
                    borderRadius: 'var(--admin-radius)',
                    boxShadow: 'var(--admin-shadow)',
                    padding: '2.5rem 2rem',
                    textAlign: 'center',
                }}>

                    {/* Icon badge */}
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 72, height: 72, borderRadius: '50%',
                        background: cfg.bg,
                        border: `1.5px solid ${cfg.border}`,
                        marginBottom: '1.5rem',
                    }}>
                        <i className={`bi ${cfg.icon}`} style={{ fontSize: '2rem', color: cfg.color }} />
                    </div>

                    {/* Pillar label badge */}
                    <div style={{
                        fontSize: '0.72rem', fontWeight: 700,
                        letterSpacing: '0.12em', textTransform: 'uppercase',
                        color: cfg.color, marginBottom: '0.5rem',
                    }}>
                        {resolvedLabel} — Not Connected
                    </div>

                    {/* Headline */}
                    <h1 style={{
                        fontSize: '1.5rem', fontWeight: 700,
                        color: 'var(--admin-text-primary)',
                        letterSpacing: '-0.02em', marginBottom: '0.65rem',
                    }}>
                        {cfg.headline}
                    </h1>

                    {/* Body */}
                    <p style={{
                        fontSize: '0.9rem', color: 'var(--admin-text-muted)',
                        lineHeight: 1.6, marginBottom: '1.5rem',
                    }}>
                        {cfg.body}
                    </p>

                    {/* Info strip */}
                    <div style={{
                        background: cfg.bg,
                        border: `1px solid ${cfg.border}`,
                        borderRadius: 8, padding: '0.85rem 1rem',
                        marginBottom: '1.75rem', textAlign: 'left',
                        display: 'flex', gap: '0.65rem', alignItems: 'flex-start',
                    }}>
                        <i className="bi bi-info-circle-fill" style={{ color: cfg.color, marginTop: 2, flexShrink: 0 }} />
                        <span style={{ fontSize: '0.84rem', color: 'var(--admin-text-secondary)', lineHeight: 1.55 }}>
                            Please ask your <strong>System Administrator</strong> to connect the{' '}
                            <strong>{resolvedName}</strong> pillar in the{' '}
                            <span style={{ color: cfg.color, fontWeight: 600 }}>HRMO Hub</span> settings.
                            Once connected, you will be redirected automatically on your next login.
                        </span>
                    </div>

                    {/* Divider */}
                    <div style={{ borderTop: '1px solid var(--admin-border)', marginBottom: '1.5rem' }} />

                    {/* Actions */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        {/* Contact link — only shown when an e-mail address is provided */}
                        {contactEmail && (
                            <a
                                href={`mailto:${contactEmail}?subject=HRMO Hub — ${resolvedLabel} pillar not connected`}
                                style={primaryBtnStyle(cfg.color)}
                            >
                                <i className="bi bi-envelope" style={{ marginRight: '0.4rem' }} />
                                Contact Administrator
                            </a>
                        )}

                        {/* Back to login */}
                        <a href="/login" style={ghostBtnStyle}>
                            <i className="bi bi-arrow-left" style={{ marginRight: '0.4rem' }} />
                            Back to Login
                        </a>
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

// ----- Shared style helpers (mirror Error.jsx) ----------------------------------
const primaryBtnStyle = (color) => ({
    display: 'block',
    width: '100%',
    padding: '0.65rem',
    fontSize: '0.88rem',
    fontWeight: 600,
    background: color,
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--admin-radius)',
    cursor: 'pointer',
    textDecoration: 'none',
    textAlign: 'center',
    transition: 'opacity 0.15s',
});

const ghostBtnStyle = {
    display: 'block',
    width: '100%',
    padding: '0.65rem',
    fontSize: '0.88rem',
    fontWeight: 500,
    background: 'transparent',
    color: 'var(--admin-text-secondary)',
    border: '1px solid var(--admin-border-strong)',
    borderRadius: 'var(--admin-radius)',
    cursor: 'pointer',
    textDecoration: 'none',
    textAlign: 'center',
    transition: 'opacity 0.15s',
};
