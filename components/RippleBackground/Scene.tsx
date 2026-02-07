"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrthographicCamera } from "@react-three/drei";
import Model from "./Model";
import useDimension from "@/hooks/useDimension";

export default function Scene() {
    const device = useDimension();

    if (!device.width || !device.height) {
        return null;
    }

    const frustumSize = device.height;
    const aspect = device.width / device.height;

    return (
        <div className="fixed top-0 left-0 w-full h-full -z-50 pointer-events-none">
            <Canvas className="w-full h-full">
                <OrthographicCamera
                    makeDefault
                    args={[
                        (frustumSize * aspect) / -2,
                        (frustumSize * aspect) / 2,
                        frustumSize / 2,
                        frustumSize / -2,
                        -1000,
                        1000,
                    ]}
                    position={[0, 0, 2]}
                />
                <Suspense fallback={null}>
                    <Model />
                </Suspense>
            </Canvas>
        </div>
    );
}
