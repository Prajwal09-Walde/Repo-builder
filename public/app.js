import { GITHUB_LANG_COLORS, DEFAULT_LANG_COLOR } from './repo-data.js';
import { initScene, resetCamera, selectBuilding, pingSelectedBuilding, updateCityTimeline, toggleCodeMatrixView, navigateBuildings } from './three-city.js';
import { RagChatAnalyst } from './rag-chat.js';
import { calculateHealthScore, appState, handleDataLoadingTrigger, rebuildCityDashboard } from './app-data.js';
import { appendMessageBubble, appendTypewriterBubble, createTypingBubble, scrollChatToBottom } from './chat-ui.js';
import { setupAuth } from './auth-ui.js';

// Instantiate our RAG analyst model
const ragChat = new RagChatAnalyst();

// UI Elements
const dataSourceSelect = document.getElementById('data-source-select');
const usernameInput = document.getElementById('username-input');
const btnLoadData = document.getElementById('btn-load-data');
const btnSearchIcon = document.getElementById('btn-search-icon');
const topConsole = document.getElementById('top-console');
const btnPingAudit = document.getElementById('btn-ping-audit');

// Timeline Elements
const timelineSlider = document.getElementById('timeline-slider');
const timelineStatusLabel = document.getElementById('timeline-status-label');
const btnPlayTimeline = document.getElementById('btn-play-timeline');

// Matrix Elements
const btnToggleMatrix = document.getElementById('btn-toggle-matrix');
let isMatrixViewActive = false;

let autoplayInterval = null;
let isAutoplayRunning = false;

// HUD Tooltip Elements
const hudTooltip = document.getElementById('hud-tooltip');
const hudRepoName = document.getElementById('hud-repo-name');
const hudLangDot = document.getElementById('hud-lang-dot');
const hudLangName = document.getElementById('hud-lang-name');
const hudCommits = document.getElementById('hud-commits');
const hudStars = document.getElementById('hud-stars');
const hudIssues = document.getElementById('hud-issues');
const hudForks = document.getElementById('hud-forks');

// Side Panel Elements
const ragPanel = document.getElementById('rag-panel');
const btnClosePanel = document.getElementById('btn-close-panel');
const btnResetView = document.getElementById('btn-reset-view');

const pRepoName = document.getElementById('panel-repo-name');
const pRepoDesc = document.getElementById('panel-repo-desc');
const pHealthScoreVal = document.getElementById('panel-health-score-val');
const pHealthBarFill = document.getElementById('panel-health-bar-fill');
const pLang = document.getElementById('panel-lang');
const pCommits = document.getElementById('panel-commits');
const pStars = document.getElementById('panel-stars');
const pIssues = document.getElementById('panel-issues');
const pSize = document.getElementById('panel-size');
const pContributors = document.getElementById('panel-contributors');
const pTopics = document.getElementById('panel-topics');

// Chat Elements
const chatMessagesLog = document.getElementById('chat-messages-log');
const chatUserInput = document.getElementById('chat-user-input');
const btnSendChat = document.getElementById('btn-send-chat');
const promptChips = document.querySelectorAll('.prompt-chip');

// Initialize application (with readyState safety guard to prevent ES6 module race conditions)
function startMetropolisApp() {
  // Start Three.js Viewport
  initScene('canvas-container', onRepositoryClicked, onRepositoryHovered);

  // Setup Event Listeners
  setupEventListeners();

  // Setup Auth Modal & Session State
  setupAuth(rebuildCityDashboard, appState);
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', startMetropolisApp);
} else {
  startMetropolisApp();
}

// Setup listeners for user settings and search panel
function setupEventListeners() {
  // Toggle select source: Preset vs Live API fetch vs Compare
  dataSourceSelect.addEventListener('change', (e) => {
    const val = e.target.value;
    if (val === 'preset') {
      usernameInput.disabled = true;
      usernameInput.placeholder = "Preset loaded successfully...";
      btnSearchIcon.textContent = "🔍";
    } else if (val === 'github') {
      usernameInput.disabled = false;
      usernameInput.placeholder = "Enter GitHub username";
      btnSearchIcon.textContent = "🔍";
    } else if (val === 'compare') {
      usernameInput.disabled = false;
      usernameInput.placeholder = "Enter two users";
      btnSearchIcon.textContent = "⚔️";
    }
  });

  // Execute Load Data Search button
  btnLoadData.addEventListener('click', handleDataLoadingTrigger);
  usernameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleDataLoadingTrigger();
  });

  // Panel controllers
  btnClosePanel.addEventListener('click', () => {
    ragPanel.classList.remove('open');
    resetCamera();
  });

  btnResetView.addEventListener('click', () => {
    resetCamera();
  });

  // Ping Selected Building when clicking the Repository Audit header
  btnPingAudit.addEventListener('click', () => {
    pingSelectedBuilding();
  });

  // Timeline Slider Event Listener
  timelineSlider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10);
    timelineStatusLabel.textContent = `${val}%`;
    updateCityTimeline(val);
  });

  // Autoplay Timeline Playback Event Listener
  btnPlayTimeline.addEventListener('click', () => {
    isAutoplayRunning = !isAutoplayRunning;
    if (isAutoplayRunning) {
      btnPlayTimeline.textContent = "⏸";
      if (parseInt(timelineSlider.value, 10) >= 100) {
        timelineSlider.value = 0;
      }
      autoplayInterval = setInterval(() => {
        let val = parseInt(timelineSlider.value, 10);
        val += 2;
        if (val >= 100) {
          val = 100;
          clearInterval(autoplayInterval);
          btnPlayTimeline.textContent = "▶";
          isAutoplayRunning = false;
        }
        timelineSlider.value = val;
        timelineStatusLabel.textContent = `${val}%`;
        updateCityTimeline(val);
      }, 50);
    } else {
      btnPlayTimeline.textContent = "▶";
      clearInterval(autoplayInterval);
    }
  });

  // Code Matrix 3D Toggle Click Action
  btnToggleMatrix.addEventListener('click', () => {
    isMatrixViewActive = !isMatrixViewActive;
    btnToggleMatrix.classList.toggle('active', isMatrixViewActive);
    toggleCodeMatrixView(isMatrixViewActive);
  });

  // Chat send controllers
  btnSendChat.addEventListener('click', triggerUserChatMessage);
  chatUserInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') triggerUserChatMessage();
  });

  // Direct Prompt Chips click listener
  promptChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const promptText = chip.getAttribute('data-prompt');
      chatUserInput.value = promptText;
      triggerUserChatMessage();
    });
  });

  // Legend Panel Collapsible Toggle (starts collapsed)
  const btnToggleLegend = document.getElementById('btn-toggle-legend');
  const legendContent = document.getElementById('legend-content');
  const legendChevron = document.getElementById('legend-chevron');
  let legendCollapsed = true;

  btnToggleLegend.addEventListener('click', () => {
    legendCollapsed = !legendCollapsed;
    if (legendCollapsed) {
      legendContent.style.maxHeight = '0px';
      legendContent.style.marginTop = '0px';
      legendChevron.style.transform = 'rotate(180deg)';
    } else {
      legendContent.style.maxHeight = '240px';
      legendContent.style.marginTop = '12px';
      legendChevron.style.transform = 'rotate(0deg)';
    }
  });

  // Handle dynamically added chat action button clicks (Event Delegation)
  chatMessagesLog.addEventListener('click', (e) => {
    if (e.target.classList.contains('chat-btn-toggle-matrix')) {
      isMatrixViewActive = !isMatrixViewActive;
      btnToggleMatrix.classList.toggle('active', isMatrixViewActive);
      toggleCodeMatrixView(isMatrixViewActive);
    } else if (e.target.classList.contains('chat-btn-reset-view')) {
      resetCamera();
    }
  });

  // Global Left/Right Arrow keys navigation for Skyscrapers
  window.addEventListener('keydown', (e) => {
    // Ignore keypresses if typing inside search inputs, chat inputs, or textareas
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
      return;
    }

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      navigateBuildings(1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      navigateBuildings(-1);
    }
  });
}

// Callback: When a building is clicked
function onRepositoryClicked(repo) {
  const score = calculateHealthScore(repo);

  // Update RAG model context
  ragChat.setRepository(repo, score);

  // 1. Populate UI sidebar cards
  pRepoName.textContent = `${repo.owner} / ${repo.name}`;
  pRepoDesc.textContent = repo.description;
  pHealthScoreVal.textContent = `${score} / 100`;
  
  // Set Health Bar color and widths
  pHealthBarFill.style.width = `${score}%`;
  pHealthBarFill.className = "health-bar-fill"; // reset
  if (score >= 80) {
    pHealthBarFill.classList.add('health-fill-green');
    pHealthScoreVal.style.color = "var(--color-green)";
  } else if (score >= 50) {
    pHealthBarFill.classList.add('health-fill-amber');
    pHealthScoreVal.style.color = "#ffaa00";
  } else {
    pHealthBarFill.classList.add('health-fill-red');
    pHealthScoreVal.style.color = "var(--color-red)";
  }

  // Populate numeric badges
  pLang.textContent = repo.language;
  pCommits.textContent = repo.commits >= 1000 ? `${(repo.commits/1000).toFixed(1)}K` : repo.commits;
  pStars.textContent = repo.stars >= 1000 ? `${(repo.stars/1000).toFixed(1)}K` : repo.stars;
  pIssues.textContent = repo.issues >= 1000 ? `${(repo.issues/1000).toFixed(1)}K` : repo.issues;
  pSize.textContent = repo.size >= 1024 ? `${(repo.size/1024).toFixed(1)} MB` : `${repo.size} KB`;
  pContributors.textContent = repo.contributors.toLocaleString();

  // Populate topics badges
  pTopics.innerHTML = '';
  repo.topics.slice(0, 5).forEach(topic => {
    const badge = document.createElement('span');
    badge.className = 'topic-badge';
    badge.textContent = topic;
    pTopics.appendChild(badge);
  });

  // Open sidebar panel
  ragPanel.classList.add('open');

  // Trigger system log inside Chat History
  chatMessagesLog.innerHTML = `
    <div class="chat-msg assistant">
      <h3>Context Loaded: ${repo.name}</h3>
      RAG ingest operational for **${repo.owner}/${repo.name}**. I have loaded all file indexes, issue histories, and commit vectors into my system context memory.
      <br><br>
      Ask me detailed audits: <em>"How do I improve my Health Score?", "Suggest a maintainer plan", or ask generic coding advice!</em>
    </div>
  `;
}

// Callback: Hovering over a building
function onRepositoryHovered(repo, screenCoords) {
  if (!repo || !screenCoords) {
    hudTooltip.classList.remove('visible');
    return;
  }

  const freshRows = hudTooltip.querySelectorAll('.hud-stats-row');
  if (freshRows.length >= 2) {
    freshRows[0].style.display = 'flex';
    freshRows[1].style.display = 'flex';
  }

  hudRepoName.textContent = repo.name;

  if (repo.isFile) {
    hudLangName.textContent = `Type: ${repo.language}`;
    hudLangDot.style.backgroundColor = "var(--color-cyan)";
    
    // Safely update labels and values without breaking DOM references
    if (hudCommits.parentNode && hudCommits.parentNode.childNodes[0]) {
      hudCommits.parentNode.childNodes[0].textContent = "Size: ";
    }
    hudCommits.textContent = repo.commits;

    if (hudStars.parentNode && hudStars.parentNode.childNodes[0]) {
      hudStars.parentNode.childNodes[0].textContent = "Ingested: ";
    }
    hudStars.textContent = "Yes 💎";

    if (freshRows.length >= 2) {
      freshRows[1].style.display = 'none'; // Hide issues and forks rows for code files
    }
  } else {
    hudLangName.textContent = repo.language;
    const color = GITHUB_LANG_COLORS[repo.language] || DEFAULT_LANG_COLOR;
    hudLangDot.style.backgroundColor = color;

    // Restore text labels
    if (hudCommits.parentNode && hudCommits.parentNode.childNodes[0]) {
      hudCommits.parentNode.childNodes[0].textContent = "Commits: ";
    }
    hudCommits.textContent = repo.commits >= 1000 ? `${(repo.commits/1000).toFixed(1)}K` : repo.commits;

    if (hudStars.parentNode && hudStars.parentNode.childNodes[0]) {
      hudStars.parentNode.childNodes[0].textContent = "Stars: ";
    }
    hudStars.textContent = repo.stars >= 1000 ? `${(repo.stars/1000).toFixed(1)}K` : repo.stars;

    hudIssues.textContent = repo.issues >= 1000 ? `${(repo.issues/1000).toFixed(1)}K` : repo.issues;
    hudForks.textContent = repo.forks >= 1000 ? `${(repo.forks/1000).toFixed(1)}K` : repo.forks;
  }

  // Move tooltip div overlay
  hudTooltip.style.left = `${screenCoords.x}px`;
  hudTooltip.style.top = `${screenCoords.y}px`;
  hudTooltip.classList.add('visible');
}

// Send chat message and query live backend LLM RAG engine
async function triggerUserChatMessage() {
  const query = chatUserInput.value.trim();
  if (!query) return;

  chatUserInput.value = '';

  // Append user bubble
  appendMessageBubble(chatMessagesLog, 'user', query);

  // Append typing loading bubble
  const typingIndicator = createTypingBubble();
  chatMessagesLog.appendChild(typingIndicator);
  scrollChatToBottom(chatMessagesLog);

  try {
    const token = localStorage.getItem('metropolis_token');
    const headers = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Send RAG payload to Node backend server
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        message: query,
        repoContext: ragChat.currentRepo
      })
    });

    if (response.status === 401) {
      localStorage.removeItem('metropolis_token');
      const authModal = document.getElementById('auth-modal');
      if (authModal) {
        authModal.style.display = 'flex';
        setTimeout(() => {
          authModal.style.opacity = '1';
          authModal.style.pointerEvents = 'auto';
        }, 10);
      }
      const authMessageBox = document.getElementById('auth-message-box');
      if (authMessageBox) {
        authMessageBox.textContent = 'Session token expired or invalid. Please sign in again.';
        authMessageBox.style.display = 'block';
      }
      throw new Error('Session token expired or invalid. Redirecting to login gate.');
    }

    if (!response.ok) {
      throw new Error(`Server returned error status ${response.status}`);
    }

    const result = await response.json();
    
    // Remove typing indicator
    if (typingIndicator) typingIndicator.remove();

    // Typewriter effect inside a new assistant bubble
    appendTypewriterBubble(chatMessagesLog, 'assistant', result.text);
  } catch (err) {
    if (typingIndicator) typingIndicator.remove();
    appendMessageBubble(chatMessagesLog, 'assistant', `### System Error ⚠️\nFailed to retrieve RAG response from backend: \`${err.message}\`.\nEnsure your server is running and configured correctly.`);
  }
}
