(function () {
  'use strict';

  // Menú móvil
  var toggle = document.querySelector('.nav-toggle');
  var links = document.getElementById('nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      var open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    links.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') { links.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); }
    });
  }

  // Selector de categorías -> rellena el buscador
  var select = document.getElementById('servicio');
  document.querySelectorAll('.cat').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.cat').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
      btn.setAttribute('aria-pressed', 'true');
      if (select) { select.value = btn.dataset.value; }
      var form = document.getElementById('buscador');
      if (form) { form.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    });
  });

  // Pestañas "Cómo funciona"
  document.querySelectorAll('.tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      document.querySelectorAll('.tab').forEach(function (t) { t.setAttribute('aria-selected', String(t === tab)); });
      document.querySelectorAll('.steps').forEach(function (s) { s.hidden = s.id !== tab.getAttribute('aria-controls'); });
    });
  });

  // Formulario de búsqueda (sin backend todavía: valida y confirma)
  var form = document.getElementById('buscador');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var msg = document.getElementById('form-msg');
      var cp = form.elements['cp'].value.trim();
      var serv = form.elements['servicio'].value;
      var email = form.elements['email'].value.trim();
      msg.className = 'form-msg err';
      if (!serv) { msg.textContent = 'Elige el servicio que necesitas.'; return; }
      if (!/^\d{5}$/.test(cp)) { msg.textContent = 'Introduce un código postal válido de 5 dígitos.'; return; }
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { msg.textContent = 'Introduce un email válido.'; return; }
      // TODO: conectar con el backend / servicio de formularios.
      msg.className = 'form-msg ok';
      msg.textContent = '¡Recibido! Te avisaremos en cuanto tengamos profesionales disponibles en tu zona.';
      form.reset();
    });
  }

  // Banner de cookies
  var banner = document.getElementById('cookie-banner');
  function getConsent() { try { return localStorage.getItem('em_cookies'); } catch (e) { return null; } }
  function setConsent(v) { try { localStorage.setItem('em_cookies', v); } catch (e) {} if (banner) banner.classList.remove('show'); }
  if (banner) {
    if (!getConsent()) { banner.classList.add('show'); }
    document.getElementById('cookie-accept').addEventListener('click', function () { setConsent('all'); });
    document.getElementById('cookie-reject').addEventListener('click', function () { setConsent('necessary'); });
  }
  var reset = document.getElementById('cookie-reset');
  if (reset) {
    reset.addEventListener('click', function () {
      try { localStorage.removeItem('em_cookies'); } catch (e) {}
      if (banner) banner.classList.add('show');
    });
  }
})();
