import * as THREE from 'three';
import { ctx, LANG_COLORS, DEFAULT_COLOR, resetCamera } from './three-city-core.js';
import { generateStreets, initRainSystem, initTrafficSystem } from './three-city-assets.js';
import { buildCodeMatrixNodes } from './three-city-matrix.js';

// Procedural Canvas Texture for Glowing Windows
export function createBuildingTexture(langColorHex, hasHighIssues) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctxCanvas = canvas.getContext('2d');

  // Base background
  ctxCanvas.fillStyle = '#060713';
  ctxCanvas.fillRect(0, 0, canvas.width, canvas.height);

  // Draw window columns & rows
  const cols = 8;
  const rows = 24;
  const paddingX = 8;
  const paddingY = 8;
  const winW = (canvas.width - paddingX * (cols + 1)) / cols;
  const winH = (canvas.height - paddingY * (rows + 1)) / rows;

  const tintR = parseInt(langColorHex.slice(1, 3), 16);
  const tintG = parseInt(langColorHex.slice(3, 5), 16);
  const tintB = parseInt(langColorHex.slice(5, 7), 16);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = paddingX + c * (winW + paddingX);
      const y = paddingY + r * (winH + paddingY);

      // Random off state
      if (Math.random() < 0.25) {
        ctxCanvas.fillStyle = '#03030a'; // Window is off
      } else {
        if (hasHighIssues && Math.random() < 0.35) {
          // Hot flashing red window for problematic projects
          ctxCanvas.fillStyle = 'rgba(255, 30, 70, 0.9)';
        } else {
          // Normal windows: blue-tinted with a blend of language color
          const blendR = Math.floor(100 * 0.7 + tintR * 0.3);
          const blendG = Math.floor(200 * 0.7 + tintG * 0.3);
          const blendB = Math.floor(255 * 0.7 + tintB * 0.3);
          const brightness = 0.5 + Math.random() * 0.5;
          ctxCanvas.fillStyle = `rgba(${Math.floor(blendR * brightness)}, ${Math.floor(blendG * brightness)}, ${Math.floor(blendB * brightness)}, 0.95)`;
        }
      }
      ctxCanvas.fillRect(x, y, winW, winH);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 1);
  return texture;
}

// Helper to calculate health score for styling classifications
export function getHealthScore(repo) {
  const commitsPoints = Math.min(30, Math.log10(repo.commits + 1) * 6);
  const lastActiveDate = new Date(repo.lastActive || repo.lastCommit || new Date());
  const elapsedDays = Math.max(0, Math.floor((new Date() - lastActiveDate) / (1000 * 60 * 60 * 24)));
  const recencyPoints = Math.max(0, 30 - (elapsedDays * 0.15));
  const contributors = Math.max(1, repo.contributors);
  const issuesPerDev = repo.issues / contributors;
  const issuePenalty = Math.min(20, issuesPerDev * 1.5);
  const issuePoints = Math.max(0, 20 - issuePenalty);
  const starsPoints = Math.min(15, Math.log10(repo.stars + 1) * 3);
  const forksPoints = Math.min(5, Math.log10(repo.forks + 1) * 1.2);
  const communityPoints = starsPoints + forksPoints;
  return Math.round(commitsPoints + recencyPoints + issuePoints + communityPoints);
}

// Draw futuristic glows as WebGL 3D Sprites
export function createHolographicBadge(text, colorHex) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 32;
  const ctxCanvas = canvas.getContext('2d');
  
  ctxCanvas.fillStyle = 'rgba(11, 13, 28, 0.85)';
  ctxCanvas.strokeStyle = colorHex;
  ctxCanvas.lineWidth = 2;
  ctxCanvas.beginPath();
  
  if (ctxCanvas.roundRect) {
    ctxCanvas.roundRect(2, 2, canvas.width - 4, canvas.height - 4, 6);
  } else {
    ctxCanvas.rect(2, 2, canvas.width - 4, canvas.height - 4);
  }
  ctxCanvas.fill();
  ctxCanvas.stroke();
  
  ctxCanvas.fillStyle = '#ffffff';
  ctxCanvas.font = 'bold 11px monospace';
  ctxCanvas.textAlign = 'center';
  ctxCanvas.textBaseline = 'middle';
  
  ctxCanvas.shadowColor = colorHex;
  ctxCanvas.shadowBlur = 6;
  ctxCanvas.fillText(text, canvas.width / 2, canvas.height / 2);
  
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(3.5, 0.88, 1);
  return sprite;
}

// Generate the metropolis based on repository datasets
export function generateCity(reposData) {
  // 1. Clear previous
  ctx.buildings.forEach(b => ctx.scene.remove(b.group));
  ctx.orbitingGems.forEach(gem => ctx.scene.remove(gem.mesh));
  ctx.antennas.forEach(ant => ctx.scene.remove(ant.bulb));
  
  // Clear traffic, rain, and halos
  ctx.trafficCars.forEach(car => ctx.scene.remove(car.mesh));
  ctx.trafficCars = [];
  ctx.activeHalos.forEach(halo => ctx.scene.remove(halo.mesh));
  ctx.activeHalos = [];
  if (ctx.rainSystem) {
    ctx.scene.remove(ctx.rainSystem);
    ctx.rainSystem = null;
  }
  if (ctx.matrixNodesGroup) {
    ctx.scene.remove(ctx.matrixNodesGroup);
    ctx.matrixNodesGroup = null;
  }
  ctx.fileNodesList = [];
  
  ctx.buildings = [];
  ctx.orbitingGems = [];
  ctx.antennas = [];
  ctx.selectedBuilding = null;
  resetCamera();

  const count = reposData.length;
  const columns = Math.ceil(Math.sqrt(count));
  const spacing = 14; 
  const startX = -((columns - 1) * spacing) / 2;
  const startZ = -((columns - 1) * spacing) / 2;

  // Check if comparison mode is active
  const hasComparison = reposData.some(r => r.ownerSide);

  // Generate cyber neon street grids connecting the towers
  generateStreets(columns, spacing, startX, startZ);

  // Add digital purple river bisector for comparison bank splits
  if (hasComparison) {
    const roadLength = columns * spacing + 22;
    const riverGeo = new THREE.PlaneGeometry(8, roadLength);
    const riverMat = new THREE.MeshStandardMaterial({
      color: 0x6c63ff,
      emissive: 0x6c63ff,
      emissiveIntensity: 2.2,
      transparent: true,
      opacity: 0.38,
      side: THREE.DoubleSide
    });
    const river = new THREE.Mesh(riverGeo, riverMat);
    river.rotation.x = -Math.PI / 2;
    river.position.set(0, 0.02, 0);
    ctx.scene.add(river);
    ctx.streets.push(river);
  }

  // Initialize atmospheric systems
  const widthBound = columns * spacing + 30;
  initRainSystem(widthBound, widthBound);
  initTrafficSystem(columns, spacing);

  reposData.forEach((repo, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);

    let x = startX + col * spacing;
    let z = startZ + row * spacing;

    // Separate rival banks left & right with a river buffer
    if (hasComparison) {
      if (repo.ownerSide === 'left') {
        x = -Math.abs(startX + col * spacing) - 5.5;
      } else {
        x = Math.abs(startX + col * spacing) + 5.5;
      }
    }

    // A. Height: Log-scaled commits
    const height = Math.max(3.0, Math.log10(repo.commits + 1) * 3.8);

    // B. Base Footprint Width: scaled by repository size (in KB)
    // Formula: sqrt(size) with a clamping threshold to prevent microscopic or screen-covering cubes
    const sizeFactor = Math.sqrt(repo.size || 1000);
    const width = Math.min(5.5, Math.max(1.8, sizeFactor * 0.0035 + 1.2));
    const depth = width; // square footprints look uniform and high-quality

    // Get Language color
    const langColorHex = LANG_COLORS[repo.language] || DEFAULT_COLOR;
    const hasHighIssues = repo.issues > 2000;
    const health = getHealthScore(repo);
    const isScaffoldTower = health < 50;
    const isEliteTower = health > 80;

    // Create Main Skyscraper Group
    const buildingGroup = new THREE.Group();
    buildingGroup.position.set(x, 0, z);

    // Dark metallic structural skeleton material
    const structureMaterial = new THREE.MeshStandardMaterial({
      color: isScaffoldTower ? 0x241202 : 0x070815,
      emissive: isScaffoldTower ? 0xee5500 : 0x000000,
      emissiveIntensity: isScaffoldTower ? 0.35 : 0,
      metalness: 0.95,
      roughness: 0.12,
      bumpScale: 0.05
    });

    // Windows emissive material
    const winTexture = createBuildingTexture(langColorHex, hasHighIssues);
    const windowsMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: winTexture,
      emissive: 0xffffff,
      emissiveMap: winTexture,
      emissiveIntensity: 1.5,
      metalness: 0.1,
      roughness: 0.4
    });

    // Double layer design: Inner core of glowing windows, outer structural frame
    // We can simulate setbacks by split tier geometries
    let topOfBuilding = height;

    const buildTiers = [];

    // Setback Logic
    if (height > 22) {
      // 3 Tiers (Bottom: 14, Middle: 8, Top: height - 22)
      buildTiers.push({ bottomY: 0, topY: 14, w: width, d: depth });
      buildTiers.push({ bottomY: 14, topY: 22, w: width * 0.75, d: depth * 0.75 });
      buildTiers.push({ bottomY: 22, topY: height, w: width * 0.5, d: depth * 0.5 });
    } else if (height > 14) {
      // 2 Tiers (Bottom: 14, Top: height - 14)
      buildTiers.push({ bottomY: 0, topY: 14, w: width, d: depth });
      buildTiers.push({ bottomY: 14, topY: height, w: width * 0.75, d: depth * 0.75 });
    } else {
      // 1 Tier
      buildTiers.push({ bottomY: 0, topY: height, w: width, d: depth });
    }

    buildTiers.forEach((tier) => {
      const tierH = tier.topY - tier.bottomY;
      const centerY = tier.bottomY + tierH / 2;

      // Window Block
      const winGeo = new THREE.BoxGeometry(tier.w * 0.96, tierH, tier.d * 0.96);
      const winMesh = new THREE.Mesh(winGeo, windowsMaterial);
      winMesh.position.y = centerY;
      winMesh.castShadow = true;
      winMesh.receiveShadow = true;
      buildingGroup.add(winMesh);

      // Scaffold braces for low health repos
      if (isScaffoldTower) {
        const braceMat = new THREE.MeshStandardMaterial({
          color: 0xee5500,
          emissive: 0xee5500,
          emissiveIntensity: 0.65,
          metalness: 0.8,
          roughness: 0.2
        });
        const beamGeo = new THREE.BoxGeometry(0.04, Math.sqrt(tier.w * tier.w + tierH * tierH), 0.04);
        
        // Front diagonal X brace
        const braceF1 = new THREE.Mesh(beamGeo, braceMat);
        braceF1.position.set(0, centerY, tier.d / 2 + 0.02);
        braceF1.rotation.z = Math.atan2(tier.w, tierH);
        buildingGroup.add(braceF1);

        const braceF2 = new THREE.Mesh(beamGeo, braceMat);
        braceF2.position.set(0, centerY, tier.d / 2 + 0.02);
        braceF2.rotation.z = -Math.atan2(tier.w, tierH);
        buildingGroup.add(braceF2);
      }

      // Structural frame block (edges/grid lines surrounding the windows)
      const frameGeo = new THREE.BoxGeometry(tier.w, tierH * 1.002, tier.d);
      const pillarW = 0.08 * tier.w;
      const cornerOffsets = [
        { x: -0.5, z: -0.5 },
        { x: -0.5, z: 0.5 },
        { x: 0.5, z: -0.5 },
        { x: 0.5, z: 0.5 }
      ];

      cornerOffsets.forEach(offset => {
        const pillarGeo = new THREE.BoxGeometry(pillarW, tierH, pillarW);
        const pillar = new THREE.Mesh(pillarGeo, structureMaterial);
        pillar.position.set(
          (tier.w / 2 - pillarW / 2) * offset.x * 2,
          centerY,
          (tier.d / 2 - pillarW / 2) * offset.z * 2
        );
        pillar.castShadow = true;
        buildingGroup.add(pillar);
      });

      // Roof plates
      const roofGeo = new THREE.BoxGeometry(tier.w * 1.02, 0.15, tier.d * 1.02);
      const roofMesh = new THREE.Mesh(roofGeo, structureMaterial);
      roofMesh.position.y = tier.topY;
      buildingGroup.add(roofMesh);
    });

    // C. Roof Glow: language-themed neon glow panel at the absolute peak
    const peakTier = buildTiers[buildTiers.length - 1];
    const glowGeo = new THREE.BoxGeometry(peakTier.w * 0.85, 0.1, peakTier.d * 0.85);
    const glowMat = new THREE.MeshStandardMaterial({
      color: langColorHex,
      emissive: langColorHex,
      emissiveIntensity: 2.8,
      metalness: 0.1,
      roughness: 0.1
    });
    const glowMesh = new THREE.Mesh(glowGeo, glowMat);
    glowMesh.position.y = height + 0.08;
    buildingGroup.add(glowMesh);

    // Dynamic rotating energy halo for elite repositories
    if (isEliteTower) {
      const haloGeo = new THREE.TorusGeometry(peakTier.w * 0.58, 0.08, 8, 24);
      const haloMat = new THREE.MeshStandardMaterial({
        color: langColorHex,
        emissive: langColorHex,
        emissiveIntensity: 3.5,
        metalness: 0.1,
        roughness: 0.1
      });
      const haloMesh = new THREE.Mesh(haloGeo, haloMat);
      haloMesh.position.set(x, height + 0.6, z);
      haloMesh.rotation.x = Math.PI / 2; // Flat horizontal plane
      ctx.scene.add(haloMesh);
      ctx.activeHalos.push({
        mesh: haloMesh,
        speed: 1.5 + Math.random() * 1.5
      });
    }

    // Floating 3D holographic status pins above peaks
    let badgeText = "";
    let badgeColor = "#00f0ff";
    if (health > 80) {
      badgeText = "💎 ELITE";
      badgeColor = "#00f0ff";
    } else if (repo.commits > 10000) {
      badgeText = "🔥 ACTIVE";
      badgeColor = "#ffaa00";
    } else if (hasHighIssues) {
      badgeText = "🚨 REFACTOR";
      badgeColor = "#ff1e46";
    }

    if (badgeText) {
      const badge = createHolographicBadge(badgeText, badgeColor);
      badge.position.set(0, height + 1.2, 0);
      buildingGroup.add(badge);
    }

    // Glowing point light at the peak for roof glow cast
    const roofLight = new THREE.PointLight(langColorHex, 0.8, 6);
    roofLight.position.set(0, height + 0.5, 0);
    buildingGroup.add(roofLight);

    // D. Orbiting ⬡ Gems: Star Count (1 per 30K stars)
    const gemCount = Math.min(10, Math.floor(repo.stars / 30000));
    const buildingRadius = peakTier.w * 0.9;

    for (let g = 0; g < gemCount; g++) {
      const gemGeo = new THREE.OctahedronGeometry(0.28, 0);
      const gemMat = new THREE.MeshStandardMaterial({
        color: 0xFFD700, // Gold star gem
        emissive: 0x9A7B0C,
        emissiveIntensity: 1.8,
        metalness: 1.0,
        roughness: 0.08
      });
      const gemMesh = new THREE.Mesh(gemGeo, gemMat);
      
      // Distribute heights and speeds
      const orbitHeight = height * 0.3 + (height * 0.6) * (g / Math.max(1, gemCount - 1));
      const orbitRadius = width * 1.05 + 1.0 + Math.random() * 0.5;
      const speed = 0.8 + Math.random() * 0.8;
      const phase = (g / gemCount) * Math.PI * 2;

      ctx.scene.add(gemMesh);
      ctx.orbitingGems.push({
        mesh: gemMesh,
        centerX: x,
        centerZ: z,
        radius: orbitRadius,
        height: orbitHeight,
        speed: speed,
        phase: phase
      });
    }

    // E. Blinking Antenna for Mega Projects (>16 height)
    if (height > 16) {
      // Silver pole
      const poleGeo = new THREE.CylinderGeometry(0.04, 0.04, 2.5, 6);
      const poleMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.9, roughness: 0.1 });
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(0, height + 1.25, 0);
      buildingGroup.add(pole);

      // Warning red beacon
      const bulbGeo = new THREE.SphereGeometry(0.12, 8, 8);
      const bulbMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
      const bulb = new THREE.Mesh(bulbGeo, bulbMat);
      bulb.position.set(x, height + 2.5, z);
      ctx.scene.add(bulb);

      ctx.antennas.push({
        bulb: bulb,
        freq: 4 + Math.random() * 2, // blink rate
        phase: Math.random() * Math.PI
      });
    }

    ctx.scene.add(buildingGroup);

    // Save in buildings list for interactions
    ctx.buildings.push({
      group: buildingGroup,
      meshBlock: buildingGroup.children[0], // window mesh (good target for raycasting)
      repoData: repo,
      height: height,
      width: width,
      depth: depth,
      langColorHex: langColorHex,
      hasHighIssues: hasHighIssues,
      textureToUpdate: winTexture // hold texture reference to update flashing windows
    });
  });

  // Build the 3D code matrix dependency graph
  buildCodeMatrixNodes(reposData);
}

// Scale buildings according to timeline percentage
export function updateCityTimeline(percentage) {
  const count = ctx.buildings.length;
  if (count === 0) return;

  const threshold = Math.ceil((percentage / 100) * count);

  ctx.buildings.forEach((b, index) => {
    if (index < threshold) {
      b.group.visible = true;
      b.group.scale.set(1, 1, 1);
    } else {
      b.group.visible = false;
    }
  });
}
