'use strict';
/* GitPulpo — tema light/dark. Se carga en <head> ANTES de style.css
   (bloqueante mínimo: fija data-theme en <html> y evita flash de tema). */
(function () {
  var KEY = 'gitpulpo-theme';
  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function stored() {
    try {
      var v = localStorage.getItem(KEY);
      return (v === 'light' || v === 'dark') ? v : null;
    } catch (e) { return null; /* localStorage no disponible */ }
  }

  function apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    document.dispatchEvent(new CustomEvent('themechange', { detail: { theme: theme } }));
  }

  window.getTheme = function () {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  };

  window.setTheme = function (theme) {
    if (theme !== 'light' && theme !== 'dark') return;
    try { localStorage.setItem(KEY, theme); } catch (e) { /* sin persistencia */ }
    apply(theme);
  };

  /* inicial: elección guardada, o preferencia del sistema */
  apply(stored() || (mq && mq.matches ? 'dark' : 'light'));

  /* si el usuario nunca eligió, seguir los cambios del sistema */
  if (mq) {
    var follow = function (e) {
      if (stored() === null) apply(e.matches ? 'dark' : 'light');
    };
    if (mq.addEventListener) mq.addEventListener('change', follow);
    else if (mq.addListener) mq.addListener(follow);
  }
})();
