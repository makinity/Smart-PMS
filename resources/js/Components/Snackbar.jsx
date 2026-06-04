import { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react';

// ── Context ──────────────────────────────────────────────────────────────────
const ToastCtx = createContext(null);

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const counter = useRef(0);

    const toast = useCallback((message, type = 'info', duration = 3500) => {
        const id = ++counter.current;
        setToasts(t => [...t, { id, message, type }]);
        setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), duration);
    }, []);

    return (
        <ToastCtx.Provider value={toast}>
            {children}
            <ToastContainer toasts={toasts} onDismiss={id => setToasts(t => t.filter(x => x.id !== id))} />
        </ToastCtx.Provider>
    );
}

export function useToast() {
    return useContext(ToastCtx);
}

// ── Colors per type ──────────────────────────────────────────────────────────
const STYLES = {
    success:  { bg: 'rgba(22,163,74,0.95)',   border: '#16a34a', icon: '✓' },
    error:    { bg: 'rgba(220,38,38,0.95)',    border: '#dc2626', icon: '✕' },
    warning:  { bg: 'rgba(202,138,4,0.95)',    border: '#ca8a04', icon: '⚠' },
    info:     { bg: 'rgba(37,99,235,0.95)',    border: '#2563eb', icon: 'ℹ' },
    approved: { bg: 'rgba(5,150,105,0.95)',    border: '#059669', icon: '✓' },
    rejected: { bg: 'rgba(239,68,68,0.95)',    border: '#ef4444', icon: '✕' },
    draft:    { bg: 'rgba(100,116,139,0.95)',  border: '#64748b', icon: '●' },
    submitted:{ bg: 'rgba(37,99,235,0.95)',    border: '#2563eb', icon: '↑' },
};

function ToastContainer({ toasts, onDismiss }) {
    if (!toasts.length) return null;
    return (
        <div style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '0.5rem', pointerEvents: 'none' }}>
            {toasts.map(t => <Toast key={t.id} toast={t} onDismiss={onDismiss} />)}
        </div>
    );
}

function Toast({ toast, onDismiss }) {
    const [visible, setVisible] = useState(false);
    const st = STYLES[toast.type] ?? STYLES.info;

    useEffect(() => {
        requestAnimationFrame(() => setVisible(true));
    }, []);

    return (
        <div
            onClick={() => onDismiss(toast.id)}
            style={{
                display: 'flex', alignItems: 'center', gap: '0.6rem',
                padding: '0.65rem 1rem', borderRadius: 10,
                background: st.bg, border: `1px solid ${st.border}`,
                color: '#fff', fontSize: '0.85rem', fontWeight: 500,
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                minWidth: 220, maxWidth: 360, cursor: 'pointer',
                pointerEvents: 'all',
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(12px)',
                transition: 'opacity 0.2s, transform 0.2s',
            }}
        >
            <span style={{ fontSize: '1rem', flexShrink: 0 }}>{st.icon}</span>
            <span style={{ flex: 1, lineHeight: 1.4 }}>{toast.message}</span>
        </div>
    );
}

export default ToastProvider;
