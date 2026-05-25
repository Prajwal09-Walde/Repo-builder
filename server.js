import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Import SDKs conditionally or directly
import { GoogleGenerativeAI } from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

// Import secure auth handlers and middleware
import { registerUser, authenticateUser, registerOrLoginGithubUser, authMiddleware } from './server-auth.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT, 10) || 8080;

app.use(express.json());
app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')));
app.use(express.static('public'));

// Helper: Formats the RAG System Context Prompt
function buildSystemPrompt(repo, message) {
  return `You are Claude 3.5 Sonnet, a world-class AI repository systems architect and software analyst.
You have been loaded with active 3D visualization model facts for the repository:
- Repository: "${repo.owner}/${repo.name}"
- Primary Language: ${repo.language}
- Total Commits: ${repo.commits.toLocaleString()}
- Stars: ${repo.stars.toLocaleString()}
- Open Issues: ${repo.issues.toLocaleString()}
- Codebase Footprint Size: ${repo.size.toLocaleString()} KB
- Maintainers: ${repo.contributors}
- Health Score Index: ${repo.healthScore}/100
- Last Commit: ${repo.lastActive}

Analysis Rules:
1. Provide expert analysis with specific statistics based on the details above.
2. Address the user with a helpful, sharp, and highly technical tone.
3. Refer to the visual characteristics of their 3D skyscraper metropolis where relevant:
   - Height represents commits (log scale).
   - Width represents file size (KB).
   - Roof neon glow and windows color represent language color.
   - Orbiting yellow octahedron gems represent star counts (1 per 30,000 stars).
   - Flashing hot-red window cells represent repositories with high issues (>2,000).
   - Blinking warning antennas at the top represent mega projects (>16 units height).
4. Provide highly actionable recommendations (e.g. implementing stale-bots, GitHub issue forms, SIG groups, or language specific tooling).

User Question: ${message}`;
}

// ROUTE 0: Authentication routes (Signup / Login / GitHub OAuth)
app.post('/api/auth/signup', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await registerUser(username, password);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await authenticateUser(username, password);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Redirects client browser to GitHub's Authorization page
app.get('/api/auth/github', (req, res) => {
  const clientID = process.env.GITHUB_CLIENT_ID;
  if (!clientID || clientID === 'paste_your_github_client_id_here') {
    return res.status(500).send("GitHub Client ID is not configured in `.env`. Please register an OAuth application first.");
  }
  const redirectURI = `https://github.com/login/oauth/authorize?client_id=${clientID}&scope=repo`;
  res.redirect(redirectURI);
});

// Exchanges GitHub code for access token, logins/registers user, and redirects back to Metropolis
app.get('/api/auth/github/callback', async (req, res) => {
  const { code } = req.query;
  const clientID = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!code) {
    return res.status(400).send("Missing temporary authorization code.");
  }

  try {
    // 1. Swap authorization code for user access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: clientID,
        client_secret: clientSecret,
        code
      })
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      throw new Error(`GitHub Token Swap Error: ${tokenData.error_description || tokenData.error}`);
    }

    const accessToken = tokenData.access_token;

    // 2. Query GitHub profile metadata
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${accessToken}`,
        'User-Agent': 'Metropolis-3D-Visualizer-Agent'
      }
    });

    if (!userResponse.ok) {
      throw new Error(`Failed to retrieve GitHub profile metadata. Status: ${userResponse.status}`);
    }

    const userData = await userResponse.json();
    const githubId = userData.id;
    const githubUsername = userData.login; // e.g. "torvalds"

    // 3. Register or Login the user in users.json and issue app JWT
    const { token } = await registerOrLoginGithubUser(githubId, githubUsername, accessToken);

    // 4. Redirect user back to index.html with our session JWT in search params
    res.redirect(`/?token=${token}`);

  } catch (error) {
    console.error('[OAuth Callback Error] Failed exchange:', error.message);
    res.status(500).send(`Authentication failed during callback exchange: ${error.message}`);
  }
});

// ROUTE 1: Proxy GitHub API requests with authenticated token to raise rate limits (Protected)
app.get('/api/repos/:username', authMiddleware, async (req, res) => {
  const { username } = req.params;
  
  // Extract and validate the user-specific OAuth token from their decoded session
  const oauthToken = req.user.githubToken;

  console.log(`[Proxy Request] Fetching repositories for user: ${username}`);

  const headers = {
    'User-Agent': 'Metropolis-3D-Visualizer-Agent'
  };

  if (oauthToken) {
    headers['Authorization'] = `Bearer ${oauthToken}`;
    console.log(`[Proxy Request] Authenticating using User OAuth token`);
  } else {
    console.warn(`[Proxy Warning] No active User OAuth token is set in this session. Unauthenticated API calls are subject to strict rate limits (60/hr).`);
  }

  try {
    const apiResponse = await fetch(`https://api.github.com/users/${username}/repos?per_page=30&sort=updated`, { headers });
    
    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      throw new Error(`GitHub API returned status ${apiResponse.status}: ${errorText}`);
    }

    const data = await apiResponse.json();

    // Map properties cleanly for 3D visual frontend
    const mappedRepos = data.map(repo => {
      const stars = repo.stargazers_count || 0;
      const forks = repo.forks_count || 0;
      const issues = repo.open_issues_count || 0;
      const size = repo.size || 1000;
      
      // Contributor estimation based on forks index
      const contributors = Math.max(1, Math.floor(Math.sqrt(forks) * 0.6 + 1));
      
      // Realistic commits scale estimated from size and activity metrics
      const estimatedCommits = Math.max(12, Math.floor(size * 0.15 + stars * 0.5 + forks * 1.5 + Math.random() * 45));

      return {
        name: repo.name,
        owner: repo.owner.login,
        description: repo.description || "No description provided for this codebase.",
        language: repo.language || "JavaScript",
        commits: estimatedCommits,
        stars: stars,
        issues: issues,
        size: size,
        contributors: contributors,
        forks: forks,
        watchers: repo.watchers_count || 0,
        lastActive: repo.pushed_at || new Date().toISOString(),
        topics: repo.topics || [repo.language || "codebase"]
      };
    });

    res.json(mappedRepos);
  } catch (error) {
    console.error(`[Proxy Error] Failed to fetch user repositories:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// ROUTE 2: Live RAG Chat Auditor with multi-provider fallback (Protected)
app.post('/api/chat', authMiddleware, async (req, res) => {
  const { message, repoContext } = req.body;
  const provider = (process.env.LLM_PROVIDER || 'gemini').toLowerCase();

  if (!message || !repoContext) {
    return res.status(400).json({ error: "Missing message or repository context payload." });
  }

  const promptText = buildSystemPrompt(repoContext, message);
  console.log(`[RAG AI Audit] Processing query for ${repoContext.name} using provider: ${provider}`);

  try {
    let aiResponseText = "";

    // 1. Google Gemini Provider (with robust model fallback)
    if (provider === 'gemini') {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === 'paste_your_gemini_api_key_here') {
        throw new Error("GEMINI_API_KEY is not configured in your .env file.");
      }
      
      const genAI = new GoogleGenerativeAI(apiKey);
      let result;
      try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        result = await model.generateContent(promptText);
      } catch (geminiError) {
        console.warn("[Gemini Warning] gemini-2.5-flash failed, falling back to gemini-flash-latest:", geminiError.message);
        try {
          const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
          result = await model.generateContent(promptText);
        } catch (innerError) {
          console.warn("[Gemini Warning] gemini-flash-latest failed, falling back to gemini-pro-latest:", innerError.message);
          const model = genAI.getGenerativeModel({ model: "gemini-pro-latest" });
          result = await model.generateContent(promptText);
        }
      }
      
      const response = await result.response;
      aiResponseText = response.text();
    } 
    // // 2. Anthropic Claude Provider
    // else if (provider === 'anthropic') {
    //   const apiKey = process.env.ANTHROPIC_API_KEY;
    //   if (!apiKey || apiKey === 'paste_your_anthropic_api_key_here') {
    //     throw new Error("ANTHROPIC_API_KEY is not configured in your .env file.");
    //   }
      
    //   const anthropic = new Anthropic({ apiKey });
    //   const response = await anthropic.messages.create({
    //     model: "claude-3-5-sonnet-20241022",
    //     max_tokens: 1024,
    //     messages: [{ role: "user", content: promptText }]
    //   });
    //   aiResponseText = response.content[0].text;
    // } 
    // // 3. OpenAI GPT Provider
    // else if (provider === 'openai') {
    //   const apiKey = process.env.OPENAI_API_KEY;
    //   if (!apiKey || apiKey === 'paste_your_openai_api_key_here') {
    //     throw new Error("OPENAI_API_KEY is not configured in your .env file.");
    //   }
      
    //   const openai = new OpenAI({ apiKey });
    //   const completion = await openai.chat.completions.create({
    //     model: "gpt-4o",
    //     messages: [{ role: "user", content: promptText }]
    //   });
    //   aiResponseText = completion.choices[0].message.content;
    // } 
    else {
      throw new Error(`Unsupported LLM provider: ${provider}`);
    }

    res.json({ role: "assistant", text: aiResponseText });

  } catch (error) {
    console.error(`[RAG AI Error] LLM Query failed:`, error.message);
    
    // Friendly, highly detailed developer warning response rather than simple 500 error page,
    // instructing them how to fix their .env variables or fall back.
    const friendlyErrorText = `### RAG AI Ingest Alert ⚠️
I was unable to retrieve a live response from our **${provider.toUpperCase()}** LLM integration.

**Reason**: \`${error.message}\`

**How to resolve this**:
1. Open the project root environment file: [**.env**](file:///c:/Users/HP/Desktop/Repo%20builder/.env)
2. Ensure you have selected your active provider: \`LLM_PROVIDER=${provider}\`
3. Paste a valid API key into the variable slot (e.g. \`GEMINI_API_KEY=AIzaSy...\` for Gemini).
4. Restart your Node.js server to reload the settings.

*Note: In the meantime, you can still search users and analyze the 3D cityscape visual encodings!*`;

    res.json({ role: "assistant", text: friendlyErrorText });
  }
});

// Serve frontend SPA for all unmatched routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n=============================================================================`);
  console.log(`🌐  METROPOLIS 3D FULL-STACK SERVER RUNNING`);
  console.log(`👉  Active local dashboard URL: http://localhost:${PORT}`);
  console.log(`⚙️   Active LLM RAG Provider: ${process.env.LLM_PROVIDER || 'gemini'}`);
  console.log(`=============================================================================\n`);
});
