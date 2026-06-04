import './bootstrap';
import { createInertiaApp } from '@inertiajs/react';
import { createRoot } from 'react-dom/client';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { ToastProvider } from '@/Components/Snackbar';
import { ConfirmProvider } from '@/Components/ConfirmDialog';

createInertiaApp({
    resolve: (name) =>
        resolvePageComponent(`./Pages/${name}.jsx`, import.meta.glob('./Pages/**/*.jsx')),
    setup({ el, App, props }) {
        createRoot(el).render(
            <ConfirmProvider>
                <ToastProvider>
                    <App {...props} />
                </ToastProvider>
            </ConfirmProvider>
        );
    },
    progress: { color: '#4B5563' },
});
