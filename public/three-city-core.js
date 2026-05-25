import * as THREE from 'three';

export const LANG_COLORS = {
  "JavaScript": "#f1e05a",
  "TypeScript": "#3178c6",
  "Python": "#3572A5",
  "C++": "#f34b7d",
  "C": "#a8a8a8",
  "Rust": "#dea584",
  "Go": "#00ADD8",
  "Java": "#b07219",
  "HTML": "#e34c26",
  "CSS": "#563d7c",
  "Ruby": "#701516",
  "Shell": "#89e051",
  "PHP": "#4F5D95",
  "Swift": "#F05138",
  "Kotlin": "#A97BFF",
  "Dart": "#00B4AB",
  "C#": "#178600",
  "Vue": "#41B883"
};

export const DEFAULT_COLOR = "#00FFFF";

export const ctx = {
  scene: null,
  camera: null,
  renderer: null,
  controls: null,
  buildings: [],
  orbitingGems: [],
  antennas: [],
  streets: [],
  hoverHighlightMesh: null,
  selectedBuilding: null,
  isPinging: false,

  // Cyberpunk Metropolis Extensions
  trafficCars: [],
  rainSystem: null,
  activeHalos: [],
  dayCycleTime: 0,

  // Code Matrix Node Variables
  matrixNodesGroup: null,
  isInMatrixView: false,
  fileNodesList: [],

  // Camera transition targets
  targetCameraPos: null,
  targetLookAt: null,
  originalCameraPos: new THREE.Vector3(30, 25, 30),
  originalLookAt: new THREE.Vector3(0, 0, 0),

  // Callbacks
  onRepoClickedCallback: null,
  onRepoHoverCallback: null,

  // Raycasting for mouse interactions
  raycaster: new THREE.Raycaster(),
  mouse: new THREE.Vector2()
};

// Reset camera to full view based on active mode
export function resetCamera() {
  ctx.selectedBuilding = null;
  if (ctx.isInMatrixView) {
    ctx.targetCameraPos = new THREE.Vector3(0, 15, 25);
    ctx.targetLookAt = new THREE.Vector3(0, 10, 0);
  } else {
    ctx.targetCameraPos = ctx.originalCameraPos.clone();
    ctx.targetLookAt = ctx.originalLookAt.clone();
  }
}
