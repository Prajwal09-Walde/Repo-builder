// Auth UI Interactions & Logic for Metropolis 3D
// Keeps app.js length strictly under the 500 LOC limit

export function setupAuth(rebuildCityDashboard, appState) {
  const authModal = document.getElementById('auth-modal');
  const authTabLogin = document.getElementById('auth-tab-login');
  const authTabSignup = document.getElementById('auth-tab-signup');
  const authUsername = document.getElementById('auth-username');
  const authPassword = document.getElementById('auth-password');
  const authMessageBox = document.getElementById('auth-message-box');
  const btnAuthSubmit = document.getElementById('btn-auth-submit');
  const btnAuthGithub = document.getElementById('btn-auth-github');
  const btnLogout = document.getElementById('btn-logout');

  let currentAuthMode = 'login'; // default mode

  // 1. Initial Authentication Token Sweep (supporting GitHub OAuth redirects)
  const urlParams = new URLSearchParams(window.location.search);
  const urlToken = urlParams.get('token');
  if (urlToken) {
    localStorage.setItem('metropolis_token', urlToken);
    // Strip URL parameters dynamically to keep browser path clean
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  const token = localStorage.getItem('metropolis_token');

  if (token) {
    if (authModal) {
      authModal.style.opacity = '0';
      authModal.style.pointerEvents = 'none';
      setTimeout(() => {
        authModal.style.display = 'none';
      }, 500);
    }
    // Load baseline preset city immediately
    rebuildCityDashboard(appState.activeRepos);
  } else {
    if (authModal) {
      authModal.style.display = 'flex';
      authModal.style.opacity = '1';
      authModal.style.pointerEvents = 'auto';
    }
  }

  // 2. Tab toggles
  if (authTabLogin && authTabSignup) {
    authTabLogin.addEventListener('click', () => {
      currentAuthMode = 'login';
      authTabLogin.classList.add('active');
      authTabSignup.classList.remove('active');
      if (btnAuthSubmit) btnAuthSubmit.textContent = 'LOG IN ⚡';
      if (authMessageBox) {
        authMessageBox.style.display = 'none';
        authMessageBox.textContent = '';
      }
    });

    authTabSignup.addEventListener('click', () => {
      currentAuthMode = 'signup';
      authTabSignup.classList.add('active');
      authTabLogin.classList.remove('active');
      if (btnAuthSubmit) btnAuthSubmit.textContent = 'CREATE ACCOUNT 🚀';
      if (authMessageBox) {
        authMessageBox.style.display = 'none';
        authMessageBox.textContent = '';
      }
    });
  }

  // 3. Form Submission
  if (btnAuthSubmit) {
    btnAuthSubmit.addEventListener('click', async () => {
      const username = authUsername.value.trim();
      const password = authPassword.value;

      if (!username || !password) {
        authMessageBox.textContent = 'Please enter both username and password.';
        authMessageBox.style.display = 'block';
        return;
      }

      if (password.length < 6) {
        authMessageBox.textContent = 'Password must be at least 6 characters.';
        authMessageBox.style.display = 'block';
        return;
      }

      try {
        const url = currentAuthMode === 'login' ? '/api/auth/login' : '/api/auth/signup';
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Authentication failed');
        }

        // Save session token
        localStorage.setItem('metropolis_token', data.token);

        // Reset forms
        authUsername.value = '';
        authPassword.value = '';
        authMessageBox.style.display = 'none';
        authMessageBox.textContent = '';

        // Animate modal fade out
        if (authModal) {
          authModal.style.opacity = '0';
          authModal.style.pointerEvents = 'none';
          setTimeout(() => {
            authModal.style.display = 'none';
          }, 500);
        }

        // Load visual city grid presets now that session is valid
        rebuildCityDashboard(appState.activeRepos);

      } catch (err) {
        authMessageBox.textContent = err.message;
        authMessageBox.style.display = 'block';
      }
    });

    // Support keyboard submit inside input fields
    const triggerSubmitOnEnter = (e) => {
      if (e.key === 'Enter') btnAuthSubmit.click();
    };
    if (authUsername) authUsername.addEventListener('keypress', triggerSubmitOnEnter);
    if (authPassword) authPassword.addEventListener('keypress', triggerSubmitOnEnter);
  }

  // 4. Logout trigger
  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      localStorage.removeItem('metropolis_token');
      // Hard refresh to fully tear down state and show auth modal
      window.location.reload();
    });
  }

  // 5. GitHub OAuth Button trigger
  if (btnAuthGithub) {
    btnAuthGithub.addEventListener('click', () => {
      window.location.href = '/api/auth/github';
    });
  }
}
