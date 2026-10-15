/* Shared by the public "Event of the week" section and the staff preview.
   Everything is written with textContent, never innerHTML, so staff text can't inject markup. */
(function (w) {
  var PHONE = '254115435374';

  function todayNairobi() {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Nairobi' }).format(new Date()); // YYYY-MM-DD
  }
  function asDate(iso) { return new Date(iso + 'T12:00:00Z'); }
  function longDate(iso) {
    return asDate(iso).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  }
  function isWeekend(iso) { var d = asDate(iso).getUTCDay(); return d === 0 || d === 6; }

  // "Sundown Sessions" -> Sundown <em>Sessions</em> (last word in gold italics)
  function setTitle(el, text) {
    el.textContent = '';
    var words = String(text).trim().split(/\s+/);
    if (words.length < 2) { el.textContent = text; return; }
    var last = words.pop();
    el.appendChild(document.createTextNode(words.join(' ') + ' '));
    var em = document.createElement('em');
    em.textContent = last;
    el.appendChild(em);
  }

  // data-tw="title|when|desc|details|kicker|dow|sub|img|book|wa" hooks inside root
  function q(root, k) { return root.querySelector('[data-tw="' + k + '"]'); }

  function render(root, ev) {
    var fallback = root.getAttribute('data-fallback') ? JSON.parse(root.getAttribute('data-fallback')) : null;
    var live = ev && (ev.imageVersion || ev.title);
    var d = live ? ev : fallback;
    if (!d) return;

    setTitle(q(root, 'title'), d.title || 'This week at Nifty');
    q(root, 'kicker').textContent = live ? 'Event of the week' : (d.kicker || 'Every week');
    var when = live
      ? [d.date ? longDate(d.date) : '', d.time || ''].filter(Boolean).join(' · ')
      : d.when;
    q(root, 'when').textContent = when;
    q(root, 'when').hidden = !when;
    q(root, 'desc').textContent = d.description || '';
    q(root, 'desc').hidden = !d.description;

    var details = d.details || '';
    var note = live && d.date && isWeekend(d.date) ? 'Weekend booking: KSh 1,000 per person voucher, redeemable on your bill, non-refundable.' : (live ? '' : d.note || '');
    var dEl = q(root, 'details');
    dEl.textContent = [details, note].filter(Boolean).join('  ·  ');
    dEl.hidden = !dEl.textContent;

    // media: photo if staff added one, otherwise a gold date block
    var img = q(root, 'img'), block = q(root, 'block');
    if (live && ev.imageVersion) {
      img.src = '/api/event?image=1&v=' + ev.imageVersion;
      img.alt = (ev.title || 'Event of the week') + ' poster';
      img.hidden = false; block.hidden = true;
    } else if (!live && d.image) {
      img.src = d.image; img.alt = d.title; img.hidden = false; block.hidden = true;
    } else {
      img.hidden = true; block.hidden = false;
      if (live && d.date) {
        var dt = asDate(d.date);
        q(root, 'dow').textContent = dt.toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' });
        q(root, 'sub').textContent = dt.getUTCDate() + ' ' + dt.toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' });
      } else {
        q(root, 'dow').textContent = d.dow || '';
        q(root, 'sub').textContent = d.sub || '';
      }
    }

    var wa = q(root, 'wa');
    if (wa) {
      var msg = 'Hi Nifty! I would like to book a table' + (d.title ? ' for ' + d.title : ' for the event this week') + (live && d.date ? ' on ' + longDate(d.date) : '') + '.';
      wa.href = 'https://wa.me/' + PHONE + '?text=' + encodeURIComponent(msg);
    }
    var book = q(root, 'book');
    if (book) { book.dataset.date = live && d.date ? d.date : ''; }
    root.setAttribute('data-state', live ? 'live' : 'default');
  }

  w.NiftyEvent = { render: render, todayNairobi: todayNairobi };
})(window);
