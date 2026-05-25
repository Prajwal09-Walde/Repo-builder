import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

const USERS_FILE = path.join(process.cwd(), 'users.json');
const JWT_SECRET = process.env.JWT_SECRET || 'METROPOLIS_SUPER_SECRET_KEY_2026_CYBERPUNK';

// Helper: Loads users safely from JSON database
function loadUsers() {
  try {
    if (!fs.existsSync(USERS_FILE)) {
      fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2));
      return [];
    }
    const rawData = fs.readFileSync(USERS_FILE, 'utf8');
    return JSON.parse(rawData || '[]');
  } catch (error) {
    console.error('[Auth Database Error] Failed to load users.json:', error.message);
    return [];
  }
}

// Helper: Saves users to JSON database
function saveUsers(users) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
  } catch (error) {
    console.error('[Auth Database Error] Failed to save users.json:', error.message);
  }
}

// Signs a standard 7-day session token for an authenticated user
function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// Registers a new user with secure hashed credentials
export async function registerUser(username, password) {
  const normalizedUsername = username.trim().toLowerCase();
  
  if (!normalizedUsername || !password) {
    throw new Error('Username and password are required fields.');
  }
  
  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters in length.');
  }

  const users = loadUsers();
  const exists = users.find(u => u.username === normalizedUsername);
  if (exists) {
    throw new Error('Username has already been registered.');
  }

  // Hash password securely (salt rounds = 10)
  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = {
    id: Date.now().toString(),
    username: normalizedUsername,
    password: hashedPassword,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  saveUsers(users);

  const token = generateToken(newUser);
  return {
    user: { id: newUser.id, username: newUser.username },
    token
  };
}

// Authenticates username and password against database records
export async function authenticateUser(username, password) {
  const normalizedUsername = username.trim().toLowerCase();
  
  if (!normalizedUsername || !password) {
    throw new Error('Username and password are required fields.');
  }

  const users = loadUsers();
  const user = users.find(u => u.username === normalizedUsername);
  
  if (!user) {
    throw new Error('Invalid username or password credentials.');
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new Error('Invalid username or password credentials.');
  }

  const token = generateToken(user);
  return {
    user: { id: user.id, username: user.username },
    token
  };
}

// Registers or logs in a user using GitHub OAuth credentials, syncing their token
export async function registerOrLoginGithubUser(githubId, username, githubToken) {
  if (!githubId || !username) {
    throw new Error('GitHub profile ID and username are required.');
  }

  const users = loadUsers();
  
  // Find by githubId
  let user = users.find(u => u.githubId === String(githubId));
  
  if (user) {
    // Existing user: Update the latest access token and save
    user.githubToken = githubToken;
    saveUsers(users);
  } else {
    // New user: Generate a unique username if it already exists in Metropolis
    let uniqueUsername = username.trim().toLowerCase();
    let clash = users.find(u => u.username === uniqueUsername);
    let counter = 1;
    while (clash) {
      uniqueUsername = `${username.trim().toLowerCase()}-${counter}`;
      clash = users.find(u => u.username === uniqueUsername);
      counter++;
    }

    user = {
      id: Date.now().toString(),
      username: uniqueUsername,
      githubId: String(githubId),
      githubToken: githubToken,
      createdAt: new Date().toISOString()
    };

    users.push(user);
    saveUsers(users);
  }

  const token = generateToken(user);
  return {
    user: { id: user.id, username: user.username },
    token
  };
}

// Express Middleware: Intercepts and validates Authorization Bearer JWT headers
export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization Bearer token header.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Resolve full user metadata dynamically to check for a registered GitHub token
    const users = loadUsers();
    const fullUser = users.find(u => u.id === decoded.id);
    if (fullUser && fullUser.githubToken) {
      decoded.githubToken = fullUser.githubToken;
    }

    req.user = decoded; // Attach active session payload to request object
    next();
  } catch (error) {
    console.warn('[Auth Middleware Warning] Token validation failed:', error.message);
    return res.status(401).json({ error: 'Session token has expired or is invalid. Please log in again.' });
  }
}
