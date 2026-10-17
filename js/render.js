// Renders the regulator panel, device cards (phones), device table (wider screens),
// evidence panels, head-to-head tables and standards.
import { h, link } from './dom.js';
import { t, locale } from './i18n.js';
import { sponsorClass } from './data.js';

const nf = () => new Intl.NumberFormat(locale(), { minimumFractionDigits: 1, maximumFractionDigits: 2 });
const fmt = (v) => (v === null || v === undefined) ? null : nf().format(v);
const fmtInt = (v) => (v === null || v === undefined) ? null : new Intl.NumberFormat(locale(), { maximumFractionDigits: 1 }).format(v);

function badge(cls, text, title) {
  return h('span', { class: `badge badge-${cls}`, title: title || text }, text);
}

function sponsorBadge(study) {
  const map = { manufacturer: 'badge.manufacturer', independent: 'badge.independent', competitor: 'badge.competitor', mixed: 'badge.mixed', unknown: 'badge.unknown' };
  return badge(sponsorClass(study.sponsor), t(map[study.sponsor] || 'badge.unknown'), study.sponsor_note || undefined);
}

function compactSponsor(study) {
  const full = sponsorBadge(study);
  const letter = { manufacturer: 'M', independent: 'I', competitor: 'C', mixed: 'C', unknown: '?' }[study.sponsor] || '?';
  full.textContent = letter;
  full.setAttribute('aria-label', full.title);
  return full;
}

function statusFor(device, jur) {
  if (jur === 'INT') return null;
  const a = device.approvals.find(x => x.jurisdiction === jur);
  if (!a) return { cls: 'n', text: t('status.none'), rec: null };
  return a.verified
    ? { cls: 'v', text: t('status.verified'), rec: a }
    : { cls: 'u', text: t('status.unverified'), rec: a };
}

function approvalDetail(rec) {
  if (!rec) return null;
  const bits = [rec.route, rec.reference, rec.date].filter(Boolean).join(' · ');
  const parts = [bits];
  if (rec.subsidy) parts.push(`${t('panel.subsidy')}: ${rec.subsidy}`);
  const el = h('span', { class: 'ev-sub' }, parts.filter(Boolean).join(' — '));
  if (rec.note) el.append('. ', rec.note);
  const url = rec.reference_url || rec.source_url;
  if (url) el.append(' ', link(url, t('col.source')));
  return el;
}

/* ---------- Regulator panel ---------- */
export function renderPanel(j) {
  const root = document.getElementById('reg-panel');
  const row = (label, text, url) => h('div', {},
    h('dt', {}, label),
    h('dd', {}, url ? link(url, text) : text));
  const dl = h('dl', {},
    row(t('panel.regulator'), j.regulator, j.regulator_url),
    j.register ? row(t('panel.register'), j.register, j.register_url) : null,
    row(t('panel.route'), j.route),
    row(t('panel.standard'), j.standard, j.standard_url),
    j.reimbursement ? row(t('panel.subsidy'), j.reimbursement, j.reimbursement_url) : null
  );
  const det = h('details', { open: window.matchMedia('(min-width: 48em)').matches },
    h('summary', { id: 'reg-title' }, `${j.name} — ${t('panel.regulator')} · ${t('panel.subsidy')}`),
    dl
  );
  root.replaceChildren(det);
}

/* ---------- Evidence ---------- */
function evidenceItem(arm, withDevice) {
  const s = arm.study;
  const figs = [];
  if (arm.mard != null) figs.push(`MARD ${fmt(arm.mard)}%`);
  if (arm.p2020 != null) figs.push(`%20/20 ${fmt(arm.p2020)}`);
  const sub = [arm.label || s.population, s.reference_method, s.n ? `n=${s.n}` : null].filter(Boolean).join(' · ');
  return h('li', { class: 'ev-item' },
    link(s.url, s.citation),
    ' ', sponsorBadge(s),
    h('span', { class: 'ev-sub' }, withDevice ? `${withDevice} — ${sub}` : sub),
    figs.length ? h('span', { class: 'ev-figs' }, figs.join(' · ')) : null,
    arm.range_limited ? h('span', { class: 'ev-sub' }, arm.range_limited) : null
  );
}

function evidenceGroup(title, arms) {
  return h('div', { class: 'ev-group' },
    h('h3', {}, title),
    arms.length
      ? h('ul', { class: 'ev-list' }, arms.map(a => evidenceItem(a)))
      : h('p', { class: 'missing' }, t('evidence.none'))
  );
}

function evidenceBlocks(d) {
  const nonH2H = d.arms.filter(a => a.study.design !== 'head-to-head');
  const man = nonH2H.filter(a => a.study.sponsor === 'manufacturer');
  const ind = nonH2H.filter(a => a.study.sponsor !== 'manufacturer');
  const h2h = d.arms.filter(a => a.study.design === 'head-to-head');
  return [
    evidenceGroup(t('evidence.manufacturer'), man),
    evidenceGroup(t('evidence.independent'), ind),
    evidenceGroup(t('evidence.h2h'), h2h)
  ];
}

function featureList(d) {
  const f = d.features;
  const val = (v) => (v === null || v === undefined || v === '') ? h('span', { class: 'missing' }, t('missing')) : String(v);
  return h('dl', { class: 'feat' },
    h('dt', {}, t('col.wear')), h('dd', {}, f.wear_days != null ? fmtInt(f.wear_days) : val(null)),
    h('dt', {}, t('col.sensor')), h('dd', {}, val(d.sensor_type)),
    h('dt', {}, t('col.otc')), h('dd', {}, d.otc ? t('yes') : t('no')),
    h('dt', {}, t('col.aid')), h('dd', {}, val(f.aid)),
    f.source ? [h('dt', {}, t('col.source')), h('dd', {}, link(f.source, new URL(f.source).hostname))] : null
  );
}

/* ---------- Cards (phones) ---------- */
export function renderCards(list, state) {
  const ul = document.getElementById('cards');
  ul.replaceChildren(...list.map(({ d, dim }) => {
    const hl = d.headline;
    const st = statusFor(d, state.jur);
    const showFeatures = state.view === 'features';

    const metric = showFeatures
      ? h('div', { class: 'metric' },
          h('div', { class: 'metric-value' }, d.features.wear_days != null ? fmtInt(d.features.wear_days) : '—'),
          h('div', { class: 'metric-label' }, t('col.wear')))
      : h('div', { class: 'metric' },
          h('div', { class: 'metric-value' }, hl?.mard != null ? fmt(hl.mard) : '—'),
          h('div', { class: 'metric-label' }, t('col.mard')));

    const meta = h('div', { class: 'card-meta' });
    if (!showFeatures) {
      meta.append(h('span', {}, `${t('col.p2020')} `, h('b', {}, hl?.p2020 != null ? fmt(hl.p2020) : '—')));
      if (hl) meta.append(h('span', {}, `${t('col.reference')}: `, h('b', {}, hl.study.reference_method)));
    } else {
      meta.append(h('span', {}, `${t('col.sensor')}: `, h('b', {}, d.sensor_type)));
      meta.append(h('span', {}, `${t('col.otc')}: `, h('b', {}, d.otc ? t('yes') : t('no'))));
    }

    const badges = h('div', { class: 'badges' },
      hl ? sponsorBadge(hl.study) : badge('n', t('missing')),
      d.hasH2H ? h('a', { class: 'badge badge-h', href: '#h2h-title' }, 'H2H') : null,
      st ? badge(st.cls, st.text) : null
    );

    const details = h('details', { class: 'evidence' },
      h('summary', {}, t('evidence.show')),
      st?.rec ? approvalDetail(st.rec) : null,
      d.note ? h('p', { class: 'ev-sub' }, d.note) : null,
      hl?.range_limited ? h('p', { class: 'ev-sub' }, `* ${hl.range_limited}`) : null,
      evidenceBlocks(d),
      h('div', { class: 'ev-group' }, h('h3', {}, t('evidence.features')), featureList(d))
    );

    return h('li', { class: `card${dim ? ' dim' : ''}`, id: `dev-${d.id}` },
      h('div', { class: 'card-head' },
        h('div', {},
          h('p', { class: 'card-name' }, d.name, hl?.range_limited ? '*' : ''),
          h('p', { class: 'card-maker' }, link(d.maker.url, d.maker.name))),
        metric),
      meta, badges, details);
  }));
}

/* ---------- Table (all widths; default layout) ----------
   One line per row: no wrapping. The device column and header row stay fixed;
   other columns scroll sideways. Long text is cut with an ellipsis and shown
   in full in the title and the evidence panel. */
const ACC_COLS = [
  { key: 'mard', label: 'col.mard', num: true, sort: 'mard' },
  { key: 'p2020', label: 'col.p2020', num: true, sort: 'p2020' },
  { key: 'status', label: 'col.approval', jurOnly: true },
  { key: 'ref', label: 'col.reference' },
  { key: 'src', label: 'col.source' },
  { key: 'maker', label: 'col.provider' }
];
const FEAT_COLS = [
  { key: 'wear', label: 'col.wear', num: true },
  { key: 'status', label: 'col.approval', jurOnly: true },
  { key: 'sensor', label: 'col.sensor' },
  { key: 'otc', label: 'col.otc' },
  { key: 'aid', label: 'col.aid' },
  { key: 'maker', label: 'col.provider' }
];

const clip = (text, cls = '') => h('span', { class: `clip ${cls}`.trim(), title: text }, text);
const dash = () => h('span', { class: 'missing' }, '—');

function cellFor(key, d, st) {
  const hl = d.headline, f = d.features;
  switch (key) {
    case 'mard': return h('td', { class: 'num' }, h('span', { class: 'big' }, hl?.mard != null ? fmt(hl.mard) : '—'), hl?.range_limited ? '*' : '');
    case 'p2020': return h('td', { class: 'num' }, hl?.p2020 != null ? fmt(hl.p2020) : '—');
    case 'status': return h('td', {}, badge(st.cls, st.text));
    case 'ref': return h('td', {}, hl ? clip(hl.study.reference_method) : dash());
    case 'src': return h('td', {}, hl
      ? [h('a', { href: hl.study.url, rel: 'noopener', target: '_blank', class: 'clip', title: hl.study.citation }, hl.study.citation.split(' et al')[0].split('.')[0] + ` ${hl.study.year}`), ' ', compactSponsor(hl.study),
         d.hasH2H ? [' ', h('a', { class: 'badge badge-h', href: '#h2h-title', title: t('badge.headtohead') }, 'H2H')] : null]
      : h('span', { class: 'missing' }, t('missing')));
    case 'maker': return h('td', {}, link(d.maker.url, d.maker.name));
    case 'wear': return h('td', { class: 'num' }, f.wear_days != null ? fmtInt(f.wear_days) : dash());
    case 'sensor': return h('td', {}, d.sensor_type);
    case 'otc': return h('td', {}, d.otc ? t('yes') : t('no'));
    case 'aid': return h('td', {}, f.aid ? clip(f.aid) : dash());
  }
}

export function renderTable(list, state, onSort) {
  const cols = (state.view === 'features' ? FEAT_COLS : ACC_COLS).filter(c => !c.jurOnly || state.jur !== 'INT');
  const thead = document.getElementById('thead');
  const tbody = document.getElementById('tbody');
  document.getElementById('table-caption').textContent = t('count', { n: list.length });

  const arrow = (key) => state.sort === key ? (key === 'p2020' ? ' ▼' : ' ▲') : '';
  const ariaSort = (key) => state.sort === key ? (key === 'p2020' ? 'descending' : 'ascending') : null;

  thead.replaceChildren(h('tr', {},
    h('th', { scope: 'col', class: 'col-dev', 'aria-sort': ariaSort('name') },
      h('button', { type: 'button', onclick: () => onSort('name') }, t('col.device'), arrow('name'))),
    cols.map(c => h('th', { scope: 'col', 'aria-sort': c.sort ? ariaSort(c.sort) : null, class: c.num ? 'num' : null },
      c.sort ? h('button', { type: 'button', onclick: () => onSort(c.sort) }, t(c.label), arrow(c.sort)) : t(c.label)))
  ));

  const span = 1 + cols.length;
  const rows = [];
  for (const { d, dim } of list) {
    const hl = d.headline;
    const st = statusFor(d, state.jur);
    const evId = `ev-${d.id}`;
    const toggle = h('button', { type: 'button', class: 'dev-toggle', 'aria-expanded': 'false', 'aria-controls': evId, title: `${d.name} — ${t('evidence.show')}` },
      h('span', { class: 'chev', 'aria-hidden': 'true' }, '›'),
      h('span', { class: 'clip' }, d.short || d.name));
    const evRow = h('tr', { class: 'ev-row', id: evId, hidden: true },
      h('td', { colspan: span },
        h('div', { class: 'ev-pin' },
          h('p', { class: 'ev-title' }, d.name, ' — ', link(d.maker.url, d.maker.name)),
          st?.rec ? approvalDetail(st.rec) : null,
          d.note ? h('p', { class: 'ev-sub' }, d.note) : null,
          hl?.range_limited ? h('p', { class: 'ev-sub' }, `* ${hl.range_limited}`) : null,
          h('div', { class: 'ev-cols' }, evidenceBlocks(d)),
          h('div', { class: 'ev-group' }, h('h3', {}, t('evidence.features')), featureList(d)))));
    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open));
      evRow.hidden = open;
    });
    rows.push(h('tr', { class: dim ? 'dim' : null },
      h('th', { scope: 'row', class: 'col-dev' }, toggle),
      cols.map(c => cellFor(c.key, d, st))
    ), evRow);
  }
  tbody.replaceChildren(...rows);
  updateScrollButtons();
}

/* Left/right column navigation for narrow screens */
export function initTableNav() {
  const wrap = document.getElementById('table-wrap');
  const prev = document.getElementById('col-prev');
  const next = document.getElementById('col-next');
  let pending = null, timer;
  const step = (dir) => {
    const devW = wrap.querySelector('thead .col-dev')?.offsetWidth || 0;
    const cells = [...wrap.querySelectorAll('thead th:not(.col-dev)')];
    const view = pending ?? wrap.scrollLeft;
    // Snap to the next or previous column edge after the fixed device column.
    const edges = cells.map(c => c.offsetLeft - devW);
    const target = dir > 0
      ? edges.find(e => e > view + 40) ?? wrap.scrollWidth
      : ([...edges].reverse().find(e => e < view - 40) ?? 0);
    pending = Math.min(target, wrap.scrollWidth - wrap.clientWidth);
    clearTimeout(timer); timer = setTimeout(() => { pending = null; }, 450);
    wrap.scrollTo({ left: target, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  };
  prev.addEventListener('click', () => step(-1));
  next.addEventListener('click', () => step(1));
  wrap.addEventListener('scroll', updateScrollButtons, { passive: true });
  window.addEventListener('resize', updateScrollButtons);
}

export function updateScrollButtons() {
  const wrap = document.getElementById('table-wrap');
  const nav = document.getElementById('table-nav');
  if (!wrap || !nav) return;
  const max = wrap.scrollWidth - wrap.clientWidth;
  nav.hidden = max <= 2;
  document.getElementById('col-prev').disabled = wrap.scrollLeft <= 2;
  document.getElementById('col-next').disabled = wrap.scrollLeft >= max - 2;
  wrap.classList.toggle('scrolled', wrap.scrollLeft > 2);
}

/* ---------- Head-to-head ---------- */
export function renderH2H(model) {
  const root = document.getElementById('h2h');
  const studies = Object.values(model.studies).filter(s => s.design === 'head-to-head' || (s.design === 'special' && model.arms.some(a => a.study === s && a.label?.startsWith('Scuba'))));
  root.replaceChildren(...studies.map(s => {
    const arms = model.arms.filter(a => a.study === s);
    const devIds = [...new Set(arms.map(a => a.device))];
    const labels = [...new Set(arms.map(a => a.label))];
    const name = id => model.devices.find(d => d.id === id)?.name || id;
    const cell = (lab, dev) => {
      const a = arms.find(x => x.label === lab && x.device === dev);
      if (!a) return '—';
      return a.p2020 != null ? `${fmt(a.mard)} (${fmt(a.p2020)})` : fmt(a.mard);
    };
    return h('article', { class: 'h2h-study' },
      h('h3', {}, link(s.url, s.citation)),
      h('p', {}, [s.population, s.n ? `n=${s.n}` : null, s.sponsor_note].filter(Boolean).join(' · '), ' ', sponsorBadge(s)),
      h('div', { class: 'h2h-scroll' },
        h('table', { class: 'mini' },
          h('caption', { class: 'sr-only' }, `MARD % (%20/20) — ${s.citation}`),
          h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, t('col.reference')), devIds.map(id => h('th', { scope: 'col' }, name(id))))),
          h('tbody', {}, labels.map(lab => h('tr', {},
            h('th', { scope: 'row' }, lab.replace(/^vs /, '')),
            devIds.map(id => h('td', {}, cell(lab, id)))))))),
      h('p', {}, 'MARD % (%20/20)')
    );
  }));
}

/* ---------- Standards ---------- */
export function renderStandards(model) {
  document.getElementById('standards').replaceChildren(...model.standards.map(s =>
    h('li', {}, h('span', { class: 'type' }, s.type), link(s.url, s.name), h('div', { class: 'ev-sub' }, s.summary))
  ));
}
