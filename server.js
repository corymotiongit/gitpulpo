'use strict';
const express = require('express');
const path = require('path');
const git = require('./lib/git');
const gh = require('./lib/github');

const app = express();
const PORT = process.env.PORT || 3737;

// Solo aceptar requests dirigidos a localhost: bloquea DNS rebinding,
// donde un dominio malicioso resuelve a 127.0.0.1 para saltarse CORS.
const ALLOWED_HOSTS = new Set([
  `localhost:${PORT}`, `127.0.0.1:${PORT}`, 'localhost', '127.0.0.1',
]);
app.use((req, res, next) => {
  if (!ALLOWED_HOSTS.has(req.headers.host || '')) {
    return res.status(403).json({ error: 'host no permitido' });
  }
  next();
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Envuelve handlers async y normaliza errores
const h = fn => async (req, res) => {
  try {
    await fn(req, res);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || String(err) });
  }
};

async function requireRepo(req) {
  const repoPath = (req.method === 'GET' ? req.query.path : req.body.path) || '';
  if (!repoPath) throw Object.assign(new Error('falta parámetro path'), { status: 400 });
  if (!(await git.isRepo(repoPath))) {
    throw Object.assign(new Error(`no es un repo git: ${repoPath}`), { status: 400 });
  }
  return repoPath;
}

// Acepta nombres de rama/tag, refs remotos (origin/x) y hashes; rechaza
// cualquier cosa que git pudiera interpretar como opción (-f, --force…).
function requireRef(name, label = 'ref') {
  if (typeof name !== 'string' || !/^[\w\-./]+$/.test(name) || name.startsWith('-')) {
    throw Object.assign(new Error(`${label} inválido`), { status: 400 });
  }
  return name;
}

function rememberRepo(repoPath) {
  const cfg = gh.loadConfig();
  cfg.recent = [repoPath, ...(cfg.recent || []).filter(r => r !== repoPath)].slice(0, 10);
  gh.saveConfig(cfg);
}

// ---- repo ----
app.get('/api/repo', h(async (req, res) => {
  const p = await requireRepo(req);
  const info = await git.repoInfo(p);
  rememberRepo(info.path);
  res.json(info);
}));

app.get('/api/recent', h(async (req, res) => {
  const cfg = gh.loadConfig();
  res.json({ recent: cfg.recent || [], hasToken: !!cfg.token });
}));

app.get('/api/log', h(async (req, res) => {
  const p = await requireRepo(req);
  const limit = Math.min(parseInt(req.query.limit, 10) || 400, 2000);
  res.json({ commits: await git.log(p, limit) });
}));

app.get('/api/branches', h(async (req, res) => {
  const p = await requireRepo(req);
  res.json(await git.branches(p));
}));

app.get('/api/status', h(async (req, res) => {
  const p = await requireRepo(req);
  res.json(await git.status(p));
}));

app.get('/api/commit', h(async (req, res) => {
  const p = await requireRepo(req);
  res.json(await git.commitDetail(p, req.query.hash));
}));

app.get('/api/commit-diff', h(async (req, res) => {
  const p = await requireRepo(req);
  res.json({ diff: await git.commitFileDiff(p, req.query.hash, req.query.file) });
}));

app.get('/api/working-diff', h(async (req, res) => {
  const p = await requireRepo(req);
  const { file, staged, untracked } = req.query;
  if (untracked === '1') {
    const content = await git.untrackedContent(p, file);
    const diff = content.split('\n').map(l => '+' + l).join('\n');
    return res.json({ diff: `--- /dev/null\n+++ b/${file}\n@@ nuevo archivo @@\n${diff}` });
  }
  res.json({ diff: await git.workingDiff(p, file, staged === '1') });
}));

// ---- acciones ----
app.post('/api/stage', h(async (req, res) => {
  const p = await requireRepo(req);
  await git.stage(p, req.body.files || []);
  res.json({ ok: true });
}));

app.post('/api/unstage', h(async (req, res) => {
  const p = await requireRepo(req);
  await git.unstage(p, req.body.files || []);
  res.json({ ok: true });
}));

app.post('/api/discard', h(async (req, res) => {
  const p = await requireRepo(req);
  await git.discard(p, req.body.files || []);
  res.json({ ok: true });
}));

app.post('/api/commit', h(async (req, res) => {
  const p = await requireRepo(req);
  if (!req.body.message || !req.body.message.trim()) {
    throw Object.assign(new Error('mensaje de commit vacío'), { status: 400 });
  }
  const out = await git.commit(p, req.body.message);
  res.json({ ok: true, out });
}));

app.post('/api/checkout', h(async (req, res) => {
  const p = await requireRepo(req);
  const out = await git.checkout(p, requireRef(req.body.ref));
  res.json({ ok: true, out });
}));

app.post('/api/branch', h(async (req, res) => {
  const p = await requireRepo(req);
  const name = requireRef(req.body.name || '', 'nombre de rama');
  const from = req.body.from ? requireRef(req.body.from, 'ref de origen') : undefined;
  const out = await git.createBranch(p, name, from);
  res.json({ ok: true, out });
}));

app.post('/api/branch-delete', h(async (req, res) => {
  const p = await requireRepo(req);
  const out = await git.deleteBranch(p, requireRef(req.body.name, 'nombre de rama'));
  res.json({ ok: true, out });
}));

app.post('/api/fetch', h(async (req, res) => {
  const p = await requireRepo(req);
  const out = await git.fetch(p);
  res.json({ ok: true, out });
}));

app.post('/api/pull', h(async (req, res) => {
  const p = await requireRepo(req);
  const out = await git.pull(p);
  res.json({ ok: true, out });
}));

app.post('/api/push', h(async (req, res) => {
  const p = await requireRepo(req);
  const out = await git.push(p);
  res.json({ ok: true, out });
}));

// ---- GitHub ----
async function githubTarget(req) {
  const p = await requireRepo(req);
  const info = await git.repoInfo(p);
  const target = gh.parseRemote(info.remote);
  if (!target) throw Object.assign(new Error('el remoto origin no apunta a github.com'), { status: 400 });
  return target;
}

app.get('/api/github/meta', h(async (req, res) => {
  const { owner, repo } = await githubTarget(req);
  const cfg = gh.loadConfig();
  res.json(await gh.repoMeta(owner, repo, cfg.token));
}));

app.get('/api/github/pulls', h(async (req, res) => {
  const { owner, repo } = await githubTarget(req);
  const cfg = gh.loadConfig();
  res.json(await gh.pulls(owner, repo, cfg.token, req.query.state || 'open'));
}));

app.get('/api/github/issues', h(async (req, res) => {
  const { owner, repo } = await githubTarget(req);
  const cfg = gh.loadConfig();
  res.json(await gh.issues(owner, repo, cfg.token, req.query.state || 'open'));
}));

app.post('/api/github/token', h(async (req, res) => {
  const cfg = gh.loadConfig();
  cfg.token = req.body.token || '';
  gh.saveConfig(cfg);
  res.json({ ok: true, hasToken: !!cfg.token });
}));

app.listen(PORT, '127.0.0.1', () => {
  console.log(`🐙 GitPulpo escuchando en http://localhost:${PORT}`);
});
