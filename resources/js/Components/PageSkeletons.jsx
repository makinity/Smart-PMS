// ── Page loading skeletons ────────────────────────────────────────────────────
// Keyed by URL pattern. AppLayout renders the matching skeleton while Inertia
// navigates so the user never sees a blank flash.

import { useEffect, useState } from 'react';

const SHIMMER = `@keyframes sk-shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}`;

function Sh({ h, w = '100%', r = 6 }) {
    return (
        <div style={{
            height: h, width: w, borderRadius: r, marginBottom: 8, flexShrink: 0,
            background: 'linear-gradient(90deg,var(--admin-border) 25%,var(--admin-bg-secondary) 50%,var(--admin-border) 75%)',
            backgroundSize: '800px 100%', animation: 'sk-shimmer 1.4s infinite linear',
        }} />
    );
}

const SK = { background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)', borderRadius: 'var(--admin-radius)', padding: '1.25rem' };
const sh = (h, w = '100%', r = 6) => <Sh h={h} w={w} r={r} />;
const pill = (w, h = 28) => <div style={{ width: w, height: h, borderRadius: 99, flexShrink: 0, background: 'linear-gradient(90deg,var(--admin-border) 25%,var(--admin-bg-secondary) 50%,var(--admin-border) 75%)', backgroundSize: '800px 100%', animation: 'sk-shimmer 1.4s infinite linear' }} />;
const avatar = (size = 36) => <div style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(90deg,var(--admin-border) 25%,var(--admin-bg-secondary) 50%,var(--admin-border) 75%)', backgroundSize: '800px 100%', animation: 'sk-shimmer 1.4s infinite linear' }} />;

function useBreakpoint() {
    const [w, setW] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1200));
    useEffect(() => {
        const onResize = () => setW(window.innerWidth);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);
    return w >= 1024 ? 'desktop' : w >= 768 ? 'tablet' : 'mobile';
}

// Shared two-panel skeleton (OPCR Show pages)
function TwoPanelSkeleton({ actionCount = 2 }) {
    return (
        <div style={{ borderRadius: 'var(--admin-radius)', border: '1px solid var(--admin-border-strong)', background: 'var(--admin-card)', overflow: 'hidden' }}>
            <div style={{ padding: '0.6rem 1rem', borderBottom: '1px solid var(--admin-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {sh(32, 32, 8)}
                    <div style={{ width: 1, height: 28, background: 'var(--admin-border-strong)' }} />
                    <div>{sh(16, '160px')}{sh(10, '100px')}</div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {Array.from({ length: actionCount }).map((_, i) => sh(32, 100, 8))}
                </div>
            </div>
            <div style={{ display: 'flex', minHeight: 600 }}>
                <div style={{ width: 270, minWidth: 270, borderRight: '1px solid var(--admin-border)', padding: '1.25rem 0' }}>
                    <div style={{ padding: '0 1rem 0.65rem' }}>{sh(8, '55%', 4)}</div>
                    {[0, 1, 2, 3].map(i => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.55rem 1rem' }}>
                            {avatar(28)}<div style={{ flex: 1 }}>{sh(11, '60%')}{sh(9, '40%')}</div>{sh(18, 32, 99)}
                        </div>
                    ))}
                    <div style={{ borderTop: '1px solid var(--admin-border)', margin: '0.75rem 0 0.5rem' }} />
                    <div style={{ padding: '0 1rem 0.65rem' }}>{sh(8, '40%', 4)}</div>
                    {[0, 1].map(i => (
                        <div key={i}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 1rem' }}>
                                {sh(14, 14, 3)}{sh(12, '55%')}<div style={{ marginLeft: 'auto' }}>{sh(18, 32, 99)}</div>
                            </div>
                            {i === 0 && [0, 1, 2].map(j => <div key={j} style={{ padding: '0.45rem 1rem 0.45rem 2rem' }}>{sh(11, '65%')}</div>)}
                        </div>
                    ))}
                </div>
                <div style={{ flex: 1, padding: '1.5rem', minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid var(--admin-border)', marginBottom: '1rem' }}>
                        {sh(18, '45%')}{sh(22, 80, 99)}
                    </div>
                    {[0, 1, 2].map(i => (
                        <div key={i} style={{ border: '1px solid var(--admin-border)', borderRadius: 12, padding: '1.25rem 1.5rem', marginBottom: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                            {sh(16, undefined, 4)}{sh(13, '55%', 4)}
                            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>{sh(13, '15%')}{sh(18, 80, 99)}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function EmployeeAccomplishmentIpcrSkeleton() {
    return (
        <>
            <style>{SHIMMER}</style>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ ...SK, padding: '1.1rem 1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: '0.85rem' }}>
                        <div>
                            {sh(12, 60, 4)}
                            {sh(20, '180px')}
                            {sh(10, '140px')}
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                            <div style={{ textAlign: 'center' }}>
                                {sh(18, '60px')}
                                {sh(10, '48px')}
                            </div>
                            {sh(30, 92, 8)}
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.72rem', color: 'var(--admin-text-muted)', paddingTop: '0.75rem', borderTop: '1px solid var(--admin-border)' }}>
                        {[0, 1, 2, 3].map(i => (
                            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                {sh(10, 10, 99)}
                                {sh(10, i === 3 ? '110px' : i === 2 ? '100px' : i === 1 ? '110px' : '90px')}
                            </span>
                        ))}
                    </div>
                </div>

                {[
                    { title: 'Function A', weight: '35%', rows: 3 },
                    { title: 'Function B', weight: '40%', rows: 4 },
                    { title: 'Function C', weight: '25%', rows: 3 },
                ].map((section, idx) => (
                    <div key={idx} style={SK}>
                        <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--admin-border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 18, height: 18, borderRadius: 99, background: 'linear-gradient(90deg,var(--admin-border) 25%,var(--admin-bg-secondary) 50%,var(--admin-border) 75%)', backgroundSize: '800px 100%', animation: 'sk-shimmer 1.4s infinite linear' }} />
                            <div style={{ flex: 1 }}>
                                {sh(12, '38%')}
                                {sh(10, '24%')}
                            </div>
                            {sh(18, 46, 99)}
                        </div>
                        <div style={{ padding: '0.75rem' }}>
                            {Array.from({ length: section.rows }).map((_, rowIdx) => (
                                <div key={rowIdx} style={{ border: '1px solid var(--admin-border)', borderRadius: 10, marginBottom: 8, overflow: 'hidden' }}>
                                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', padding: '0.75rem 0.85rem', background: 'rgba(59,130,246,0.05)' }}>
                                        <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(59,130,246,0.12)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
                                            {sh(8, 8, 99)}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 180 }}>
                                            {sh(12, '72%')}
                                            {sh(10, '45%')}
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                                            {['Q', 'E', 'T', 'A'].map(label => (
                                                <div key={label} style={{ textAlign: 'center', minWidth: 38 }}>
                                                    {sh(8, 18, 4)}
                                                    {sh(16, 34, 4)}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                <div style={{ ...SK, padding: '1rem 1.25rem' }}>
                    {sh(10, '30%')}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
                        {[0, 1, 2].map(i => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '0.6rem 0.85rem', borderRadius: 8, background: 'var(--admin-bg-secondary)' }}>
                                {sh(10, i === 0 ? '42%' : i === 1 ? '45%' : '48%')}
                                {sh(18, 60, 4)}
                            </div>
                        ))}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '0.6rem 0.85rem', borderRadius: 8, border: '1px solid var(--admin-border-strong)' }}>
                            {sh(12, '28%')}
                            <div style={{ textAlign: 'right' }}>
                                {sh(18, '56px')}
                                {sh(10, '44px')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

function AdminHrisIntegrationSkeleton() {
    return (
        <>
            <style>{SHIMMER}</style>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={SK}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                                <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(90deg,var(--admin-border) 25%,var(--admin-bg-secondary) 50%,var(--admin-border) 75%)', backgroundSize: '800px 100%', animation: 'sk-shimmer 1.4s infinite linear' }} />
                                <div>
                                    {sh(10, '110px')}
                                    {sh(22, '220px')}
                                </div>
                            </div>
                            {sh(14, '72%')}
                        </div>
                        {sh(36, 120, 12)}
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                    {[0, 1, 2, 3].map(i => (
                        <div key={i} style={SK}>
                            {sh(10, '45%')}
                            {sh(28, '35%')}
                            {sh(10, '55%')}
                        </div>
                    ))}
                </div>

                <div style={SK}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                        <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(90deg,var(--admin-border) 25%,var(--admin-bg-secondary) 50%,var(--admin-border) 75%)', backgroundSize: '800px 100%', animation: 'sk-shimmer 1.4s infinite linear', flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                            {sh(12, '22%')}
                            {sh(10, '80%')}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 0.95fr', gap: '0.75rem' }}>
                    <div style={SK}>
                        {sh(12, '24%')}
                        {sh(10, '64%')}
                        <div style={{ display: 'grid', gap: '0.9rem', marginTop: '1rem' }}>
                            <div>
                                {sh(10, '18%')}
                                {sh(36)}
                                {sh(10, '34%')}
                            </div>
                            <div>
                                {sh(10, '22%')}
                                {sh(36)}
                                {sh(10, '46%')}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.25rem' }}>
                                {sh(36, 92, 12)}
                                {sh(36, 118, 12)}
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div style={SK}>
                            {sh(12, '18%')}
                            {sh(10, '72%')}
                            <div style={{ display: 'grid', gap: '0.6rem', marginTop: '0.8rem' }}>
                                {[0, 1, 2, 3].map(i => (
                                    <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                        {sh(12, 12, 99)}
                                        <div style={{ flex: 1 }}>{sh(11, i % 2 === 0 ? '82%' : '74%')}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div style={SK}>
                            {sh(12, '20%')}
                            {sh(10, '78%')}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

function AdminDatabaseSkeleton() {
    return (
        <>
            <style>{SHIMMER}</style>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={SK}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                        <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(90deg,var(--admin-border) 25%,var(--admin-bg-secondary) 50%,var(--admin-border) 75%)', backgroundSize: '800px 100%', animation: 'sk-shimmer 1.4s infinite linear', flexShrink: 0 }} />
                        <div style={{ minWidth: 0, flex: 1 }}>
                            {sh(10, '115px')}
                            {sh(22, '190px')}
                            {sh(10, '82%')}
                        </div>
                    </div>
                </div>

                <div style={{ ...SK, padding: '0 1.25rem' }}>
                    <div style={{ display: 'flex', gap: 0, overflowX: 'auto', scrollbarWidth: 'none' }}>
                        {[120, 108, 124].map((w, i) => (
                            <div key={i} style={{ padding: '0.95rem 0.2rem', marginRight: '0.9rem', flexShrink: 0 }}>
                                {sh(12, w)}
                            </div>
                        ))}
                    </div>
                </div>

                <div style={SK}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                        {sh(12, '24%')}
                        {sh(16, 60, 99)}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                        {[0, 1, 2, 3].map(i => (
                            <div key={i} style={{ padding: '0.95rem', borderRadius: 12, border: '1px solid var(--admin-border)', background: 'var(--admin-bg-secondary)' }}>
                                {sh(10, '42%')}
                                {sh(24, '34%')}
                                {sh(10, '58%')}
                            </div>
                        ))}
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                    <div style={SK}>
                        {sh(12, '28%')}
                        {sh(10, '74%')}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.75rem', marginTop: '1rem' }}>
                            <div>
                                {sh(10, '20%')}
                                {sh(36)}
                            </div>
                            <div>
                                {sh(10, '10%')}
                                {sh(36, 96, 10)}
                            </div>
                        </div>
                        <div style={{ marginTop: '0.75rem' }}>
                            {sh(10, '18%')}
                            {sh(36)}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
                            {[0, 1].map(i => (
                                <div key={i}>
                                    {sh(10, '18%')}
                                    {sh(36)}
                                </div>
                            ))}
                        </div>
                        <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
                            {sh(36, 110, 10)}
                            {sh(36, 130, 10)}
                        </div>
                    </div>

                    <div style={SK}>
                        {sh(12, '34%')}
                        <div style={{ marginTop: '0.75rem' }}>
                            {sh(10, '32%')}
                            <div style={{ display: 'grid', gap: '0.6rem', marginTop: '0.5rem' }}>
                                {[0, 1, 2, 3].map(i => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        {sh(20, 20, 99)}
                                        <div style={{ flex: 1 }}>
                                            {sh(11, i % 2 === 0 ? '86%' : '72%')}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div style={{ marginTop: '1rem' }}>
                            {sh(12, '26%')}
                            {sh(10, '84%')}
                        </div>
                    </div>
                </div>

                <div style={SK}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {sh(12, '20%')}
                        {sh(10, '18%')}
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <div style={{ minWidth: 600 }}>
                            <div style={{ display: 'flex', gap: '0.75rem', padding: '0.55rem 0.75rem', borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-bg-secondary)' }}>
                                {[1, 2, 3, 4, 5, 6].map(i => (
                                    <div key={i} style={{ width: [100, 170, 120, 80, 120, 90][i - 1], height: 10, flexShrink: 0, borderRadius: 3, background: 'linear-gradient(90deg,var(--admin-border) 25%,var(--admin-bg-secondary) 50%,var(--admin-border) 75%)', backgroundSize: '800px 100%', animation: 'sk-shimmer 1.4s infinite linear' }} />
                                ))}
                            </div>
                            {[0, 1, 2, 3, 4].map(i => (
                                <div key={i} style={{ display: 'flex', gap: '0.75rem', padding: '0.7rem 0.75rem', borderBottom: '1px solid var(--admin-border)', alignItems: 'center' }}>
                                    {[100, 170, 120, 80, 120, 90].map((w, j) => (
                                        <div key={j} style={{ width: w, height: 11, flexShrink: 0, borderRadius: 3, background: 'linear-gradient(90deg,var(--admin-border) 25%,var(--admin-bg-secondary) 50%,var(--admin-border) 75%)', backgroundSize: '800px 100%', animation: 'sk-shimmer 1.4s infinite linear' }} />
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
                    {[0, 1, 2, 3].map(i => (
                        <div key={i} style={{ ...SK, padding: '1rem', textAlign: 'center' }}>
                            {sh(18, 18, 4)}
                            {sh(12, '70%')}
                            {sh(10, '52%')}
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}

function AdminMachineLearningSkeleton() {
    return (
        <>
            <style>{SHIMMER}</style>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: '2rem' }}>
                <div style={{ ...SK, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 220 }}>
                        <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(90deg,var(--admin-border) 25%,var(--admin-bg-secondary) 50%,var(--admin-border) 75%)', backgroundSize: '800px 100%', animation: 'sk-shimmer 1.4s infinite linear', flexShrink: 0 }} />
                        <div>
                            {sh(10, '110px')}
                            {sh(20, '200px')}
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        {[0, 1, 2].map(i => (
                            <div key={i}>
                                {sh(10, '72px')}
                                {sh(18, i === 0 ? '76px' : i === 1 ? '92px' : '64px')}
                            </div>
                        ))}
                    </div>
                </div>

                <div style={SK}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <div style={{ width: 18, height: 18, borderRadius: 5, background: 'linear-gradient(90deg,var(--admin-border) 25%,var(--admin-bg-secondary) 50%,var(--admin-border) 75%)', backgroundSize: '800px 100%', animation: 'sk-shimmer 1.4s infinite linear' }} />
                        <div style={{ flex: 1, minWidth: 220 }}>
                            {sh(10, '20%')}
                            {sh(36)}
                        </div>
                        {sh(34, 110, 10)}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '0.35rem', borderBottom: '1px solid var(--admin-border)' }}>
                    {[110, 110].map((w, i) => (
                        <div key={i} style={{ padding: '0.6rem 1rem', marginBottom: '-1px' }}>{sh(12, w)}</div>
                    ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div style={SK}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.9rem' }}>
                            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(90deg,var(--admin-border) 25%,var(--admin-bg-secondary) 50%,var(--admin-border) 75%)', backgroundSize: '800px 100%', animation: 'sk-shimmer 1.4s infinite linear', flexShrink: 0 }} />
                            <div style={{ flex: 1 }}>
                                {sh(10, '34%')}
                                {sh(18, '52%')}
                            </div>
                        </div>
                        {sh(10, '90%')}
                        <div style={{ display: 'grid', gap: '0.65rem', marginTop: '0.9rem' }}>
                            {Array.from({ length: 2 }).map((_, i) => (
                                <div key={i}>
                                    {sh(10, i === 0 ? '16%' : '10%')}
                                    {sh(36)}
                                </div>
                            ))}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.9rem' }}>{sh(34, 160, 10)}</div>
                    </div>
                    <div style={SK}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.9rem' }}>
                            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(90deg,var(--admin-border) 25%,var(--admin-bg-secondary) 50%,var(--admin-border) 75%)', backgroundSize: '800px 100%', animation: 'sk-shimmer 1.4s infinite linear', flexShrink: 0 }} />
                            <div style={{ flex: 1 }}>
                                {sh(10, '26%')}
                                {sh(18, '58%')}
                            </div>
                        </div>
                        {sh(10, '90%')}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.9rem' }}>
                            <div style={{ border: '2px dashed var(--admin-border-strong)', borderRadius: 10, padding: '1rem', background: 'var(--admin-bg-secondary)' }}>
                                {sh(10, '44%')}
                                {sh(10, '64%')}
                            </div>
                            {sh(34, 160, 10)}
                        </div>
                    </div>
                </div>

                <div style={SK}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.9rem' }}>
                        {sh(12, '22%')}
                        {sh(10, '18%')}
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <div style={{ minWidth: 760 }}>
                            <div style={{ display: 'flex', gap: '0.75rem', padding: '0.55rem 0.75rem', borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-bg-secondary)' }}>
                                {[120, 100, 140, 90].map((w, i) => (
                                    <div key={i} style={{ width: w, height: 10, flexShrink: 0, borderRadius: 3, background: 'linear-gradient(90deg,var(--admin-border) 25%,var(--admin-bg-secondary) 50%,var(--admin-border) 75%)', backgroundSize: '800px 100%', animation: 'sk-shimmer 1.4s infinite linear' }} />
                                ))}
                            </div>
                            {[0, 1, 2, 3, 4].map(i => (
                                <div key={i} style={{ display: 'flex', gap: '0.75rem', padding: '0.7rem 0.75rem', borderBottom: '1px solid var(--admin-border)' }}>
                                    {[120, 100, 140, 90].map((w, j) => (
                                        <div key={j} style={{ width: w, height: 11, flexShrink: 0, borderRadius: 3, background: 'linear-gradient(90deg,var(--admin-border) 25%,var(--admin-bg-secondary) 50%,var(--admin-border) 75%)', backgroundSize: '800px 100%', animation: 'sk-shimmer 1.4s infinite linear' }} />
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

function AdminReportsSkeleton() {
    return (
        <>
            <style>{SHIMMER}</style>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={SK}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                        <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(90deg,var(--admin-border) 25%,var(--admin-bg-secondary) 50%,var(--admin-border) 75%)', backgroundSize: '800px 100%', animation: 'sk-shimmer 1.4s infinite linear', flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                            {sh(12, '110px')}
                            {sh(20, '180px')}
                            {sh(12, '72%')}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
                    {[0, 1, 2].map(i => (
                        <div key={i} style={SK}>
                            {sh(10, '30%')}
                            {sh(28, '42%')}
                            {sh(10, '70%')}
                        </div>
                    ))}
                </div>

                <div style={SK}>
                    {sh(14, '24%')}
                    {sh(10, '84%')}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginTop: '0.9rem' }}>
                        {[0, 1, 2, 3, 4, 5].map(i => (
                            <div key={i} style={{ padding: '0.9rem', borderRadius: 12, border: '1px solid var(--admin-border)', background: 'var(--admin-bg-secondary)' }}>
                                {sh(10, '40%')}
                                {sh(26, '48%')}
                            </div>
                        ))}
                    </div>
                </div>

                <div style={SK}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.9rem' }}>
                        {sh(14, '20%')}
                        {sh(10, '18%')}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                        {[0, 1, 2, 3].map(i => (
                            <div key={i} style={{ padding: '1rem', borderRadius: 12, border: '1px solid var(--admin-border)', background: 'var(--admin-bg-secondary)' }}>
                                {sh(10, '46%')}
                                {sh(18, '60%')}
                                {sh(10, '76%')}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}

function SupervisorUwpEditorSkeleton() {
    return (
        <>
            <style>{SHIMMER}</style>
            <div style={{ borderRadius: 'var(--admin-radius-lg)', border: '1px solid var(--admin-border-strong)', background: 'var(--admin-card)', boxShadow: 'var(--admin-shadow)', overflow: 'hidden' }}>
                <div style={{ position: 'sticky', top: 0, zIndex: 40, background: 'var(--admin-card)', borderBottom: '1px solid var(--admin-border)', padding: '0.6rem 1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0, flex: 1 }}>
                            {sh(34, 34, 10)}
                            <div style={{ width: 1, height: 28, background: 'var(--admin-border-strong)', flexShrink: 0 }} />
                            <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    {sh(14, '120px')}
                                    {pill(70, 24)}
                                </div>
                                {sh(10, '220px')}
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                            {sh(32, 100, 8)}
                            {sh(32, 90, 8)}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.75rem 0.75rem 0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 0.75rem', borderRadius: 12, border: '1px solid rgba(74,222,128,0.25)', background: 'rgba(74,222,128,0.08)' }}>
                        <div style={{ width: 16, height: 16, borderRadius: 99, background: 'linear-gradient(90deg,var(--admin-border) 25%,var(--admin-bg-secondary) 50%,var(--admin-border) 75%)', backgroundSize: '800px 100%', animation: 'sk-shimmer 1.4s infinite linear' }} />
                        {sh(10, '66%')}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', overflowX: 'auto', scrollbarWidth: 'none', borderBottom: '1px solid var(--admin-border)' }}>
                        {[130, 150, 130].map((w, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', flexShrink: 0, borderRight: '1px solid var(--admin-border)' }}>
                                <div style={{ padding: '0.7rem 1rem', borderBottom: '2px solid transparent' }}>{sh(12, w)}</div>
                                {i < 2 && <div style={{ padding: '0.35rem 0.3rem' }}>{sh(10, 18)}</div>}
                            </div>
                        ))}
                    </div>

                    <div style={{ display: 'flex', overflowX: 'auto', scrollbarWidth: 'none', whiteSpace: 'nowrap' }}>
                        {[110, 130, 120, 140].map((w, i) => (
                            <div key={i} style={{ padding: '0.7rem 1rem' }}>{sh(12, w)}</div>
                        ))}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', flexDirection: 'row', padding: '0.25rem 0.75rem 0.75rem' }}>
                    <aside style={{ width: 280, minWidth: 280, padding: '0.5rem 0', display: 'none' }}>
                        <div style={sh(12, '70%')} />
                    </aside>
                    <main style={{ flex: 1, minWidth: 0, paddingBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {[0, 1, 2].map((i) => (
                                <div key={i} style={{ border: '1px solid var(--admin-border-strong)', borderRadius: 12, overflow: 'hidden', background: 'var(--admin-card)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', padding: '0.8rem 1rem', borderBottom: '1px solid var(--admin-border)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0, flex: 1 }}>
                                            <div style={{ width: 18, height: 18, borderRadius: 6, background: 'linear-gradient(90deg,var(--admin-border) 25%,var(--admin-bg-secondary) 50%,var(--admin-border) 75%)', backgroundSize: '800px 100%', animation: 'sk-shimmer 1.4s infinite linear', flexShrink: 0 }} />
                                            <div style={{ minWidth: 0, flex: 1 }}>
                                                {sh(12, '40%')}
                                                {sh(10, '62%')}
                                            </div>
                                        </div>
                                        {pill(90, 22)}
                                    </div>
                                    <div style={{ padding: '0.85rem 1rem' }}>
                                        {Array.from({ length: 3 }).map((_, j) => (
                                            <div key={j} style={{ border: '1px solid var(--admin-border)', borderRadius: 10, padding: '0.8rem', marginBottom: 8, background: 'rgba(59,130,246,0.05)' }}>
                                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
                                                    <div style={{ flex: 1, minWidth: 180 }}>
                                                        {sh(12, '78%')}
                                                        {sh(10, '48%')}
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                                                        {['Q', 'E', 'T', 'A'].map(label => (
                                                            <div key={label} style={{ textAlign: 'center', minWidth: 34 }}>
                                                                {sh(8, 14, 4)}
                                                                {sh(16, 30, 4)}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {sh(34, 140, 8)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </main>
                </div>
            </div>

            <div style={{ position: 'fixed', bottom: '1.5rem', right: '1.25rem', zIndex: 98 }}>
                {sh(52, 52, 999)}
            </div>

            <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 99, background: 'var(--admin-card)', borderTop: '1px solid var(--admin-border)', padding: '0.75rem 1rem', minHeight: 56, display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                {sh(36, 100, 8)}
                {sh(36, 90, 8)}
            </div>
        </>
    );
}

function SupervisorUwpShowSkeleton() {
    return (
        <>
            <style>{SHIMMER}</style>
            <div style={{ borderRadius: 'var(--admin-radius-lg)', border: '1px solid var(--admin-border-strong)', background: 'var(--admin-card)', boxShadow: 'var(--admin-shadow)', overflow: 'hidden' }}>
                <div style={{ position: 'sticky', top: 0, zIndex: 40, background: 'var(--admin-card)', borderBottom: '1px solid var(--admin-border)', padding: '0.6rem 1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0, flex: 1 }}>
                            {sh(34, 34, 10)}
                            <div style={{ width: 1, height: 28, background: 'var(--admin-border-strong)', flexShrink: 0 }} />
                            <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    {sh(14, '160px')}
                                    {pill(72, 24)}
                                </div>
                                {sh(10, '220px')}
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                            {sh(32, 100, 8)}
                            {sh(32, 92, 8)}
                        </div>
                    </div>
                </div>

                <div style={{ padding: '0.75rem 0.75rem 0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 0.75rem', borderRadius: 12, border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.08)', marginBottom: '0.75rem' }}>
                        <div style={{ width: 16, height: 16, borderRadius: 99, background: 'linear-gradient(90deg,var(--admin-border) 25%,var(--admin-bg-secondary) 50%,var(--admin-border) 75%)', backgroundSize: '800px 100%', animation: 'sk-shimmer 1.4s infinite linear' }} />
                        {sh(10, '58%')}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', overflowX: 'auto', scrollbarWidth: 'none', borderBottom: '1px solid var(--admin-border)' }}>
                        {[140, 160, 120].map((w, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', flexShrink: 0, borderRight: i < 2 ? '1px solid var(--admin-border)' : 'none' }}>
                                <div style={{ padding: '0.7rem 1rem', borderBottom: '2px solid transparent' }}>{sh(12, w)}</div>
                                {i < 2 && <div style={{ padding: '0.35rem 0.3rem' }}>{sh(10, 18)}</div>}
                            </div>
                        ))}
                    </div>

                    <div style={{ display: 'flex', overflowX: 'auto', scrollbarWidth: 'none', whiteSpace: 'nowrap', borderBottom: '1px solid var(--admin-border)', marginBottom: '0.5rem' }}>
                        {[120, 140, 110, 150].map((w, i) => (
                            <div key={i} style={{ padding: '0.7rem 1rem' }}>{sh(12, w)}</div>
                        ))}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', flexDirection: 'row', padding: '0.25rem 0.75rem 0.75rem', minHeight: 620 }}>
                    <aside style={{ width: 270, minWidth: 270, borderRight: '1px solid var(--admin-border)', background: 'var(--admin-sidebar)', flexShrink: 0, padding: '1.25rem 0' }}>
                        <div style={{ padding: '0 1rem 0.65rem' }}>{sh(8, '48%', 4)}</div>
                        {[0, 1, 2, 3].map(i => (
                            <div key={i}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 1rem' }}>
                                    {sh(14, 14, 3)}<div style={{ flex: 1 }}>{sh(11, '62%')}{sh(9, '38%')}</div>
                                </div>
                                {i === 0 && [0, 1, 2].map(j => (
                                    <div key={j} style={{ padding: '0.45rem 1rem 0.45rem 2rem' }}>{sh(10, '68%')}</div>
                                ))}
                            </div>
                        ))}
                    </aside>
                    <main style={{ flex: 1, minWidth: 0, paddingBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {[0, 1, 2].map((i) => (
                                <div key={i} style={{ border: '1px solid var(--admin-border-strong)', borderRadius: 12, overflow: 'hidden', background: 'var(--admin-card)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', padding: '0.8rem 1rem', borderBottom: '1px solid var(--admin-border)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0, flex: 1 }}>
                                            <div style={{ width: 18, height: 18, borderRadius: 6, background: 'linear-gradient(90deg,var(--admin-border) 25%,var(--admin-bg-secondary) 50%,var(--admin-border) 75%)', backgroundSize: '800px 100%', animation: 'sk-shimmer 1.4s infinite linear', flexShrink: 0 }} />
                                            <div style={{ minWidth: 0, flex: 1 }}>
                                                {sh(12, '38%')}
                                                {sh(10, '60%')}
                                            </div>
                                        </div>
                                        {pill(92, 22)}
                                    </div>
                                    <div style={{ padding: '0.85rem 1rem' }}>
                                        {Array.from({ length: 3 }).map((_, j) => (
                                            <div key={j} style={{ border: '1px solid var(--admin-border)', borderRadius: 10, padding: '0.8rem', marginBottom: 8, background: 'rgba(59,130,246,0.05)' }}>
                                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
                                                    <div style={{ flex: 1, minWidth: 180 }}>
                                                        {sh(12, '78%')}
                                                        {sh(10, '46%')}
                                                    </div>
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.4rem', flexShrink: 0 }}>
                                                        {['Q', 'E', 'T', 'A'].map(label => (
                                                            <div key={label} style={{ textAlign: 'center', minWidth: 32 }}>
                                                                {sh(8, 16, 4)}
                                                                {sh(14, 30, 4)}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </main>
                </div>

                <div style={{ display: 'none' }} />
            </div>

            <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 99, background: 'var(--admin-card)', borderTop: '1px solid var(--admin-border)', padding: '0.75rem 1rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                {sh(34, 100, 8)}
                {sh(34, 110, 8)}
            </div>
        </>
    );
}

function SupervisorMporShowSkeleton() {
    return (
        <>
            <style>{SHIMMER}</style>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={SK}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', minWidth: 0 }}>
                            {sh(42, 42, 12)}
                            <div style={{ minWidth: 0 }}>
                                {sh(12, '110px')}
                                {sh(22, '220px')}
                                {sh(10, '150px')}
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid var(--admin-border-strong)', borderRadius: 10, padding: '0.4rem 0.65rem', background: 'var(--admin-bg-secondary)' }}>
                                {sh(28, 24, 6)}
                                {sh(20, 110, 6)}
                                {sh(28, 24, 6)}
                            </div>
                            {sh(34, 100, 8)}
                            {sh(34, 110, 8)}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                    {[0, 1, 2].map(i => (
                        <div key={i} style={SK}>
                            {sh(10, '36%')}
                            {sh(28, '48%')}
                            {sh(10, '70%')}
                        </div>
                    ))}
                </div>

                <div style={SK}>
                    {sh(14, '28%')}
                    {sh(10, '80%')}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginTop: '0.9rem' }}>
                        {[0, 1, 2, 3].map(i => (
                            <div key={i} style={{ padding: '0.95rem', borderRadius: 12, border: '1px solid var(--admin-border)', background: 'var(--admin-bg-secondary)' }}>
                                {sh(10, '42%')}
                                {sh(24, '52%')}
                                {sh(10, '64%')}
                            </div>
                        ))}
                    </div>
                </div>

                <div style={SK}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.9rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {sh(14, '34%')}
                        {sh(10, '18%')}
                    </div>
                    <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid var(--admin-border)' }}>
                        <div style={{ minWidth: 880 }}>
                            <div style={{ display: 'flex', gap: '0.5rem', padding: '0.55rem 0.75rem', borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-bg-secondary)' }}>
                                {sh(10, '220px')}
                                {sh(10, '30%')}
                                {sh(10, '20%')}
                                {sh(10, '20%')}
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', padding: '0.4rem 0.75rem', borderBottom: '2px solid var(--admin-border)', background: 'var(--admin-bg-secondary)' }}>
                                {[220, 40, 40, 40, 40, 55, 40, 40, 40, 40, 55, 40, 40, 40, 40, 55].map((w, i) => (
                                    <div key={i} style={{ width: w, height: 9, flexShrink: 0, borderRadius: 3, background: 'linear-gradient(90deg,var(--admin-border) 25%,var(--admin-bg-secondary) 50%,var(--admin-border) 75%)', backgroundSize: '800px 100%', animation: 'sk-shimmer 1.4s infinite linear' }} />
                                ))}
                            </div>
                            {[0, 1, 2, 3, 4, 5].map(i => (
                                <div key={i} style={{ display: 'flex', gap: '0.5rem', padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--admin-border)', alignItems: 'center' }}>
                                    {[220, 40, 40, 40, 40, 55, 40, 40, 40, 40, 55, 40, 40, 40, 40, 55].map((w, j) => (
                                        <div key={j} style={{ width: w, height: 11, flexShrink: 0, borderRadius: 3, background: 'linear-gradient(90deg,var(--admin-border) 25%,var(--admin-bg-secondary) 50%,var(--admin-border) 75%)', backgroundSize: '800px 100%', animation: 'sk-shimmer 1.4s infinite linear' }} />
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
                    {[0, 1, 2, 3].map(i => (
                        <div key={i} style={{ ...SK, padding: '1rem', textAlign: 'center' }}>
                            {sh(18, 18, 4)}
                            {sh(12, '70%')}
                            {sh(10, '52%')}
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}

function DeptHeadQarMporShowSkeleton() {
    return (
        <>
            <style>{SHIMMER}</style>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={SK}>
                    <div style={{ marginBottom: '1rem' }}>
                        {sh(12, 92, 99)}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', minWidth: 0, flex: 1 }}>
                            {avatar(52)}
                            <div style={{ minWidth: 0, flex: 1 }}>
                                {sh(10, '120px')}
                                {sh(22, '220px')}
                                {sh(10, '140px')}
                            </div>
                        </div>
                        {sh(28, 92, 8)}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', marginTop: '1.25rem', overflowX: 'auto', paddingBottom: '0.1rem' }}>
                        {[0, 1, 2].map((i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: i === 0 ? 'var(--admin-accent)' : 'var(--admin-bg-secondary)', border: `2px solid ${i === 0 ? 'var(--admin-accent)' : 'var(--admin-border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        {i === 0 ? <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#fff' }} /> : null}
                                    </div>
                                    {sh(9, i === 0 ? '52px' : i === 1 ? '46px' : '58px', 4)}
                                    {sh(8, i === 0 ? '42px' : i === 1 ? '40px' : '44px', 4)}
                                </div>
                                {i < 2 && <div style={{ height: 2, flex: 1, background: 'var(--admin-border)', margin: '0 0.25rem', marginBottom: '1.5rem', minWidth: 20 }} />}
                            </div>
                        ))}
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0.75rem' }}>
                    {[0, 1, 2].map(i => (
                        <div key={i} style={SK}>
                            {sh(10, '42%')}
                            {sh(28, '36%')}
                            {sh(10, '58%')}
                        </div>
                    ))}
                </div>

                <div style={SK}>
                    <div style={{ marginBottom: '1rem' }}>
                        {sh(14, '42%')}
                    </div>
                    <div style={{ overflowX: 'auto', borderRadius: 'var(--admin-radius)', border: '1px solid var(--admin-border-strong)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 880 }}>
                            <thead>
                                <tr style={{ background: 'var(--admin-bg-secondary)' }}>
                                    <th style={{ padding: '0.55rem 0.85rem', borderBottom: '1px solid var(--admin-border)', textAlign: 'left', minWidth: 220 }}>{sh(10, '22%')}</th>
                                    <th style={{ padding: '0.55rem 0.5rem', borderBottom: '1px solid var(--admin-border)' }}>{sh(10, '12%')}</th>
                                    <th style={{ padding: '0.55rem 0.5rem', borderBottom: '1px solid var(--admin-border)' }}>{sh(10, '12%')}</th>
                                    <th style={{ padding: '0.55rem 0.5rem', borderBottom: '1px solid var(--admin-border)' }}>{sh(10, '12%')}</th>
                                    <th style={{ padding: '0.55rem 0.85rem', borderBottom: '1px solid var(--admin-border)', textAlign: 'right' }}>{sh(10, '8%')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[0, 1, 2, 3, 4].map(i => (
                                    <tr key={i}>
                                        <td style={{ padding: '0.8rem 0.85rem', borderBottom: '1px solid var(--admin-border)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                                                {avatar(34)}
                                                <div style={{ flex: 1 }}>
                                                    {sh(11, '58%')}
                                                    {sh(10, '42%')}
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '0.8rem 0.5rem', borderBottom: '1px solid var(--admin-border)' }}>{sh(11, '70%')}</td>
                                        <td style={{ padding: '0.8rem 0.5rem', borderBottom: '1px solid var(--admin-border)' }}>{sh(11, '66%')}</td>
                                        <td style={{ padding: '0.8rem 0.5rem', borderBottom: '1px solid var(--admin-border)' }}>{sh(11, '64%')}</td>
                                        <td style={{ padding: '0.8rem 0.85rem', borderBottom: '1px solid var(--admin-border)', textAlign: 'right' }}>{sh(30, 72, 8)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div style={SK}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                        <div style={{ ...SK, padding: '1rem 1.25rem' }}>
                            {sh(10, '28%')}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
                                {avatar(40)}
                                <div style={{ flex: 1 }}>
                                    {sh(11, '62%')}
                                    {sh(10, '44%')}
                                    {sh(10, '30%')}
                                </div>
                            </div>
                        </div>
                        <div style={{ ...SK, padding: '1rem 1.25rem', borderLeft: '3px solid var(--admin-accent)' }}>
                            {sh(10, '24%')}
                            <div style={{ marginTop: '0.5rem' }}>
                                {sh(11, '48%')}
                                {sh(10, '28%')}
                                {sh(10, '34%')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}


// ── Skeleton map: url pattern → component ────────────────────────────────────

const skeletons = [

    // ORS
    [/\/ors$/, () => (
        <>
            <style>{SHIMMER}</style>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.75rem', marginBottom: '0.75rem' }}>
                {[0,1,2,3].map(i => <div key={i} style={SK}>{sh(10,'50%')}{sh(28,'40%')}</div>)}
            </div>
            <div style={{ ...SK, marginBottom: '0.75rem' }}>{sh(18)}</div>
            <div style={SK}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>{sh(20,160)}{sh(32,110,8)}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '0.35rem' }}>
                    {Array.from({length:35}).map((_,i) => <div key={i} style={{ height:80, borderRadius:8, background:'linear-gradient(90deg,var(--admin-border) 25%,var(--admin-bg-secondary) 50%,var(--admin-border) 75%)', backgroundSize:'800px 100%', animation:'sk-shimmer 1.4s infinite linear' }} />)}
                </div>
            </div>
        </>
    )],

    // UWP Index
    [/\/uwp$/, () => (
        <>
            <style>{SHIMMER}</style>
            <div style={SK}>
                {sh(20,'30%')}{sh(36,undefined,8)}
                <div style={{ display:'flex', gap:5, margin:'0.75rem 0' }}>{[0,1,2,3,4].map(i=><div key={i}>{pill(72)}</div>)}</div>
                {[0,1,2,3].map(i=>(
                    <div key={i} style={{ display:'flex', gap:'1rem', padding:'0.75rem 0', borderBottom:'1px solid var(--admin-border)', alignItems:'center' }}>
                        {sh(14,'20%')}{sh(14,'30%')}{sh(22,60,99)}{sh(12,'15%')}
                        <div style={{ marginLeft:'auto' }}>{sh(30,64,6)}</div>
                    </div>
                ))}
            </div>
        </>
    )],

    // Employee MPOR — header(icon+title+month-nav+export+submit) + big table
    [/\/employee\/mpor$/, () => {
        const bp = useBreakpoint();
        const isMobile = bp === 'mobile';
        return (
            <>
                <style>{SHIMMER}</style>
                <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
                    {/* Header card */}
                    <div style={SK}>
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'0.5rem', flexWrap:'wrap' }}>
                            <div style={{ display:'flex', alignItems:'center', gap:'0.85rem', minWidth: 0, flex: isMobile ? '1 1 100%' : '0 1 auto' }}>
                                <div style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0, background: 'linear-gradient(90deg,var(--admin-border) 25%,var(--admin-bg-secondary) 50%,var(--admin-border) 75%)', backgroundSize: '800px 100%', animation: 'sk-shimmer 1.4s infinite linear' }} />
                                {!isMobile && <div style={{ minWidth: 0 }}>{sh(28, 90)}</div>}
                            </div>
                            <div style={{ display:'flex', gap:'0.5rem', alignItems:'center', flexShrink: 0 }}>
                                <div style={{ display:'flex', alignItems:'center', gap:'0.4rem', border:'1px solid var(--admin-border-strong)', borderRadius:10, padding:'0.4rem 0.65rem', background:'var(--admin-bg-secondary)' }}>
                                    {sh(28,24,6)}{sh(20, isMobile ? 72 : 110, 6)}{sh(28,24,6)}
                                </div>
                                {sh(34, 34, 10)}
                                {sh(34, 34, 10)}
                            </div>
                        </div>
                    </div>

                    {/* Stats row — mirrors actual page auto-fit grid */}
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:'0.75rem' }}>
                        {[0,1,2].map(i => (
                            <div key={i} style={SK}>
                                {sh(10, '45%')}
                                {sh(28, '40%')}
                                {sh(10, '55%')}
                            </div>
                        ))}
                    </div>

                    {/* Table / mobile cards card */}
                    <div style={SK}>
                        {sh(14, '34%')}
                        {isMobile ? (
                            <div style={{ marginTop:'0.9rem' }}>
                                <div style={{ display:'flex', borderBottom:'1px solid var(--admin-border)', marginBottom:'1rem' }}>
                                    {[0,1,2].map(i => <div key={i} style={{ flex:1, padding:'0.6rem 0.4rem' }}>{sh(10, i === 0 ? '70%' : i === 1 ? '60%' : '74%')}</div>)}
                                </div>
                                {[0,1,2].map(i => (
                                    <div key={i} style={{ background:'var(--admin-card)', border:'1px solid var(--admin-border-strong)', borderRadius:'var(--admin-radius)', padding:'1rem', marginBottom:'0.5rem' }}>
                                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'0.75rem', gap:'0.75rem' }}>
                                            <div style={{ flex:1 }}>{sh(11, '72%')}{sh(10, '48%')}</div>
                                            {pill(72, 24)}
                                        </div>
                                        <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:'0.5rem' }}>
                                            {[1,2,3,4].map(w => (
                                                <div key={w} style={{ textAlign:'center' }}>
                                                    {sh(9, 18, 4)}
                                                    {sh(14, '70%')}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{ overflowX:'auto', marginTop:'0.9rem', borderRadius:8, border:'1px solid var(--admin-border)' }}>
                                <div style={{ minWidth:880 }}>
                                    <div style={{ display:'flex', gap:'0.5rem', padding:'0.55rem 0.75rem', borderBottom:'1px solid var(--admin-border)', background:'var(--admin-bg-secondary)' }}>
                                        {sh(10,'220px')}{sh(10,'30%')}{sh(10,'20%')}{sh(10,'20%')}
                                    </div>
                                    <div style={{ display:'flex', gap:'0.5rem', padding:'0.4rem 0.75rem', borderBottom:'2px solid var(--admin-border)', background:'var(--admin-bg-secondary)' }}>
                                        {[220,40,40,40,40,55,40,40,40,40,55,40,40,40,40,55].map((w,i)=>(
                                            <div key={i} style={{ width:w, height:9, flexShrink:0, borderRadius:3, background:'linear-gradient(90deg,var(--admin-border) 25%,var(--admin-bg-secondary) 50%,var(--admin-border) 75%)', backgroundSize:'800px 100%', animation:'sk-shimmer 1.4s infinite linear' }} />
                                        ))}
                                    </div>
                                    <div style={{ padding:'0.4rem 0.75rem', borderBottom:'1px solid var(--admin-border)', background:'var(--admin-bg-secondary)' }}>{sh(9,'40%')}</div>
                                    {[0,1,2,3,4,5].map(i=>(
                                        <div key={i} style={{ display:'flex', gap:'0.5rem', padding:'0.5rem 0.75rem', borderBottom:'1px solid var(--admin-border)', alignItems:'center' }}>
                                            {[220,40,40,40,40,55,40,40,40,40,55,40,40,40,40,55].map((w,j)=>(
                                                <div key={j} style={{ width:w, height:11, flexShrink:0, borderRadius:3, background:'linear-gradient(90deg,var(--admin-border) 25%,var(--admin-bg-secondary) 50%,var(--admin-border) 75%)', backgroundSize:'800px 100%', animation:'sk-shimmer 1.4s infinite linear' }} />
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Authorization footer */}
                    <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:'0.75rem' }}>
                        <div style={SK}>
                            {sh(10, '28%')}
                            <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', marginTop:'0.75rem' }}>
                                {avatar(40)}
                                <div style={{ flex: 1 }}>
                                    {sh(11, '60%')}
                                    {sh(10, '42%')}
                                    {sh(10, '30%')}
                                </div>
                            </div>
                        </div>
                        <div style={{ ...SK, borderLeft: '3px solid var(--admin-accent)' }}>
                            {sh(10, '24%')}
                            <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', marginTop:'0.75rem' }}>
                                {avatar(40)}
                                <div style={{ flex: 1 }}>
                                    {sh(11, '48%')}
                                    {sh(10, '28%')}
                                    {sh(10, '34%')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </>
        );
    }],

    // Team Tasks
    [/\/team-tasks$/, () => (
        <>
            <style>{SHIMMER}</style>
            <div style={SK}>
                {sh(20,'40%')}{sh(34,undefined,8)}
                <div style={{ display:'flex', gap:4, margin:'0.75rem 0' }}>{[0,1,2,3,4,5].map(i=><div key={i}>{pill(72)}</div>)}</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'0.75rem' }}>
                    {Array.from({length:8}).map((_,i)=>(
                        <div key={i} style={{ ...SK, padding:'1rem', display:'flex', flexDirection:'column', gap:'0.5rem' }}>
                            <div style={{ display:'flex', gap:'0.5rem', alignItems:'center' }}>{avatar(28)}{sh(12,'50%')}</div>
                            {sh(12)}{sh(12,'80%')}
                        </div>
                    ))}
                </div>
            </div>
        </>
    )],

    // ORS Monitoring
    [/\/ors-monitoring$/, () => (
        <>
            <style>{SHIMMER}</style>
            <div style={{ display:'grid', gridTemplateColumns:'380px 1fr', gap:'1rem', height:'calc(100vh - 120px)' }}>
                <div style={{ ...SK, display:'flex', flexDirection:'column', gap:'0.75rem' }}>
                    {sh(16,'60%')}{sh(34,undefined,8)}
                    <div style={{ display:'flex', gap:4 }}>{sh(30,undefined,8)}{sh(30,undefined,8)}</div>
                    {[0,1,2,3,4].map(i=>(
                        <div key={i} style={{ padding:'0.75rem', borderRadius:10, border:'1px solid var(--admin-border)', display:'flex', flexDirection:'column', gap:'0.5rem' }}>
                            <div style={{ display:'flex', gap:'0.5rem' }}>{avatar(24)}{sh(13,'60%')}</div>
                            {sh(11)}{sh(11,'70%')}
                        </div>
                    ))}
                </div>
                <div style={{ ...SK, display:'flex', flexDirection:'column', gap:'1rem' }}>
                    {sh(18,'40%')}{sh(13,'70%')}{sh(120,undefined,10)}{sh(80,undefined,10)}
                </div>
            </div>
        </>
    )],

    // My Tasks
    [/\/my-tasks$/, () => (
        <>
            <style>{SHIMMER}</style>
            <div style={{ marginBottom:'0.5rem' }}>{sh(26,120,99)}</div>
            <div style={SK}>
                {sh(42,undefined,8)}
                <div style={{ display:'flex', gap:4, margin:'0.75rem 0', overflowX:'auto' }}>
                    {[80,60,80,65,80,75].map((w,i)=><div key={i}>{pill(w)}</div>)}
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:'0.75rem' }}>
                    {Array.from({length:8}).map((_,i)=>(
                        <div key={i} style={{ borderRadius:12, border:'1px solid var(--admin-border)', padding:'1rem', borderTop:'3px solid var(--admin-border-strong)', display:'flex', flexDirection:'column', gap:'0.5rem' }}>
                            {sh(11,undefined,4)}{sh(11,'75%',4)}
                            <div style={{ display:'flex', gap:'0.4rem', marginTop:4 }}>{sh(18,60,99)}{sh(18,55,99)}{sh(18,50,99)}</div>
                        </div>
                    ))}
                </div>
            </div>
        </>
    )],

    // Employee IPCR Preview — back+title+score/export + function sections
    [/\/employee\/accomplishment\/ipcr$/, () => (
        <EmployeeAccomplishmentIpcrSkeleton />
    )],

    // Admin HRIS Integration
    [/\/administrator\/hris-integration$/, () => (
        <AdminHrisIntegrationSkeleton />
    )],

    // Admin Database
    [/\/administrator\/database$/, () => (
        <AdminDatabaseSkeleton />
    )],

    // Admin ML Control Center
    [/\/administrator\/ml$/, () => (
        <AdminMachineLearningSkeleton />
    )],

    // Admin Reports
    [/\/administrator\/reports$/, () => (
        <AdminReportsSkeleton />
    )],

    // Supervisor UWP Show
    [/\/supervisor\/uwp\/\d+$/, () => (
        <SupervisorUwpShowSkeleton />
    )],

    // Supervisor MPOR Show
    [/\/supervisor\/mpor\/\d+$/, () => (
        <SupervisorMporShowSkeleton />
    )],

    // Dept Head QAR MPOR Show
    [/\/dept-head\/qar\/mpor\/\d+$/, () => (
        <DeptHeadQarMporShowSkeleton />
    )],

    // Supervisor UWP Editor
    [/\/supervisor\/uwp\/\d+\/editor$/, () => (
        <SupervisorUwpEditorSkeleton />
    )],

    // Employee SMPOR Preview — back+title+3 tabs card + table card
    [/\/employee\/accomplishment\/smpor$/, () => (
        <>
            <style>{SHIMMER}</style>
            <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
                {/* Header + tabs card */}
                <div style={{ ...SK, padding:'1.1rem 1.25rem 0' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1rem' }}>
                        <div>{sh(12,60,4)}{sh(20,'180px')}{sh(10,'140px')}</div>
                        {sh(32,100,8)}
                    </div>
                    <div style={{ display:'flex', gap:0, borderTop:'1px solid var(--admin-border)' }}>
                        {[140,160,100].map((w,i)=>(
                            <div key={i} style={{ width:w, height:40, borderBottom:'2px solid transparent', background:'linear-gradient(90deg,var(--admin-border) 25%,var(--admin-bg-secondary) 50%,var(--admin-border) 75%)', backgroundSize:'800px 100%', animation:'sk-shimmer 1.4s infinite linear', margin:'0 4px' }} />
                        ))}
                    </div>
                </div>
                {/* Table card */}
                <div style={SK}>
                    <div style={{ overflowX:'auto', borderRadius:8, border:'1px solid var(--admin-border)' }}>
                        <div style={{ minWidth:600 }}>
                            <div style={{ display:'flex', gap:'1rem', padding:'0.5rem 0.75rem', borderBottom:'2px solid var(--admin-border)', background:'var(--admin-bg-secondary)' }}>
                                {[200,80,80,80,80,80].map((w,i)=><div key={i} style={{ width:w, height:10, flexShrink:0, borderRadius:3, background:'linear-gradient(90deg,var(--admin-border) 25%,var(--admin-bg-secondary) 50%,var(--admin-border) 75%)', backgroundSize:'800px 100%', animation:'sk-shimmer 1.4s infinite linear' }} />)}
                            </div>
                            {[0,1,2,3,4,5].map(i=>(
                                <div key={i} style={{ display:'flex', gap:'1rem', padding:'0.55rem 0.75rem', borderBottom:'1px solid var(--admin-border)' }}>
                                    {[200,80,80,80,80,80].map((w,j)=><div key={j} style={{ width:w, height:11, flexShrink:0, borderRadius:3, background:'linear-gradient(90deg,var(--admin-border) 25%,var(--admin-bg-secondary) 50%,var(--admin-border) 75%)', backgroundSize:'800px 100%', animation:'sk-shimmer 1.4s infinite linear' }} />)}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </>
    )],

    // Employee Accomplishment
    [/\/employee\/accomplishment$/, () => (
        <>
            <style>{SHIMMER}</style>
            <div style={{ ...SK, marginBottom:'0.75rem' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
                    {sh(16,'30%')}{sh(22,80,99)}
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', position:'relative' }}>
                    <div style={{ position:'absolute', top:17, left:'5%', right:'5%', height:2, background:'var(--admin-border)' }} />
                    {[0,1,2,3,4].map(i=>(
                        <div key={i} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6, flex:1, position:'relative' }}>
                            {avatar(34)}{sh(10,48,4)}
                        </div>
                    ))}
                </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:'0.75rem', marginBottom:'0.75rem' }}>
                {[0,1].map(i=><div key={i} style={SK}>{sh(10,'40%')}{sh(28,'30%')}{sh(10,'55%')}</div>)}
            </div>
            <div style={SK}>{sh(10,'25%')}{sh(100,undefined,8)}{sh(72,undefined,8)}{sh(40,120,8)}</div>
        </>
    )],

    // IPCR Target
    [/\/ipcr-target$/, () => (
        <>
            <style>{SHIMMER}</style>
            <div style={{ ...SK, marginBottom:'0.75rem' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div style={{ display:'flex', gap:'0.5rem', alignItems:'center' }}>{sh(20,120,99)}{sh(20,80,99)}{sh(20,60,99)}</div>
                    <div style={{ display:'flex', gap:'0.5rem' }}>{sh(36,110,8)}{sh(36,100,8)}</div>
                </div>
            </div>
            <div style={{ display:'flex', gap:'0.75rem', marginBottom:'0.75rem', flexWrap:'wrap' }}>
                {[0,1,2].map(i=><div key={i} style={{ ...SK, flex:1, minWidth:140 }}>{sh(10,'50%')}{sh(14,'70%')}</div>)}
            </div>
            {['#f59e0b','#8b5cf6','#10b981'].map((c,g)=>(
                <div key={g} style={{ ...SK, marginBottom:'0.75rem', borderLeft:`3px solid ${c}` }}>
                    <div style={{ height:32, borderRadius:6, marginBottom:'0.75rem', background:'linear-gradient(90deg,var(--admin-border) 25%,var(--admin-bg-secondary) 50%,var(--admin-border) 75%)', backgroundSize:'800px 100%', animation:'sk-shimmer 1.4s infinite linear' }} />
                    {[0,1,2].map(i=>(
                        <div key={i} style={{ display:'flex', alignItems:'center', gap:'0.75rem', padding:'0.6rem 0', borderBottom:'1px solid var(--admin-border)' }}>
                            {avatar(28)}<div style={{ flex:1 }}>{sh(11,'80%',4)}{sh(9,'45%',4)}</div>{sh(22,70,6)}
                        </div>
                    ))}
                </div>
            ))}
        </>
    )],



    // Supervisor MPOR
    [/\/supervisor\/mpor$/, () => (
        <>
            <style>{SHIMMER}</style>
            <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
                <div style={SK}>
                    <div style={{ display:'flex', gap:'0.65rem', marginBottom:'0.6rem' }}>{sh(42,undefined,8)}{sh(42,160,8)}</div>
                    <div style={{ display:'flex', gap:4 }}>{[60,80,75,75].map((w,i)=><div key={i}>{pill(w)}</div>)}</div>
                </div>
                <div style={SK}>
                    <div style={{ display:'flex', gap:'1rem', paddingBottom:'0.6rem', borderBottom:'1px solid var(--admin-border-strong)', marginBottom:'0.25rem' }}>
                        {sh(10,'30%')}{sh(10,'12%')}{sh(10,'15%')}{sh(10,'12%')}{sh(10,70)}
                    </div>
                    {[0,1,2,3,4].map(i=>(
                        <div key={i} style={{ display:'flex', gap:'1rem', padding:'0.85rem 0', borderBottom:'1px solid var(--admin-border)', alignItems:'center' }}>
                            <div style={{ display:'flex', gap:'0.6rem', alignItems:'center', flex:'0 0 30%' }}>
                                {avatar(40)}<div>{sh(12,'80%')}{sh(9,'60%')}</div>
                            </div>
                            {sh(11,'12%')}{sh(11,'14%')}{sh(22,72,99)}{sh(32,80,8)}
                        </div>
                    ))}
                </div>
            </div>
        </>
    )],

    // Supervisor IDP
    [/\/supervisor\/idp$/, () => (
        <>
            <style>{SHIMMER}</style>
            <div style={SK}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1rem' }}>
                    <div>{sh(16,'160px')}{sh(10,'130px')}</div>{sh(22,65,99)}
                </div>
                {sh(36,undefined,8)}
                <div style={{ display:'flex', gap:4, margin:'0.75rem 0' }}>{[55,75,75,100].map((w,i)=><div key={i}>{pill(w)}</div>)}</div>
                {[0,1,2,3,4].map(i=>(
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:'0.85rem', padding:'0.85rem 0.75rem', marginBottom:'0.4rem', borderRadius:10, borderLeft:'3px solid var(--admin-border-strong)' }}>
                        {avatar(40)}
                        <div style={{ flex:1 }}>
                            <div style={{ display:'flex', gap:'0.5rem', alignItems:'center', marginBottom:5 }}>{sh(14,'45%')}{sh(20,90,99)}</div>
                            {sh(10,'60%')}{sh(10,'40%')}
                        </div>
                        <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>{sh(18,45,99)}{sh(14,14,14)}</div>
                    </div>
                ))}
            </div>
        </>
    )],

    // Supervisor Accomplishment
    [/\/supervisor\/accomplishment$/, () => (
        <>
            <style>{SHIMMER}</style>
            <div style={SK}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1rem' }}>
                    <div>{sh(16,'180px')}{sh(10,'140px')}</div>{sh(22,80,99)}
                </div>
                {sh(42,undefined,8)}
                <div style={{ display:'flex', gap:4, margin:'0.75rem 0' }}>{[55,75,75,75].map((w,i)=><div key={i}>{pill(w)}</div>)}</div>
                {[0,1,2,3,4].map(i=>(
                    <div key={i} style={{ display:'flex', gap:'0.75rem', padding:'0.85rem 0', borderBottom:'1px solid var(--admin-border)', alignItems:'center', borderLeft:'3px solid var(--admin-border-strong)', paddingLeft:'0.75rem' }}>
                        {avatar(36)}<div style={{ flex:1 }}>{sh(13,'55%')}{sh(9,'35%')}</div>{sh(22,85,99)}
                        <div style={{ width:16, height:16, borderRadius:3, background:'linear-gradient(90deg,var(--admin-border) 25%,var(--admin-bg-secondary) 50%,var(--admin-border) 75%)', backgroundSize:'800px 100%', animation:'sk-shimmer 1.4s infinite linear' }} />
                    </div>
                ))}
            </div>
        </>
    )],

    // PMT OPCR Review Show
    [/\/pmt\/opcr-review\/\d+/, () => (
        <><style>{SHIMMER}</style><TwoPanelSkeleton actionCount={3} /></>
    )],

    // PMT OPCR Review Index
    [/\/pmt\/opcr-review$/, () => (
        <>
            <style>{SHIMMER}</style>
            <div style={{ ...SK, padding:'1.75rem' }}>
                {sh(18,'35%')}{sh(11,'55%')}
                <div style={{ margin:'1rem 0 0.5rem' }}>{sh(40,undefined,8)}</div>
                <div style={{ display:'flex', gap:4, margin:'0.75rem 0' }}>{[55,80,75,75].map((w,i)=><div key={i}>{pill(w)}</div>)}</div>
                {[0,1,2,3,4].map(i=>(
                    <div key={i} style={{ display:'flex', gap:'1rem', padding:'0.75rem 0', borderBottom:'1px solid var(--admin-border)', alignItems:'center' }}>
                        {sh(13,'22%')}{sh(13,'12%')}{sh(13,'10%')}{sh(22,80,99)}{sh(11,'12%')}
                        <div style={{ marginLeft:'auto' }}>{sh(32,32,6)}</div>
                    </div>
                ))}
            </div>
        </>
    )],

    // PMT Performance Overview
    [/\/pmt\/performance-overview$/, () => (
        <>
            <style>{SHIMMER}</style>
            <div style={{ ...SK, marginBottom:'0.75rem' }}>
                {sh(40,undefined,8)}
                <div style={{ display:'flex', gap:4, marginTop:'0.75rem', flexWrap:'wrap' }}>
                    {[55,110,135,105,115,65].map((w,i)=><div key={i}>{pill(w,30)}</div>)}
                </div>
            </div>
            {sh(10,'30%')}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:'0.85rem', marginTop:'0.75rem' }}>
                {Array.from({length:6}).map((_,i)=>(
                    <div key={i} style={{ ...SK, borderLeft:'4px solid var(--admin-border-strong)' }}>
                        <div style={{ display:'flex', gap:'0.75rem', marginBottom:'0.75rem' }}>
                            {avatar(48)}<div style={{ flex:1 }}>{sh(13,'70%')}{sh(10,'50%')}</div>
                        </div>
                        {sh(9,'55%')}
                        <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', marginTop:'0.5rem' }}>
                            {avatar(52)}<div>{sh(11,'60%')}{sh(22,90,99)}</div>
                        </div>
                    </div>
                ))}
            </div>
        </>
    )],

    // PMT QAR Show
    [/\/pmt\/qar\/\d+/, () => (
        <>
            <style>{SHIMMER}</style>
            <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
                <div style={SK}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'1rem' }}>{sh(12,110,6)}{sh(30,110,8)}</div>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'0.85rem' }}>
                            {avatar(52)}<div>{sh(9,'80px')}{sh(18,'200px')}{sh(11,'150px')}</div>
                        </div>
                        {sh(26,55,8)}
                    </div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'0.65rem' }}>
                    {[0,1,2].map(i=><div key={i} style={SK}>{sh(9,'55%')}{sh(28,'35%')}</div>)}
                </div>
                <div style={SK}>
                    {sh(13,'30%')}
                    <div style={{ display:'flex', gap:'0.5rem', margin:'0.75rem 0', alignItems:'center' }}>
                        {sh(34,undefined,8)}
                        <div style={{ display:'flex', gap:'0.3rem', flexShrink:0 }}>{[42,65,65,65].map((w,i)=><div key={i}>{pill(w,30)}</div>)}</div>
                    </div>
                    <div style={{ borderRadius:8, border:'1px solid var(--admin-border-strong)', overflow:'hidden' }}>
                        {[0,1,2,3,4].map(i=>(
                            <div key={i} style={{ display:'flex', gap:'0.75rem', padding:'0.7rem 0.85rem', borderBottom:'1px solid var(--admin-border)', alignItems:'center' }}>
                                {avatar(36)}<div style={{ flex:1 }}>{sh(13,'45%')}{sh(10,'30%')}</div>{sh(13,'12%')}{sh(28,70,6)}
                            </div>
                        ))}
                    </div>
                </div>
                <div style={SK}>
                    {sh(13,'32%')}
                    <div style={{ overflowX:'auto', marginTop:'0.75rem', borderRadius:8, border:'1px solid var(--admin-border)' }}>
                        <div style={{ minWidth:820 }}>
                            <div style={{ display:'flex', gap:'1rem', padding:'0.55rem 0.75rem', borderBottom:'2px solid var(--admin-border)', background:'var(--admin-bg-secondary)' }}>
                                {[70,160,200,120,110,90,130].map((w,i)=><div key={i} style={{ width:w, height:10, flexShrink:0, borderRadius:4, background:'linear-gradient(90deg,var(--admin-border) 25%,var(--admin-bg-secondary) 50%,var(--admin-border) 75%)', backgroundSize:'800px 100%', animation:'sk-shimmer 1.4s infinite linear' }} />)}
                            </div>
                            {[0,1,2,3,4].map(i=>(
                                <div key={i} style={{ display:'flex', gap:'1rem', padding:'0.65rem 0.75rem', borderBottom:'1px solid var(--admin-border)' }}>
                                    {[70,160,200,120,110,90,130].map((w,j)=><div key={j} style={{ width:w, height:11, flexShrink:0, borderRadius:4, background:'linear-gradient(90deg,var(--admin-border) 25%,var(--admin-bg-secondary) 50%,var(--admin-border) 75%)', backgroundSize:'800px 100%', animation:'sk-shimmer 1.4s infinite linear' }} />)}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div style={{ ...SK, display:'flex', justifyContent:'flex-end', gap:'0.6rem' }}>{sh(36,130,8)}{sh(36,120,8)}</div>
            </div>
        </>
    )],

    // PMT QAR / IDP / OPCR Accomplishment Index
    [/\/pmt\/(qar|idp|opcr-accomplishment)$/, () => (
        <>
            <style>{SHIMMER}</style>
            <div style={SK}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1rem' }}>
                    <div>{sh(16,'200px')}{sh(10,'140px')}</div>{sh(22,80,99)}
                </div>
                {sh(40,undefined,8)}
                <div style={{ display:'flex', gap:4, margin:'0.75rem 0' }}>{[55,75,80,80].map((w,i)=><div key={i}>{pill(w)}</div>)}</div>
                {[0,1,2,3,4].map(i=>(
                    <div key={i} style={{ display:'flex', gap:'0.75rem', padding:'0.85rem 0', borderBottom:'1px solid var(--admin-border)', alignItems:'center', borderLeft:'3px solid var(--admin-border-strong)', paddingLeft:'0.75rem' }}>
                        {avatar(40)}<div style={{ flex:1 }}>{sh(13,'50%')}{sh(9,'35%')}</div>{sh(22,85,99)}
                        <div style={{ width:16, height:16, borderRadius:3, background:'linear-gradient(90deg,var(--admin-border) 25%,var(--admin-bg-secondary) 50%,var(--admin-border) 75%)', backgroundSize:'800px 100%', animation:'sk-shimmer 1.4s infinite linear' }} />
                    </div>
                ))}
            </div>
        </>
    )],



    // Dept Head OPCR Show
    [/\/dept-head\/opcr\/\d+/, () => (
        <><style>{SHIMMER}</style><TwoPanelSkeleton actionCount={2} /></>
    )],

    // Dept Head OPCR Index
    [/\/dept-head\/opcr$/, () => (
        <>
            <style>{SHIMMER}</style>
            <div style={{ ...SK, padding:'1.75rem' }}>
                <div style={{ marginBottom:'1.5rem' }}>{sh(18,'55%')}{sh(10,'35%')}</div>
                {sh(40,undefined,8)}
                <div style={{ display:'flex', gap:4, margin:'0.75rem 0' }}>{[55,65,80,75,75].map((w,i)=><div key={i}>{pill(w)}</div>)}</div>
                {[0,1,2,3].map(i=>(
                    <div key={i} style={{ display:'flex', gap:'1rem', padding:'0.75rem 0', borderBottom:'1px solid var(--admin-border)', alignItems:'center' }}>
                        {sh(13,'30%')}{sh(22,85,99)}{sh(11,'15%')}
                        <div style={{ marginLeft:'auto' }}>{sh(32,32,6)}</div>
                    </div>
                ))}
            </div>
        </>
    )],

    // Dept Head OPCR Accomplishment
    [/\/dept-head\/opcr-accomplishment$/, () => (
        <>
            <style>{SHIMMER}</style>
            <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
                <div style={{ ...SK, padding:'1rem 1.25rem', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div>{sh(16,'38%')}{sh(10,'28%')}</div>{sh(22,70,99)}
                </div>
                <div style={{ padding:'0.85rem 1.1rem', borderRadius:'var(--admin-radius)', border:'1px solid var(--admin-border)', borderLeft:'4px solid var(--admin-border-strong)', display:'flex', justifyContent:'space-between', alignItems:'center', gap:10 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>{avatar(20)}<div>{sh(14,'140px')}{sh(10,'200px')}</div></div>
                    {sh(30,90,8)}
                </div>
                <div style={{ ...SK, padding:'1.1rem 1.25rem' }}>
                    {sh(10,'30%')}{sh(36,'20%')}
                    <div style={{ height:6, borderRadius:99, background:'var(--admin-border)', margin:'0.5rem 0 0.25rem' }} />
                    {sh(9,'40%')}
                </div>
                <div style={SK}>
                    <div style={{ padding:'0.85rem 1.25rem', borderBottom:'1px solid var(--admin-border)' }}>
                        {sh(14,'32%')}
                        <div style={{ display:'flex', gap:'0.5rem', marginTop:'0.65rem', flexWrap:'wrap', alignItems:'center' }}>
                            {sh(34,undefined,8)}
                            <div style={{ display:'flex', gap:'0.3rem', flexShrink:0, marginTop:4 }}>{[42,72,80,68,106].map((w,i)=><div key={i}>{pill(w,30)}</div>)}</div>
                        </div>
                    </div>
                    {[0,1,2,3,4].map(i=>(
                        <div key={i} style={{ display:'flex', alignItems:'center', gap:'0.75rem', padding:'0.65rem 1rem', borderBottom:'1px solid var(--admin-border)' }}>
                            {avatar(28)}<div style={{ flex:1 }}>{sh(13,'40%')}</div>{sh(13,'18%')}{sh(22,70,99)}
                        </div>
                    ))}
                </div>
                <div style={{ ...SK, padding:'1.25rem' }}>
                    {sh(14,'30%')}{sh(72,undefined,8)}
                    <div style={{ height:32, borderRadius:10, background:'linear-gradient(90deg,var(--admin-border) 25%,var(--admin-bg-secondary) 50%,var(--admin-border) 75%)', backgroundSize:'800px 100%', animation:'sk-shimmer 1.4s infinite linear', margin:'1rem 0' }} />
                    <div style={{ display:'flex', justifyContent:'flex-end' }}>{sh(36,140,8)}</div>
                </div>
            </div>
        </>
    )],

    // Dept Head IDP + Accomplishment Review
    [/\/dept-head\/(idp|accomplishment-review)$/, () => (
        <>
            <style>{SHIMMER}</style>
            <div style={{ ...SK, padding:'1.25rem' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
                    <div>{sh(16,'38%')}{sh(10,'50%')}</div>{sh(22,50,99)}
                </div>
                {sh(34,undefined,8)}
                <div style={{ display:'flex', gap:4, margin:'0.6rem 0 1rem' }}>{[48,70,78,70].map((w,i)=><div key={i}>{pill(w,26)}</div>)}</div>
                {[0,1,2,3,4,5].map(i=>(
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:'0.75rem', padding:'0.85rem 0.75rem', borderRadius:10, marginBottom:6, borderLeft:'3px solid var(--admin-border)' }}>
                        {avatar(40)}<div style={{ flex:1 }}>{sh(13,'42%')}{sh(10,'28%')}{sh(9,'35%')}</div>
                        <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>{sh(20,70,99)}{sh(12,12,4)}</div>
                    </div>
                ))}
            </div>
        </>
    )],

    // Dept Head QAR
    [/\/dept-head\/qar$/, () => (
        <>
            <style>{SHIMMER}</style>
            <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
                <div style={SK}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        {sh(22,'45%',6)}
                        <div style={{ display:'flex', gap:'0.5rem' }}>{sh(34,110,10)}{sh(34,110,10)}</div>
                    </div>
                    <div style={{ display:'flex', gap:'0.4rem', marginTop:'1.25rem' }}>{[0,1].map(i=><div key={i}>{pill(110,32)}</div>)}</div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'0.65rem' }}>
                    {[0,1,2,3].map(i=><div key={i} style={SK}>{sh(10,'55%')}{sh(28,'40%')}</div>)}
                </div>
                <div style={SK}>
                    {sh(14,'30%')}
                    <div style={{ display:'flex', gap:'0.5rem', margin:'0.75rem 0', alignItems:'center' }}>
                        {sh(34,undefined,8)}
                        <div style={{ display:'flex', gap:4, flexShrink:0 }}>{[55,65,65,65].map((w,i)=><div key={i}>{pill(w,30)}</div>)}</div>
                    </div>
                    <div style={{ borderRadius:8, border:'1px solid var(--admin-border-strong)', overflow:'hidden' }}>
                        {[0,1,2,3,4].map(i=>(
                            <div key={i} style={{ display:'flex', gap:'0.75rem', padding:'0.7rem 0.85rem', borderBottom:'1px solid var(--admin-border)', alignItems:'center' }}>
                                {avatar(36)}<div style={{ flex:1 }}>{sh(13,'45%')}{sh(10,'30%')}</div>{sh(13,'12%')}{sh(22,70,99)}{sh(30,64,6)}
                            </div>
                        ))}
                    </div>
                </div>
                <div style={SK}>
                    {sh(14,'35%')}
                    <div style={{ overflowX:'auto', marginTop:'0.75rem', borderRadius:8, border:'1px solid var(--admin-border)' }}>
                        <div style={{ minWidth:820 }}>
                            <div style={{ display:'flex', gap:'1rem', padding:'0.55rem 0.75rem', borderBottom:'2px solid var(--admin-border)', background:'var(--admin-bg-secondary)' }}>
                                {[70,160,200,130,110,90,140].map((w,i)=><div key={i} style={{ width:w, height:10, flexShrink:0, borderRadius:4, background:'linear-gradient(90deg,var(--admin-border) 25%,var(--admin-bg-secondary) 50%,var(--admin-border) 75%)', backgroundSize:'800px 100%', animation:'sk-shimmer 1.4s infinite linear' }} />)}
                            </div>
                            {[0,1,2,3,4].map(i=>(
                                <div key={i} style={{ display:'flex', gap:'1rem', padding:'0.65rem 0.75rem', borderBottom:'1px solid var(--admin-border)' }}>
                                    {[70,160,200,130,110,90,140].map((w,j)=><div key={j} style={{ width:w, height:11, flexShrink:0, borderRadius:4, background:'linear-gradient(90deg,var(--admin-border) 25%,var(--admin-bg-secondary) 50%,var(--admin-border) 75%)', backgroundSize:'800px 100%', animation:'sk-shimmer 1.4s infinite linear' }} />)}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </>
    )],



    // Admin Users
    [/\/administrator\/users$/, () => (
        <>
            <style>{SHIMMER}</style>
            <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
                <div style={SK}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <div style={{ display:'flex', gap:'0.75rem', alignItems:'center' }}>
                            {sh(42,42,10)}<div>{sh(9,'80px')}{sh(22,'200px')}{sh(9,'150px')}</div>
                        </div>
                        <div style={{ display:'flex', gap:'0.5rem' }}>{sh(40,120,8)}{sh(40,160,8)}</div>
                    </div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:'0.75rem' }}>
                    {[0,1,2,3].map(i=><div key={i} style={SK}>{sh(9,'60%')}{sh(28,'35%')}{sh(9,'45%')}</div>)}
                </div>
                <div style={SK}>
                    {sh(40,undefined,8)}
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'0.5rem', marginTop:'0.5rem' }}>
                        {sh(40,undefined,8)}{sh(40,undefined,8)}{sh(40,undefined,8)}
                    </div>
                </div>
                <div style={SK}>
                    {[0,1,2,3,4,5].map(i=>(
                        <div key={i} style={{ display:'flex', gap:'0.75rem', padding:'0.75rem 0', borderBottom:'1px solid var(--admin-border)', alignItems:'center' }}>
                            {avatar(38)}<div style={{ flex:1 }}>{sh(13,'45%')}{sh(9,'30%')}</div>
                            {sh(20,65,99)}{sh(20,70,99)}{sh(20,55,99)}
                            <div style={{ display:'flex', gap:'0.4rem' }}>{sh(30,30,6)}{sh(30,30,6)}{sh(30,30,6)}</div>
                        </div>
                    ))}
                </div>
            </div>
        </>
    )],

    // Admin Offices
    [/\/administrator\/offices$/, () => (
        <>
            <style>{SHIMMER}</style>
            <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
                <div style={SK}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <div>{sh(9,'80px')}{sh(24,'180px')}{sh(9,'220px')}</div>{sh(40,110,8)}
                    </div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:'0.75rem' }}>
                    {[0,1,2,3].map(i=><div key={i} style={SK}>{sh(9,'55%')}{sh(26,'35%')}</div>)}
                </div>
                <div style={SK}>
                    {sh(40,undefined,8)}
                    <div style={{ display:'flex', gap:4, marginTop:'0.75rem' }}>{[55,65,70,90].map((w,i)=><div key={i}>{pill(w)}</div>)}</div>
                </div>
                <div style={SK}>
                    {[0,1,2,3,4,5].map(i=>(
                        <div key={i} style={{ display:'flex', gap:'1rem', padding:'0.75rem 0', borderBottom:'1px solid var(--admin-border)', alignItems:'center' }}>
                            {sh(13,'22%')}
                            <div style={{ display:'flex', gap:'0.5rem', alignItems:'center', flex:'0 0 auto' }}>
                                {avatar(32)}{sh(11,90)}
                            </div>
                            {sh(11,'8%')}{sh(20,65,99)}{sh(20,60,99)}
                            <div style={{ display:'flex', gap:'0.4rem', marginLeft:'auto' }}>{sh(30,50,6)}{sh(30,45,6)}{sh(30,80,6)}</div>
                        </div>
                    ))}
                </div>
            </div>
        </>
    )],

    // Admin Audit Logs
    [/\/administrator\/audit-logs$/, () => (
        <>
            <style>{SHIMMER}</style>
            <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
                <div style={SK}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <div style={{ display:'flex', gap:'0.85rem', alignItems:'center' }}>
                            {sh(42,42,12)}<div>{sh(9,'80px')}{sh(22,'160px')}{sh(9,'200px')}</div>
                        </div>{sh(36,110,8)}
                    </div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:'0.75rem' }}>
                    {[0,1,2,3].map(i=><div key={i} style={SK}>{sh(9,'55%')}{sh(26,'35%')}{sh(9,'45%')}</div>)}
                </div>
                <div style={SK}>
                    <div style={{ display:'flex', gap:'0.65rem', flexWrap:'wrap' }}>{sh(40,undefined,8)}{sh(40,160,8)}{sh(40,160,8)}</div>
                </div>
                <div style={SK}>
                    {[0,1,2,3,4,5,6].map(i=>(
                        <div key={i} style={{ display:'flex', gap:'0.75rem', padding:'0.85rem 0', borderBottom:'1px solid var(--admin-border)', alignItems:'flex-start' }}>
                            {avatar(36)}
                            <div style={{ flex:1 }}>
                                <div style={{ display:'flex', gap:'0.5rem', alignItems:'center', marginBottom:6 }}>{sh(13,'30%')}{sh(20,70,99)}{sh(20,90,99)}</div>
                                {sh(9,'55%')}
                            </div>
                            {sh(9,90)}
                        </div>
                    ))}
                </div>
            </div>
        </>
    )],

    // Admin Dashboard
    [/\/administrator\/?$/, () => (
        <>
            <style>{SHIMMER}</style>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:'0.75rem', marginBottom:'0.75rem' }}>
                {[0,1,2,3].map(i=><div key={i} style={SK}>{sh(9,'60%')}{sh(28,'40%')}{sh(9,'50%',4)}</div>)}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem', marginBottom:'0.75rem' }}>
                <div style={SK}>{sh(14,'50%')}{sh(180,undefined,8)}</div>
                <div style={SK}>{sh(14,'55%')}{sh(180,undefined,8)}</div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'0.75rem', marginBottom:'0.75rem' }}>
                {[0,1,2].map(i=><div key={i} style={SK}>{sh(32,32,8)}{sh(14,'65%')}{sh(10,'80%')}</div>)}
            </div>
            <div style={SK}>
                {sh(14,'25%')}
                {[0,1,2,3,4].map(i=>(
                    <div key={i} style={{ display:'flex', gap:'0.75rem', padding:'0.65rem 0', borderBottom:'1px solid var(--admin-border)', alignItems:'center' }}>
                        {avatar(34)}<div style={{ flex:1 }}>{sh(13,'40%')}{sh(9,'28%')}</div>{sh(20,65,99)}{sh(9,80)}
                    </div>
                ))}
            </div>
        </>
    )],

    // Role Dashboards
    [/\/(employee|supervisor|dept-head|pmt)\/?$/, () => (
        <>
            <style>{SHIMMER}</style>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'0.75rem', marginBottom:'0.75rem' }}>
                {[0,1,2,3].map(i=><div key={i} style={SK}>{sh(10,'55%')}{sh(32,'40%')}{sh(10,'60%',4)}</div>)}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem', marginBottom:'0.75rem' }}>
                <div style={SK}>{sh(14,'40%')}{sh(180,undefined,8)}</div>
                <div style={SK}>{sh(14,'40%')}{sh(180,undefined,8)}</div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'0.75rem', marginBottom:'0.75rem' }}>
                {[0,1,2,3].map(i=><div key={i} style={SK}>{sh(28,28,8)}{sh(14,'70%')}{sh(10,'90%')}</div>)}
            </div>
            <div style={SK}>
                {sh(16,'30%')}
                {[0,1,2,3].map(i=>(
                    <div key={i} style={{ display:'flex', gap:'1rem', padding:'0.6rem 0', borderBottom:'1px solid var(--admin-border)' }}>
                        {sh(12,'45%')}{sh(20,70,99)}{sh(12,'20%')}
                    </div>
                ))}
            </div>
        </>
    )],

    // Employee History
    [/\/employee\/history/, () => (
        <>
            <style>{SHIMMER}</style>
            <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
                {/* Header card: avatar + name + period */}
                <div style={SK}>
                    <div style={{ display:'flex', alignItems:'center', gap:'1rem' }}>
                        {avatar(52)}
                        <div style={{ flex:1 }}>{sh(18,'45%')}{sh(10,'30%')}{sh(10,'55%')}</div>
                    </div>
                </div>
                {/* Tab pills */}
                <div style={{ display:'flex', gap:'0.35rem' }}>
                    {[100,140,90].map((w,i)=><div key={i}>{pill(w,34)}</div>)}
                </div>
                {/* Current period card */}
                <div style={{ ...SK, borderLeft:'4px solid var(--admin-border)' }}>
                    {sh(9,'25%')}{sh(32,'15%')}{sh(16,'40%')}
                </div>
                {/* 4 stat cards */}
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:'0.75rem' }}>
                    {[0,1,2,3].map(i=>(
                        <div key={i} style={{ ...SK, padding:'1rem' }}>
                            {sh(18,20,4)}{sh(28,'50%')}{sh(10,'60%')}
                        </div>
                    ))}
                </div>
                {/* Trend chart card */}
                <div style={{ ...SK, padding:'1.1rem 1.25rem' }}>
                    {sh(10,'25%')}{sh(80,undefined,8)}
                </div>
            </div>
        </>
    )],

    // Profile
    [/\/profile$/, () => (
        <>
            <style>{SHIMMER}</style>
            <div style={{ display:'grid', gridTemplateColumns:'minmax(280px,340px) minmax(0,1fr)', gap:'1rem' }}>
                <div style={{ display:'grid', gap:'1rem' }}>
                    <div style={{ ...SK, padding:'1.5rem' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'0.95rem', marginBottom:'1.25rem' }}>
                            {sh(78,78,18)}<div style={{ flex:1 }}>{sh(26,'70%')}{sh(10,'50%')}{sh(10,'80%')}</div>
                        </div>
                        {[0,1,2,3].map(i=>(
                            <div key={i} style={{ padding:'0.85rem', borderRadius:12, border:'1px solid var(--admin-border)', marginBottom:'0.75rem' }}>
                                {sh(8,'40%')}{sh(14,'65%')}
                            </div>
                        ))}
                    </div>
                    <div style={SK}>{sh(14,'50%')}{sh(10)}{sh(10,'80%')}</div>
                </div>
                <div style={{ display:'grid', gap:'1rem' }}>
                    <div style={SK}>
                        {sh(16,'40%')}{sh(10,'60%')}
                        <div style={{ marginTop:'1rem', display:'grid', gap:'0.75rem' }}>{sh(52,undefined,12)}{sh(52,undefined,12)}</div>
                        {sh(42,130,10)}
                    </div>
                    <div style={SK}>
                        {sh(16,'35%')}{sh(10,'55%')}
                        <div style={{ marginTop:'1rem', display:'grid', gap:'0.75rem' }}>{sh(52,undefined,12)}{sh(52,undefined,12)}{sh(52,undefined,12)}</div>
                        {sh(42,130,10)}
                    </div>
                </div>
            </div>
        </>
    )],

];

// ── Main export ───────────────────────────────────────────────────────────────
export default function PageSkeleton({ url }) {
    const match = skeletons.find(([pattern]) => url.match(pattern));
    if (match) return match[1]();

    // Generic fallback
    return (
        <>
            <style>{SHIMMER}</style>
            <div style={SK}>{sh(20,'40%')}{sh(14)}{sh(14,'80%')}{sh(14,'60%')}</div>
        </>
    );
}
