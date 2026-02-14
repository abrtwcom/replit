import React, { useRef, useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useFBO, useTexture } from "@react-three/drei";
import * as THREE from "three";
import useMouse from "@/hooks/useMouse";
import useDimension from "@/hooks/useDimension";
import { vertex } from "@/shaders/vertex";
import { fragment } from "@/shaders/fragment";

export default function Model() {
  const { viewport, gl, camera } = useThree();
  const brushTexture = useTexture("/images/brush.png");
  const backgroundTexture = useTexture("/images/jio.jpg");
  const meshRefs = useRef([]);
  const mouse = useMouse();
  const device = useDimension();
  const prevMouse = useRef({ x: 0, y: 0 });
  const currentWave = useRef(0);
  const max = 100;

  const rippleScene = useRef(new THREE.Scene()).current;

  const uniforms = useRef({
    uDisplacement: { value: null },
    uTexture: { value: null },
    winResolution: {
      value: new THREE.Vector2(0, 0),
    },
  });

  const fboBase = useFBO(device.width || 1, device.height || 1);
  const fboTexture = useFBO(device.width || 1, device.height || 1);

  // Create the image scene with orthographic camera for the background
  const { scene: imageScene, camera: imageCamera } = useMemo(() => {
    const scene = new THREE.Scene();
    const cam = new THREE.OrthographicCamera(
      viewport.width / -2,
      viewport.width / 2,
      viewport.height / 2,
      viewport.height / -2,
      -1000,
      1000
    );
    cam.position.z = 2;
    scene.add(cam);

    const geometry = new THREE.PlaneGeometry(1, 1);
    const material = new THREE.MeshBasicMaterial({ map: backgroundTexture });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.scale.set(viewport.width, viewport.height, 1);
    scene.add(mesh);

    return { scene, camera: cam };
  }, [viewport.width, viewport.height, backgroundTexture]);

  // Create brush meshes for ripple effect
  useEffect(() => {
    const geometry = new THREE.PlaneGeometry(60, 60, 1, 1);
    const material = new THREE.MeshBasicMaterial({
      transparent: true,
      map: brushTexture,
    });

    meshRefs.current = Array.from({ length: max }).map(() => {
      const mesh = new THREE.Mesh(geometry, material.clone());
      mesh.visible = false;
      mesh.rotation.z = Math.random();
      return mesh;
    });

    return () => {
      geometry.dispose();
      material.dispose();
      meshRefs.current.forEach((m) => m.material.dispose());
    };
  }, [brushTexture]);

  function setNewWave(x, y, index) {
    const mesh = meshRefs.current[index];
    if (mesh) {
      mesh.position.set(x, y, 0);
      mesh.visible = true;
      mesh.material.opacity = 1;
      mesh.scale.set(1.75, 1.75, 1);
    }
  }

  function trackMousePos(x, y) {
    if (
      Math.abs(x - prevMouse.current.x) > 0.1 ||
      Math.abs(y - prevMouse.current.y) > 0.1
    ) {
      currentWave.current = (currentWave.current + 1) % max;
      setNewWave(x, y, currentWave.current);
    }
    prevMouse.current = { x, y };
  }

  useFrame(({ gl, scene: finalScene }) => {
    const x = mouse.x - device.width / 2;
    const y = -mouse.y + device.height / 2;
    trackMousePos(x, y);

    meshRefs.current.forEach((mesh) => {
      if (mesh.visible) {
        mesh.rotation.z += 0.025;
        mesh.material.opacity *= 0.95;
        mesh.scale.x = 0.98 * mesh.scale.x + 0.155;
        mesh.scale.y = 0.98 * mesh.scale.y + 0.155;
        if (mesh.material.opacity < 0.001) mesh.visible = false;
      }
    });

    if (device.width > 0 && device.height > 0) {
      // Render brush strokes to FBO for displacement map
      gl.setRenderTarget(fboBase);
      gl.clear();
      meshRefs.current.forEach((mesh) => {
        if (mesh.visible) rippleScene.add(mesh);
      });
      gl.render(rippleScene, camera);
      meshRefs.current.forEach((mesh) => {
        if (mesh.visible) rippleScene.remove(mesh);
      });

      // Set texture uniform, then render background to FBO
      uniforms.current.uTexture.value = fboTexture.texture;
      gl.setRenderTarget(fboTexture);
      gl.render(imageScene, imageCamera);
      uniforms.current.uDisplacement.value = fboBase.texture;

      // Render final scene with shader to screen
      gl.setRenderTarget(null);
      gl.render(finalScene, camera);

      uniforms.current.winResolution.value.set(
        device.width * device.pixelRatio,
        device.height * device.pixelRatio
      );
    }
  }, 1);

  return (
    <group>
      <mesh>
        <planeGeometry args={[device.width, device.height, 1, 1]} />
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
