import * as THREE from 'three';
import { ctx } from './three-city-core.js';

// Helper: Generates dynamic, glowing cybernetic road grids between skyscrapers
export function generateStreets(columns, spacing, startX, startZ) {
  const roadWidth = 2.4;
  // Add spacing padding so roads extend beautifully beyond the border skyscrapers
  const roadLength = columns * spacing + 22;

  const roadMaterial = new THREE.MeshStandardMaterial({
    color: 0x06070e, // Dark cybernetic asphalt
    roughness: 0.85,
    metalness: 0.95
  });

  const neonLineMatX = new THREE.MeshStandardMaterial({
    color: 0x00f0ff, // Neon Cyan center lines for X-axis streets
    emissive: 0x00f0ff,
    emissiveIntensity: 3.2,
    metalness: 0.1,
    roughness: 0.1
  });

  const neonLineMatZ = new THREE.MeshStandardMaterial({
    color: 0x6c63ff, // Neon Purple center lines for Z-axis streets
    emissive: 0x6c63ff,
    emissiveIntensity: 3.2,
    metalness: 0.1,
    roughness: 0.1
  });

  // 1. Draw horizontal streets along the Z midpoints (between rows)
  for (let r = 0; r <= columns; r++) {
    const z = startZ + (r - 0.5) * spacing;

    // Asphalt highway
    const roadGeo = new THREE.BoxGeometry(roadLength, 0.02, roadWidth);
    const roadMesh = new THREE.Mesh(roadGeo, roadMaterial);
    roadMesh.position.set(0, 0.015, z);
    roadMesh.receiveShadow = true;
    ctx.scene.add(roadMesh);
    ctx.streets.push(roadMesh);

    // Glowing Neon Center line
    const stripeGeo = new THREE.BoxGeometry(roadLength, 0.03, 0.08);
    const stripeMesh = new THREE.Mesh(stripeGeo, neonLineMatX);
    stripeMesh.position.set(0, 0.02, z);
    ctx.scene.add(stripeMesh);
    ctx.streets.push(stripeMesh);
  }

  // 2. Draw vertical streets along the X midpoints (between columns)
  for (let c = 0; c <= columns; c++) {
    const x = startX + (c - 0.5) * spacing;

    // Asphalt highway
    const roadGeo = new THREE.BoxGeometry(roadWidth, 0.02, roadLength);
    const roadMesh = new THREE.Mesh(roadGeo, roadMaterial);
    roadMesh.position.set(x, 0.015, 0);
    roadMesh.receiveShadow = true;
    ctx.scene.add(roadMesh);
    ctx.streets.push(roadMesh);

    // Glowing Neon Center line
    const stripeGeo = new THREE.BoxGeometry(0.08, 0.03, roadLength);
    const stripeMesh = new THREE.Mesh(stripeGeo, neonLineMatZ);
    stripeMesh.position.set(x, 0.02, 0);
    ctx.scene.add(stripeMesh);
    ctx.streets.push(stripeMesh);
  }
}

// Initialize cybernetic neon rain lines
export function initRainSystem(widthBound, depthBound) {
  const rainCount = 800;
  const lineGeometry = new THREE.BufferGeometry();
  const positions = new Float32Array(rainCount * 6); // 2 vertices per segment (6 floats)

  for (let i = 0; i < rainCount; i++) {
    const x = (Math.random() - 0.5) * widthBound * 1.5;
    const y = Math.random() * 60;
    const z = (Math.random() - 0.5) * depthBound * 1.5;

    // Start point
    positions[i * 6] = x;
    positions[i * 6 + 1] = y;
    positions[i * 6 + 2] = z;

    // End point
    positions[i * 6 + 3] = x;
    positions[i * 6 + 4] = y - 1.5;
    positions[i * 6 + 5] = z;
  }

  lineGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  
  const rainMaterial = new THREE.LineBasicMaterial({
    color: 0x00f0ff,
    transparent: true,
    opacity: 0.45,
    blending: THREE.AdditiveBlending
  });

  ctx.rainSystem = new THREE.LineSegments(lineGeometry, rainMaterial);
  ctx.scene.add(ctx.rainSystem);
}

// Initialize autonomous neon grid traffic (cars) snap to road coordinates
export function initTrafficSystem(columns, spacing) {
  const roadLength = columns * spacing + 22;
  const numCars = 35;

  const carMaterialCyan = new THREE.MeshStandardMaterial({
    color: 0x00f0ff,
    emissive: 0x00f0ff,
    emissiveIntensity: 3.5,
    metalness: 0.1,
    roughness: 0.1
  });

  const carMaterialPurple = new THREE.MeshStandardMaterial({
    color: 0x6c63ff,
    emissive: 0x6c63ff,
    emissiveIntensity: 3.5,
    metalness: 0.1,
    roughness: 0.1
  });

  const startX = -((columns - 1) * spacing) / 2;
  const startZ = -((columns - 1) * spacing) / 2;

  for (let i = 0; i < numCars; i++) {
    const isXStreet = Math.random() > 0.5;
    const speed = 0.15 + Math.random() * 0.35;
    const direction = Math.random() > 0.5 ? 1 : -1;
    const progress = (Math.random() - 0.5) * roadLength;

    const carGeo = new THREE.BoxGeometry(0.18, 0.08, 0.4);
    const carMat = isXStreet ? carMaterialCyan : carMaterialPurple;
    const carMesh = new THREE.Mesh(carGeo, carMat);

    let x = 0, z = 0;
    const r = Math.floor(Math.random() * (columns + 1));
    
    if (isXStreet) {
      z = startZ + (r - 0.5) * spacing;
      x = progress;
      carMesh.rotation.y = Math.PI / 2; // Face direction of road
    } else {
      x = startX + (r - 0.5) * spacing;
      z = progress;
    }

    carMesh.position.set(x, 0.06, z);
    ctx.scene.add(carMesh);

    ctx.trafficCars.push({
      mesh: carMesh,
      isXStreet: isXStreet,
      fixedCoord: isXStreet ? z : x,
      progress: progress,
      speed: speed,
      direction: direction,
      roadLength: roadLength
    });
  }
}
