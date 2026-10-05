const $ = (id) => document.getElementById(id);
const fmt = (n) => (n === null || n === undefined ? '–' : Number(n).toLocaleString('en-IN'));

function showStats(s) {
  if (!s) return;
  $('s1').textContent = fmt(s.chats_checked);
  $('s2').textContent = fmt(s.booking_opportunities);
  $('s3').textContent = s.chats_checked > 0 ? fmt(s.unapproved_pct) + '%' : '–';
}

function list(el, items, none) {
  el.innerHTML = '';
  const arr = items && items.length ? items : [none];
  arr.forEach((t) => { const li = document.createElement('li'); li.textContent = t; el.appendChild(li); });
}

function state(name) {
  $('empty').hidden = name !== 'empty';
  $('load').hidden = name !== 'load';
  $('res').hidden = name !== 'res';
}

function showError(msg) { const e = $('err'); e.textContent = msg; e.hidden = !msg; }

async function loadStats() {
  try { const r = await fetch('/api/check'); if (r.ok) showStats((await r.json()).stats); } catch (_) {}
}

document.querySelectorAll('.samples button').forEach((b) =>
  b.addEventListener('click', () => { $('msg').value = b.dataset.s; $('msg').focus(); }));

$('chk').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  showError('');
  const message = $('msg').value.trim();
  const rate_card = $('rate').value.trim();
  if (message.length < 3) return showError('Paste a customer message first.');
  if (rate_card.length < 10) return showError('Add at least one service and price to the rate card.');

  $('go').disabled = true; $('go').textContent = 'Reading…';
  state('load');
  try {
    const r = await fetch('/api/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, rate_card, discount_rule: $('disc').value, diary: $('diary').value })
    });
    const data = await r.json().catch(() => ({}));
    if (data.stats) showStats(data.stats);
    if (!r.ok) { state('empty'); return showError(data.error || 'Something went wrong. Please try again.'); }

    const o = data.result;
    if (o.status === 'refused') {
      state('empty');
      return showError('ChairBack only reads customer messages sent to a salon. ' + (o.refusal_reason || ''));
    }
    $('lang').textContent = o.language || '';
    $('opp').textContent = o.booking_opportunity === 'none' ? 'No booking chance' : o.booking_opportunity + ' booking chance';
    $('wants').textContent = o.customer_wants;
    list($('miss'), o.missing_info, 'Nothing');
    list($('own'), o.needs_owner_decision, 'Nothing, you can send the draft');
    $('draft').textContent = o.reply_draft || 'No draft. Decide this one yourself first.';
    $('next').textContent = o.next_action;
    $('guard').hidden = !data.guard; $('guard').textContent = data.guard || '';
    $('left').textContent = data.remaining + ' reads left today';
    state('res');
  } catch (e) {
    state('empty'); showError('Could not reach ChairBack. Check your connection and try again.');
  } finally {
    $('go').disabled = false; $('go').textContent = 'Help me reply';
  }
});

loadStats();
