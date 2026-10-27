/* Staff page for the "Event of the week". Talks to api/login and api/event (Netlify functions).
   Up to 3 events can be live at once (tabs "Event 1/2/3"); empty or finished ones simply don't show on the website. */
(function () {
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  var KEY = 'nifty_admin_token';
  var state = { slot: 1, events: {}, image: null, hasImage: false, current: null };

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
  function imgUrl(slot, version) { return NiftyEvent.api + '?image=1&slot=' + slot + '&v=' + version; }
  function api(method, body) {
    return fetch(NiftyEvent.api + '?slot=' + state.slot, {
      method: method,
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token(), 'x-nifty-token': token() },
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
    fetch(NiftyEvent.login, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: pw }) })
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

  // ---- what is live, per slot ----
  function slotStatus(slot) {
    var ev = state.events[slot], today = NiftyEvent.todayNairobi();
    if (!ev) return 'empty';
    if (ev.date && ev.date < today) return 'ended';
    return 'live';
  }
  function updateTabs() {
    $$('#slots .slot').forEach(function (b) {
      var s = +b.dataset.slot, st = slotStatus(s), ev = state.events[s];
      b.classList.toggle('on', s === state.slot);
      b.setAttribute('aria-selected', s === state.slot);
      b.setAttribute('data-st', st);
      b.querySelector('small').textContent = st === 'live' ? 'On the website' : st === 'ended' ? 'Finished' : 'Empty';
      b.title = ev && ev.title ? ev.title : '';
    });
  }
  function updateStatusLine() {
    var live = [1, 2, 3].filter(function (s) { return slotStatus(s) === 'live'; });
    var st = $('#liveStatus');
    if (!live.length) st.textContent = 'No event poster is live. The website is showing the usual Sundown Sessions section. Choose an event tab below and upload a poster.';
    else st.textContent = 'On the website now: ' + live.map(function (s) { var e = state.events[s]; return 'Event ' + s + (e.title ? ' (' + e.title + ')' : ''); }).join(', ') + '. Empty or finished events don\'t show.';
  }

  function isWeekend(iso) { if (!iso) return false; var d = new Date(iso + 'T12:00:00Z').getUTCDay(); return d === 0 || d === 6; }
  function fillForm() {
    var ev = state.events[state.slot] || null;
    state.current = ev; state.image = null; state.hasImage = !!(ev && ev.imageVersion);
    $('#title').value = (ev && ev.title) || ''; $('#date').value = (ev && ev.date) || '';
    $('#time').value = (ev && ev.time) || ''; $('#desc').value = (ev && ev.description) || '';
    // older events saved before the tickbox existed used the automatic Saturday/Sunday rule
    $('#weekendNote').checked = ev ? (ev.weekendNote === undefined ? isWeekend(ev.date) : !!ev.weekendNote) : false;
    $('#file').value = '';
    var drop = $('#drop'), old = drop.querySelector('img'); if (old) old.remove();
    if (state.hasImage) { var im = document.createElement('img'); im.src = imgUrl(state.slot, ev.imageVersion); im.alt = 'Current poster'; drop.prepend(im); drop.classList.add('has'); }
    else drop.classList.remove('has');
    msg($('#imgMsg'), ''); msg($('#saveMsg'), '');
    $('#slotName').textContent = 'Event ' + state.slot;
    $('#clearBtn').disabled = !ev; // nothing to remove when this event is empty
    updateTabs(); updateStatusLine(); preview();
  }

  function load() {
    fetch(NiftyEvent.api).then(function (r) { return r.json(); }).then(function (d) {
      var list = (d && (d.events || (d.event ? [Object.assign({ slot: 1 }, d.event)] : []))) || [];
      state.events = {};
      list.forEach(function (e) { state.events[e.slot || 1] = e; });
      fillForm();
    }).catch(function () { $('#liveStatus').textContent = 'Could not load the current events.'; });
  }

  $$('#slots .slot').forEach(function (b) {
    b.addEventListener('click', function () { state.slot = +b.dataset.slot; fillForm(); });
  });

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
      slot: state.slot, title: $('#title').value.trim(), date: $('#date').value, time: $('#time').value.trim(),
      description: $('#desc').value.trim(), weekendNote: $('#weekendNote').checked, imageVersion: has ? 1 : null
    } : null;
    NiftyEvent.render(root, ev);
    $('#previewEmpty').hidden = !!ev; root.parentElement.hidden = !ev;
    var img = root.querySelector('[data-tw="img"]');
    if (state.image) img.src = state.image;
    else if (state.hasImage && state.current) img.src = imgUrl(state.slot, state.current.imageVersion);
  }
  ['title', 'date', 'time', 'desc', 'weekendNote'].forEach(function (id) { $('#' + id).addEventListener('input', preview); });

  // ---- publish / take down ----
  $('#eventForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var m = $('#saveMsg'), btn = $('#saveBtn');
    if (!state.image && !state.hasImage) { msg(m, 'Please choose this event\'s poster first.', 'err'); return; }
    btn.disabled = true; btn.textContent = 'Publishing…'; msg(m, '');
    api('POST', {
      title: $('#title').value, date: $('#date').value, time: $('#time').value,
      description: $('#desc').value, weekendNote: $('#weekendNote').checked, image: state.image || undefined
    }).then(function () {
      load();
      setTimeout(function () { msg($('#saveMsg'), 'Published. Event ' + state.slot + ' is live on the website now.', 'ok'); }, 400);
    }).catch(function (err) { if (err.message !== 'auth') msg(m, err.message, 'err'); })
      .then(function () { btn.disabled = false; btn.textContent = 'Publish to website'; });
  });
  $('#clearBtn').addEventListener('click', function () {
    if (!state.hasImage && !state.current) { msg($('#saveMsg'), 'Event ' + state.slot + ' is already empty.'); return; }
    if (!confirm('Remove the poster for Event ' + state.slot + ' from the website? The other events stay as they are.')) return;
    api('DELETE').then(function () {
      load();
      setTimeout(function () { msg($('#saveMsg'), 'Event ' + state.slot + ' removed from the website.', 'ok'); }, 400);
    }).catch(function (err) { if (err.message !== 'auth') msg($('#saveMsg'), err.message, 'err'); });
  });

  if (token()) showEditor(); else showLogin('');
})();
