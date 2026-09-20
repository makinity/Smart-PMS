import axios from 'axios';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import 'bootstrap';

window.axios = axios;
window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

window.Pusher = Pusher;

const pusherKey = import.meta.env.VITE_PUSHER_APP_KEY || 'd294ca82c68cfe7b7258';
const pusherCluster = import.meta.env.VITE_PUSHER_APP_CLUSTER || 'ap1';

if (pusherKey && pusherKey !== 'undefined') {
    try {
        window.Echo = new Echo({
            broadcaster: 'pusher',
            key: pusherKey,
            cluster: pusherCluster,
            forceTLS: true,
            authEndpoint: '/broadcasting/auth',
            auth: {
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name=csrf-token]')?.getAttribute('content'),
                    'X-Requested-With': 'XMLHttpRequest',
                },
            },
        });
    } catch (e) {
        console.warn('Echo/Pusher init warning:', e);
    }
}
