import { useState, useCallback, createContext, useContext } from 'react';

const ConfirmCtx = createContext(null);

export function ConfirmProvider({ children }) {
    const [state, setState] = useState(null); // { message, resolve }
    const [confirming, setConfirming] = useState(false);

    // confirm(message) → returns Promise<bool>
    // confirm(message, asyncFn) → shows loading until asyncFn resolves, then closes
    const confirm = useCallback((message, asyncFn = null) => new Promise(resolve => {
        setState({ message, resolve, asyncFn });
        setConfirming(false);
    }), []);

    function handleCancel() {
        state?.resolve(false);
        setState(null);
    }

    async function handleConfirm() {
        if (state?.asyncFn) {
            setConfirming(true);
            try { await state.asyncFn(); } finally { setConfirming(false); }
            state?.resolve(true);
            setState(null);
        } else {
            setConfirming(true);
            // Brief visual feedback before resolving
            setTimeout(() => {
                state?.resolve(true);
                setState(null);
                setConfirming(false);
            }, 300);
        }
    }

    return (
        <ConfirmCtx.Provider value={confirm}>
            {children}
            {state && (
                <div style={s.overlay}>
                    <div style={s.dialog}>
                        <p style={s.message}>{state.message}</p>
                        <div style={s.actions}>
                            <button style={{ ...s.cancel, opacity: confirming ? 0.5 : 1, cursor: confirming ? 'not-allowed' : 'pointer' }}
                                onClick={handleCancel} disabled={confirming}>
                                Cancel
                            </button>
                            <button style={{ ...s.confirm, opacity: confirming ? 0.75 : 1, cursor: confirming ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 90, justifyContent: 'center' }}
                                onClick={handleConfirm} disabled={confirming}>
                                {confirming
                                    ? <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'cd-spin 0.7s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Processing…</>
                                    : 'Confirm'
                                }
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <style>{`@keyframes cd-spin { to { transform: rotate(360deg); } }`}</style>
        </ConfirmCtx.Provider>
    );
}

export function useConfirm() {
    return useContext(ConfirmCtx);
}

const s = {
    overlay: { position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    dialog:  { background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)', borderRadius: 14, padding: '1.75rem 2rem', maxWidth: 400, width: '90%', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' },
    message: { fontSize: '0.95rem', color: 'var(--admin-text-primary)', lineHeight: 1.6, margin: '0 0 1.5rem' },
    actions: { display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' },
    cancel:  { padding: '0.5rem 1.25rem', borderRadius: 8, border: '1px solid var(--admin-border-strong)', background: 'transparent', color: 'var(--admin-text-secondary)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' },
    confirm: { padding: '0.5rem 1.25rem', borderRadius: 8, border: 'none', background: '#ef4444', color: '#fff', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' },
};
