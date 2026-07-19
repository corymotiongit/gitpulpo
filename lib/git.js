'use strict';
const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');

const SEP = '\x1f'; // unit separator entre campos
const REC = '\x1e'; // record separator entre commits

function run(repoPath, args, opts = {}) {
  return new Promise((resolve, reject) => {
    execFile('git', ['-C', repoPath, ...args], {
      maxBuffer: 64 * 1024 * 1024,
      windowsHide: true,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GIT_OPTIONAL_LOCKS: '0' },
      ...opts,
    }, (err, stdout, stderr) => {
      if (err) {
        const e = new Error((stderr || err.message || '').trim() || 'git error');
        e.code = err.code;
        return reject(e);
      }
      resolve(stdout);
    });
  });
}

async function isRepo(repoPath) {
  try {
    if (!fs.existsSync(repoPath)) return false;
    const out = await run(repoPath, ['rev-parse', '--is-inside-work-tree']);
    return out.trim() === 'true';
  } catch { return false; }
}

async function repoInfo(repoPath) {
  const top = (await run(repoPath, ['rev-parse', '--show-toplevel'])).trim();
  let head = '';
  let detached = false;
  try {
    head = (await run(repoPath, ['symbolic-ref', '--short', 'HEAD'])).trim();
  } catch {
    detached = true;
    try { head = (await run(repoPath, ['rev-parse', '--short', 'HEAD'])).trim(); } catch { head = ''; }
  }
  let remote = '';
  try { remote = (await run(repoPath, ['remote', 'get-url', 'origin'])).trim(); } catch {}
  return { path: top, name: path.basename(top), head, detached, remote };
}

async function log(repoPath, limit = 400) {
  const fmt = ['%H', '%P', '%an', '%ae', '%aI', '%D', '%s'].join(SEP) + REC;
  const out = await run(repoPath, [
    'log', '--all', '--topo-order', '--date=iso-strict',
    `--pretty=format:${fmt}`, '-n', String(limit),
  ]);
  const commits = [];
  for (const rec of out.split(REC)) {
    const line = rec.replace(/^\n/, '');
    if (!line.trim()) continue;
    const [hash, parents, author, email, date, refs, subject] = line.split(SEP);
    commits.push({
      hash,
      parents: parents ? parents.split(' ').filter(Boolean) : [],
      author, email, date,
      refs: parseRefs(refs),
      subject: subject || '',
    });
  }
  return commits;
}

function parseRefs(raw) {
  if (!raw || !raw.trim()) return [];
  return raw.split(',').map(s => s.trim()).filter(Boolean).map(r => {
    if (r.startsWith('HEAD ->')) return { type: 'head', name: r.replace('HEAD ->', '').trim() };
    if (r === 'HEAD') return { type: 'detached', name: 'HEAD' };
    if (r.startsWith('tag:')) return { type: 'tag', name: r.replace('tag:', '').trim() };
    if (r.startsWith('origin/')) return { type: 'remote', name: r };
    return { type: 'branch', name: r };
  });
}

async function branches(repoPath) {
  const fmt = ['%(refname)', '%(objectname:short)', '%(HEAD)', '%(upstream:short)', '%(upstream:track)'].join(SEP);
  const out = await run(repoPath, [
    'for-each-ref', `--format=${fmt}`,
    'refs/heads', 'refs/remotes', 'refs/tags',
  ]);
  const local = [], remote = [], tags = [];
  for (const line of out.split('\n')) {
    if (!line.trim()) continue;
    const [refname, sha, isHead, upstream, track] = line.split(SEP);
    if (refname.startsWith('refs/heads/')) {
      local.push({ name: refname.slice(11), sha, current: isHead === '*', upstream: upstream || null, track: (track || '').replace(/[\[\]]/g, '') });
    } else if (refname.startsWith('refs/remotes/')) {
      const name = refname.slice(13);
      if (!name.endsWith('/HEAD')) remote.push({ name, sha });
    } else if (refname.startsWith('refs/tags/')) {
      tags.push({ name: refname.slice(10), sha });
    }
  }
  return { local, remote, tags };
}

async function status(repoPath) {
  const out = await run(repoPath, ['status', '--porcelain=v2', '--branch', '--untracked-files=all']);
  const files = [];
  let branch = { ahead: 0, behind: 0 };
  for (const line of out.split('\n')) {
    if (!line) continue;
    if (line.startsWith('# branch.ab')) {
      const m = line.match(/\+(\d+) -(\d+)/);
      if (m) branch = { ahead: +m[1], behind: +m[2] };
    } else if (line.startsWith('1 ')) {
      const parts = line.split(' ');
      files.push({ path: parts.slice(8).join(' '), index: parts[1][0], worktree: parts[1][1] });
    } else if (line.startsWith('2 ')) {
      const parts = line.split(' ');
      const filePath = parts.slice(9).join(' ').split('\t')[0];
      files.push({ path: filePath, index: parts[1][0], worktree: parts[1][1] });
    } else if (line.startsWith('? ')) {
      files.push({ path: line.slice(2), index: '?', worktree: '?' });
    } else if (line.startsWith('u ')) {
      files.push({ path: line.split(' ').slice(10).join(' '), index: 'U', worktree: 'U' });
    }
  }
  return { files, branch };
}

async function commitDetail(repoPath, hash) {
  if (!/^[0-9a-f]{4,40}$/i.test(hash)) throw new Error('hash inválido');
  const fmt = ['%H', '%P', '%an', '%ae', '%aI', '%cn', '%cI', '%D', '%s', '%b'].join(SEP);
  const meta = await run(repoPath, ['show', '--no-patch', `--pretty=format:${fmt}`, hash]);
  const [h, parents, an, ae, ad, cn, cd, refs, subject, ...bodyParts] = meta.split(SEP);
  const numstat = await run(repoPath, ['show', '--numstat', '--format=', '-M', hash]);
  const files = numstat.split('\n').filter(l => l.trim()).map(l => {
    const [add, del, ...rest] = l.split('\t');
    return { path: rest.join('\t'), additions: add === '-' ? null : +add, deletions: del === '-' ? null : +del };
  });
  return {
    hash: h, parents: parents ? parents.split(' ').filter(Boolean) : [],
    author: an, email: ae, date: ad, committer: cn, commitDate: cd,
    refs: parseRefs(refs), subject, body: bodyParts.join(SEP).trim(), files,
  };
}

async function commitFileDiff(repoPath, hash, file) {
  if (!/^[0-9a-f]{4,40}$/i.test(hash)) throw new Error('hash inválido');
  return run(repoPath, ['show', '--no-color', '--format=', '-M', hash, '--', file]);
}

async function workingDiff(repoPath, file, staged) {
  const args = ['diff', '--no-color'];
  if (staged) args.push('--cached');
  if (file) args.push('--', file);
  return run(repoPath, args);
}

async function untrackedContent(repoPath, file) {
  const full = path.join(repoPath, file);
  const real = fs.realpathSync(full);
  const top = fs.realpathSync(repoPath);
  // path.relative evita el falso positivo de prefijos (C:\repo vs C:\repo-otro)
  const rel = path.relative(top, real);
  if (rel.startsWith('..') || path.isAbsolute(rel)) throw new Error('ruta fuera del repo');
  const stat = fs.statSync(real);
  if (stat.size > 2 * 1024 * 1024) return '(archivo muy grande para previsualizar)';
  return fs.readFileSync(real, 'utf8');
}

const stage = (p, files) => run(p, ['add', '--', ...files]);
const unstage = (p, files) => run(p, ['restore', '--staged', '--', ...files]);
const discard = (p, files) => run(p, ['checkout', '--', ...files]);
const commit = (p, message) => run(p, ['commit', '-m', message]);
const checkout = (p, ref) => run(p, ['checkout', ref]);
const createBranch = (p, name, from) => run(p, from ? ['checkout', '-b', name, from] : ['checkout', '-b', name]);
const deleteBranch = (p, name) => run(p, ['branch', '-d', name]);
const fetch = (p) => run(p, ['fetch', '--all', '--prune']);
const pull = (p) => run(p, ['pull', '--ff-only']);
const push = (p) => run(p, ['push']);

module.exports = {
  run, isRepo, repoInfo, log, branches, status, commitDetail,
  commitFileDiff, workingDiff, untrackedContent,
  stage, unstage, discard, commit, checkout, createBranch, deleteBranch,
  fetch, pull, push,
};
