const shimmer = `
@keyframes skeleton-shimmer {
    0%   { background-position: -400px 0; }
    100% { background-position:  400px 0; }
}`;

export default function Skeleton({ width = '100%', height = 16, borderRadius = 6, style = {} }) {
    return (
        <>
            <style>{shimmer}</style>
            <div style={{
                width, height, borderRadius,
                background: 'linear-gradient(90deg, var(--admin-border) 25%, var(--admin-bg-secondary) 50%, var(--admin-border) 75%)',
                backgroundSize: '800px 100%',
                animation: 'skeleton-shimmer 1.4s infinite linear',
                flexShrink: 0,
                ...style,
            }} />
        </>
    );
}
