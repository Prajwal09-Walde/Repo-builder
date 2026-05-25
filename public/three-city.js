import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ctx, LANG_COLORS, DEFAULT_COLOR } from './three-city-core.js';

// Re-export structural generation helpers to keep public API unified for app.js
export { generateCity, updateCityTimeline } from './three-city-buildings.js';
export { toggleCodeMatrixView } from './three-city-matrix.js';
export { resetCamera } from './three-city-core.js';

// Setup Scene
export function initScene(containerId, onRepoClicked, onRepoHover) {
  const container = document.getElementById(containerId);
  if (!container) return;

  ctx.onRepoClickedCallback = onRepoClicked;
  ctx.onRepoHoverCallback = onRepoHover;

  // Scene
  ctx.scene = new THREE.Scene();
  ctx.scene.fog = new THREE.FogExp2(0x04050f, 0.012);

  // Camera & Layout size fallback (resolves NaN aspect ratios on fast load)
  const width = container.clientWidth || window.innerWidth || 800;
  const height = container.clientHeight || window.innerHeight || 600;

  ctx.camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
  ctx.camera.position.copy(ctx.originalCameraPos);

  // Renderer
  ctx.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  ctx.renderer.setSize(width, height);
  ctx.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  ctx.renderer.setClearColor(0x04050f, 1);
  ctx.renderer.shadowMap.enabled = true;
  ctx.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(ctx.renderer.domElement);

  // Controls
  ctx.controls = new OrbitControls(ctx.camera, ctx.renderer.domElement);
  ctx.controls.enableDamping = true;
  ctx.controls.dampingFactor = 0.05;
  ctx.controls.maxPolarAngle = Math.PI / 2 - 0.02; // Keep camera above ground
  ctx.controls.minDistance = 3;
  ctx.controls.maxDistance = 120;
  ctx.controls.target.copy(ctx.originalLookAt);
  ctx.controls.autoRotate = true;
  ctx.controls.autoRotateSpeed = 0.8;

  // Lights
  const ambientLight = new THREE.AmbientLight(0x0d0f27, 0.8);
  ctx.scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0x6c63ff, 1.2);
  dirLight.position.set(40, 60, 20);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  dirLight.shadow.bias = -0.0005;
  ctx.scene.add(dirLight);

  const dirLight2 = new THREE.DirectionalLight(0x00f0ff, 0.6);
  dirLight2.position.set(-40, 20, -20);
  ctx.scene.add(dirLight2);

  // Ground Grid & Floor
  const gridHelper = new THREE.GridHelper(200, 40, 0x1f2347, 0x0f1126);
  gridHelper.position.y = 0.01;
  ctx.scene.add(gridHelper);

  const floorGeo = new THREE.PlaneGeometry(250, 250);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x04050a,
    roughness: 0.8,
    metalness: 0.9,
    transparent: true,
    opacity: 0.9
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  ctx.scene.add(floor);

  // Hover Highlight Wireframe Box
  const highlightGeo = new THREE.BoxGeometry(1, 1, 1);
  const highlightMat = new THREE.MeshBasicMaterial({
    color: 0x00ffff,
    wireframe: true,
    transparent: true,
    opacity: 0
  });
  ctx.hoverHighlightMesh = new THREE.Mesh(highlightGeo, highlightMat);
  ctx.scene.add(ctx.hoverHighlightMesh);

  // Event Listeners
  window.addEventListener('resize', onWindowResize);
  container.addEventListener('mousemove', onMouseMove);
  container.addEventListener('click', onMouseClick);

  // Start Animation Loop
  animate();
}

function onWindowResize() {
  const container = ctx.renderer.domElement.parentElement;
  const width = container.clientWidth || window.innerWidth || 800;
  const height = container.clientHeight || window.innerHeight || 600;
  ctx.camera.aspect = width / height;
  ctx.camera.updateProjectionMatrix();
  ctx.renderer.setSize(width, height);
}

function onMouseMove(event) {
  const rect = ctx.renderer.domElement.getBoundingClientRect();
  ctx.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  ctx.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

function onMouseClick(event) {
  ctx.raycaster.setFromCamera(ctx.mouse, ctx.camera);
  
  if (ctx.isInMatrixView) {
    const intersects = ctx.raycaster.intersectObjects(ctx.fileNodesList);
    if (intersects.length > 0) {
      const fileNode = intersects[0].object;
      const meta = fileNode.userData;
      if (meta && ctx.onRepoClickedCallback) {
        ctx.onRepoClickedCallback({
          owner: meta.repo.owner,
          name: meta.name,
          description: `Ingested code file submodule from directory branch. Includes imports, exported functions, and API vectors.`,
          language: meta.ext.toUpperCase(),
          commits: 450,
          stars: meta.repo.stars,
          issues: 0,
          size: parseInt(meta.size) || 12,
          contributors: 2,
          topics: [meta.ext, 'submodule', 'dependency']
        });
      }
    }
    return;
  }

  const intersects = ctx.raycaster.intersectObjects(ctx.buildings.map(b => b.meshBlock || b.group));

  if (intersects.length > 0) {
    let clickedBlock = intersects[0].object;
    let topGroup = clickedBlock;
    while (topGroup.parent && topGroup.parent !== ctx.scene) {
      topGroup = topGroup.parent;
    }

    const building = ctx.buildings.find(b => b.group === topGroup);
    if (building) {
      selectBuilding(building);
    }
  }
}

// Select a building and animate camera to see the ENTIRE building from top to bottom
export function selectBuilding(building) {
  ctx.selectedBuilding = building;

  if (ctx.onRepoClickedCallback) {
    ctx.onRepoClickedCallback(building.repoData);
  }

  const basePos = building.group.position;
  const height = building.height;

  // Calculate distance dynamically based on building height to ensure the full tower (top to bottom)
  // fits cleanly within the camera vertical FOV, adding a nice margin.
  const distance = Math.max(16.0, height * 1.6);

  ctx.targetCameraPos = new THREE.Vector3(
    basePos.x + distance * 0.8,
    height * 0.5 + distance * 0.55,
    basePos.z + distance * 0.8
  );
  ctx.targetLookAt = new THREE.Vector3(
    basePos.x,
    height * 0.45, // Look slightly below the middle to keep full structure nicely centered
    basePos.z
  );
}



// Ping Selected Building with a glowing flash alert
export function pingSelectedBuilding() {
  if (!ctx.selectedBuilding || ctx.isPinging) return;

  ctx.isPinging = true;

  // Position the highlight box surrounding the selected building
  ctx.hoverHighlightMesh.scale.set(ctx.selectedBuilding.width * 1.15, ctx.selectedBuilding.height * 1.05, ctx.selectedBuilding.depth * 1.15);
  ctx.hoverHighlightMesh.position.set(ctx.selectedBuilding.group.position.x, ctx.selectedBuilding.height / 2, ctx.selectedBuilding.group.position.z);
  
  let count = 0;
  const originalColor = ctx.hoverHighlightMesh.material.color.getHex();
  
  const interval = setInterval(() => {
    count++;
    if (count % 2 === 0) {
      ctx.hoverHighlightMesh.material.color.setHex(0xff1e46); // Flashing Red/Neon Ping
      ctx.hoverHighlightMesh.material.opacity = 0.95;
    } else {
      ctx.hoverHighlightMesh.material.color.setHex(0x00f0ff); // Neon Cyan
      ctx.hoverHighlightMesh.material.opacity = 0.25;
    }
    if (count > 6) {
      clearInterval(interval);
      // Restore to hidden
      ctx.hoverHighlightMesh.material.opacity = 0;
      ctx.hoverHighlightMesh.material.color.setHex(originalColor);
      ctx.isPinging = false;
    }
  }, 150);

  // Smoothly refocus camera on the selected building to fit the entire tower from top to bottom
  const basePos = ctx.selectedBuilding.group.position;
  const height = ctx.selectedBuilding.height;
  const distance = Math.max(16.0, height * 1.6);

  ctx.targetCameraPos = new THREE.Vector3(
    basePos.x + distance * 0.8,
    height * 0.5 + distance * 0.55,
    basePos.z + distance * 0.8
  );
  ctx.targetLookAt = new THREE.Vector3(
    basePos.x,
    height * 0.45,
    basePos.z
  );
}

// Render loop running at ~60fps
function animate() {
  requestAnimationFrame(animate);

  const time = performance.now() * 0.001;

  // 1. Camera interpolation for smooth zoom and pans
  const isAnimatingCamera = (ctx.targetCameraPos !== null || ctx.targetLookAt !== null);

  if (isAnimatingCamera) {
    // Disable damping to prevent OrbitControls from fighting our manual lerp
    ctx.controls.enableDamping = false;

    if (ctx.targetCameraPos) {
      ctx.camera.position.lerp(ctx.targetCameraPos, 0.06);
      if (ctx.camera.position.distanceTo(ctx.targetCameraPos) < 0.02) {
        ctx.camera.position.copy(ctx.targetCameraPos);
        ctx.targetCameraPos = null;
      }
    }

    if (ctx.targetLookAt) {
      ctx.controls.target.lerp(ctx.targetLookAt, 0.06);
      if (ctx.controls.target.distanceTo(ctx.targetLookAt) < 0.02) {
        ctx.controls.target.copy(ctx.targetLookAt);
        ctx.targetLookAt = null;
      }
    }

    ctx.controls.update();
  } else {
    // Re-enable damping for smooth user mouse interactions
    ctx.controls.enableDamping = true;
    ctx.controls.update();
  }

  // 2. Animate Orbiting Star Gems
  ctx.orbitingGems.forEach(gem => {
    const angle = time * gem.speed + gem.phase;
    const gx = gem.centerX + Math.cos(angle) * gem.radius;
    const gz = gem.centerZ + Math.sin(angle) * gem.radius;
    gem.mesh.position.set(gx, gem.height, gz);
    gem.mesh.rotation.x += 0.015;
    gem.mesh.rotation.y += 0.03;
  });

  // 3. Animate Blinking Antennas
  ctx.antennas.forEach(ant => {
    const visible = Math.sin(time * ant.freq + ant.phase) > 0;
    ant.bulb.material.color.setHex(visible ? 0xff0000 : 0x220000);
  });

  // 4. Animate flashing windows on problematic projects (updating canvas texture occasionally)
  ctx.buildings.forEach(b => {
    if (b.hasHighIssues && b.textureToUpdate) {
      // Trigger a periodic blink intensity modification
      const pulseVal = 0.65 + Math.sin(time * 6.5) * 0.35;
      b.textureToUpdate.needsUpdate = true;
      b.meshBlock.material.emissiveIntensity = 0.5 + pulseVal * 1.5;
    }
  });

  // 5. Day/Night atmospheric schedule cycles (interpolating fog density and ambient lighting colors)
  ctx.dayCycleTime += 0.0006;
  const cycleVal01 = (Math.sin(ctx.dayCycleTime) + 1.0) / 2.0; // 0.0 (midnight) to 1.0 (noon)
  
  if (ctx.scene && ctx.renderer) {
    // Midnight: deep cyber navy/black. Noon: subtle neon-purple tinted glow,
    const dayFogColor = new THREE.Color(0x0c071a);
    const nightFogColor = new THREE.Color(0x020206);
    const interpolatedColor = nightFogColor.clone().lerp(dayFogColor, cycleVal01);
    
    ctx.scene.fog.color.copy(interpolatedColor);
    ctx.renderer.setClearColor(interpolatedColor, 1);
    
    // Scale ambient and directional light levels dynamically
    ctx.scene.traverse((c) => {
      if (c.isDirectionalLight) {
        c.intensity = 0.35 + cycleVal01 * 0.85;
      }
      if (c.isAmbientLight) {
        c.intensity = 0.25 + cycleVal01 * 0.65;
      }
    });
  }

  // 6. Update Cybernetic Rain Positions
  if (ctx.rainSystem) {
    const posAttr = ctx.rainSystem.geometry.attributes.position;
    const positions = posAttr.array;
    for (let i = 0; i < positions.length / 6; i++) {
      positions[i * 6 + 1] -= 1.5; // fall velocity
      positions[i * 6 + 4] -= 1.5;

      if (positions[i * 6 + 1] < 0) {
        positions[i * 6 + 1] = 45 + Math.random() * 15;
        positions[i * 6 + 4] = positions[i * 6 + 1] - 1.5;
      }
    }
    posAttr.needsUpdate = true;
  }

  // 7. Update Autonomous Traffic
  ctx.trafficCars.forEach(car => {
    car.progress += car.speed * car.direction;
    const halfLen = car.roadLength / 2;
    if (car.progress > halfLen) car.progress = -halfLen;
    else if (car.progress < -halfLen) car.progress = halfLen;

    if (car.isXStreet) {
      car.mesh.position.set(car.progress, 0.06, car.fixedCoord);
    } else {
      car.mesh.position.set(car.fixedCoord, 0.06, car.progress);
    }
  });

  // 8. Update Rotating Halos
  ctx.activeHalos.forEach(halo => {
    halo.mesh.rotation.z += 0.02 * halo.speed;
  });

  // Slow rotation for file tree graph in matrix mode
  if (ctx.isInMatrixView && ctx.matrixNodesGroup) {
    ctx.matrixNodesGroup.rotation.y += 0.003;
  }

  // 9. Handle raycasting hover effects
  let isHoveringInteractive = false;

  if (!ctx.isPinging) {
    if (ctx.isInMatrixView) {
      ctx.raycaster.setFromCamera(ctx.mouse, ctx.camera);
      const intersects = ctx.raycaster.intersectObjects(ctx.fileNodesList);
      if (intersects.length > 0) {
        isHoveringInteractive = true;
        const fileNode = intersects[0].object;
        const meta = fileNode.userData;
        
        if (ctx.onRepoHoverCallback && meta) {
          const tempV = new THREE.Vector3();
          fileNode.getWorldPosition(tempV);
          tempV.y += 0.6;
          tempV.project(ctx.camera);

          const x = (tempV.x *  .5 + .5) * ctx.renderer.domElement.clientWidth;
          const y = (tempV.y * -.5 + .5) * ctx.renderer.domElement.clientHeight;

          ctx.onRepoHoverCallback({
            name: meta.name,
            language: meta.ext.toUpperCase(),
            commits: meta.size, // maps to size in UI
            stars: 0,
            issues: 0,
            forks: 0,
            isFile: true
          }, { x, y });
        }
      } else {
        if (ctx.onRepoHoverCallback) {
          ctx.onRepoHoverCallback(null, null);
        }
      }
    } else {
      ctx.raycaster.setFromCamera(ctx.mouse, ctx.camera);
      const intersects = ctx.raycaster.intersectObjects(ctx.buildings.map(b => b.meshBlock || b.group));

      if (intersects.length > 0) {
        let hoveredMesh = intersects[0].object;
        let topGroup = hoveredMesh;
        while (topGroup.parent && topGroup.parent !== ctx.scene) {
          topGroup = topGroup.parent;
        }

        const building = ctx.buildings.find(b => b.group === topGroup);
        if (building) {
          isHoveringInteractive = true;
          ctx.hoverHighlightMesh.scale.set(building.width * 1.08, building.height * 1.02, building.depth * 1.08);
          ctx.hoverHighlightMesh.position.set(building.group.position.x, building.height / 2, building.group.position.z);
          ctx.hoverHighlightMesh.material.opacity = 0.85;
          ctx.hoverHighlightMesh.material.color.setHex(0x00f0ff);

          if (ctx.onRepoHoverCallback) {
            const tempV = new THREE.Vector3();
            building.group.getWorldPosition(tempV);
            tempV.y += building.height * 0.8;
            tempV.project(ctx.camera);

            const x = (tempV.x *  .5 + .5) * ctx.renderer.domElement.clientWidth;
            const y = (tempV.y * -.5 + .5) * ctx.renderer.domElement.clientHeight;

            ctx.onRepoHoverCallback(building.repoData, { x, y });
          }
        }
      } else {
        ctx.hoverHighlightMesh.material.opacity = 0;
        if (ctx.onRepoHoverCallback) {
          ctx.onRepoHoverCallback(null, null);
        }
      }
    }
  }

  // Update canvas cursor to pointer when hovering over interactive elements
  if (ctx.renderer && ctx.renderer.domElement) {
    ctx.renderer.domElement.style.cursor = isHoveringInteractive ? 'pointer' : 'default';
  }

  // 10. Update cinematic auto-rotation for cityscape grid (pauses when panel is open, matrix is active, or building selected)
  if (ctx.controls) {
    const ragPanel = document.getElementById('rag-panel');
    const isPanelOpen = ragPanel && ragPanel.classList.contains('open');
    ctx.controls.autoRotate = (!isPanelOpen && !ctx.isInMatrixView && !ctx.selectedBuilding);
  }

  ctx.renderer.render(ctx.scene, ctx.camera);
}

// Keyboard navigation to focus on next/previous skyscraper building
export function navigateBuildings(direction) {
  if (ctx.isInMatrixView || ctx.buildings.length === 0) return;

  const currentIndex = ctx.buildings.findIndex(b => b === ctx.selectedBuilding);

  if (currentIndex === -1) {
    // Select first or last depending on direction if nothing is active
    const targetIndex = direction > 0 ? 0 : ctx.buildings.length - 1;
    selectBuilding(ctx.buildings[targetIndex]);
  } else {
    let targetIndex = currentIndex + direction;
    if (targetIndex >= ctx.buildings.length) {
      targetIndex = 0; // wrap to first
    } else if (targetIndex < 0) {
      targetIndex = ctx.buildings.length - 1; // wrap to last
    }
    selectBuilding(ctx.buildings[targetIndex]);
  }
}
