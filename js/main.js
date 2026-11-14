(function () {
  'use strict';

  var $ = function (s, ctx) { return (ctx || document).querySelector(s); };
  var $$ = function (s, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(s)); };

  // Año del copyright
  var year = $('#year');
  if (year) { year.textContent = new Date().getFullYear(); }

  // Header: sombra al hacer scroll
  var header = $('.site-header');
  function onScroll() { if (header) header.classList.toggle('scrolled', window.scrollY > 8); }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // Menú móvil
  var toggle = $('.nav-toggle');
  var links = $('#nav-links');
  function closeMenu() {
    if (!links) return;
    links.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  }
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      var open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    links.addEventListener('click', function (e) { if (e.target.tagName === 'A') closeMenu(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });
  }

  // Selector de servicios (chips del hero y categorías) -> rellena el formulario
  var select = $('#servicio');
  function pickService(value, btn) {
    if (select) { select.value = value; select.removeAttribute('aria-invalid'); }
    $$('.cat').forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
    var card = $('#presupuesto');
    if (card) { card.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    var cp = $('#cp');
    if (cp) { setTimeout(function () { cp.focus({ preventScroll: true }); }, 450); }
  }
  $$('.cat, .chip').forEach(function (btn) {
    btn.addEventListener('click', function () { pickService(btn.dataset.value, btn.classList.contains('cat') ? btn : null); });
  });

  // Pestañas "Cómo funciona" (accesibles con teclado)
  var tabs = $$('.tab');
  function selectTab(tab) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      var panel = document.getElementById(t.getAttribute('aria-controls'));
      if (panel) panel.hidden = !on;
    });
    tab.focus();
  }
  tabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () { selectTab(tab); });
    tab.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); selectTab(tabs[(i + 1) % tabs.length]); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); selectTab(tabs[(i - 1 + tabs.length) % tabs.length]); }
    });
  });

  // Envío de formularios a la función de Supabase (reparto automático a profesionales).
  // Sin JavaScript, el formulario cae al envío estándar de Netlify Forms (atributo data-netlify).
  var API = 'https://qnqmjsvrclxjfvjigesp.supabase.co/functions/v1/solicitudes';
  function sendForm(formEl, name) {
    var data = { form: name };
    new FormData(formEl).forEach(function (v, k) { if (k !== 'form-name') data[k] = v; });
    return fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  }

  // Formulario de presupuestos
  var form = $('#buscador');
  if (form) {
    var msg = $('#form-msg');
    var btn = $('button[type="submit"]', form);
    var setMsg = function (text, type) { msg.textContent = text; msg.className = 'form-msg ' + (type || ''); };
    var invalid = function (el, text) { el.setAttribute('aria-invalid', 'true'); el.focus(); setMsg(text, 'err'); };

    $$('input, select', form).forEach(function (el) {
      el.addEventListener('input', function () { el.removeAttribute('aria-invalid'); });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = form.elements;
      $$('[aria-invalid]', form).forEach(function (el) { el.removeAttribute('aria-invalid'); });

      if (!f.servicio.value) return invalid(f.servicio, 'Elige el servicio que necesitas.');
      if (!/^\d{5}$/.test(f.cp.value.trim())) return invalid(f.cp, 'Introduce un código postal válido de 5 dígitos.');
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.value.trim())) return invalid(f.email, 'Introduce un email válido.');
      var tel = f.telefono.value.replace(/[ .-]/g, '').replace(/^([+]34|0034)/, '');
      if (!/^[67][0-9]{8}$/.test(tel)) return invalid(f.telefono, 'Introduce un teléfono móvil español válido (9 dígitos).');
      if (!f.privacidad.checked) return invalid(f.privacidad, 'Debes aceptar la política de privacidad.');

      btn.disabled = true;
      setMsg('Enviando…');
      sendForm(form, 'presupuestos').then(function (res) {
        if (res.status === 429) { throw new Error('limit'); }
        if (!res.ok) throw new Error('HTTP ' + res.status);
        form.reset();
        $$('.cat').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
        setMsg('¡Solicitud enviada! Los profesionales de tu zona te escribirán directamente a tu email.', 'ok');
      }).catch(function (err) {
        setMsg(err && err.message === 'limit'
          ? 'Has enviado varias solicitudes hoy. Inténtalo de nuevo mañana.'
          : 'No hemos podido enviar la solicitud. Inténtalo de nuevo en unos minutos.', 'err');
      }).then(function () { btn.disabled = false; });
    });
  }

  // Formulario de registro de profesionales (Netlify Forms vía fetch)
  var reg = $("#registro");
  if (reg) {
    var rmsg = $("#form-msg");
    var rbtn = $("button[type=\"submit\"]", reg);
    var rset = function (t, c) { rmsg.textContent = t; rmsg.className = "form-msg " + (c || ""); };
    var rbad = function (el, t) { el.setAttribute("aria-invalid", "true"); el.focus(); rset(t, "err"); };
    $$("input, select", reg).forEach(function (el) { el.addEventListener("input", function () { el.removeAttribute("aria-invalid"); }); });

    reg.addEventListener("submit", function (e) {
      e.preventDefault();
      var f = reg.elements;
      $$("[aria-invalid]", reg).forEach(function (el) { el.removeAttribute("aria-invalid"); });
      var tel = f.telefono.value.replace(/[ .-]/g, "").replace(/^([+]34|0034)/, "");

      if (f.nombre.value.trim().length < 2) return rbad(f.nombre, "Indica tu nombre o nombre comercial.");
      if (!f.especialidad.value) return rbad(f.especialidad, "Selecciona tu especialidad o sector.");
      if (!/^[67][0-9]{8}$/.test(tel)) return rbad(f.telefono, "Introduce un teléfono móvil español válido (9 dígitos).");
      if (!/^[^@ ]+@[^@ ]+[.][^@ ]+$/.test(f.email.value.trim())) return rbad(f.email, "Introduce un email válido.");
      if (!f.provincia.value) return rbad(f.provincia, "Selecciona la provincia donde trabajas.");
      if (!f.aceptacion.checked) return rbad(f.aceptacion, "Debes aceptar la política de privacidad y los términos.");

      rbtn.disabled = true;
      rset("Enviando…");
      sendForm(reg, "registro-profesionales").then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        window.location.href = "/gracias-profesionales.html";
      }).catch(function () {
        rset("No hemos podido enviar tu registro. Inténtalo de nuevo en unos minutos.", "err");
        rbtn.disabled = false;
      });
    });
  }

  // Animaciones de entrada al hacer scroll
  var reveal = $$('[data-reveal]');
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    reveal.forEach(function (el) { io.observe(el); });
  } else {
    reveal.forEach(function (el) { el.classList.add('in'); });
  }

  // Banner de cookies
  var banner = $('#cookie-banner');
  function getConsent() { try { return localStorage.getItem('em_cookies'); } catch (e) { return null; } }
  function setConsent(v) { try { localStorage.setItem('em_cookies', v); } catch (e) {} if (banner) banner.classList.remove('show'); }
  if (banner) {
    if (!getConsent()) { banner.classList.add('show'); }
    $('#cookie-accept').addEventListener('click', function () { setConsent('all'); });
    $('#cookie-reject').addEventListener('click', function () { setConsent('necessary'); });
  }
  var reset = $('#cookie-reset');
  if (reset) {
    reset.addEventListener('click', function () {
      try { localStorage.removeItem('em_cookies'); } catch (e) {}
      if (banner) banner.classList.add('show');
    });
  }
})();
