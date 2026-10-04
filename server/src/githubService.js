import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_FILE = path.resolve(__dirname, '../data/github_config.json');

// Helper to read and write local config
export function getGitHubConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.warn('[GitHub Config] Read error:', e.message);
  }
  return {
    repo: 'leetcode-solutions',
    owner: '',
    branch: 'main',
    autoPush: true,
    directoryMode: 'by-topic', // 'by-topic' | 'flat'
    isPrivate: false
  };
}

export function saveGitHubConfig(newConfig) {
  try {
    const current = getGitHubConfig();
    const merged = { ...current, ...newConfig };
    const dir = path.dirname(CONFIG_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2), 'utf8');
    return merged;
  } catch (e) {
    console.error('[GitHub Config] Save error:', e.message);
    throw e;
  }
}

// Retrieve active GitHub token (from env or gh CLI)
export function getGitHubToken() {
  if (process.env.GITHUB_TOKEN && process.env.GITHUB_TOKEN.trim().length > 0) {
    return process.env.GITHUB_TOKEN.trim();
  }
  try {
    const stdout = execSync('gh auth token', { encoding: 'utf8', timeout: 4000 });
    const token = stdout.trim();
    if (token) return token;
  } catch (e) {
    // gh CLI not authenticated or not installed
  }
  return null;
}

// Low-level fetch wrapper with auth headers
async function githubRequest(endpoint, options = {}) {
  const token = getGitHubToken();
  if (!token) {
    throw new Error('GitHub token not found. Ensure `gh auth login` is run or set GITHUB_TOKEN in server/.env');
  }

  const url = endpoint.startsWith('https://') ? endpoint : `https://api.github.com${endpoint}`;
  const headers = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'PacedLearner-Core/1.0',
    Authorization: `Bearer ${token}`,
    ...(options.headers || {})
  };

  const response = await fetch(url, { ...options, headers });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (e) {
    data = text;
  }

  if (!response.ok) {
    const errorMsg = data?.message || `GitHub API error: ${response.status} ${response.statusText}`;
    const err = new Error(errorMsg);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

// Status check: Profile & Repository information
export async function getGitHubStatus() {
  const token = getGitHubToken();
  if (!token) {
    return {
      authenticated: false,
      error: 'No GitHub token detected. Authenticate via GitHub CLI (`gh auth login`) or add GITHUB_TOKEN to server/.env'
    };
  }

  try {
    const user = await githubRequest('/user');
    const config = getGitHubConfig();
    const owner = config.owner || user.login;

    // Check if target repository exists
    let repoInfo = null;
    try {
      repoInfo = await githubRequest(`/repos/${owner}/${config.repo}`);
    } catch (e) {
      if (e.status !== 404) {
        console.warn('[GitHub Status] Repo check warning:', e.message);
      }
    }

    return {
      authenticated: true,
      user: {
        login: user.login,
        name: user.name,
        avatar_url: user.avatar_url,
        html_url: user.html_url,
        public_repos: user.public_repos
      },
      targetRepo: {
        name: config.repo,
        owner,
        fullName: `${owner}/${config.repo}`,
        exists: !!repoInfo,
        html_url: repoInfo?.html_url || `https://github.com/${owner}/${config.repo}`,
        default_branch: repoInfo?.default_branch || config.branch,
        isPrivate: repoInfo?.private ?? config.isPrivate
      },
      config
    };
  } catch (err) {
    return {
      authenticated: false,
      error: err.message
    };
  }
}

// List user repositories
export async function listUserRepos() {
  try {
    const repos = await githubRequest('/user/repos?per_page=100&sort=updated');
    return repos.map(r => ({
      id: r.id,
      name: r.name,
      full_name: r.full_name,
      private: r.private,
      html_url: r.html_url,
      default_branch: r.default_branch,
      description: r.description
    }));
  } catch (err) {
    console.error('[GitHub Repos] Failed to list:', err.message);
    throw err;
  }
}

// Create new GitHub Repository
export async function createRepository({ name, description = 'Curated LeetCode solutions and spaced repetition algorithmic intuition notes synced with PacedLearner.', isPrivate = false }) {
  const cleanName = name.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-');
  const user = await githubRequest('/user');

  const newRepo = await githubRequest('/user/repos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: cleanName,
      description,
      private: isPrivate,
      auto_init: true
    })
  });

  // Save as target repo in config
  saveGitHubConfig({
    repo: cleanName,
    owner: user.login,
    branch: newRepo.default_branch || 'main',
    isPrivate
  });

  return newRepo;
}

// Ensure target repository exists, create if missing
export async function ensureTargetRepository() {
  const status = await getGitHubStatus();
  if (!status.authenticated) {
    throw new Error('Not authenticated to GitHub');
  }

  const { targetRepo } = status;
  if (!targetRepo.exists) {
    console.log(`[GitHub Service] Repository ${targetRepo.fullName} does not exist. Creating automatically...`);
    const created = await createRepository({
      name: targetRepo.name,
      description: 'Curated LeetCode solutions, complexity analysis, and FSRS spaced repetition intuition synced with PacedLearner.',
      isPrivate: targetRepo.isPrivate
    });
    return created;
  }
  return targetRepo;
}

// Get existing file SHA to allow updates
async function getFileSha(owner, repo, filePath, branch = 'main') {
  try {
    const data = await githubRequest(`/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`);
    return data?.sha || null;
  } catch (err) {
    if (err.status === 404) return null;
    throw err;
  }
}

// Put or update a file in repository
export async function commitFile(owner, repo, filePath, contentString, commitMessage, branch = 'main') {
  const sha = await getFileSha(owner, repo, filePath, branch);
  const body = {
    message: commitMessage,
    content: Buffer.from(contentString, 'utf8').toString('base64'),
    branch
  };
  if (sha) body.sha = sha;

  return await githubRequest(`/repos/${owner}/${repo}/contents/${filePath}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

// Language to file extension mapping
function getLanguageExtension(language) {
  const l = (language || 'python3').toLowerCase();
  if (l.includes('python')) return 'py';
  if (l.includes('javascript') || l === 'js') return 'js';
  if (l.includes('typescript') || l === 'ts') return 'ts';
  if (l.includes('c++') || l.includes('cpp')) return 'cpp';
  if (l.includes('java')) return 'java';
  if (l.includes('golang') || l === 'go') return 'go';
  if (l.includes('rust') || l === 'rs') return 'rs';
  if (l.includes('c#') || l.includes('csharp')) return 'cs';
  return 'py';
}

function getDifficultyBadgeColor(diff) {
  const d = (diff || 'Medium').toLowerCase();
  if (d === 'easy') return '00b8a3'; // emerald
  if (d === 'hard') return 'ff375f'; // crimson
  return 'ffc01e'; // amber
}

// Generate Markdown README for a single problem
export function generateProblemReadme(problem) {
  const tags = Array.isArray(problem.tags) ? problem.tags : (problem.tags ? JSON.parse(problem.tags) : []);
  const patterns = Array.isArray(problem.patterns) ? problem.patterns : (problem.patterns ? JSON.parse(problem.patterns) : []);
  const diffColor = getDifficultyBadgeColor(problem.difficulty);

  const tagPills = [...new Set([...tags, ...patterns])]
    .map(t => `\`${t}\``)
    .join(' ') || '`Algorithms`';

  const reviewsCount = problem.fsrs_reps || (problem.reviews ? problem.reviews.length : 0);
  const retrievabilityPercent = problem.retrievability ? (problem.retrievability * 100).toFixed(1) : '100.0';
  const stabilityDays = problem.fsrs_stability ? Number(problem.fsrs_stability).toFixed(2) : '1.00';

  return `# ${problem.title}

[![LeetCode Problem](https://img.shields.io/badge/LeetCode-Problem_Link-FFA116?style=flat&logo=leetcode&logoColor=black)](${problem.url})
[![Difficulty](https://img.shields.io/badge/Difficulty-${encodeURIComponent(problem.difficulty)}-${diffColor}?style=flat)]()
[![FSRS Status](https://img.shields.io/badge/FSRS_Mastery-${encodeURIComponent(problem.mastery_level || 'Learning')}-38bdf8?style=flat)]()
[![Retrievability](https://img.shields.io/badge/Recall_Probability-${retrievabilityPercent}%25-10b981?style=flat)]()

## 🧠 Algorithmic Invariants & Core Intuition

${problem.intuition ? problem.intuition : '_No detailed intuition recorded yet._'}

---

## ⚡ Complexity Analysis

- **Time Complexity**: \`${problem.time_complexity || 'O(N)'}\`
- **Space Complexity**: \`${problem.space_complexity || 'O(1)'}\`

---

## ⚠️ Potential Pitfalls & Edge Cases

${problem.pitfalls ? problem.pitfalls : '_None recorded._'}

---

## 🏷️ Algorithmic Patterns & Tags

${tagPills}

---

## 📈 FSRS Spaced Repetition Metrics

| Metric | Value |
| :--- | :--- |
| **Stability ($S$)** | ${stabilityDays} days |
| **Expected Retrievability ($R$)** | ${retrievabilityPercent}% |
| **Total Review Repetitions** | ${reviewsCount} |
| **Next Review Due** | ${problem.next_review_date ? new Date(problem.next_review_date).toLocaleDateString() : 'Today'} |

---

*Synchronized automatically via [PacedLearner](https://github.com/eash-codes) — FSRS Spaced Repetition Algorithmic Mastery.*
`;
}

// Generate code file with header comments
export function generateProblemCodeFile(problem) {
  const ext = getLanguageExtension(problem.language);
  const isPython = ext === 'py';

  const header = isPython
    ? `"""\nProblem: ${problem.title}\nDifficulty: ${problem.difficulty}\nURL: ${problem.url}\nTime Complexity: ${problem.time_complexity || 'O(N)'}\nSpace Complexity: ${problem.space_complexity || 'O(1)'}\n"""\n\n`
    : `/**\n * Problem: ${problem.title}\n * Difficulty: ${problem.difficulty}\n * URL: ${problem.url}\n * Time Complexity: ${problem.time_complexity || 'O(N)'}\n * Space Complexity: ${problem.space_complexity || 'O(1)'}\n */\n\n`;

  return header + (problem.code_snippet || '// Solution code not recorded.');
}

// Generate Root Master Catalog README.md
export function generateMasterReadme(problems, owner, repo) {
  const easyCount = problems.filter(p => p.difficulty === 'Easy').length;
  const medCount = problems.filter(p => p.difficulty === 'Medium').length;
  const hardCount = problems.filter(p => p.difficulty === 'Hard').length;
  const total = problems.length;

  const config = getGitHubConfig();
  const isByTopic = config.directoryMode === 'by-topic';

  const rows = problems.map((p, idx) => {
    const slug = p.slug || p.id;
    const rawCategory = Array.isArray(p.tags) ? p.tags[0] : (p.tags ? JSON.parse(p.tags)[0] : 'Algorithms');
    const cleanCat = (rawCategory || 'Algorithms').replace(/[^a-zA-Z0-9 _-]/g, '').trim();
    const folderPath = isByTopic
      ? `${cleanCat}/${slug}`
      : `Problems/${slug}`;

    const diffBadge = p.difficulty === 'Easy' ? '🟢 Easy' : (p.difficulty === 'Hard' ? '🔴 Hard' : '🟡 Medium');
    const recall = p.retrievability ? `${(p.retrievability * 100).toFixed(0)}%` : '100%';

    return `| ${idx + 1} | [${p.title}](${folderPath}/README.md) | ${diffBadge} | \`${p.time_complexity || 'O(N)'}\` | \`${p.space_complexity || 'O(1)'}\` | ${recall} | [Code](${folderPath}/solution.${getLanguageExtension(p.language)}) |`;
  }).join('\n');

  return `# 🧠 LeetCode Algorithmic Mastery & Solutions Vault

Curated collection of LeetCode algorithmic solutions, architectural intuitions, complexity analyses, and FSRS spaced repetition recall schedules, automatically managed and synchronized via **[PacedLearner](https://github.com/eash-codes)**.

---

### 📊 Repository Summary

- **Total Problems Mastered**: \`${total}\`
- **Easy**: \`${easyCount}\` | **Medium**: \`${medCount}\` | **Hard**: \`${hardCount}\`
- **Spaced Repetition Algorithm**: Free Spaced Repetition Scheduler (**FSRS v4.5**)
- **Last Synchronized**: \`${new Date().toUTCString()}\`

---

### 📑 Problem Catalog

| # | Problem | Difficulty | Time | Space | Retrievability | Solution |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: |
${rows}

---

*Generated by [PacedLearner](https://github.com/eash-codes) — Precision Cognitive Spaced Repetition.*
`;
}

// Atomic commit using GitHub Git Database API (Tree + Commit + Ref update)
export async function commitTree(owner, repo, fileItems, commitMessage, branch = 'main') {
  // 1. Get latest commit SHA on branch
  const ref = await githubRequest(`/repos/${owner}/${repo}/git/ref/heads/${branch}`);
  const latestCommitSha = ref.object.sha;

  // 2. Create tree with base_tree for incremental atomic diff
  const treeData = await githubRequest(`/repos/${owner}/${repo}/git/trees`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      base_tree: latestCommitSha,
      tree: fileItems.map(item => ({
        path: item.path,
        mode: '100644',
        type: 'blob',
        content: item.content
      }))
    })
  });

  // 3. Create Commit
  const commit = await githubRequest(`/repos/${owner}/${repo}/git/commits`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: commitMessage,
      tree: treeData.sha,
      parents: [latestCommitSha]
    })
  });

  // 4. Update branch ref
  await githubRequest(`/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sha: commit.sha,
      force: false
    })
  });

  return commit;
}

// Push a single problem solution to GitHub
export async function pushProblemSolution(problem) {
  const status = await getGitHubStatus();
  if (!status.authenticated) {
    throw new Error('GitHub authentication required');
  }

  const { targetRepo, user, config } = status;
  const owner = targetRepo.owner || user.login;
  const repo = targetRepo.name;
  const branch = targetRepo.default_branch || 'main';

  // Ensure repo exists
  await ensureTargetRepository();

  const slug = problem.slug || problem.id;
  const tags = Array.isArray(problem.tags) ? problem.tags : (problem.tags ? JSON.parse(problem.tags) : []);
  const category = tags[0] || 'Algorithms';
  const cleanCat = category.replace(/[^a-zA-Z0-9 _-]/g, '').trim();

  const basePath = config.directoryMode === 'by-topic'
    ? `${cleanCat}/${slug}`
    : `Problems/${slug}`;

  const ext = getLanguageExtension(problem.language);
  const codeFilePath = `${basePath}/solution.${ext}`;
  const readmeFilePath = `${basePath}/README.md`;

  const readmeContent = generateProblemReadme(problem);
  const codeContent = generateProblemCodeFile(problem);

  const commitMsg = `Sync ${problem.title} (${problem.difficulty}) [Time: ${problem.time_complexity || 'O(N)'}, Space: ${problem.space_complexity || 'O(1)'}]`;

  // Commit both files atomically
  await commitTree(owner, repo, [
    { path: codeFilePath, content: codeContent },
    { path: readmeFilePath, content: readmeContent }
  ], commitMsg, branch);

  const fileUrl = `https://github.com/${owner}/${repo}/tree/${branch}/${basePath}`;

  return {
    success: true,
    fileUrl,
    readmePath: readmeFilePath,
    codePath: codeFilePath,
    repository: `${owner}/${repo}`,
    branch
  };
}

// Batch push all problems and generate root index README in ONE atomic commit
export async function pushAllProblems(problems) {
  const status = await getGitHubStatus();
  if (!status.authenticated) {
    throw new Error('GitHub authentication required');
  }

  const { targetRepo, user, config } = status;
  const owner = targetRepo.owner || user.login;
  const repo = targetRepo.name;
  const branch = targetRepo.default_branch || 'main';

  await ensureTargetRepository();

  const fileItems = [];
  const results = [];

  for (const problem of problems) {
    const slug = problem.slug || problem.id;
    const tags = Array.isArray(problem.tags) ? problem.tags : (problem.tags ? JSON.parse(problem.tags) : []);
    const category = tags[0] || 'Algorithms';
    const cleanCat = category.replace(/[^a-zA-Z0-9 _-]/g, '').trim();

    const basePath = config.directoryMode === 'by-topic'
      ? `${cleanCat}/${slug}`
      : `Problems/${slug}`;

    const ext = getLanguageExtension(problem.language);
    const codeFilePath = `${basePath}/solution.${ext}`;
    const readmeFilePath = `${basePath}/README.md`;

    const readmeContent = generateProblemReadme(problem);
    const codeContent = generateProblemCodeFile(problem);

    fileItems.push({ path: codeFilePath, content: codeContent });
    fileItems.push({ path: readmeFilePath, content: readmeContent });

    const fileUrl = `https://github.com/${owner}/${repo}/tree/${branch}/${basePath}`;
    results.push({ id: problem.id, title: problem.title, success: true, url: fileUrl });
  }

  // Master catalog README.md
  const masterReadme = generateMasterReadme(problems, owner, repo);
  fileItems.push({ path: 'README.md', content: masterReadme });

  const commitMsg = `Sync ${problems.length} LeetCode solutions & Master Catalog index with FSRS stats`;
  await commitTree(owner, repo, fileItems, commitMsg, branch);

  return {
    success: true,
    total: problems.length,
    pushed: results.length,
    repoUrl: `https://github.com/${owner}/${repo}`,
    results
  };
}

