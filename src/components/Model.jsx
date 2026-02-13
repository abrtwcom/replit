import React, { useRef, useEffect, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useFBO, useTexture } from "@react-three/drei";
import * as THREE from "three";
import useMouse from "@/hooks/useMouse";
import useDimension from "@/hooks/useDimension";
import { vertex } from "@/shaders/vertex";
import { fragment } from "@/shaders/fragment";

export default function Model() {
  const { viewport, gl, camera } = useThree();
  const texture = useTexture("/images/brush.png");
  const meshRefs = useRef([]);
  const mouse = useMouse();
  const device = useDimension();
  const [prevMouse, setPrevMouse] = useState({ x: 0, y: 0 });
  const [currentWave, setCurrentWave] = useState(0);
  const max = 100;

  const scene = useRef(new THREE.Scene()).current;

  const uniforms = useRef({
    uDisplacement: { value: null },
    uTexture: { value: null },
    winResolution: {
      value: new THREE.Vector2(0, 0),
    },
  });

  const fboBase = useFBO(device.width, device.height);
  const fboTexture = useFBO(device.width, device.height);

  const { scene: imageScene, camera: imageCamera } = Images(viewport);

  useEffect(() => {
    const geometry = new THREE.PlaneGeometry(60, 60, 1, 1);
    const material = new THREE.MeshBasicMaterial({ transparent: true, map: texture });

    meshRefs.current = Array.from({ length: max }).map(() => {
      const mesh = new THREE.Mesh(geometry, material.clone());
      mesh.visible = false;
      mesh.rotation.z = Math.random();
      return mesh;
    });

    return () => {
      geometry.dispose();
      material.dispose();
      meshRefs.current.forEach(m => m.material.dispose());
    };
  }, [texture]);

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
    if (Math.abs(x - prevMouse.x) > 0.1 || Math.abs(y - prevMouse.y) > 0.1) {
      const nextWave = (currentWave + 1) % max;
      setCurrentWave(nextWave);
      setNewWave(x, y, nextWave);
    }
    setPrevMouse({ x, y });
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
      gl.setRenderTarget(fboBase);
      gl.clear();
      meshRefs.current.forEach((mesh) => {
        if (mesh.visible) {
          scene.add(mesh);
        }
      });
      gl.render(scene, camera);
      meshRefs.current.forEach((mesh) => {
        if (mesh.visible) {
          scene.remove(mesh);
        }
      });

      uniforms.current.uTexture.value = fboTexture.texture;
      gl.setRenderTarget(fboTexture);
      gl.render(imageScene, imageCamera);
      uniforms.current.uDisplacement.value = fboBase.texture;

      gl.setRenderTarget(null);
      gl.render(finalScene, camera);

      uniforms.current.winResolution.value.set(
        device.width * device.pixelRatio,
        device.height * device.pixelRatio
      );
    }
  }, 1);

  function Images(viewport) {
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
    const backgroundTexture = useTexture("/images/jio.jpg");
    const backgroundMaterial = new THREE.MeshBasicMaterial({ map: backgroundTexture });
    const background = new THREE.Mesh(geometry, backgroundMaterial);
    background.scale.set(viewport.width, viewport.height, 1);
    scene.add(background);

    return { scene, camera };
  }

  return (
    <group>
      <mesh>
        <planeGeometry args={[device.width, device.height, 1, 1]} />
        <shaderMaterial
          vertexShader={vertex}
          fragmentShader={fragment}
          transparent={true}
          uniforms={uniforms.current}
        ></shaderMaterial>
      </mesh>
    </group>
  );
}
