import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Escenario 3D estilo Centro de Operaciones / Sala de Guerra Territorial:
 * - Malla holográfica del terreno de Valledupar (Wireframe Grid + Radar Scanner).
 * - Geocercas volumétricas en forma de cilindros de luz con pulsación.
 * - Cilindros 3D holográficos para cada alerta registrada en la BD con partículas ascendentes.
 */
export default function WarRoomThreeScene({ alerts = [], activeGeofence, showMesh = true, showRadar = true }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount) return;

    const width = currentMount.clientWidth;
    const height = currentMount.clientHeight;

    // 1. Escena, Cámara y Renderer
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x020617, 0.015);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 35, 45);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    currentMount.appendChild(renderer.domElement);

    // 2. Luces
    const ambientLight = new THREE.AmbientLight(0x06b6d4, 0.8);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(20, 40, 20);
    scene.add(dirLight);

    // 3. Malla Territorial Urbana 3D (Grid Holográfico)
    let gridHelper = null;
    if (showMesh) {
      gridHelper = new THREE.GridHelper(70, 35, 0x06b6d4, 0x0f3460);
      gridHelper.position.y = 0;
      scene.add(gridHelper);
    }

    // 4. Anillos de Radar / Escaneo Geográfico
    const radarGroup = new THREE.Group();
    const ringGeo = new THREE.RingGeometry(0.5, 32, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.25,
      wireframe: true,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    radarGroup.add(ring);

    // Línea de escáner rotatorio
    const sweepGeo = new THREE.PlaneGeometry(32, 0.4);
    const sweepMat = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
    });
    const sweep = new THREE.Mesh(sweepGeo, sweepMat);
    sweep.rotation.x = Math.PI / 2;
    sweep.position.set(16, 0.05, 0);
    const radarPivot = new THREE.Group();
    radarPivot.add(sweep);
    radarGroup.add(radarPivot);

    if (showRadar) scene.add(radarGroup);

    // 5. Geocerca 3D de Valledupar (Cilindro volumétrico holográfico)
    const geofenceGroup = new THREE.Group();
    const fenceGeo = new THREE.CylinderGeometry(18, 18, 8, 32, 1, true);
    const fenceMat = new THREE.MeshBasicMaterial({
      color: 0x3b82f6,
      transparent: true,
      opacity: 0.18,
      wireframe: true,
      side: THREE.DoubleSide,
    });
    const fenceMesh = new THREE.Mesh(fenceGeo, fenceMat);
    fenceMesh.position.y = 4;
    geofenceGroup.add(fenceMesh);

    // Anillo delimitador de suelo
    const borderGeo = new THREE.RingGeometry(17.8, 18.2, 64);
    const borderMat = new THREE.MeshBasicMaterial({ color: 0x3b82f6, side: THREE.DoubleSide });
    const border = new THREE.Mesh(borderGeo, borderMat);
    border.rotation.x = Math.PI / 2;
    border.position.y = 0.08;
    geofenceGroup.add(border);

    scene.add(geofenceGroup);

    // 6. Alertas / Columnas 3D proyectadas desde la Base de Datos
    // Coordenadas base de Valledupar: lat ~10.4631, lng ~-73.2532
    const refLat = 10.4631;
    const refLng = -73.2532;
    const scale = 700; // factor de conversión de grados a coordenadas 3D locales

    const markersGroup = new THREE.Group();
    alerts.forEach((a) => {
      const x = (a.lng - refLng) * scale;
      const z = -(a.lat - refLat) * scale;

      const color =
        a.severity === "critical"
          ? 0xef4444
          : a.severity === "high"
          ? 0xf97316
          : a.severity === "medium"
          ? 0xeab308
          : 0x06b6d4;

      // Columna de luz vertical
      const colGeo = new THREE.CylinderGeometry(0.2, 0.4, 6, 16);
      const colMat = new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 0.8,
        roughness: 0.2,
      });
      const col = new THREE.Mesh(colGeo, colMat);
      col.position.set(x, 3, z);
      markersGroup.add(col);

      // Esfera pulsante en la cima
      const sphereGeo = new THREE.SphereGeometry(0.6, 16, 16);
      const sphereMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const sphere = new THREE.Mesh(sphereGeo, sphereMat);
      sphere.position.set(x, 6.2, z);
      markersGroup.add(sphere);

      // Anillo de impacto en el suelo
      const groundRingGeo = new THREE.RingGeometry(0.6, 1.2, 24);
      const groundRingMat = new THREE.MeshBasicMaterial({ color: color, side: THREE.DoubleSide, transparent: true, opacity: 0.7 });
      const groundRing = new THREE.Mesh(groundRingGeo, groundRingMat);
      groundRing.rotation.x = Math.PI / 2;
      groundRing.position.set(x, 0.05, z);
      markersGroup.add(groundRing);
    });

    scene.add(markersGroup);

    // 7. Partículas en suspensión (Atmósfera de sala de control)
    const partCount = 180;
    const partGeo = new THREE.BufferGeometry();
    const partPos = new Float32Array(partCount * 3);
    for (let i = 0; i < partCount * 3; i += 3) {
      partPos[i] = (Math.random() - 0.5) * 60;
      partPos[i + 1] = Math.random() * 20;
      partPos[i + 2] = (Math.random() - 0.5) * 60;
    }
    partGeo.setAttribute("position", new THREE.BufferAttribute(partPos, 3));
    const partMat = new THREE.PointsMaterial({ size: 0.35, color: 0x22d3ee, transparent: true, opacity: 0.5 });
    const particles = new THREE.Points(partGeo, partMat);
    scene.add(particles);

    // 8. Bucle de Animación
    let animationId;
    let clock = new THREE.Clock();

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Rotación del haz de radar
      radarPivot.rotation.y = elapsedTime * 1.5;

      // Pulsación de la geocerca holográfica
      fenceMesh.material.opacity = 0.15 + Math.sin(elapsedTime * 3) * 0.08;

      // Rotación suave de la escena / cámara
      scene.rotation.y = Math.sin(elapsedTime * 0.1) * 0.15;

      renderer.render(scene, camera);
    };

    animate();

    // 9. Redimensionamiento
    const handleResize = () => {
      if (!currentMount) return;
      const w = currentMount.clientWidth;
      const h = currentMount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationId);
      if (currentMount && renderer.domElement) {
        currentMount.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [alerts, showMesh, showRadar]);

  return <div ref={mountRef} className="h-full w-full relative" />;
}

