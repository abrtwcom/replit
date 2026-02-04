import { useEffect, useState } from 'react';

export default function useMouse() {
    const [mouse, setMouse] = useState({ x: 0, y: 0, pixelRatio: 0 });

    useEffect(() => {
        const mouseMove = (e: MouseEvent) => {
            const { clientX, clientY } = e;
            setMouse({
                x: clientX,
                y: clientY,
                pixelRatio: Math.min(window.devicePixelRatio, 2),
            });
        };

        window.addEventListener("mousemove", mouseMove);
        return () => {
            window.removeEventListener("mousemove", mouseMove);
        };
    }, []);

    return mouse;
}
