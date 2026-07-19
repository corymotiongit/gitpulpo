'use strict';
/* GitPulpo — i18n ES/EN. Se carga ANTES de graph.js y app.js. */

const I18N = {
  es: {
    'app.title': 'GitPulpo — visualizador git',
    'lang.switch': 'Switch to English',

    'topbar.repoPlaceholder': 'C:\\ruta\\a\\tu\\repo',
    'topbar.open': 'Abrir',
    'topbar.recent': 'recientes…',
    'topbar.recentTitle': 'Repos recientes',
    'topbar.fetch': '⇣ Fetch',
    'topbar.pull': '⤓ Pull',
    'topbar.push': '⤒ Push',
    'topbar.refreshTitle': 'Recargar todo',
    'topbar.tokenTitle': 'Token de GitHub',
    'topbar.themeDark': 'Cambiar a tema oscuro',
    'topbar.themeLight': 'Cambiar a tema claro',

    'sidebar.local': 'Ramas locales',
    'sidebar.remote': 'Remotas',
    'sidebar.tags': 'Tags',
    'sidebar.newBranchTitle': 'Nueva rama',
    'sidebar.checkoutHint': 'doble click → checkout',
    'sidebar.noBranches': 'sin ramas',
    'sidebar.noRemotes': 'sin remotas',
    'sidebar.noTags': 'sin tags',

    'tabs.commit': 'Commit',
    'tabs.changes': 'Cambios',
    'tabs.github': 'GitHub',

    'welcome.intro': 'Abre un repo local para ver su grafo de commits, ramas, diffs, staging y datos de GitHub.',
    'welcome.hint': 'Escribe la ruta arriba o elige uno reciente.',

    'detail.select': 'Selecciona un commit del grafo',
    'detail.sha': 'sha',
    'detail.author': 'autor',
    'detail.date': 'fecha',
    'detail.parents': 'padres',
    'detail.total': 'total',
    'detail.inFiles': 'en {n} archivos',
    'detail.copySha': 'click para copiar',

    'common.loading': 'cargando…',
    'common.loadingDiff': 'cargando diff…',
    'common.cancel': 'Cancelar',
    'common.save': 'Guardar',

    'diff.empty': 'sin diff (¿binario o merge?)',

    'wip.uncommitted': '// cambios sin commitear ({n} archivos)',
    'wip.unstaged': 'Sin stage',
    'wip.staged': 'En stage',
    'wip.stageAllTitle': 'Stage todo',
    'wip.unstageAllTitle': 'Unstage todo',
    'wip.stageFile': 'Agregar a staging',
    'wip.unstageFile': 'Quitar de staging',
    'wip.discardFile': 'Descartar cambios',
    'wip.confirmDiscard': '¿Descartar cambios en {file}? No se puede deshacer.',
    'wip.commitPlaceholder': 'mensaje de commit…',
    'wip.commit': 'Commit',
    'wip.clean': 'árbol de trabajo limpio ✨',

    'toast.repoOpened': 'Repo abierto: {name}',
    'toast.shaCopied': 'SHA copiado',
    'toast.staged': 'Archivo en stage',
    'toast.unstaged': 'Archivo fuera de stage',
    'toast.discarded': 'Cambios descartados',
    'toast.emptyCommitMsg': 'Escribe un mensaje de commit',
    'toast.commitCreated': 'Commit creado 🐙',
    'toast.refreshed': 'actualizado',
    'toast.checkout': 'checkout → {ref}',
    'toast.actionOk': '{action} ok',
    'toast.branchCreated': 'rama {name} creada',
    'toast.tokenSaved': 'token guardado',

    'gh.loading': 'consultando GitHub…',
    'gh.open': 'Abiertos',
    'gh.closed': 'Cerrados',
    'gh.all': 'Todos',
    'gh.pulls': 'Pull requests',
    'gh.issues': 'Issues',
    'gh.noPulls': 'sin pull requests',
    'gh.noIssues': 'sin issues',
    'gh.rate': 'rate limit restante: {n}',
    'gh.rateHint': 'Probablemente rate limit. Configura un token con el botón 🔑.',
    'gh.noOrigin': 'Este repo no tiene remoto de GitHub.',

    'dlgBranch.title': 'Nueva rama',
    'dlgBranch.name': 'Nombre',
    'dlgBranch.from': 'Desde',
    'dlgBranch.fromPlaceholder': '(HEAD actual)',
    'dlgBranch.create': 'Crear y checkout',

    'dlgToken.title': 'Token de GitHub',
    'dlgToken.note1': 'Opcional. Sin token la API pública permite 60 peticiones/hora.',
    'dlgToken.note2': 'Se guarda en',
    'dlgToken.label': 'Token',
  },

  en: {
    'app.title': 'GitPulpo — git visualizer',
    'lang.switch': 'Cambiar a español',

    'topbar.repoPlaceholder': 'C:\\path\\to\\your\\repo',
    'topbar.open': 'Open',
    'topbar.recent': 'recent…',
    'topbar.recentTitle': 'Recent repos',
    'topbar.fetch': '⇣ Fetch',
    'topbar.pull': '⤓ Pull',
    'topbar.push': '⤒ Push',
    'topbar.refreshTitle': 'Reload everything',
    'topbar.tokenTitle': 'GitHub token',
    'topbar.themeDark': 'Switch to dark theme',
    'topbar.themeLight': 'Switch to light theme',

    'sidebar.local': 'Local branches',
    'sidebar.remote': 'Remotes',
    'sidebar.tags': 'Tags',
    'sidebar.newBranchTitle': 'New branch',
    'sidebar.checkoutHint': 'double-click → checkout',
    'sidebar.noBranches': 'no branches',
    'sidebar.noRemotes': 'no remotes',
    'sidebar.noTags': 'no tags',

    'tabs.commit': 'Commit',
    'tabs.changes': 'Changes',
    'tabs.github': 'GitHub',

    'welcome.intro': 'Open a local repo to see its commit graph, branches, diffs, staging area and GitHub data.',
    'welcome.hint': 'Type the path above or pick a recent one.',

    'detail.select': 'Select a commit from the graph',
    'detail.sha': 'sha',
    'detail.author': 'author',
    'detail.date': 'date',
    'detail.parents': 'parents',
    'detail.total': 'total',
    'detail.inFiles': 'in {n} files',
    'detail.copySha': 'click to copy',

    'common.loading': 'loading…',
    'common.loadingDiff': 'loading diff…',
    'common.cancel': 'Cancel',
    'common.save': 'Save',

    'diff.empty': 'no diff (binary file or merge?)',

    'wip.uncommitted': '// uncommitted changes ({n} files)',
    'wip.unstaged': 'Unstaged',
    'wip.staged': 'Staged',
    'wip.stageAllTitle': 'Stage all',
    'wip.unstageAllTitle': 'Unstage all',
    'wip.stageFile': 'Stage file',
    'wip.unstageFile': 'Unstage file',
    'wip.discardFile': 'Discard changes',
    'wip.confirmDiscard': 'Discard changes in {file}? This cannot be undone.',
    'wip.commitPlaceholder': 'commit message…',
    'wip.commit': 'Commit',
    'wip.clean': 'working tree clean ✨',

    'toast.repoOpened': 'Repo opened: {name}',
    'toast.shaCopied': 'SHA copied',
    'toast.staged': 'File staged',
    'toast.unstaged': 'File unstaged',
    'toast.discarded': 'Changes discarded',
    'toast.emptyCommitMsg': 'Write a commit message',
    'toast.commitCreated': 'Commit created 🐙',
    'toast.refreshed': 'refreshed',
    'toast.checkout': 'checkout → {ref}',
    'toast.actionOk': '{action} ok',
    'toast.branchCreated': 'branch {name} created',
    'toast.tokenSaved': 'token saved',

    'gh.loading': 'querying GitHub…',
    'gh.open': 'Open',
    'gh.closed': 'Closed',
    'gh.all': 'All',
    'gh.pulls': 'Pull requests',
    'gh.issues': 'Issues',
    'gh.noPulls': 'no pull requests',
    'gh.noIssues': 'no issues',
    'gh.rate': 'rate limit remaining: {n}',
    'gh.rateHint': 'Probably rate-limited. Set a token with the 🔑 button.',
    'gh.noOrigin': 'This repo has no GitHub remote.',

    'dlgBranch.title': 'New branch',
    'dlgBranch.name': 'Name',
    'dlgBranch.from': 'From',
    'dlgBranch.fromPlaceholder': '(current HEAD)',
    'dlgBranch.create': 'Create & checkout',

    'dlgToken.title': 'GitHub token',
    'dlgToken.note1': 'Optional. Without a token the public API allows 60 requests/hour.',
    'dlgToken.note2': 'Stored in',
    'dlgToken.label': 'Token',
  },
};

let _lang = (() => {
  try {
    const saved = localStorage.getItem('gitpulpo-lang');
    if (saved === 'es' || saved === 'en') return saved;
  } catch (e) { /* localStorage no disponible */ }
  return (navigator.language || 'en').toLowerCase().startsWith('es') ? 'es' : 'en';
})();

function getLang() { return _lang; }

function t(key, params) {
  const dict = I18N[_lang] || {};
  let s = dict[key];
  if (s == null && I18N.en) s = I18N.en[key];
  if (s == null) s = key; // fallback: la propia clave
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      s = s.split('{' + k + '}').join(String(v));
    }
  }
  return s;
}

/* Aplica traducciones a los nodos estáticos marcados con data-i18n / data-i18n-placeholder / data-i18n-title. */
function applyI18nStatic() {
  document.documentElement.lang = _lang;
  document.title = t('app.title');
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.setAttribute('placeholder', t(el.dataset.i18nPlaceholder));
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.setAttribute('title', t(el.dataset.i18nTitle));
  });
  const langBtn = document.getElementById('btn-lang');
  if (langBtn) {
    langBtn.textContent = _lang === 'es' ? 'EN' : 'ES';
    langBtn.title = t('lang.switch');
    langBtn.setAttribute('aria-label', t('lang.switch'));
  }
}

function setLang(lang) {
  if (lang !== 'es' && lang !== 'en') return;
  _lang = lang;
  try { localStorage.setItem('gitpulpo-lang', lang); } catch (e) { /* sin persistencia */ }
  applyI18nStatic();
  document.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
}

/* Los <script> van al final del <body>: el DOM estático ya existe. */
applyI18nStatic();
