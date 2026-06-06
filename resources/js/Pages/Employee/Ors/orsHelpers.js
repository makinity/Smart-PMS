export function formatDuration(totalSeconds) {
    const s = Math.max(0, Math.floor(totalSeconds));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export const STATUS_CFG = {
    draft:     { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  icon: 'bi-pencil',           label: 'Draft' },
    recording: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   icon: 'bi-record-circle',    label: 'Recording' },
    paused:    { color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)',  icon: 'bi-pause-circle',     label: 'Paused' },
    submitted: { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',  icon: 'bi-check-circle',     label: 'Submitted' },
    rated:     { color: '#10b981', bg: 'rgba(16,185,129,0.12)',  icon: 'bi-patch-check-fill', label: 'Validated' },
};
export const statusCfg = (st) => STATUS_CFG[st] ?? STATUS_CFG.draft;
