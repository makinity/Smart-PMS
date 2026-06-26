import { useEffect } from 'react';

let _audioCtx = null;
let _audioBuffer = null;

function getAudioCtx() {
    if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return _audioCtx;
}

async function loadSound() {
    if (_audioBuffer) return _audioBuffer;
    const ctx = getAudioCtx();
    const res = await fetch('/sounds/notifications/new-notification.wav');
    const arr = await res.arrayBuffer();
    _audioBuffer = await ctx.decodeAudioData(arr);
    return _audioBuffer;
}

function playSound() {
    const ctx = getAudioCtx();
    if (!_audioBuffer) return;
    const src = ctx.createBufferSource();
    src.buffer = _audioBuffer;
    src.connect(ctx.destination);
    src.start(0);
}

/**
 * Subscribes to the private Reverb channel for the given userId.
 * Calls onNotification() when a notification arrives (after a 300ms delay
 * to let the DB write commit, matching the original Livewire behaviour).
 *
 * Sound is unlocked on first user gesture via AudioContext resume.
 * The sound file should be at /sounds/notifications/new-notification.wav
 */
export function useNotificationListener(userId, onNotification) {
    useEffect(() => {
        if (!userId) return;

        // Pre-load the sound buffer
        loadSound().catch(() => {});

        // Resume AudioContext on first gesture (required by browsers)
        const unlock = () => {
            const ctx = getAudioCtx();
            if (ctx.state === 'suspended') ctx.resume();
        };
        window.addEventListener('pointerdown', unlock);
        window.addEventListener('keydown', unlock);

        return () => {
            window.removeEventListener('pointerdown', unlock);
            window.removeEventListener('keydown', unlock);
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
                        playSound();
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
