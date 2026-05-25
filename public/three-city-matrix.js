import * as THREE from 'three';
import { ctx, resetCamera } from './three-city-core.js';

// Toggle Code Matrix View Mode
export function toggleCodeMatrixView(active) {
  ctx.isInMatrixView = active;
  
  if (active) {
    // 1. Hide City Elements
    ctx.buildings.forEach(b => {
      b.group.visible = false;
    });
    ctx.orbitingGems.forEach(gem => {
      gem.mesh.visible = false;
    });
    ctx.antennas.forEach(ant => {
      ant.bulb.visible = false;
    });
    ctx.trafficCars.forEach(car => {
      car.mesh.visible = false;
    });
    ctx.activeHalos.forEach(halo => {
      halo.mesh.visible = false;
    });
    ctx.streets.forEach(street => {
      street.visible = false;
    });
    if (ctx.rainSystem) {
      ctx.rainSystem.visible = false;
    }
    
    // Position camera dynamically in node focus space
    ctx.targetCameraPos = new THREE.Vector3(0, 15, 25);
    ctx.targetLookAt = new THREE.Vector3(0, 10, 0);

    // 2. Show Node Graph
    if (ctx.matrixNodesGroup) {
      ctx.matrixNodesGroup.visible = true;
    }
  } else {
    // 1. Restore City Elements
    ctx.buildings.forEach(b => {
      b.group.visible = true;
    });
    ctx.orbitingGems.forEach(gem => {
      gem.mesh.visible = true;
    });
    ctx.antennas.forEach(ant => {
      ant.bulb.visible = true;
    });
    ctx.trafficCars.forEach(car => {
      car.mesh.visible = true;
    });
    ctx.activeHalos.forEach(halo => {
      halo.mesh.visible = true;
    });
    ctx.streets.forEach(street => {
      street.visible = true;
    });
    if (ctx.rainSystem) {
      ctx.rainSystem.visible = true;
    }
    
    resetCamera();

    // 2. Hide Node Graph
    if (ctx.matrixNodesGroup) {
      ctx.matrixNodesGroup.visible = false;
    }
  }
}

// Generate the 3D Code Matrix node tree
export function buildCodeMatrixNodes(repos) {
  ctx.matrixNodesGroup = new THREE.Group();
  ctx.matrixNodesGroup.visible = false;
  ctx.scene.add(ctx.matrixNodesGroup);
  
  ctx.fileNodesList = [];

  const extensions = ['js', 'py', 'json', 'css', 'html', 'md'];
  const extColors = {
    'js': 0xf1e05a,
    'py': 0x3572a5,
    'json': 0xffaa00,
    'css': 0x563d7c,
    'html': 0xe34c26,
    'md': 0x00f0ff
  };

  // Root Node
  const rootGeo = new THREE.SphereGeometry(1.2, 16, 16);
  const rootMat = new THREE.MeshStandardMaterial({
    color: 0x00f0ff,
    emissive: 0x00f0ff,
    emissiveIntensity: 3.0,
    metalness: 0.1,
    roughness: 0.1
  });
  const rootMesh = new THREE.Mesh(rootGeo, rootMat);
  rootMesh.position.set(0, 10, 0);
  ctx.matrixNodesGroup.add(rootMesh);

  // Directory Nodes (Branches)
  const dirs = ['src/components', 'src/core', 'public/assets', 'server/routes', 'tests/specs'];
  const dirMeshes = [];

  dirs.forEach((dir, i) => {
    const angle = (i / dirs.length) * Math.PI * 2;
    const x = Math.cos(angle) * 10;
    const z = Math.sin(angle) * 10;
    const y = 6 + Math.random() * 8;

    const dirGeo = new THREE.SphereGeometry(0.8, 16, 16);
    const dirMat = new THREE.MeshStandardMaterial({
      color: 0x6c63ff,
      emissive: 0x6c63ff,
      emissiveIntensity: 2.2,
      metalness: 0.1,
      roughness: 0.1
    });
    const dirMesh = new THREE.Mesh(dirGeo, dirMat);
    dirMesh.position.set(x, y, z);
    ctx.matrixNodesGroup.add(dirMesh);
    dirMeshes.push(dirMesh);

    // Connect to Root Node
    const points = [rootMesh.position, dirMesh.position];
    const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
    const lineMat = new THREE.LineBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.5 });
    const line = new THREE.Line(lineGeo, lineMat);
    ctx.matrixNodesGroup.add(line);

    // Add 3-5 File Nodes (Leaves) per Directory
    const fileCount = 3 + Math.floor(Math.random() * 3);
    for (let f = 0; f < fileCount; f++) {
      const fAngle = angle + ((f - fileCount/2) / fileCount) * 0.8;
      const fx = x + Math.cos(fAngle) * 4;
      const fz = z + Math.sin(fAngle) * 4;
      const fy = y + (Math.random() - 0.5) * 3;

      const ext = extensions[Math.floor(Math.random() * extensions.length)];
      const color = extColors[ext] || 0xffffff;

      const fileGeo = new THREE.SphereGeometry(0.4, 16, 16);
      const fileMat = new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 2.5,
        metalness: 0.1,
        roughness: 0.1
      });
      const fileMesh = new THREE.Mesh(fileGeo, fileMat);
      fileMesh.position.set(fx, fy, fz);
      ctx.matrixNodesGroup.add(fileMesh);

      // Connect to Directory Node
      const fPoints = [dirMesh.position, fileMesh.position];
      const fLineGeo = new THREE.BufferGeometry().setFromPoints(fPoints);
      const fLineMat = new THREE.LineBasicMaterial({ color: 0x6c63ff, transparent: true, opacity: 0.4 });
      const fLine = new THREE.Line(fLineGeo, fLineMat);
      ctx.matrixNodesGroup.add(fLine);

      // Attach file metadata for RAG mapping
      const mockRepo = repos[Math.floor(Math.random() * repos.length)] || { owner: 'mrdoob', stars: 99000 };
      fileMesh.userData = {
        isFile: true,
        name: `${dir.split('/')[1] || 'core'}_module_${f+1}.${ext}`,
        size: Math.round(10 + Math.random() * 250) + " KB",
        ext: ext,
        repo: mockRepo
      };
      ctx.fileNodesList.push(fileMesh);
    }
  });
}
