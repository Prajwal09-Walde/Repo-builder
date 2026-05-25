// Preset dataset representing famous repositories to populate the city automatically on start.
// Also includes helper objects for language color palettes.

export const GITHUB_LANG_COLORS = {
  "JavaScript": "#f1e05a",
  "TypeScript": "#3178c6",
  "Python": "#3572A5",
  "C++": "#f34b7d",
  "C": "#555555",
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

export const DEFAULT_LANG_COLOR = "#00FFFF"; // Cyan neon default

export const PRESET_REPOS = [
  {
    name: "linux",
    owner: "torvalds",
    description: "Linux kernel source tree - the foundation of modern cloud, mobile, and embedded computing infrastructures.",
    language: "C",
    commits: 1150000,
    stars: 172000,
    issues: 120, // Linux is managed via mailing lists, low issue count on GitHub mirror
    size: 4850000, // 4.85 GB in KB
    contributors: 24500,
    forks: 51000,
    watchers: 9500,
    lastActive: "2026-05-24T12:30:00Z",
    topics: ["kernel", "os", "linux", "system", "c"]
  },
  {
    name: "vscode",
    owner: "microsoft",
    description: "Visual Studio Code - a premium extensible code editor designed for professional developers.",
    language: "TypeScript",
    commits: 135000,
    stars: 162000,
    issues: 5400, // Trigger red-flashing windows (>2k issues)
    size: 512000, // 512MB
    contributors: 1950,
    forks: 28500,
    watchers: 3200,
    lastActive: "2026-05-24T14:10:00Z",
    topics: ["editor", "typescript", "electron", "development"]
  },
  {
    name: "react",
    owner: "facebook",
    description: "A declarative, efficient, and flexible JavaScript library for building component-based user interfaces.",
    language: "JavaScript",
    commits: 16800,
    stars: 224000, // Orbiting 7-8 yellow gems (1 gem per 30k stars)
    issues: 850,
    size: 195000,
    contributors: 1620,
    forks: 46200,
    watchers: 6800,
    lastActive: "2026-05-23T21:45:00Z",
    topics: ["frontend", "library", "react", "declarative-ui"]
  },
  {
    name: "three.js",
    owner: "mrdoob",
    description: "JavaScript 3D Library which makes WebGL simpler and highly accessible for creating outstanding visual web experiences.",
    language: "JavaScript",
    commits: 34500,
    stars: 99500, // Orbiting 3 gems
    issues: 380,
    size: 320000,
    contributors: 1850,
    forks: 19800,
    watchers: 2800,
    lastActive: "2026-05-24T09:15:00Z",
    topics: ["webgl", "3d", "graphics", "javascript", "canvas"]
  },
  {
    name: "rust",
    owner: "rust-lang",
    description: "Empowering everyone to build reliable and efficient software. Focuses on speed, memory safety, and thread concurrency.",
    language: "Rust",
    commits: 185000, // Very tall building
    stars: 94000,
    issues: 9800, // Trigger red flashing windows
    size: 1540000, // High size
    contributors: 4600,
    forks: 12500,
    watchers: 1700,
    lastActive: "2026-05-24T13:50:00Z",
    topics: ["compiler", "rust", "systems-programming", "memory-safety"]
  },
  {
    name: "kubernetes",
    owner: "kubernetes",
    description: "Production-Grade Container Scheduling and Management System. Orchestrates software deployment across containerized clouds.",
    language: "Go",
    commits: 118000,
    stars: 106000,
    issues: 3200, // Flashing red windows
    size: 980000,
    contributors: 3500,
    forks: 38200,
    watchers: 3400,
    lastActive: "2026-05-24T11:05:00Z",
    topics: ["orchestration", "kubernetes", "containers", "cloud-native"]
  },
  {
    name: "tensorflow",
    owner: "tensorflow",
    description: "An Open Source Machine Learning Framework for Everyone. Empowering researchers and businesses to scale deep neural networks.",
    language: "C++",
    commits: 124000,
    stars: 182000,
    issues: 4100, // Flashing windows
    size: 2100000,
    contributors: 3300,
    forks: 89000,
    watchers: 8200,
    lastActive: "2026-05-24T05:00:00Z",
    topics: ["machine-learning", "deep-learning", "neural-networks", "ai"]
  },
  {
    name: "flutter",
    owner: "flutter",
    description: "Google's SDK for crafting beautiful, fast, natively compiled applications for mobile, web, and desktop from a single codebase.",
    language: "Dart",
    commits: 38200,
    stars: 161000,
    issues: 12100, // Flashing windows
    size: 670000,
    contributors: 1350,
    forks: 26800,
    watchers: 3700,
    lastActive: "2026-05-24T13:12:00Z",
    topics: ["mobile", "cross-platform", "dart", "ui-toolkit"]
  },
  {
    name: "python-3-pattern-matching",
    owner: "python",
    description: "Experimental implementation of PEP 634: Structural Pattern Matching in core Python development tree.",
    language: "Python",
    commits: 2400, // Small building height
    stars: 2800, // 0 gems (needs >30K stars)
    issues: 45,
    size: 42000, // Narrow building width
    contributors: 85,
    forks: 290,
    watchers: 120,
    lastActive: "2024-11-12T08:00:00Z", // Low health score (inactive)
    topics: ["pep", "python", "pattern-matching"]
  },
  {
    name: "next.js",
    owner: "vercel",
    description: "The React Framework for the Web. Used by the world's leading companies, enabling high-performance SSR and static exports.",
    language: "TypeScript",
    commits: 31000,
    stars: 122000, // 4 gems
    issues: 1950, // Right on the edge of flashing windows
    size: 280000,
    contributors: 3100,
    forks: 26500,
    watchers: 1600,
    lastActive: "2026-05-24T14:02:00Z",
    topics: ["nextjs", "react", "ssr", "server-components", "framework"]
  }
];

