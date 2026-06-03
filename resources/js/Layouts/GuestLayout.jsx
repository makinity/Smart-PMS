import { useEffect } from 'react';

export default function GuestLayout({ children }) {
    useEffect(() => {
        const saved = localStorage.getItem('theme') ?? 'light';
        document.documentElement.setAttribute('data-theme', saved);
    }, []);

    return (
        <>
            {children}
            <style>{`
                :root[data-theme="dark"], :root {
                    --admin-bg-primary: #0a0f1a;
                    --admin-bg-secondary: #0f1724;
                    --admin-card: rgba(16,23,34,0.96);
                    --admin-border: rgba(140,171,214,0.12);
                    --admin-border-strong: rgba(59,130,246,0.22);
                    --admin-text-primary: #f4f8ff;
                    --admin-text-secondary: #a5b4cf;
                    --admin-text-muted: #6f83a6;
                    --admin-accent: #3b82f6;
                    --admin-radius: 12px;
                    --admin-shadow: 0 18px 40px rgba(0,0,0,0.28);
                }
                :root[data-theme="light"] {
                    --admin-bg-primary: #f0f4ff;
                    --admin-bg-secondary: #e8edf8;
                    --admin-card: rgba(255,255,255,0.96);
                    --admin-border: rgba(59,130,246,0.14);
                    --admin-border-strong: rgba(59,130,246,0.32);
                    --admin-text-primary: #0f172a;
                    --admin-text-secondary: #334155;
                    --admin-text-muted: #64748b;
                    --admin-accent: #2563eb;
                    --admin-shadow: 0 18px 40px rgba(0,0,0,0.08);
                }
                *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
                body {
                    font-family: 'Inter', system-ui, sans-serif;
                    color: var(--admin-text-primary);
                    min-height: 100vh;
                    background:
                        radial-gradient(circle at top left, rgba(59,130,246,0.12), transparent 26%),
                        linear-gradient(180deg, var(--admin-bg-primary) 0%, var(--admin-bg-secondary) 100%);
                }
            `}</style>
        </>
    );
}
