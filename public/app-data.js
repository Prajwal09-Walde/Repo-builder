import { PRESET_REPOS } from './repo-data.js';
import { generateCity, resetCamera } from './three-city.js';

// Shared application states
export const appState = {
  activeRepos: [...PRESET_REPOS],
  isGenerating: false
};

// Math Formula for Codebase Health Score (0 - 100)
// Health Score = Commit Velocity (30%) + Recency Decay (30%) + Issue Density (20%) + Community Outreach (20%)
export function calculateHealthScore(repo) {
  // A. Commit Velocity Weight (Max 30)
  // Scale log-based: 30 points if commits >= 100,000, sliding down
  const commitsPoints = Math.min(30, Math.log10(repo.commits + 1) * 6);

  // B. Activity Recency Decay Weight (Max 30)
  // Find elapsed days since last active commit. 30 points if active today, decays linearly to 0 at 200 days
  const lastActiveDate = new Date(repo.lastActive || repo.lastCommit || new Date());
  const elapsedDays = Math.max(0, Math.floor((new Date() - lastActiveDate) / (1000 * 60 * 60 * 24)));
  const recencyPoints = Math.max(0, 30 - (elapsedDays * 0.15));

  // C. Issue-to-Contributor Ratio Weight (Max 20)
  // 20 points default. High issues relative to contributors introduces a sliding penalty
  const contributors = Math.max(1, repo.contributors);
  const issuesPerDev = repo.issues / contributors;
  const issuePenalty = Math.min(20, issuesPerDev * 1.5);
  const issuePoints = Math.max(0, 20 - issuePenalty);

  // D. Community Outreach Weight (Max 20)
  // Stars + forks scale log-based
  const starsPoints = Math.min(15, Math.log10(repo.stars + 1) * 3);
  const forksPoints = Math.min(5, Math.log10(repo.forks + 1) * 1.2);
  const communityPoints = starsPoints + forksPoints;

  const total = Math.round(commitsPoints + recencyPoints + issuePoints + communityPoints);
  return Math.max(0, Math.min(100, total));
}

// Trigger load data from preset arrays or GitHub fetch API
export async function handleDataLoadingTrigger() {
  if (appState.isGenerating) return;

  const dataSourceSelect = document.getElementById('data-source-select');
  const usernameInput = document.getElementById('username-input');
  const btnSearchIcon = document.getElementById('btn-search-icon');
  const timelineSlider = document.getElementById('timeline-slider');
  const timelineStatusLabel = document.getElementById('timeline-status-label');

  const source = dataSourceSelect.value;
  if (source === 'preset') {
    appState.activeRepos = [...PRESET_REPOS];
    rebuildCityDashboard(appState.activeRepos);
    // Reset timeline controls
    timelineSlider.value = 100;
    timelineStatusLabel.textContent = "100% (All)";
  } else {
    const username = usernameInput.value.trim();
    if (!username) {
      alert("Please enter a valid GitHub username!");
      return;
    }
    await fetchGitHubUserRepos(username);
  }
}

// Fetch repositories live from our backend GitHub authenticated proxy
export async function fetchGitHubUserRepos(username) {
  const dataSourceSelect = document.getElementById('data-source-select');
  const usernameInput = document.getElementById('username-input');
  const btnSearchIcon = document.getElementById('btn-search-icon');
  const topConsole = document.getElementById('top-console');
  const timelineSlider = document.getElementById('timeline-slider');
  const timelineStatusLabel = document.getElementById('timeline-status-label');

  appState.isGenerating = true;
  topConsole.classList.add('loading');
  btnSearchIcon.textContent = "⏳";

  const source = dataSourceSelect.value;

  const token = localStorage.getItem('metropolis_token');
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    if (source === 'compare') {
      const users = username.split(',').map(s => s.trim()).filter(Boolean);
      if (users.length < 2) {
        alert("Please enter two GitHub usernames separated by a comma (e.g. mrdoob, torvalds)!");
        topConsole.classList.remove('loading');
        btnSearchIcon.textContent = "⚔️";
        appState.isGenerating = false;
        return;
      }

      // Fetch both in parallel from backend proxy routes
      const [resA, resB] = await Promise.all([
        fetch(`/api/repos/${users[0]}`, { headers }),
        fetch(`/api/repos/${users[1]}`, { headers })
      ]);

      const dataA = resA.ok ? await resA.json() : [];
      const dataB = resB.ok ? await resB.json() : [];

      if (dataA.length === 0 && dataB.length === 0) {
        throw new Error("Could not retrieve repository data for either user!");
      }

      // Assign bank positions
      dataA.forEach(r => r.ownerSide = 'left');
      dataB.forEach(r => r.ownerSide = 'right');

      appState.activeRepos = [...dataA, ...dataB];
    } else {
      const response = await fetch(`/api/repos/${username}`, { headers });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const errMsg = errData.error || `Status: ${response.status}`;
        throw new Error(errMsg);
      }

      const data = await response.json();
      if (data.length === 0) {
        alert("No public repositories found for this user!");
        topConsole.classList.remove('loading');
        btnSearchIcon.textContent = (dataSourceSelect.value === 'preset') ? "⚡" : "🔍";
        appState.isGenerating = false;
        return;
      }

      appState.activeRepos = data;
    }

    rebuildCityDashboard(appState.activeRepos);
    
    // Reset timeline controls
    timelineSlider.value = 100;
    timelineStatusLabel.textContent = "100% (All)";

  } catch (error) {
    console.error(error);
    alert(`Failed to retrieve live GitHub data: ${error.message}. Loading preset famous projects instead.`);
    appState.activeRepos = [...PRESET_REPOS];
    rebuildCityDashboard(appState.activeRepos);
  } finally {
    topConsole.classList.remove('loading');
    btnSearchIcon.textContent = (dataSourceSelect.value === 'preset') ? "⚡" : (dataSourceSelect.value === 'compare' ? "⚔️" : "🔍");
    appState.isGenerating = false;
  }
}

// Generate the 3D Metropolis and scan for critical stability issues (red windows)
export function rebuildCityDashboard(repos) {
  generateCity(repos);

  const chatMessagesLog = document.getElementById('chat-messages-log');
  const criticalRepos = repos.filter(r => r.issues > 2000);
  
  if (criticalRepos.length > 0) {
    // 1. Dynamic System Ingest Alert inside Chat History
    chatMessagesLog.innerHTML = `
      <div class="chat-msg assistant" style="border: 1px solid var(--color-red) !important; box-shadow: 0 0 10px rgba(255, 30, 70, 0.15) !important;">
        <h3 style="color: var(--color-red) !important; font-family: var(--font-display); font-size: 14px; font-weight: 700; margin-bottom: 6px;">🚨 METROPOLIS STABILITY WARNING</h3>
        I have detected <strong style="color: var(--color-red);">${criticalRepos.length}</strong> sector(s) flashing <strong style="color: var(--color-red);">RED</strong> in the visualizer grid!
        <br><br>
        These repositories have critical open issue volumes exceeding **2,000 issues**:
        <ul style="padding-left:18px; margin: 8px 0; color: var(--color-text-muted);">
          ${criticalRepos.slice(0, 5).map(r => `<li><strong>${r.owner}/${r.name}</strong> (${r.issues.toLocaleString()} open issues)</li>`).join('')}
          ${criticalRepos.length > 5 ? `<li>...and ${criticalRepos.length - 5} more</li>` : ''}
        </ul>
        <br>
        Click these skyscrapers to ingest their statistics and request an **AI refactor audit** immediately!
        <div style="display: flex; gap: 8px; margin-top: 12px;">
          <button class="chat-btn-toggle-matrix" style="background: rgba(0, 240, 255, 0.1); border: 1px solid var(--color-cyan); color: var(--color-cyan); padding: 6px 12px; border-radius: 4px; font-family: var(--font-display); font-size: 11px; font-weight: 500; cursor: pointer; display: flex; align-items: center; gap: 6px; box-shadow: 0 0 5px rgba(0,240,255,0.15);">🌌 Code Matrix</button>
          <button class="chat-btn-reset-view" style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255,255,255,0.1); color: var(--color-text-main); padding: 6px 12px; border-radius: 4px; font-family: var(--font-display); font-size: 11px; font-weight: 500; cursor: pointer; display: flex; align-items: center; gap: 6px;">🏠 Reset View</button>
        </div>
      </div>
    `;

    // 2. Proactive Alert Notification Toast
    setTimeout(() => {
      alert(`🚨 CODEBASE STABILITY WARNING!\n\nDetected ${criticalRepos.length} repository tower(s) flashing RED on the grid due to critical open issues (>2,000 open issues).\n\nCheck the RAG Chat Log for a complete stability report!`);
    }, 1200);
  } else {
    // Stable greeting
    chatMessagesLog.innerHTML = `
      <div class="chat-msg assistant">
        <h3>Metropolis Grid Stable 🟢</h3>
        All active codebase sectors are nominal. No flashing red window cells detected in the visual grid.
        <br><br>
        Click any skyscraper to zoom and begin a custom RAG code quality audit!
        <div style="display: flex; gap: 8px; margin-top: 12px;">
          <button class="chat-btn-toggle-matrix" style="background: rgba(0, 240, 255, 0.1); border: 1px solid var(--color-cyan); color: var(--color-cyan); padding: 6px 12px; border-radius: 4px; font-family: var(--font-display); font-size: 11px; font-weight: 500; cursor: pointer; display: flex; align-items: center; gap: 6px; box-shadow: 0 0 5px rgba(0,240,255,0.15);">🌌 Code Matrix</button>
          <button class="chat-btn-reset-view" style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255,255,255,0.1); color: var(--color-text-main); padding: 6px 12px; border-radius: 4px; font-family: var(--font-display); font-size: 11px; font-weight: 500; cursor: pointer; display: flex; align-items: center; gap: 6px;">🏠 Reset View</button>
        </div>
      </div>
    `;
  }
}
