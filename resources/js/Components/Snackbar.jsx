import { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react';

// ── Context ───────────────────────────────────────────────────────────────────
const ToastCtx = createContext(null);

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const counter = useRef(0);

    const toast = useCallback((message, type = 'info', duration = 3500) => {
        const id = ++counter.current;
        setToasts(t => [...t, { id, message, type, duration }]);
    }, []);

    const dismiss = useCallback((id) => {
        setToasts(t => t.filter(x => x.id !== id));
    }, []);

    return (
        <ToastCtx.Provider value={toast}>
            {children}
            <ToastContainer toasts={toasts} onDismiss={dismiss} />
        </ToastCtx.Provider>
    );
}

export function useToast() {
    return useContext(ToastCtx);
}

// ── Type config ───────────────────────────────────────────────────────────────
const TYPE_CONFIG = {
    success:  { accent: '#16a34a', iconBg: '#dcfce7', iconColor: '#15803d', icon: <SuccessIcon />,  glow: 'rgba(22,163,74,0.18)'   },
    error:    { accent: '#dc2626', iconBg: '#fee2e2', iconColor: '#b91c1c', icon: <ErrorIcon />,    glow: 'rgba(220,38,38,0.18)'   },
    warning:  { accent: '#d97706', iconBg: '#fef3c7', iconColor: '#b45309', icon: <WarningIcon />,  glow: 'rgba(217,119,6,0.18)'   },
    info:     { accent: '#2563eb', iconBg: '#dbeafe', iconColor: '#1d4ed8', icon: <InfoIcon />,     glow: 'rgba(37,99,235,0.18)'   },
    approved: { accent: '#059669', iconBg: '#d1fae5', iconColor: '#047857', icon: <SuccessIcon />,  glow: 'rgba(5,150,105,0.18)'   },
    rejected: { accent: '#ef4444', iconBg: '#fee2e2', iconColor: '#dc2626', icon: <ErrorIcon />,    glow: 'rgba(239,68,68,0.18)'   },
    draft:    { accent: '#64748b', iconBg: '#f1f5f9', iconColor: '#475569', icon: <DraftIcon />,    glow: 'rgba(100,116,139,0.18)' },
    submitted:{ accent: '#2563eb', iconBg: '#dbeafe', iconColor: '#1d4ed8', icon: <SubmitIcon />,   glow: 'rgba(37,99,235,0.18)'   },
};

// ── SVG Icons ─────────────────────────────────────────────────────────────────
function SuccessIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
        </svg>
    );
}
function ErrorIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
    );
}
function WarningIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
    );
}
function InfoIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
    );
}
function DraftIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
        </svg>
    );
}
function SubmitIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
        </svg>
    );
}

// ── Container ─────────────────────────────────────────────────────────────────
function ToastContainer({ toasts, onDismiss }) {
    return (
        <div style={{
            position: 'fixed',
            top: '1.25rem',
            right: '1.25rem',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            pointerEvents: 'none',
            alignItems: 'flex-end',
        }}>
            {toasts.map(t => (
                <Toast key={t.id} toast={t} onDismiss={onDismiss} />
            ))}
        </div>
    );
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ toast, onDismiss }) {
    const { id, message, type, duration } = toast;
    const cfg = TYPE_CONFIG[type] ?? TYPE_CONFIG.info;

    // enter/exit state
    const [phase, setPhase] = useState('entering'); // entering | visible | exiting

    // hover pause state for progress bar
    const [paused, setPaused] = useState(false);

    // track elapsed time for auto-dismiss when paused
    const timerRef = useRef(null);
    const remainingRef = useRef(duration);
    const startedAtRef = useRef(null);

    const scheduleExit = useCallback(() => {
        setPhase('exiting');
        setTimeout(() => onDismiss(id), 320);
    }, [id, onDismiss]);

    const startTimer = useCallback((remaining) => {
        startedAtRef.current = performance.now();
        timerRef.current = setTimeout(() => scheduleExit(), remaining);
    }, [scheduleExit]);

    useEffect(() => {
        // trigger enter animation on next frame
        const enterFrame = requestAnimationFrame(() => setPhase('visible'));
        startTimer(remainingRef.current);
        return () => {
            cancelAnimationFrame(enterFrame);
            clearTimeout(timerRef.current);
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleMouseEnter = () => {
        clearTimeout(timerRef.current);
        // snapshot how much time is left
        if (startedAtRef.current !== null) {
            const elapsed = performance.now() - startedAtRef.current;
            remainingRef.current = Math.max(0, remainingRef.current - elapsed);
            startedAtRef.current = null;
        }
        setPaused(true);
    };

    const handleMouseLeave = () => {
        setPaused(false);
        startTimer(remainingRef.current);
    };

    // ── Styles ────────────────────────────────────────────────────────────────
    const entering = phase === 'entering';
    const exiting  = phase === 'exiting';

    const cardStyle = {
        // layout
        display: 'flex',
        flexDirection: 'column',
        minWidth: 260,
        maxWidth: 380,
        borderRadius: 12,
        overflow: 'hidden',
        cursor: 'pointer',
        pointerEvents: 'all',
        position: 'relative',

        // light/dark adaptive card
        background: 'var(--toast-bg)',
        border: '1px solid var(--toast-border)',
        boxShadow: `0 8px 32px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.08), 0 0 0 1px var(--toast-border), 0 4px 16px ${cfg.glow}`,

        // enter/exit animation
        opacity: entering || exiting ? 0 : 1,
        transform: entering
            ? 'translateX(24px) scale(0.97)'
            : exiting
                ? 'translateX(16px) scale(0.97)'
                : 'translateX(0) scale(1)',
        transition: entering
            ? 'opacity 0.25s ease, transform 0.25s cubic-bezier(0.34,1.56,0.64,1)'
            : exiting
                ? 'opacity 0.28s ease, transform 0.28s ease-in'
                : 'opacity 0.25s ease, transform 0.25s cubic-bezier(0.34,1.56,0.64,1)',
    };

    return (
        <>
            {/* CSS variables for light/dark adaptive colors */}
            <style>{`
                :root, :root[data-theme="dark"] {
                    --toast-bg: #151e2d;
                    --toast-border: rgba(140,171,214,0.12);
                    --toast-text: #f0f4ff;
                    --toast-subtext: #7a90b0;
                }
                :root[data-theme="light"] {
                    --toast-bg: #ffffff;
                    --toast-border: rgba(0,0,0,0.08);
                    --toast-text: #0f172a;
                    --toast-subtext: #64748b;
                }
                @keyframes toast-drain {
                    from { transform: scaleX(1); }
                    to   { transform: scaleX(0); }
                }
            `}</style>

            <div
                style={cardStyle}
                onClick={scheduleExit}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                {/* Left accent bar */}
                <div style={{
                    position: 'absolute',
                    left: 0, top: 0, bottom: 0,
                    width: 4,
                    background: cfg.accent,
                    borderRadius: '12px 0 0 12px',
                }} />

                {/* Body */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem 0.9rem 0.65rem 0.85rem',
                    paddingLeft: '0.85rem',
                }}>
                    {/* Icon badge */}
                    <div style={{
                        flexShrink: 0,
                        width: 30,
                        height: 30,
                        borderRadius: 8,
                        background: cfg.iconBg,
                        color: cfg.iconColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}>
                        {cfg.icon}
                    </div>

                    {/* Message */}
                    <span style={{
                        flex: 1,
                        fontSize: '0.84rem',
                        fontWeight: 500,
                        lineHeight: 1.45,
                        color: 'var(--toast-text)',
                        letterSpacing: '-0.01em',
                    }}>
                        {message}
                    </span>

                    {/* Dismiss × */}
                    <button
                        onClick={e => { e.stopPropagation(); scheduleExit(); }}
                        style={{
                            flexShrink: 0,
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '2px 4px',
                            color: 'var(--toast-subtext)',
                            fontSize: '0.9rem',
                            lineHeight: 1,
                            borderRadius: 4,
                            opacity: 0.7,
                            transition: 'opacity 0.15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.opacity = 1}
                        onMouseLeave={e => e.currentTarget.style.opacity = 0.7}
                        aria-label="Dismiss"
                    >
                        ×
                    </button>
                </div>

                {/* Progress bar */}
                <div style={{
                    height: 3,
                    background: 'var(--toast-border)',
                    margin: '0 0.85rem 0.55rem',
                    borderRadius: 99,
                    overflow: 'hidden',
                }}>
                    <div style={{
                        height: '100%',
                        width: '100%',
                        background: cfg.accent,
                        borderRadius: 99,
                        opacity: 0.85,
                        transformOrigin: 'left center',
                        animation: `toast-drain ${duration}ms linear forwards`,
                        animationPlayState: paused ? 'paused' : 'running',
                    }} />
                </div>
            </div>
        </>
    );
}

export default ToastProvider;
