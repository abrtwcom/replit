import React, { useRef, useEffect, useState, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useFBO, useTexture } from "@react-three/drei";
import * as THREE from "three";
import useMouse from "@/hooks/useMouse";
import useDimension from "@/hooks/useDimension";
import { vertex, fragment } from "./shaders";

export default function Model() {
    const { viewport, gl, camera } = useThree();
    const texture = useTexture("/images/brush.png");
    // Pre-load the background image to ensure it's available for the scene
    const bgTexture = useTexture("/images/background.jpg");

    const meshRefs = useRef<(THREE.Mesh | null)[]>([]);
    const [meshes, setMeshes] = useState<React.ReactNode[]>([]);
    const mouse = useMouse();
    const device = useDimension();
    const [prevMouse, setPrevMouse] = useState({ x: 0, y: 0 });
    const [currentWave, setCurrentWave] = useState(0);

    const scene = useMemo(() => new THREE.Scene(), []);
    const max = 100;

    const uniforms = useRef({
        uDisplacement: { value: null as THREE.Texture | null },
        uTexture: { value: null as THREE.Texture | null },
        winResolution: {
            value: new THREE.Vector2(0, 0),
        },
    });

    const fboBase = useFBO();
    const fboTexture = useFBO();

    // Helper function to create the background image scene
    const { scene: imageScene, camera: imageCamera } = useMemo(() => {
        const scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera(
            viewport.width / -2,
            viewport.width / 2,
            viewport.height / 2,
            viewport.height / -2,
            -1000,
            1000
        );
        camera.position.z = 2;
        scene.add(camera);

        const geometry = new THREE.PlaneGeometry(1, 1);
        // Background image
        const material = new THREE.MeshBasicMaterial({ map: bgTexture });
        const image = new THREE.Mesh(geometry, material);

        // Scale to cover viewport
        image.scale.set(viewport.width, viewport.height, 1);
        image.position.set(0, 0, 1);

        scene.add(image);
        return { scene, camera };
    }, [viewport.width, viewport.height, bgTexture]);

    useEffect(() => {
        const generatedMeshes = Array.from({ length: max }).map((_, i) => (
            <mesh
                key={i}
                position={[0, 0, 0]}
                ref={(el) => { meshRefs.current[i] = el; }}
                rotation={[0, 0, Math.random()]}
                visible={false}
            >
                <planeGeometry args={[60, 60, 1, 1]} />
                <meshBasicMaterial transparent={true} map={texture} />
            </mesh>
        ));
        setMeshes(generatedMeshes);
    }, [texture]);

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
        const x = mouse.x - device.width / 2;
        // Fix: Reference used -mouse.y but that might depend on CSS layout. 
        // Assuming standard top-left 0,0 web coords and center 0,0 threejs.
        const y = -mouse.y + device.height / 2;

        trackMousePos(x, y);

        meshRefs.current.forEach((mesh) => {
            if (mesh && mesh.visible) {
                mesh.rotation.z += 0.025;
                (mesh.material as THREE.MeshBasicMaterial).opacity *= 0.95;
                mesh.scale.x = 0.98 * mesh.scale.x + 0.155;
                mesh.scale.y = 0.98 * mesh.scale.y + 0.155;
            }
        });

        if (device.width > 0 && device.height > 0) {
            // 1. Render ripples to fboBase
            gl.setRenderTarget(fboBase);
            gl.clear();
            meshRefs.current.forEach((mesh) => {
                if (mesh && mesh.visible) {
                    scene.add(mesh);
                }
            });
            gl.render(scene, camera);
            meshRefs.current.forEach((mesh) => {
                if (mesh && mesh.visible) {
                    scene.remove(mesh);
                }
            });

            // 2. Render background image to fboTexture
            // In the reference, they render the image scene to `fboTexture`.
            // This allows the shader to sample the clean image + ripple displacement.
            gl.setRenderTarget(fboTexture);
            gl.render(imageScene, imageCamera);

            // 3. Update uniforms
            uniforms.current.uTexture.value = fboTexture.texture;
            uniforms.current.uDisplacement.value = fboBase.texture;

            // Use domElement width/height which are standard
            uniforms.current.winResolution.value.set(gl.domElement.width, gl.domElement.height);

            // 4. Reset render target to screen (null) and render the final shader mesh
            gl.setRenderTarget(null);
        }
    });

    return (
        <group>
            {meshes}
            <mesh>
                <planeGeometry args={[viewport.width, viewport.height, 1, 1]} />
                <shaderMaterial
                    vertexShader={vertex}
                    fragmentShader={fragment}
                    transparent={true}
                    uniforms={uniforms.current}
                />
            </mesh>
        </group>
    );
}
