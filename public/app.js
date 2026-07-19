'use strict';
/* GitPulpo — lógica de UI (strings visibles vía t() de i18n.js) */

const $ = sel => document.querySelector(sel);
const $$ = sel => [...document.querySelectorAll(sel)];

const state = {
  repoPath: null,
  info: null,
  commits: [],
  rows: [],
  maxLanes: 1,
  branches: { local: [], remote: [], tags: [] },
  status: { files: [], branch: { ahead: 0, behind: 0 } },
  selected: null,
  githubLoaded: false,
  ghState: 'open',
};

/* ---------- helpers ---------- */
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}

function toast(msg, isError = false) {
  const t = $('#toast');
  t.textContent = msg;
  t.className = isError ? 'error' : '';
  t.hidden = false;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.hidden = true; }, isError ? 5000 : 2600);
}

async function api(path, opts = {}) {
  const url = new URL(path, location.origin);
  if (opts.query) for (const [k, v] of Object.entries(opts.query)) url.searchParams.set(k, v);
  const init = { method: opts.method || 'GET' };
  if (opts.body) {
    init.method = opts.method || 'POST';
    init.headers = { 'Content-Type': 'application/json' };
    init.body = JSON.stringify(opts.body);
  }
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

const fmtDate = iso => {
  if (!iso) return '';
  const d = new Date(iso);
  const loc = getLang() === 'es' ? 'es-MX' : 'en-US';
  return d.toLocaleDateString(loc, { day: '2-digit', month: 'short', year: '2-digit' }) +
    ' ' + d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' });
};

/* ---------- apertura de repo ---------- */
async function openRepo(path) {
  if (!path || !path.trim()) return;
  try {
    state.info = await api('/api/repo', { query: { path: path.trim() } });
    state.repoPath = state.info.path;
    $('#repo-input').value = state.repoPath;
    $('#layout').classList.remove('empty-state');
    $('#sidebar').hidden = false;
    $('#graph-pane').hidden = false;
    $('#detail-pane').hidden = false;
    $('#welcome').style.display = 'none';
    ['#btn-fetch', '#btn-pull', '#btn-push', '#btn-refresh'].forEach(s => { $(s).disabled = false; });
    state.githubLoaded = false;
    $('#tab-github').innerHTML = '';
    await refreshAll();
    loadRecent();
    toast(t('toast.repoOpened', { name: state.info.name }));
  } catch (err) {
    toast(err.message, true);
  }
}

async function refreshAll() {
  const p = state.repoPath;
  const [info, log, branches, status] = await Promise.all([
    api('/api/repo', { query: { path: p } }),
    api('/api/log', { query: { path: p, limit: 500 } }),
    api('/api/branches', { query: { path: p } }),
    api('/api/status', { query: { path: p } }),
  ]);
  state.info = info;
  state.commits = log.commits;
  state.branches = branches;
  state.status = status;
  const { rows, maxLanes } = GitGraph.layout(state.commits);
  state.rows = rows;
  state.maxLanes = Math.min(maxLanes, 14);
  renderTopbar();
  renderSidebar();
  renderGraph();
  renderWipTab();
}

function loadRecent() {
  api('/api/recent').then(({ recent }) => {
    const sel = $('#recent-select');
    sel.innerHTML = `<option value="" data-i18n="topbar.recent">${esc(t('topbar.recent'))}</option>` +
      recent.map(r => `<option value="${esc(r)}">${esc(r.split(/[\\/]/).pop())}</option>`).join('');
  }).catch(() => {});
}

/* ---------- topbar ---------- */
function renderTopbar() {
  $('#repo-id').hidden = false;
  $('#repo-name').textContent = state.info.name;
  $('#repo-head').textContent = state.info.detached ? `⌀ ${state.info.head}` : state.info.head;
  const { ahead, behind } = state.status.branch;
  $('#ahead-behind').textContent =
    (ahead ? `↑${ahead} ` : '') + (behind ? `↓${behind}` : '');
}

/* ---------- sidebar ---------- */
function renderSidebar() {
  const colorOf = (() => {
    // color según carril del commit que apunta la rama
    const shaLane = {};
    state.rows.forEach((r, i) => { shaLane[state.commits[i].hash.slice(0, 7)] = r.color; });
    return sha => {
      const c = shaLane[sha && sha.slice(0, 7)];
      return GitGraph.PALETTE[(c ?? 0) % GitGraph.PALETTE.length];
    };
  })();

  const local = $('#local-branches');
  local.innerHTML = state.branches.local.map(b => `
    <li class="${b.current ? 'current' : ''}" data-ref="${esc(b.name)}" title="${esc(t('sidebar.checkoutHint'))}">
      <span class="branch-dot" style="background:${colorOf(b.sha)}"></span>
      <span>${esc(b.name)}</span>
      ${b.track ? `<span class="track">${esc(b.track)}</span>` : ''}
    </li>`).join('') || `<div class="side-empty">${esc(t('sidebar.noBranches'))}</div>`;

  const remote = $('#remote-branches');
  remote.innerHTML = state.branches.remote.slice(0, 40).map(b => `
    <li data-ref="${esc(b.name)}" title="${esc(t('sidebar.checkoutHint'))}">
      <span class="branch-dot" style="background:${colorOf(b.sha)};opacity:.5"></span>
      <span>${esc(b.name)}</span>
    </li>`).join('') || `<div class="side-empty">${esc(t('sidebar.noRemotes'))}</div>`;

  const tags = $('#tag-list');
  tags.innerHTML = state.branches.tags.slice(0, 40).map(tg => `
    <li data-sha="${esc(tg.sha)}">
      <span class="tag-ico">⌂</span>
      <span>${esc(tg.name)}</span>
    </li>`).join('') || `<div class="side-empty">${esc(t('sidebar.noTags'))}</div>`;

  $$('#local-branches li, #remote-branches li').forEach(li => {
    li.addEventListener('dblclick', () => doCheckout(li.dataset.ref));
    li.addEventListener('click', () => {
      const b = [...state.branches.local, ...state.branches.remote].find(x => x.name === li.dataset.ref);
      if (b) scrollToSha(b.sha);
    });
  });
  $$('#tag-list li').forEach(li => li.addEventListener('click', () => scrollToSha(li.dataset.sha)));
}

function scrollToSha(sha) {
  if (!sha) return;
  const row = $(`.commit-row[data-hash^="${CSS.escape(sha)}"]`);
  if (row) {
    row.scrollIntoView({ block: 'center', behavior: 'smooth' });
    row.classList.add('selected');
    setTimeout(() => { if (state.selected !== row.dataset.hash) row.classList.remove('selected'); }, 1200);
  }
}

/* ---------- grafo ---------- */
function renderGraph() {
  const width = state.maxLanes * GitGraph.LANE_W + 12;
  const list = $('#commit-list');
  const frag = [];

  if (state.status.files.length) {
    const headRow = state.rows.find((r, i) =>
      state.commits[i].refs.some(ref => ref.type === 'head' || ref.type === 'detached'));
    const lane = headRow ? headRow.lane : 0;
    frag.push(`
      <div class="commit-row wip-row" data-wip="1">
        <div class="graph-cell">${GitGraph.wipSvg(lane, width)}</div>
        <div class="msg-cell"><span class="subject">${esc(t('wip.uncommitted', { n: state.status.files.length }))}</span></div>
      </div>`);
  }

  state.rows.forEach((row, i) => {
    const c = state.commits[i];
    const refs = c.refs.map(r => {
      const cls = r.type === 'head' ? 'head' : r.type === 'detached' ? 'head' : r.type;
      return `<span class="ref-chip ${cls}">${esc(r.name)}</span>`;
    }).join('');
    frag.push(`
      <div class="commit-row" data-hash="${c.hash}">
        <div class="graph-cell">${GitGraph.rowSvg(row, width)}</div>
        <div class="msg-cell">
          ${refs ? `<span class="refs">${refs}</span>` : ''}
          <span class="subject">${esc(c.subject)}</span>
        </div>
        <div class="meta">
          <span class="author">${esc(c.author)}</span>
          <span class="date">${fmtDate(c.date)}</span>
          <span class="sha">${c.hash.slice(0, 7)}</span>
        </div>
      </div>`);
  });

  list.innerHTML = frag.join('');

  if (state.selected) {
    const sel = list.querySelector(`.commit-row[data-hash="${CSS.escape(state.selected)}"]`);
    if (sel) sel.classList.add('selected');
  }

  $$('.commit-row').forEach(row => {
    row.addEventListener('click', () => {
      if (row.dataset.wip) { switchTab('wip'); return; }
      $$('.commit-row.selected').forEach(r => r.classList.remove('selected'));
      row.classList.add('selected');
      state.selected = row.dataset.hash;
      loadCommitDetail(row.dataset.hash);
      switchTab('commit');
    });
  });
}

/* ---------- tabs ---------- */
function switchTab(name) {
  $$('.tab').forEach(tb => tb.classList.toggle('active', tb.dataset.tab === name));
  ['commit', 'wip', 'github'].forEach(n => { $(`#tab-${n}`).hidden = n !== name; });
  if (name === 'github' && !state.githubLoaded) loadGithub();
}

$$('.tab').forEach(tb => tb.addEventListener('click', () => switchTab(tb.dataset.tab)));

/* ---------- detalle de commit ---------- */
async function loadCommitDetail(hash) {
  const box = $('#tab-commit');
  box.innerHTML = `<div class="placeholder">${esc(t('common.loading'))}</div>`;
  try {
    const d = await api('/api/commit', { query: { path: state.repoPath, hash } });
    const totalAdd = d.files.reduce((s, f) => s + (f.additions || 0), 0);
    const totalDel = d.files.reduce((s, f) => s + (f.deletions || 0), 0);
    box.innerHTML = `
      <div class="commit-head">
        <h2>${esc(d.subject)}</h2>
        ${d.body ? `<div class="commit-body-msg">${esc(d.body)}</div>` : ''}
        <dl class="commit-meta-grid">
          <dt>${esc(t('detail.sha'))}</dt><dd class="sha-full" title="${esc(t('detail.copySha'))}">${d.hash}</dd>
          <dt>${esc(t('detail.author'))}</dt><dd>${esc(d.author)} &lt;${esc(d.email)}&gt;</dd>
          <dt>${esc(t('detail.date'))}</dt><dd>${fmtDate(d.date)}</dd>
          ${d.parents.length ? `<dt>${esc(t('detail.parents'))}</dt><dd>${d.parents.map(p => p.slice(0, 7)).join(', ')}</dd>` : ''}
          <dt>${esc(t('detail.total'))}</dt><dd><span class="stat-add">+${totalAdd}</span> <span class="stat-del">−${totalDel}</span> ${esc(t('detail.inFiles', { n: d.files.length }))}</dd>
        </dl>
      </div>
      <ul class="file-list">
        ${d.files.map(f => `
          <li>
            <div class="file-item" data-file="${esc(f.path)}">
              <span class="status-badge M">±</span>
              <span class="fname">${esc(f.path)}</span>
              ${f.additions != null ? `<span class="stat-add">+${f.additions}</span>` : ''}
              ${f.deletions != null ? `<span class="stat-del">−${f.deletions}</span>` : ''}
            </div>
            <div class="diff-slot"></div>
          </li>`).join('')}
      </ul>`;

    box.querySelector('.sha-full').addEventListener('click', () => {
      navigator.clipboard.writeText(d.hash).then(() => toast(t('toast.shaCopied')));
    });

    box.querySelectorAll('.file-item').forEach(item => {
      item.addEventListener('click', async () => {
        const slot = item.parentElement.querySelector('.diff-slot');
        if (slot.innerHTML) { slot.innerHTML = ''; item.classList.remove('open'); return; }
        item.classList.add('open');
        slot.innerHTML = `<div class="placeholder" style="margin:8px 0">${esc(t('common.loadingDiff'))}</div>`;
        try {
          const { diff } = await api('/api/commit-diff', {
            query: { path: state.repoPath, hash: d.hash, file: item.dataset.file },
          });
          slot.innerHTML = renderDiff(diff);
        } catch (e) {
          slot.innerHTML = `<div class="gh-error">${esc(e.message)}</div>`;
        }
      });
    });
  } catch (err) {
    box.innerHTML = `<div class="gh-error">${esc(err.message)}</div>`;
  }
}

function renderDiff(text) {
  if (!text || !text.trim()) return `<div class="placeholder" style="margin:8px 0">${esc(t('diff.empty'))}</div>`;
  const lines = text.split('\n').map(l => {
    let cls = '';
    if (l.startsWith('+++') || l.startsWith('---') || l.startsWith('diff ') || l.startsWith('index ')) cls = 'meta';
    else if (l.startsWith('@@')) cls = 'hunk';
    else if (l.startsWith('+')) cls = 'add';
    else if (l.startsWith('-')) cls = 'del';
    return `<div class="dline ${cls}">${esc(l) || ' '}</div>`;
  });
  return `<div class="diff-box"><pre>${lines.join('')}</pre></div>`;
}

/* ---------- staging / WIP ---------- */
function renderWipTab() {
  const files = state.status.files;
  $('#wip-count').hidden = !files.length;
  $('#wip-count').textContent = files.length;

  const staged = files.filter(f => f.index !== '.' && f.index !== '?' && f.index !== ' ');
  const unstaged = files.filter(f => (f.worktree !== '.' && f.worktree !== ' ') || f.index === '?');

  const fileRow = (f, stagedList) => {
    const code = stagedList ? f.index : (f.index === '?' ? 'N' : f.worktree);
    const untracked = f.index === '?';
    return `
      <li>
        <div class="wip-file">
          <div class="file-item" data-file="${esc(f.path)}" data-staged="${stagedList ? 1 : 0}" data-untracked="${untracked ? 1 : 0}">
            <span class="status-badge ${esc(code)}">${esc(code)}</span>
            <span class="fname">${esc(f.path)}</span>
          </div>
          ${stagedList
            ? `<button class="wip-act" data-act="unstage" data-file="${esc(f.path)}" title="${esc(t('wip.unstageFile'))}">−</button>`
            : `<button class="wip-act" data-act="stage" data-file="${esc(f.path)}" title="${esc(t('wip.stageFile'))}">+</button>
               ${untracked ? '' : `<button class="wip-act danger" data-act="discard" data-file="${esc(f.path)}" title="${esc(t('wip.discardFile'))}">✕</button>`}`}
        </div>
        <div class="diff-slot"></div>
      </li>`;
  };

  $('#tab-wip').innerHTML = files.length ? `
    <div class="wip-section">
      <h4>${esc(t('wip.unstaged'))} (${unstaged.length}) ${unstaged.length ? `<button class="mini-btn" id="stage-all" title="${esc(t('wip.stageAllTitle'))}">≫</button>` : ''}</h4>
      <ul class="file-list">${unstaged.map(f => fileRow(f, false)).join('')}</ul>
      <h4>${esc(t('wip.staged'))} (${staged.length}) ${staged.length ? `<button class="mini-btn" id="unstage-all" title="${esc(t('wip.unstageAllTitle'))}">≪</button>` : ''}</h4>
      <ul class="file-list">${staged.map(f => fileRow(f, true)).join('')}</ul>
      <textarea id="commit-msg" placeholder="${esc(t('wip.commitPlaceholder'))}"></textarea>
      <div class="commit-actions">
        <button class="btn accent" id="btn-commit" ${staged.length ? '' : 'disabled'}>${esc(t('wip.commit'))} (${staged.length})</button>
      </div>
    </div>` : `<div class="placeholder">${esc(t('wip.clean'))}</div>`;

  const wip = $('#tab-wip');

  wip.querySelectorAll('.wip-act').forEach(btn => {
    btn.addEventListener('click', async ev => {
      ev.stopPropagation();
      const { act, file } = btn.dataset;
      if (act === 'discard' && !confirm(t('wip.confirmDiscard', { file }))) return;
      try {
        await api(`/api/${act}`, { body: { path: state.repoPath, files: [file] } });
        await refreshAll();
        toast(act === 'stage' ? t('toast.staged') : act === 'unstage' ? t('toast.unstaged') : t('toast.discarded'));
      } catch (e) { toast(e.message, true); }
    });
  });

  const stageAll = wip.querySelector('#stage-all');
  if (stageAll) stageAll.addEventListener('click', async () => {
    try {
      await api('/api/stage', { body: { path: state.repoPath, files: unstaged.map(f => f.path) } });
      await refreshAll();
    } catch (e) { toast(e.message, true); }
  });
  const unstageAll = wip.querySelector('#unstage-all');
  if (unstageAll) unstageAll.addEventListener('click', async () => {
    try {
      await api('/api/unstage', { body: { path: state.repoPath, files: staged.map(f => f.path) } });
      await refreshAll();
    } catch (e) { toast(e.message, true); }
  });

  const btnCommit = wip.querySelector('#btn-commit');
  if (btnCommit) btnCommit.addEventListener('click', async () => {
    const msg = wip.querySelector('#commit-msg').value;
    if (!msg.trim()) { toast(t('toast.emptyCommitMsg'), true); return; }
    try {
      await api('/api/commit', { body: { path: state.repoPath, message: msg } });
      await refreshAll();
      toast(t('toast.commitCreated'));
    } catch (e) { toast(e.message, true); }
  });

  wip.querySelectorAll('.file-item').forEach(item => {
    item.addEventListener('click', async () => {
      const slot = item.closest('li').querySelector('.diff-slot');
      if (slot.innerHTML) { slot.innerHTML = ''; item.classList.remove('open'); return; }
      item.classList.add('open');
      slot.innerHTML = `<div class="placeholder" style="margin:8px 0">${esc(t('common.loadingDiff'))}</div>`;
      try {
        const { diff } = await api('/api/working-diff', {
          query: {
            path: state.repoPath, file: item.dataset.file,
            staged: item.dataset.staged, untracked: item.dataset.untracked,
          },
        });
        slot.innerHTML = renderDiff(diff);
      } catch (e) {
        slot.innerHTML = `<div class="gh-error">${esc(e.message)}</div>`;
      }
    });
  });
}

/* ---------- GitHub ---------- */
async function loadGithub() {
  const box = $('#tab-github');
  box.innerHTML = `<div class="placeholder">${esc(t('gh.loading'))}</div>`;
  state.githubLoaded = true;
  try {
    const q = { path: state.repoPath };
    const [meta, pulls, issues] = await Promise.all([
      api('/api/github/meta', { query: q }),
      api('/api/github/pulls', { query: { ...q, state: state.ghState } }),
      api('/api/github/issues', { query: { ...q, state: state.ghState } }),
    ]);
    const m = meta.meta;
    box.innerHTML = `
      <div class="gh-header">
        <span class="gh-name"><a href="${esc(m.url)}" target="_blank">${esc(m.fullName)}</a></span>
        <span class="gh-stats">★ ${m.stars} · ⑂ ${m.forks}</span>
      </div>
      <div style="display:flex;gap:6px;margin-bottom:4px">
        <button class="btn ${state.ghState === 'open' ? 'accent' : ''}" data-ghstate="open">${esc(t('gh.open'))}</button>
        <button class="btn ${state.ghState === 'closed' ? 'accent' : ''}" data-ghstate="closed">${esc(t('gh.closed'))}</button>
        <button class="btn ${state.ghState === 'all' ? 'accent' : ''}" data-ghstate="all">${esc(t('gh.all'))}</button>
      </div>
      <div class="gh-section-title">${esc(t('gh.pulls'))} (${pulls.items.length})</div>
      ${pulls.items.map(p => `
        <div class="gh-item">
          <div class="gh-title"><a href="${esc(p.url)}" target="_blank">#${p.number} ${esc(p.title)}</a></div>
          <div class="gh-sub">
            <span class="gh-state ${p.draft ? 'draft' : p.state}">${p.draft ? 'draft' : p.state}</span>
            <span>@${esc(p.author)}</span>
            <span>${esc(p.head)} → ${esc(p.base)}</span>
            <span>${fmtDate(p.updatedAt)}</span>
          </div>
        </div>`).join('') || `<div class="side-empty">${esc(t('gh.noPulls'))}</div>`}
      <div class="gh-section-title">${esc(t('gh.issues'))} (${issues.items.length})</div>
      ${issues.items.map(i => `
        <div class="gh-item">
          <div class="gh-title"><a href="${esc(i.url)}" target="_blank">#${i.number} ${esc(i.title)}</a></div>
          <div class="gh-sub">
            <span class="gh-state ${i.state}">${i.state}</span>
            <span>@${esc(i.author)}</span>
            ${i.labels.map(l => `<span class="gh-label" style="border-color:#${l.color}66"><i class="gh-label-dot" style="background:#${l.color}"></i>${esc(l.name)}</span>`).join('')}
            <span>💬 ${i.comments}</span>
          </div>
        </div>`).join('') || `<div class="side-empty">${esc(t('gh.noIssues'))}</div>`}
      ${pulls.rateRemaining != null ? `<div class="gh-rate">${esc(t('gh.rate', { n: pulls.rateRemaining }))}</div>` : ''}
    `;
    box.querySelectorAll('[data-ghstate]').forEach(b => b.addEventListener('click', () => {
      state.ghState = b.dataset.ghstate;
      loadGithub();
    }));
  } catch (err) {
    box.innerHTML = `<div class="gh-error">${esc(err.message)}<br><br>
      ${err.message.includes('403') || err.message.includes('rate') ? esc(t('gh.rateHint')) : ''}
      ${err.message.includes('origin') ? esc(t('gh.noOrigin')) : ''}</div>`;
  }
}

/* ---------- acciones git ---------- */
async function doCheckout(ref) {
  try {
    await api('/api/checkout', { body: { path: state.repoPath, ref } });
    await refreshAll();
    toast(t('toast.checkout', { ref }));
  } catch (e) { toast(e.message, true); }
}

async function remoteAction(name) {
  const btn = $(`#btn-${name}`);
  btn.disabled = true;
  const orig = btn.textContent;
  btn.textContent = '…';
  try {
    await api(`/api/${name}`, { body: { path: state.repoPath } });
    await refreshAll();
    toast(t('toast.actionOk', { action: name }));
  } catch (e) {
    toast(e.message, true);
  } finally {
    btn.disabled = false;
    btn.textContent = orig;
  }
}

/* ---------- wiring inicial ---------- */
$('#btn-open').addEventListener('click', () => openRepo($('#repo-input').value));
$('#repo-input').addEventListener('keydown', e => { if (e.key === 'Enter') openRepo(e.target.value); });
$('#recent-select').addEventListener('change', e => { if (e.target.value) openRepo(e.target.value); });
$('#btn-refresh').addEventListener('click', () => refreshAll().then(() => toast(t('toast.refreshed'))));
$('#btn-fetch').addEventListener('click', () => remoteAction('fetch'));
$('#btn-pull').addEventListener('click', () => remoteAction('pull'));
$('#btn-push').addEventListener('click', () => remoteAction('push'));

$('#btn-lang').addEventListener('click', () => setLang(getLang() === 'es' ? 'en' : 'es'));

/* tema: ☾ en claro (va a oscuro), ☀ en oscuro (va a claro); title vía i18n */
function syncThemeBtn() {
  const btn = $('#btn-theme');
  const dark = getTheme() === 'dark';
  const key = dark ? 'topbar.themeLight' : 'topbar.themeDark';
  btn.textContent = dark ? '☀' : '☾';
  btn.dataset.i18nTitle = key; // applyI18nStatic re-traduce el title al cambiar idioma
  btn.title = t(key);
  btn.setAttribute('aria-label', t(key));
}
$('#btn-theme').addEventListener('click', () => setTheme(getTheme() === 'dark' ? 'light' : 'dark'));
document.addEventListener('themechange', syncThemeBtn); // toggle propio o cambio del SO
syncThemeBtn();

/* al cambiar de idioma: re-render dinámico (los estáticos los aplica setLang) */
document.addEventListener('langchange', () => {
  loadRecent();
  if (!state.repoPath) return;
  refreshAll().then(() => {
    if (state.selected) loadCommitDetail(state.selected);
  }).catch(err => toast(err.message, true));
  if (state.githubLoaded) {
    state.githubLoaded = false;
    if (!$('#tab-github').hidden) loadGithub();
  }
});

$('#btn-new-branch').addEventListener('click', () => {
  $('#branch-name').value = '';
  $('#branch-from').value = '';
  $('#dlg-branch').showModal();
});
$('#dlg-branch form').addEventListener('submit', async e => {
  if (e.submitter && e.submitter.value === 'ok') {
    const name = $('#branch-name').value.trim();
    const from = $('#branch-from').value.trim();
    if (!name) return;
    try {
      await api('/api/branch', { body: { path: state.repoPath, name, from: from || undefined } });
      await refreshAll();
      toast(t('toast.branchCreated', { name }));
    } catch (err) { toast(err.message, true); }
  }
});

$('#btn-token').addEventListener('click', () => $('#dlg-token').showModal());
$('#dlg-token form').addEventListener('submit', async e => {
  if (e.submitter && e.submitter.value === 'ok') {
    try {
      await api('/api/github/token', { body: { token: $('#token-input').value.trim() } });
      state.githubLoaded = false;
      toast(t('toast.tokenSaved'));
    } catch (err) { toast(err.message, true); }
  }
});

loadRecent();
