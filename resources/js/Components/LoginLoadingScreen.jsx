import { useEffect, useState } from 'react';

export default function LoginLoadingScreen() {
    const [fading, setFading] = useState(false);
    const [gone,   setGone]   = useState(false);

    useEffect(() => {
        const theme = localStorage.getItem('theme') ?? 'dark';
        document.documentElement.setAttribute('data-theme', theme);

        const t1 = setTimeout(() => setFading(true), 1400);
        const t2 = setTimeout(() => setGone(true),   1900);
        return () => { clearTimeout(t1); clearTimeout(t2); };
    }, []);

    if (gone) return null;

    return (
        <>
            <div className={`pls-overlay${fading ? ' pls-fade' : ''}`}>
                <div className="pls-card">
                    <img src="/images/pms-logo.png" alt="Smart PMS" className="pls-logo" />
                    <div className="pls-title">Smart PMS</div>
                    <div className="pls-subtitle">Loading your portal…</div>
                    <div className="pls-track"><div className="pls-bar" /></div>
                </div>
            </div>
            <style>{`
                :root[data-theme="dark"],:root{--pls-bg:#0f1117;--pls-card:#1a1d27;--pls-border:rgba(255,255,255,0.08);--pls-title:#f1f5f9;--pls-sub:rgba(241,245,249,0.45);--pls-track:rgba(255,255,255,0.08);--pls-bar1:#3b82f6;--pls-bar2:#6366f1}
                :root[data-theme="light"]{--pls-bg:#f0f4f8;--pls-card:#ffffff;--pls-border:rgba(0,0,0,0.08);--pls-title:#0f172a;--pls-sub:rgba(15,23,42,0.45);--pls-track:rgba(0,0,0,0.08);--pls-bar1:#3b82f6;--pls-bar2:#6366f1}
                .pls-overlay{position:fixed;inset:0;z-index:9999;background:var(--pls-bg);display:flex;align-items:center;justify-content:center;transition:opacity 0.5s ease}
                .pls-overlay.pls-fade{opacity:0;pointer-events:none}
                .pls-card{display:flex;flex-direction:column;align-items:center;gap:0.6rem;padding:2.5rem 3rem;background:var(--pls-card);border:1px solid var(--pls-border);border-radius:20px;box-shadow:0 24px 64px rgba(0,0,0,0.2);animation:plsPop 0.35s cubic-bezier(0.34,1.56,0.64,1) both}
                .pls-logo{width:64px;height:64px;object-fit:contain;border-radius:14px;margin-bottom:0.25rem}
                .pls-title{font-size:1.4rem;font-weight:800;color:var(--pls-title);letter-spacing:-0.03em;line-height:1}
                .pls-subtitle{font-size:0.82rem;color:var(--pls-sub);margin-bottom:0.5rem}
                .pls-track{width:180px;height:4px;border-radius:99px;background:var(--pls-track);overflow:hidden}
                .pls-bar{height:100%;width:45%;border-radius:99px;background:linear-gradient(90deg,var(--pls-bar1),var(--pls-bar2));animation:plsSlide 1.1s ease-in-out infinite}
                @keyframes plsPop{from{opacity:0;transform:scale(0.92) translateY(10px)}to{opacity:1;transform:scale(1) translateY(0)}}
                @keyframes plsSlide{0%{transform:translateX(-100%)}50%{transform:translateX(200%)}100%{transform:translateX(200%)}}
            `}</style>
        </>
    );
}
