// Mock Claude AI Analyst with RAG Architecture.
// Injects full repository context dynamically into the prompt engine
// to simulate deep knowledge of repository specifics.

export class RagChatAnalyst {
  constructor() {
    this.currentRepo = null;
    this.chatHistory = [];
  }

  // Set the currently active repository for RAG injection
  setRepository(repo, healthScore) {
    this.currentRepo = {
      ...repo,
      healthScore: healthScore
    };
    this.chatHistory = []; // Reset history for new repo context
  }

  // Helper to generate the RAG System Prompt
  getSystemPrompt() {
    if (!this.currentRepo) return "No active repository selected. Please select a skyscraper from the 3D grid.";

    const r = this.currentRepo;
    const daysSinceActive = Math.floor((new Date() - new Date(r.lastActive)) / (1000 * 60 * 60 * 24)) || 0;

    return `SYSTEM CONTEXT INJECTED (RAG RETRIEVAL ENGINE):
-----------------------------------------------------------
You are Claude 3.5 Sonnet, a world-class AI repository systems architect and software analyst.
You have been loaded with active 3D visualization model facts for:
- Repository: "${r.owner}/${r.name}"
- Primary Language: ${r.language}
- Commits Count: ${r.commits.toLocaleString()} (${r.commits > 50000 ? 'Mega codebase volume' : 'Standard codebase volume'})
- Star Count: ${r.stars.toLocaleString()} (${Math.min(10, Math.floor(r.stars / 30000))} gold ⬡ gems orbiting in 3D)
- Open Issues: ${r.issues.toLocaleString()} (${r.issues > 2000 ? 'Red-flashing warning windows active (>2K issues)' : 'Normal blue-tinted window grid'})
- Project Footprint Size: ${r.size.toLocaleString()} KB
- Core Contributors: ${r.contributors}
- Health Score: ${r.healthScore}/100
- Last Commit: ${new Date(r.lastActive).toLocaleDateString()} (${daysSinceActive} days ago)
- Main Topics: ${r.topics.join(', ')}
-----------------------------------------------------------
Rules:
1. Provide expert analysis with specific statistics.
2. Address the user with a helpful, sharp, and highly technical tone.
3. Refer to the visual characteristics of their skyscraper (e.g., height, flashing red windows, orbiting gems, setback layers, blinking red antenna) where relevant.
4. Keep advice highly actionable (recommending stale-bots, contributor structures, code refactors, CI/CD pipeline improvements, etc.).`;
  }

  // Processes the user prompt, applies RAG context, and returns a tailored answer
  async getResponse(userMessage) {
    if (!this.currentRepo) {
      return {
        role: "assistant",
        text: "Please click on any skyscraper in the 3D metropolis first. Once selected, I'll ingest its metadata and begin a deep architectural audit of the project."
      };
    }

    const r = this.currentRepo;
    const messageLower = userMessage.toLowerCase();
    let reply = "";

    // 1. Specific trigger keywords
    if (messageLower.includes("health") || messageLower.includes("score")) {
      reply = this.analyzeHealth(r);
    } else if (messageLower.includes("issue") || messageLower.includes("red") || messageLower.includes("flash")) {
      reply = this.analyzeIssues(r);
    } else if (messageLower.includes("star") || messageLower.includes("gem") || messageLower.includes("orbit")) {
      reply = this.analyzeStarsAndGems(r);
    } else if (messageLower.includes("commit") || messageLower.includes("tall") || messageLower.includes("height") || messageLower.includes("setback")) {
      reply = this.analyzeCommitsAndStructure(r);
    } else if (messageLower.includes("improve") || messageLower.includes("recommend") || messageLower.includes("fix")) {
      reply = this.getArchRecommendations(r);
    } else {
      // General comprehensive analyst overview
      reply = this.getGeneralAudit(r, userMessage);
    }

    // Save to local history
    this.chatHistory.push({ role: "user", text: userMessage });
    this.chatHistory.push({ role: "assistant", text: reply });

    // Simulate network delay/thinking
    await new Promise(resolve => setTimeout(resolve, 800));

    return {
      role: "assistant",
      text: reply
    };
  }

  analyzeHealth(r) {
    const status = r.healthScore >= 80 ? "EXCELLENT" : (r.healthScore >= 50 ? "WARNING" : "CRITICAL");
    const color = r.healthScore >= 80 ? "Green" : (r.healthScore >= 50 ? "Amber" : "Red");

    return `### Repository Health Diagnostics: **${r.name}**
**Current Grade: ${r.healthScore}/100 [Status: ${status} - ${color} Alert]**

Here is my engineering breakdown of this score:
1. **Commit Velocity (30% weight)**: With **${r.commits.toLocaleString()} total commits**, this repo represents a ${r.commits > 80000 ? 'heavy-duty development pipeline' : 'moderately paced production cycle'}.
2. **Activity Recency (30% weight)**: The last commit was pushed on **${new Date(r.lastActive).toLocaleDateString()}**. ${r.healthScore < 60 ? 'This indicates a major cooling-off period. The engine is experiencing inactivity decay.' : 'Activity remains actively warmed, preserving momentum.'}
3. **Issue-to-Contributor Ratio (20% weight)**: You have **${r.issues.toLocaleString()} issues** distributed across **${r.contributors} key maintainers**. This represents a ratio of **${(r.issues / r.contributors).toFixed(1)} issues per contributor**.
4. **Community Footprint (20% weight)**: A massive core size of **${r.stars.toLocaleString()} stars** and **${r.forks.toLocaleString()} forks** adds rich buffers, but requires rigorous community triage to sustain.

*Analyst Recommendation*: To boost this score to the next tier, ${r.issues > 2000 ? 'implement strict GitHub Action Issue templates to filter incoming reports.' : 'maintain a weekly commit cadence and resolve open stale-PRs.'}`;
  }

  analyzeIssues(r) {
    if (r.issues > 2000) {
      return `### Warning: High Issue Payload Detected 🚨
The skyscraper for **${r.name}** features **flashing red windows** in our 3D grid, which is triggered because your open issue queue is at **${r.issues.toLocaleString()}** (exceeding the critical 2,000 threshold).

Here is my professional assessment of this backlog:
- **Triage Pressure**: Maintainers are heavily outnumbered. With **${r.contributors} core contributors**, the queue ratio is exceptionally high. This causes fatigue, bug drift, and slower release loops.
- **Visual Alert**: In the visual grid, the **hot red window cells** flash to indicate high friction points where community bug reports are out-scaling active resolutions.

**My Strategic Recovery Plan:**
1. **Automate Triage**: Deploy the \`actions/stale\` GitHub action. Flag issues without activity for 60 days as "stale", and auto-close them after 14 days of no response.
2. **Implement Issue Forms**: Switch from markdown text-areas to **Structured YAML Issue Forms**. Force users to provide steps-to-reproduce, environment info, and minimal failing repos. This eliminates 40% of low-quality issues.
3. **Establish SIGs (Special Interest Groups)**: Break down the repository issues by topics (${r.topics.slice(0, 3).join(', ')}) and delegate triage roles to specific community leaders.`;
    } else {
      return `### Issue Queue Audit: **${r.name}**
Your skyscraper currently shows a **solid blue-tinted window grid**, indicating a healthy and managed issue payload of **${r.issues.toLocaleString()} open issues**.

- **Maintainer Overhead**: Highly sustainable. With **${r.contributors} active contributors**, you are averaging only **${(r.issues / r.contributors).toFixed(1)} issues per developer**.
- **Community Stability**: Code quality checks and release gates are functioning optimally. Keep up the high standard!`;
    }
  }

  analyzeStarsAndGems(r) {
    const gems = Math.min(10, Math.floor(r.stars / 30000));
    return `### Star Magnitude & Orbiting Gems ⬡
The repository **${r.owner}/${r.name}** has accumulated a substantial **${r.stars.toLocaleString()} stars** from the global engineering community!

- **3D Visualization Logic**: In our engine, we represent star power as orbiting yellow octahedron gems (**1 gem per 30,000 stars**). Your tower features **${gems} gem${gems !== 1 ? 's' : ''}** revolving around the main core structure.
- **Significance**: Gems indicate social validation and developer adoption. If you have multiple gems spinning rapidly, it means this repo has outstanding outreach.
- **Forks Ratio**: With **${r.forks.toLocaleString()} forks**, approximately **1 in every ${(r.stars / r.forks).toFixed(1)} star-gazers** has duplicated your repository to build downstream projects. This is a very high utility coefficient.`;
  }

  analyzeCommitsAndStructure(r) {
    const height = Math.max(3.0, Math.log10(r.commits + 1) * 3.8);
    const hasSetbacks = height > 14;
    const isMega = height > 16;

    let structuralOverview = `### Skyscraper Structural & Commit Analysis 🏢
Your tower for **${r.name}** represents its commit history (**${r.commits.toLocaleString()} total commits**) mapped to a **log-scaled height of ${height.toFixed(1)} units**.

`;

    if (isMega) {
      structuralOverview += `- **Mega-Project Status**: Since the height exceeds 16, a **blinking red warning antenna** has been constructed at the summit. This signals an exceptionally mature codebase with deep history.
`;
    }

    if (hasSetbacks) {
      const setbackCount = height > 22 ? "two structural setbacks (at levels 14 and 22)" : "one structural setback (at level 14)";
      structuralOverview += `- **Architectural Setbacks**: The tower features **${setbackCount}**. This architectural step-back mimics modern real-world skyscrapers, distributing the visual weight of massive projects and preventing smaller towers from being visually dominated.
`;
    } else {
      structuralOverview += `- **Monolithic Column**: Since this is a streamlined codebase (height <= 14 units), it is rendered as a clean, uniform monolithic column.
`;
    }

    structuralOverview += `
- **Footprint Footprint**: The physical width of **${(Math.min(5.5, Math.max(1.8, Math.sqrt(r.size) * 0.0035 + 1.2))).toFixed(2)} units** directly corresponds to a repository file footprint of **${r.size.toLocaleString()} KB**. A wider skyscraper means a heavier, package-dense repo, while a thin skyscraper indicates a lightweight, modular repository.`;

    return structuralOverview;
  }

  getArchRecommendations(r) {
    return `### Expert Architecture Blueprint for **${r.name}**
Based on the metrics retrieved via our RAG agent, here is my custom architectural checklist to optimize this codebase:

1. **Refining the Footprint (${r.size.toLocaleString()} KB)**:
   - *Issue*: Codebase is ${r.size > 500000 ? 'becoming bloated' : 'lightweight but could be optimized'}.
   - *Action*: Run \`gitleaks\` or \`trufflehog\` to ensure no large binaries or historical secrets are bloating the Git index. Implement a strict \`.gitignore\` to exclude test build outputs.

2. **Language Optimization (${r.language})**:
   - As a ${r.language} project, leverage strict modern tooling. If TypeScript, enforce strict null-checks; if C/C++, audit memory pointers using Valgrind/Sanitizers; if Rust, utilize Clippy lints inside your CI matrix.

3. **Boosting the Health Score (${r.healthScore}/100)**:
   - Set up **Dependabot** or **Renovate** to automate dependency updates. Keeping packages fresh directly improves safety and activity indices.
   - Introduce a \`CONTRIBUTING.md\` file detailing a clear setup routine, reducing onboarding friction for the **${r.contributors}** developer pool.`;
  }

  getGeneralAudit(r, query) {
    const daysSinceActive = Math.floor((new Date() - new Date(r.lastActive)) / (1000 * 60 * 60 * 24)) || 0;
    return `### Repository Architectural Review: **${r.owner}/${r.name}**
Greetings! I've analyzed your custom prompt ("*${query}*") alongside the RAG metadata retrieved for this tower. 

Here is my holistic audit of this **${r.language}** project:

- **Structural Status**: This skyscraper stands at **${Math.max(3.0, Math.log10(r.commits + 1) * 3.8).toFixed(1)} units** in height, showing **${r.commits.toLocaleString()} commits**. It has a health rating of **${r.healthScore}/100**.
- **Issue Overhead**: It is currently running at **${r.issues.toLocaleString()} open issues**. ${r.issues > 2000 ? 'This queue is overflowing and flashing red in your city grid!' : 'This is a well-triage queue, keeping the building window tint a steady cybernetic blue.'}
- **Recency Decay**: The codebase was last updated **${daysSinceActive} days ago** (${new Date(r.lastActive).toLocaleDateString()}). 

**Your query context**:
You asked about this skyscraper. Looking at its topics (${r.topics.join(', ') || 'none specified'}), this project plays a critical role in the ${r.language} ecosystem. If you seek to scale it, focus first on resolving open issues and automating your pull-request check flows.

*Feel free to ask me detailed questions: "How do I fix the flashing windows?", "Explain my health score", or "Suggest architectural recommendations!"*`;
  }
}
