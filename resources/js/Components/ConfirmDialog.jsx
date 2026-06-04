import { useState, useCallback, createContext, useContext } from 'react';

const ConfirmCtx = createContext(null);

export function ConfirmProvider({ children }) {
    const [state, setState] = useState(null); // { message, resolve }

    const confirm = useCallback((message) => new Promise(resolve => {
        setState({ message, resolve });
    }), []);

    function handleResponse(result) {
        state?.resolve(result);
        setState(null);
    }

    return (
        <ConfirmCtx.Provider value={confirm}>
            {children}
            {state && (
                <div style={s.overlay}>
                    <div style={s.dialog}>
                        <p style={s.message}>{state.message}</p>
                        <div style={s.actions}>
                            <button style={s.cancel} onClick={() => handleResponse(false)}>Cancel</button>
                            <button style={s.confirm} onClick={() => handleResponse(true)}>Confirm</button>
                        </div>
                    </div>
                </div>
            )}
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
