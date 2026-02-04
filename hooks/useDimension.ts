import { useEffect, useState } from 'react';

export default function useDimension() {
    const [dimension, setDimension] = useState({
        width: 0,
        height: 0,
        pixelRatio: 1,
    });

    useEffect(() => {
        const resize = () => {
            setDimension({
                width: window.innerWidth,
                height: window.innerHeight,
                pixelRatio: window.devicePixelRatio,
            });
        };

        resize();
        window.addEventListener("resize", resize);

        return () => window.removeEventListener("resize", resize);
    }, []);

    return dimension;
}
