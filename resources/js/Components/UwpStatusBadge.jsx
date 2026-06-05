const STATUS = {
    draft:     { bg: 'rgba(100,116,139,0.15)', color: '#94a3b8', border: 'rgba(100,116,139,0.3)', icon: '●', label: 'Draft' },
    submitted: { bg: 'rgba(37,99,235,0.12)',   color: '#60a5fa', border: 'rgba(37,99,235,0.3)',   icon: '↑', label: 'Submitted' },
    approved:  { bg: 'rgba(5,150,105,0.12)',   color: '#34d399', border: 'rgba(5,150,105,0.3)',   icon: '✓', label: 'Approved' },
    returned:  { bg: 'rgba(239,68,68,0.12)',   color: '#f87171', border: 'rgba(239,68,68,0.3)',   icon: '↩', label: 'Returned' },
    rejected:  { bg: 'rgba(239,68,68,0.12)',   color: '#f87171', border: 'rgba(239,68,68,0.3)',   icon: '✕', label: 'Rejected' },
    endorsed:  { bg: 'rgba(168,85,247,0.12)',  color: '#c084fc', border: 'rgba(168,85,247,0.3)',  icon: '→', label: 'Endorsed' },
};

export default function UwpStatusBadge({ status }) {
    const sc = STATUS[status] ?? STATUS.draft;
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.3rem 0.85rem', borderRadius: 999, fontSize: '0.78rem', fontWeight: 700, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
            <span>{sc.icon}</span>
            <span>{sc.label}</span>
        </div>
    );
}
