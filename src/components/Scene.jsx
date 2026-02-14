import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import Model from "./Model";
import useDimension from "@/hooks/useDimension";
import { OrthographicCamera } from "@react-three/drei";

export default function Scene() {
  const device = useDimension();

  const frustumSize = device.height || 1;
  const aspect = device.width && device.height ? device.width / device.height : 1;

  return (
    <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", overflow: "hidden" }}>
      <Canvas
        dpr={[1, 2]}
        gl={{
          antialias: false,
          powerPreference: "high-performance",
          stencil: false,
          depth: false,
        }}
      >
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
        {device.width > 0 && device.height > 0 && (
          <Suspense fallback={null}>
            <Model />
          </Suspense>
        )}
      </Canvas>
    </div>
  );
}
