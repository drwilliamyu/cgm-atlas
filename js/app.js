// CGM Atlas entry point: state, URL sync, controls and render.
import { h, store } from './dom.js';
import { loadLang, applyStatic, detectLang, t } from './i18n.js';
import { initGate } from './gate.js';
import { loadFreshness, renderFreshness } from './freshness.js';
import { loadData } from './data.js';
import { renderPanel, renderCards, renderTable, renderH2H, renderStandards, initTableNav, updateScrollButtons } from './render.js';

const PREFS = 'cgmatlas.prefs';
const EU = ['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE'];

let model;
const state = { jur: 'INT', units: 'mg/dL', lang: 'en', view: 'accuracy', sort: 'mard', include: false, layout: 'table' };

function detectJur() {
  for (const l of navigator.languages || [navigator.language || '']) {
    const region = (l.split('-')[1] || '').toUpperCase();
    if (region === 'AU') return 'AU';
    if (region === 'US') return 'US';
    if (region === 'GB') return 'UK';
    if (region === 'CA') return 'CA';
    if (region === 'NZ') return 'NZ';
    if (EU.includes(region)) return 'EU';
  }
  return 'INT';
}

function readState() {
  const p = new URLSearchParams(location.search);
  const saved = store.get(PREFS) || {};
  const jurIds = model.jurisdictions.map(j => j.id);
  state.jur = [p.get('j'), saved.jur, detectJur()].find(v => jurIds.includes(v)) || 'INT';
  state.lang = p.get('lang') || saved.lang || detectLang();
  state.view = ['accuracy', 'features'].includes(p.get('view')) ? p.get('view') : (saved.view || 'accuracy');
  state.sort = ['mard', 'p2020', 'name'].includes(p.get('sort')) ? p.get('sort') : (saved.sort || 'mard');
  state.include = p.get('all') === '1' || !!saved.include;
  state.layout = ['table', 'cards'].includes(p.get('layout')) ? p.get('layout') : (saved.layout || 'table');
  const u = p.get('units') || saved.units;
  state.units = ['mg/dL', 'mmol/L'].includes(u) ? u : jurUnits();
}

function jurUnits() {
  return model.jurisdictions.find(j => j.id === state.jur)?.units || 'mg/dL';
}

function writeState() {
  const p = new URLSearchParams();
  p.set('j', state.jur);
  if (state.lang !== 'en') p.set('lang', state.lang);
  p.set('units', state.units);
  if (state.view !== 'accuracy') p.set('view', state.view);
  if (state.sort !== 'mard') p.set('sort', state.sort);
  if (state.include) p.set('all', '1');
  if (state.layout !== 'table') p.set('layout', state.layout);
  history.replaceState(null, '', `${location.pathname}?${p}`);
  store.set(PREFS, { ...state });
}

function visibleDevices() {
  const list = model.devices.map(d => {
    const here = state.jur === 'INT' || d.approvals.some(a => a.jurisdiction === state.jur);
    return { d, here };
  }).filter(x => x.here || state.include)
    .map(({ d, here }) => ({ d, dim: !here }));

  const nullsLast = (a, b, dir) => {
    if (a == null && b == null) return 0;
    if (a == null) return 1;
    if (b == null) return -1;
    return dir * (a - b);
  };
  list.sort((x, y) => {
    if (x.dim !== y.dim) return x.dim ? 1 : -1;
    if (state.sort === 'name') return x.d.name.localeCompare(y.d.name);
    if (state.sort === 'p2020') return nullsLast(x.d.headline?.p2020, y.d.headline?.p2020, -1) || x.d.name.localeCompare(y.d.name);
    return nullsLast(x.d.headline?.mard, y.d.headline?.mard, 1) || x.d.name.localeCompare(y.d.name);
  });
  return list;
}

function render() {
  const j = model.jurisdictions.find(x => x.id === state.jur);
  renderPanel(j);
  const list = visibleDevices();
  document.getElementById('count').textContent = t('count', { n: list.filter(x => !x.dim).length });
  document.getElementById('mard-note').hidden = state.view !== 'accuracy';
  const def = document.getElementById('def-2020');
  def.hidden = state.view !== 'accuracy';
  def.textContent = t(state.units === 'mmol/L' ? 'def.2020.mmol' : 'def.2020.mg');
  const cards = state.layout === 'cards';
  document.getElementById('cards').hidden = !cards;
  document.getElementById('table-wrap').hidden = cards;
  if (cards) { document.getElementById('table-nav').hidden = true; renderCards(list, state); }
  else renderTable(list, state, (key) => { state.sort = key; syncControls(); writeState(); render(); });
  // Patient handout: same jurisdiction, devices with a record here (not wellness-only).
  const ids = list.filter(x => !x.dim && !x.d.wellness).map(x => x.d.id);
  document.getElementById('patient-link').href = `patient.html?${new URLSearchParams({ j: state.jur, d: ids.join(',') })}`;
  renderH2H(model);
  renderStandards(model);
  renderFreshness();
}

function syncControls() {
  document.getElementById('jur').value = state.jur;
  document.getElementById('lang').value = state.lang;
  document.getElementById('sort').value = state.sort;
  document.getElementById('include').checked = state.include;
  document.querySelectorAll('input[name="view"]').forEach(r => { r.checked = r.value === state.view; });
  document.querySelectorAll('input[name="units"]').forEach(r => { r.checked = r.value === state.units; });
  document.querySelectorAll('input[name="layout"]').forEach(r => { r.checked = r.value === state.layout; });
}

function fillJurisdictions() {
  const sel = document.getElementById('jur');
  sel.replaceChildren(...model.jurisdictions.map(j => h('option', { value: j.id }, j.name)));
}

function bindControls() {
  document.getElementById('jur').addEventListener('change', e => {
    state.jur = e.target.value;
    state.units = jurUnits();
    syncControls(); writeState(); render();
  });
  document.getElementById('lang').addEventListener('change', async e => {
    state.lang = await loadLang(e.target.value);
    applyStatic(); writeState(); render();
  });
  document.getElementById('sort').addEventListener('change', e => { state.sort = e.target.value; writeState(); render(); });
  document.getElementById('include').addEventListener('change', e => { state.include = e.target.checked; writeState(); render(); });
  document.querySelectorAll('input[name="view"]').forEach(r => r.addEventListener('change', () => { state.view = r.value; writeState(); render(); }));
  document.querySelectorAll('input[name="units"]').forEach(r => r.addEventListener('change', () => { state.units = r.value; writeState(); render(); }));
  document.querySelectorAll('input[name="layout"]').forEach(r => r.addEventListener('change', () => { state.layout = r.value; writeState(); render(); }));
  initTableNav();

  // Bottom sheet (phones only; hidden by CSS on wider screens)
  const sheet = document.getElementById('sheet');
  const scrim = document.getElementById('scrim');
  const openBtn = document.getElementById('sheet-open');
  const setSheet = (open) => {
    sheet.classList.toggle('open', open);
    scrim.hidden = !open;
    openBtn.setAttribute('aria-expanded', String(open));
    if (open) sheet.querySelector('input, select')?.focus();
    else openBtn.focus();
  };
  openBtn.addEventListener('click', () => setSheet(true));
  document.getElementById('sheet-close').addEventListener('click', () => setSheet(false));
  scrim.addEventListener('click', () => setSheet(false));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && sheet.classList.contains('open')) setSheet(false); });
}

async function main() {
  try {
    model = await loadData();
  } catch (err) {
    const m = document.getElementById('main');
    m.replaceChildren(h('p', { class: 'stale' }, `Could not load data: ${err.message}`));
    m.hidden = false;
    return;
  }
  readState();
  state.lang = await loadLang(state.lang);
  applyStatic();
  fillJurisdictions();
  syncControls();
  bindControls();
  await loadFreshness(model.changelog);
  render();
  writeState();
  initGate(() => { document.getElementById('main').focus({ preventScroll: true }); updateScrollButtons(); });
  updateScrollButtons();
}

main();
