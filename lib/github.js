'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

const CONFIG_PATH = path.join(os.homedir(), '.gitpulpo.json');

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch {
    return { token: '', recent: [] };
  }
}

function saveConfig(cfg) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf8');
}

// Acepta https://github.com/owner/repo(.git) y git@github.com:owner/repo(.git)
function parseRemote(url) {
  if (!url) return null;
  const m = url.match(/github\.com[/:]([^/]+)\/(.+?)(?:\.git)?$/);
  if (!m) return null;
  return { owner: m[1], repo: m[2] };
}

async function api(endpoint, token) {
  const headers = {
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'gitpulpo',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`https://api.github.com${endpoint}`, { headers });
  const remaining = res.headers.get('x-ratelimit-remaining');
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    const err = new Error(`GitHub API ${res.status}: ${body.slice(0, 200)}`);
    err.status = res.status;
    err.rateRemaining = remaining;
    throw err;
  }
  const data = await res.json();
  return { data, rateRemaining: remaining };
}

async function pulls(owner, repo, token, state = 'open') {
  const { data, rateRemaining } = await api(
    `/repos/${owner}/${repo}/pulls?state=${state}&per_page=40&sort=updated&direction=desc`, token);
  return {
    rateRemaining,
    items: data.map(p => ({
      number: p.number,
      title: p.title,
      state: p.merged_at ? 'merged' : p.state,
      draft: p.draft,
      author: p.user && p.user.login,
      base: p.base && p.base.ref,
      head: p.head && p.head.ref,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      url: p.html_url,
    })),
  };
}

async function issues(owner, repo, token, state = 'open') {
  const { data, rateRemaining } = await api(
    `/repos/${owner}/${repo}/issues?state=${state}&per_page=40&sort=updated&direction=desc`, token);
  return {
    rateRemaining,
    // la API de issues incluye PRs; filtrarlos
    items: data.filter(i => !i.pull_request).map(i => ({
      number: i.number,
      title: i.title,
      state: i.state,
      author: i.user && i.user.login,
      // color va directo a un atributo style en el frontend: solo hex válido
      labels: (i.labels || []).map(l => ({
        name: l.name,
        color: /^[0-9a-f]{6}$/i.test(l.color || '') ? l.color : '888888',
      })),
      comments: i.comments,
      createdAt: i.created_at,
      updatedAt: i.updated_at,
      url: i.html_url,
    })),
  };
}

async function repoMeta(owner, repo, token) {
  const { data, rateRemaining } = await api(`/repos/${owner}/${repo}`, token);
  return {
    rateRemaining,
    meta: {
      fullName: data.full_name,
      description: data.description,
      stars: data.stargazers_count,
      forks: data.forks_count,
      openIssues: data.open_issues_count,
      defaultBranch: data.default_branch,
      url: data.html_url,
    },
  };
}

module.exports = { loadConfig, saveConfig, parseRemote, pulls, issues, repoMeta, CONFIG_PATH };
