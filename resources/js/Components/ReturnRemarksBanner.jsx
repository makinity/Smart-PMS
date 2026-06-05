import { useState } from 'react';

export default function ReturnRemarksBanner({ remarks, label = 'Returned by Dept. Head' }) {
    const [dismissed, setDismissed] = useState(false);
    if (!remarks || dismissed) return null;

    return (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '0.85rem 1rem', marginBottom: '1rem' }}>
            <span style={{ fontSize: '1rem', lineHeight: 1, marginTop: 2 }}>↩</span>
            <div style={{ flex: 1 }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--admin-text-primary)', lineHeight: 1.6 }}>{remarks}</p>
            </div>
            <button onClick={() => setDismissed(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-muted)', fontSize: '1rem', lineHeight: 1, padding: 0 }}>✕</button>
        </div>
    );
}
