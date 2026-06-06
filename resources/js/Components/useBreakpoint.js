import { useEffect, useState } from 'react';

export default function useBreakpoint() {
    const [width, setWidth] = useState(() => (typeof window === 'undefined' ? 1024 : window.innerWidth));

    useEffect(() => {
        if (typeof window === 'undefined') return undefined;
        const handleResize = () => setWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    if (width >= 1024) return 'desktop';
    if (width >= 768) return 'tablet';
    return 'mobile';
}
