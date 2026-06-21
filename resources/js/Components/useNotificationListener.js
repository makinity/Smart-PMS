import { useEffect, useRef } from 'react';

/**
 * Subscribes to the private Reverb channel for the given userId.
 * Calls onNotification() when a notification arrives (after a 300ms delay
 * to let the DB write commit, matching the original Livewire behaviour).
 *
 * Sound is unlocked on first user gesture and played on each notification.
 * The sound file should be at /sounds/notifications/new-notification.wav
 */
export function useNotificationListener(userId, onNotification) {
    const soundRef = useRef(null);

    // Pre-load audio immediately (no gesture required for loading, only for playing)
    useEffect(() => {
        if (!userId) return;
        soundRef.current = new Audio('/sounds/notifications/new-notification.wav');
        soundRef.current.load();

        // Unlock on first gesture so subsequent plays never get blocked
        const unlock = () => {
            soundRef.current?.play().then(() => {
                soundRef.current.pause();
                soundRef.current.currentTime = 0;
            }).catch(() => {});
        };
        window.addEventListener('pointerdown', unlock, { once: true });
        window.addEventListener('keydown', unlock, { once: true });
        window.addEventListener('touchstart', unlock, { once: true });

        return () => {
            window.removeEventListener('pointerdown', unlock);
            window.removeEventListener('keydown', unlock);
            window.removeEventListener('touchstart', unlock);
        };
    }, [userId]);

    // Wait for Echo then subscribe
    useEffect(() => {
        if (!userId) return;

        let channel = null;
        let timer = null;
        let attempts = 0;
        const MAX_WAIT = 40; // 40 × 250ms = 10s

        const subscribe = () => {
            if (!window.Echo) {
                if (++attempts < MAX_WAIT) {
                    timer = setTimeout(subscribe, 250);
                } else {
                    console.warn('[PMS RT] ❌ window.Echo not available after 10s');
                }
                return;
            }

            const channelName = `App.Models.User.${userId}`;
            channel = window.Echo.private(channelName);

            channel
                .subscribed(() => {
                    console.info(`[PMS RT] ✅ Channel subscription succeeded: ${channelName}`);
                })
                .error((err) => {
                    console.error('[PMS RT] ❌ Channel subscription error', err);
                })
                .notification((payload) => {
                    console.info('[PMS RT] 🔔 Notification received:', payload);
                    setTimeout(() => {
                        onNotification(payload);
                        if (soundRef.current) {
                            soundRef.current.currentTime = 0;
                            soundRef.current.play().catch(() => {});
                        }
                    }, 300);
                });

            console.info(`[PMS RT] Subscribing to private channel: ${channelName}`);
        };

        subscribe();

        return () => {
            clearTimeout(timer);
            if (channel) window.Echo.leave(`App.Models.User.${userId}`);
        };
    }, [userId]);
}
