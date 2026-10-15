/* Staff page for the "Event of the week". Talks to /api/login and /api/event (Netlify functions). */
(function () {
  var $ = function (s) { return document.querySelector(s); };
  var KEY = 'nifty_admin_token';
  var state = { image: null, hasImage: false, current: null };

  var loginEl = $('#login'), editorEl = $('#editor'), logoutBtn = $('#logout');

  function token() { try { return sessionStorage.getItem(KEY) || ''; } catch (e) { return ''; } }
  function setToken(t) { try { t ? sessionStorage.setItem(KEY, t) : sessionStorage.removeItem(KEY); } catch (e) {} }
  function msg(el, text, kind) {
    el.textContent = text || '';
    el.hidden = !text;
    el.className = 'a-msg' + (kind ? ' ' + kind : '');
  }
  function showLogin(note) {
    editorEl.hidden = true; loginEl.hidden = false; logoutBtn.hidden = true;
    msg($('#loginMsg'), note || '', note ? 'err' : '');
    $('#pw').focus();
  }
  function showEditor() {
    loginEl.hidden = true; editorEl.hidden = false; logoutBtn.hidden = false;
    load();
  }
  function api(method, body) {
    return fetch('/api/event', {
      method: method,
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token() },
      body: body ? JSON.stringify(body) : undefined
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (data) {
        if (r.status === 401) { setToken(''); showLogin('Your session ended. Please log in again.'); throw new Error('auth'); }
        if (!r.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
        return data;
      });
    });
  }

  // ---- login ----
  $('#loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var pw = $('#pw').value, btn = $('#loginBtn');
    if (!pw) { msg($('#loginMsg'), 'Please enter the password.', 'err'); return; }
    btn.disabled = true; btn.textContent = 'Checking…';
    fetch('/api/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: pw }) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) {
        if (!res.ok) throw new Error(res.d.error || 'Could not log in.');
        setToken(res.d.token); $('#pw').value = ''; msg($('#loginMsg'), '');
        showEditor();
      })
      .catch(function (err) { msg($('#loginMsg'), err.message === 'Failed to fetch' ? 'Cannot reach the server. Open this page on the live website.' : err.message, 'err'); })
      .then(function () { btn.disabled = false; btn.textContent = 'Log in'; });
  });
  logoutBtn.addEventListener('click', function () { setToken(''); showLogin(''); });

  // ---- load what is live ----
  function load() {
    fetch('/api/event').then(function (r) { return r.json(); }).then(function (d) {
      var ev = d && d.event; state.current = ev; state.image = null; state.hasImage = !!(ev && ev.imageVersion);
      $('#title').value = (ev && ev.title) || ''; $('#date').value = (ev && ev.date) || '';
      $('#time').value = (ev && ev.time) || ''; $('#desc').value = (ev && ev.description) || '';
      var drop = $('#drop'), old = drop.querySelector('img'); if (old) old.remove();
      if (state.hasImage) { var im = document.createElement('img'); im.src = '/api/event?image=1&v=' + ev.imageVersion; im.alt = 'Current poster'; drop.prepend(im); drop.classList.add('has'); }
      else drop.classList.remove('has');
      var today = NiftyEvent.todayNairobi(), st = $('#liveStatus');
      if (!ev) st.textContent = 'No poster is up. The website is showing the usual Sundown Sessions section. Upload this week\'s poster below.';
      else if (ev.date && ev.date < today) st.textContent = 'The poster for ' + ev.date + ' has finished, so the website is back to the usual Sundown Sessions section. Upload this week\'s poster below.';
      else st.textContent = 'Live on the website now' + (ev.title ? ': ' + ev.title : '') + '. Upload a new poster to replace it.';
      preview();
    }).catch(function () { $('#liveStatus').textContent = 'Could not load the current event.'; });
  }

  // ---- image: choose, resize, preview ----
  function resize(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var max = 1600, s = Math.min(1, max / Math.max(img.width, img.height));
        var c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        var ctx = c.getContext('2d'); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width, c.height);
        var q = 0.88, out = c.toDataURL('image/jpeg', q);
        while (out.length > 3.6e6 && q > 0.5) { q -= 0.1; out = c.toDataURL('image/jpeg', q); }
        URL.revokeObjectURL(url); resolve(out);
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('That file could not be read as an image.')); };
      img.src = url;
    });
  }
  function takeFile(file) {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) { msg($('#imgMsg'), 'Please choose a JPEG, PNG or WebP image.', 'err'); return; }
    msg($('#imgMsg'), 'Preparing poster…');
    resize(file).then(function (data) {
      state.image = data;
      var drop = $('#drop'), old = drop.querySelector('img'); if (old) old.remove();
      var im = document.createElement('img'); im.src = data; im.alt = 'New poster'; drop.prepend(im); drop.classList.add('has');
      msg($('#imgMsg'), 'Poster ready. Press "Publish to website" to put it live.', 'ok');
      preview();
    }).catch(function (err) { msg($('#imgMsg'), err.message, 'err'); });
  }
  $('#file').addEventListener('change', function (e) { takeFile(e.target.files[0]); });
  var drop = $('#drop');
  ['dragenter', 'dragover'].forEach(function (n) { drop.addEventListener(n, function (e) { e.preventDefault(); drop.classList.add('over'); }); });
  ['dragleave', 'drop'].forEach(function (n) { drop.addEventListener(n, function (e) { e.preventDefault(); drop.classList.remove('over'); }); });
  drop.addEventListener('drop', function (e) { takeFile(e.dataTransfer.files[0]); });

  // ---- preview uses the same renderer as the public site ----
  function preview() {
    var root = $('#preview'), has = state.image || state.hasImage;
    var ev = (has || $('#title').value.trim()) ? {
      title: $('#title').value.trim(), date: $('#date').value, time: $('#time').value.trim(),
      description: $('#desc').value.trim(), imageVersion: has ? 1 : null
    } : null;
    NiftyEvent.render(root, ev);
    var img = root.querySelector('[data-tw="img"]');
    if (state.image) img.src = state.image;
    else if (state.hasImage && state.current) img.src = '/api/event?image=1&v=' + state.current.imageVersion;
  }
  ['title', 'date', 'time', 'desc'].forEach(function (id) { $('#' + id).addEventListener('input', preview); });

  // ---- publish / take down ----
  $('#eventForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var m = $('#saveMsg'), btn = $('#saveBtn');
    if (!state.image && !state.hasImage) { msg(m, 'Please choose this week\'s poster first.', 'err'); return; }
    btn.disabled = true; btn.textContent = 'Publishing…'; msg(m, '');
    api('POST', {
      title: $('#title').value, date: $('#date').value, time: $('#time').value,
      description: $('#desc').value, image: state.image || undefined
    }).then(function () {
      msg(m, 'Published. The new poster is live on the website now.', 'ok'); msg($('#imgMsg'), '');
      load();
    }).catch(function (err) { if (err.message !== 'auth') msg(m, err.message, 'err'); })
      .then(function () { btn.disabled = false; btn.textContent = 'Publish to website'; });
  });
  $('#clearBtn').addEventListener('click', function () {
    if (!state.hasImage && !state.current) { msg($('#saveMsg'), 'There is no poster up right now.'); return; }
    if (!confirm('Take the poster down? The website will go back to the usual Sundown Sessions section.')) return;
    api('DELETE').then(function () { msg($('#saveMsg'), 'Poster taken down. The website is back to its usual section.', 'ok'); load(); })
      .catch(function (err) { if (err.message !== 'auth') msg($('#saveMsg'), err.message, 'err'); });
  });

  if (token()) showEditor(); else showLogin('');
})();
