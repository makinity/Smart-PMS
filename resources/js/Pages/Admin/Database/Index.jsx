import { useState } from 'react';
import AppLayout from '@/Layouts/AppLayout';
import ConnectionTab from './tabs/ConnectionTab';
import BackupTab from './tabs/BackupTab';
import ExportsTab from './tabs/ExportsTab';

const TABS = [
    { key: 'connection', label: 'Connection',   icon: '🔗' },
    { key: 'backup',     label: 'Backup',        icon: '☁' },
    { key: 'exports',    label: 'Data Exports',  icon: '⬇' },
];

export default function Index({ env, backups, tables }) {
    const [tab, setTab] = useState('connection');

    return (
        <AppLayout title="Database">
            <style>{`
                .db-tab-bar { display: flex; gap: 0; overflow-x: auto; scrollbar-width: none; -webkit-overflow-scrolling: touch; }
                .db-tab-bar::-webkit-scrollbar { display: none; }
                .db-tab-btn { flex-shrink: 0; padding: 0.75rem 1.25rem; background: none; border: none; border-bottom: 2px solid transparent; cursor: pointer; font-size: 0.875rem; font-weight: 600; color: var(--admin-text-muted); display: flex; align-items: center; gap: 0.4rem; transition: color 0.15s, border-color 0.15s; white-space: nowrap; }
                .db-tab-btn:hover { color: var(--admin-text-primary); }
                .db-tab-btn.active { color: var(--admin-accent); border-bottom-color: var(--admin-accent); }
                @media (max-width: 639px) {
                    .db-tab-btn { padding: 0.65rem 0.9rem; font-size: 0.82rem; }
                    .db-tab-icon { display: none; }
                }
            `}</style>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

                {/* Page header */}
                <div style={card}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                        <div style={iconBox}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
                        </div>
                        <div>
                            <p style={statLabel}>Admin Directory</p>
                            <h1 style={{ fontWeight: 700, fontSize: '1.35rem', color: 'var(--admin-text-primary)', lineHeight: 1.1 }}>Database</h1>
                            <p style={{ fontSize: '0.82rem', color: 'var(--admin-text-muted)', marginTop: '0.15rem' }}>Administrative database tools — backup, restore, and connection management.</p>
                        </div>
                    </div>
                </div>

                {/* Tab bar */}
                <div style={{ ...card, padding: '0 1.25rem' }}>
                    <div className="db-tab-bar">
                        {TABS.map(({ key, label, icon }) => (
                            <button key={key} onClick={() => setTab(key)} className={`db-tab-btn${tab === key ? ' active' : ''}`}>
                                <span className="db-tab-icon">{icon}</span> {label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tab content */}
                {tab === 'connection' && <ConnectionTab env={env} />}
                {tab === 'backup'     && <BackupTab backups={backups} env={env} />}
                {tab === 'exports'    && <ExportsTab tables={tables} />}
            </div>
        </AppLayout>
    );
}

const card     = { background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)', borderRadius: 'var(--admin-radius)', padding: '1.25rem 1.5rem', boxShadow: 'var(--admin-shadow)' };
const iconBox  = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 42, height: 42, borderRadius: 12, border: '1px solid var(--admin-border)', background: 'rgba(59,130,246,0.08)', color: 'var(--admin-accent)', flexShrink: 0 };
const statLabel = { fontSize: '0.72rem', fontWeight: 600, color: 'var(--admin-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.1rem' };
