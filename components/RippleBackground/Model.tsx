import React, { useRef, useEffect, useState, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useFBO, useTexture } from "@react-three/drei";
import * as THREE from "three";
import useMouse from "@/hooks/useMouse";
import useDimension from "@/hooks/useDimension";
import { vertex } from "@/components/shaders/vertex";
import { fragment } from "@/components/shaders/fragment";

export default function Model() {
    const { viewport, gl, camera } = useThree();
    const [brushTexture, backgroundTexture] = useTexture([
        "/images/brush.png",
        "/images/backgrounnd.jpg",
    ]);

    const meshRefs = useRef<THREE.Mesh[]>([]);
    const [meshes, setMeshes] = useState<React.ReactNode[]>([]);
    const mouse = useMouse();
    const device = useDimension();
    const [prevMouse, setPrevMouse] = useState({ x: 0, y: 0 });
    const [currentWave, setCurrentWave] = useState(0);

    // Memoize scene to prevent recreating it every frame
    const scene = useMemo(() => new THREE.Scene(), []);
    const max = 100;

    const uniforms = useRef<{
        uDisplacement: { value: THREE.Texture | null };
        uTexture: { value: THREE.Texture | null };
        winResolution: { value: THREE.Vector2 };
    }>({
        uDisplacement: { value: null },
        uTexture: { value: null },
        winResolution: {
            value: new THREE.Vector2(0, 0),
        },
    });

    // Ensure FBOs have valid dimensions (fallback to 1x1 if 0)
    const width = device.width > 0 ? device.width : 1;
    const height = device.height > 0 ? device.height : 1;
    const fboBase = useFBO(width, height);
    const fboTexture = useFBO(width, height);

    // Setup separate scene for the background image to handle "cover" scaling
    const { scene: imageScene, camera: imageCamera, updateScale } = useImageScene(backgroundTexture, viewport);

    useEffect(() => {
        // Generate brush meshes for ripple effect
        const generatedMeshes = Array.from({ length: max }).map((_, i) => (
            <mesh
                key={i}
                position={[0, 0, 0]}
                ref={(el) => {
                    if (el) meshRefs.current[i] = el;
                }}
                rotation={[0, 0, Math.random()]}
                visible={false}
            >
                <planeGeometry args={[60, 60, 1, 1]} />
                <meshBasicMaterial transparent={true} map={brushTexture} />
            </mesh>
        ));
        setMeshes(generatedMeshes);
    }, [brushTexture]);

    useEffect(() => {
        if (updateScale) updateScale();
    }, [viewport, updateScale])

    function setNewWave(x: number, y: number, currentWave: number) {
        const mesh = meshRefs.current[currentWave];
        if (mesh) {
            mesh.position.x = x;
            mesh.position.y = y;
            mesh.visible = true;
            (mesh.material as THREE.MeshBasicMaterial).opacity = 1;
            mesh.scale.x = 1.75;
            mesh.scale.y = 1.75;
        }
    }

    function trackMousePos(x: number, y: number) {
        if (Math.abs(x - prevMouse.x) > 0.1 || Math.abs(y - prevMouse.y) > 0.1) {
            setCurrentWave((currentWave + 1) % max);
            setNewWave(x, y, currentWave);
        }
        setPrevMouse({ x: x, y: y });
    }

    useFrame(() => {
        // Only render if we have valid dimensions
        if (device.width <= 0 || device.height <= 0) return;

        // 1. Update Brushes (Ripples)
        const x = mouse.x - device.width / 2;
        const y = -mouse.y + device.height / 2;
        trackMousePos(x, y);

        meshRefs.current.forEach((mesh) => {
            if (mesh.visible) {
                mesh.rotation.z += 0.025;
                (mesh.material as THREE.MeshBasicMaterial).opacity *= 0.95;
                mesh.scale.x = 0.98 * mesh.scale.x + 0.155;
                mesh.scale.y = 0.98 * mesh.scale.y + 0.155;
                if ((mesh.material as THREE.MeshBasicMaterial).opacity < 0.002) mesh.visible = false;
            }
        });

        // 2. Render Ripples to fboBase (Displacement Map)
        gl.setRenderTarget(fboBase);
        gl.clear();
        meshRefs.current.forEach((mesh) => {
            if (mesh.visible) scene.add(mesh);
        });
        gl.render(scene, camera);
        meshRefs.current.forEach((mesh) => {
            if (mesh.visible) scene.remove(mesh);
        });

        // 3. Render Background Image to fboTexture (Color Map)
        gl.setRenderTarget(fboTexture);
        gl.render(imageScene, imageCamera);

        // 4. Reset Target to Screen
        gl.setRenderTarget(null);

        // Update Uniforms for Final Render
        uniforms.current.uTexture.value = fboTexture.texture;
        uniforms.current.uDisplacement.value = fboBase.texture;
        uniforms.current.winResolution.value.set(device.width, device.height).multiplyScalar(device.pixelRatio);
    }, 1);

    return (
        <mesh>
            <planeGeometry args={[width, height, 1, 1]} />
            <shaderMaterial
                vertexShader={vertex}
                fragmentShader={fragment}
                transparent={true}
                uniforms={uniforms.current}
            />
        </mesh>
    );
}

// Hook to manage the background image scene and aspect ratio covering
function useImageScene(texture: THREE.Texture, viewport: { width: number, height: number }) {
    const scene = useMemo(() => new THREE.Scene(), []);
    const camera = useMemo(() => new THREE.OrthographicCamera(
        viewport.width / -2, viewport.width / 2,
        viewport.height / 2, viewport.height / -2,
        -1000, 1000
    ), [viewport]);

    const meshRef = useRef<THREE.Mesh>(null);

    // Create the background mesh once
    useEffect(() => {
        const geometry = new THREE.PlaneGeometry(1, 1);
        const material = new THREE.MeshBasicMaterial({ map: texture });
        const mesh = new THREE.Mesh(geometry, material);
        meshRef.current = mesh;
        scene.add(mesh);
        return () => { scene.clear() }
    }, [scene, texture]);

    // Update scale function to maintain "cover" fit
    const updateScale = React.useCallback(() => {
        if (!meshRef.current) return;

        const img = texture.image as HTMLImageElement;
        if (!img.width || !img.height) return;

        const imageAspect = img.width / img.height;
        const viewportAspect = viewport.width / viewport.height;
        // Guard against 0 viewport
        if (viewportAspect === 0 || !isFinite(viewportAspect)) return;

        if (imageAspect > viewportAspect) {
            // Image is wider than viewport -> fit to height
            meshRef.current.scale.set(viewport.height * imageAspect, viewport.height, 1);
        } else {
            // Image is taller than viewport -> fit to width
            meshRef.current.scale.set(viewport.width, viewport.width / imageAspect, 1);
        }

        // Update camera settings as well
        camera.left = viewport.width / -2;
        camera.right = viewport.width / 2;
        camera.top = viewport.height / 2;
        camera.bottom = viewport.height / -2;
        camera.updateProjectionMatrix();

    }, [texture, viewport, camera]);

    return { scene, camera, updateScale };
}
