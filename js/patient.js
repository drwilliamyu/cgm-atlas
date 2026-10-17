// Patient handout: plain-language page built from the same data files.
// English only until a reviewed translation exists. Devices are listed
// alphabetically and never ranked.
import { h } from './dom.js';
import { loadData } from './data.js';

const p = new URLSearchParams(location.search);
let model;
const state = { jur: 'INT', ids: null };

function approvalHere(d) {
  return state.jur === 'INT' ? null : d.approvals.find(a => a.jurisdiction === state.jur);
}

function defaultIds() {
  return model.devices
    .filter(d => !d.wellness && (state.jur === 'INT' || approvalHere(d)))
    .map(d => d.id);
}

function howToGet(d, j) {
  const a = approvalHere(d);
  if (d.otc) return 'Over the counter (no prescription)';
  if (a?.subsidy && a.subsidy !== 'None') return `Subsidised through ${a.subsidy} if you are eligible`;
  if (a?.subsidy === 'None') return 'Buy directly; not subsidised';
  if (state.jur === 'US') return 'Prescription';
  return 'Ask your diabetes team';
}

function avgDiff(d) {
  const hl = d.headline;
  if (!hl || hl.mard == null) return 'Not published';
  const v = Math.round(hl.mard * 10) / 10;
  return `About ${v}%` + (hl.range_limited ? '*' : '');
}

function render() {
  const j = model.jurisdictions.find(x => x.id === state.jur);
  document.getElementById('pt-place').textContent = state.jur === 'INT' ? 'Patient information' : `Patient information · ${j.name}`;
  document.getElementById('pt-table-title').textContent = state.jur === 'INT' ? 'Devices' : `Devices with a record in ${j.name}`;

  const chosen = model.devices
    .filter(d => state.ids.includes(d.id))
    .sort((a, b) => fullName(a).localeCompare(fullName(b)));

  const rows = chosen.map(d => h('tr', {},
    h('td', {}, fullName(d)),
    h('td', {}, d.maker.name),
    h('td', {}, d.features.wear_days != null ? `${Math.round(d.features.wear_days)} days` : 'Ask your team'),
    h('td', {}, avgDiff(d)),
    h('td', {}, howToGet(d, j))
  ));
  document.getElementById('pt-rows').replaceChildren(...(rows.length ? rows
    : [h('tr', {}, h('td', { colspan: 5 }, 'No devices selected.'))]));

  const notes = [];
  if (chosen.some(d => d.headline?.range_limited)) notes.push('* Measured only for glucose between 3.9 and 10.0 mmol/L (70 to 180 mg/dL).');
  if (chosen.some(d => { const a = approvalHere(d); return a && !a.verified; })) notes.push('Availability and subsidy change often. Your diabetes team or pharmacist can confirm them.');
  notes.push('Average difference comes from studies paid for by the company that makes the device, unless your diabetes team tells you otherwise.');
  document.getElementById('pt-note').textContent = notes.join(' ');

  const updated = model.changelog.map(c => c.updated).sort().at(-1);
  const df = new Intl.DateTimeFormat(navigator.language || 'en', { day: 'numeric', month: 'short', year: 'numeric' });
  const site = `${location.host}${location.pathname.replace(/patient\.html$/, '')}`;
  document.getElementById('pt-meta').textContent =
    `Information checked ${updated ? df.format(new Date(updated + 'T00:00:00')) : 'unknown'} · Printed ${df.format(new Date())} · Source: ${site}`;

  const q = new URLSearchParams({ j: state.jur, d: state.ids.join(',') });
  history.replaceState(null, '', `${location.pathname}?${q}`);
}

function fullName(d) {
  // Prefix the brand family where the device name alone is unclear to patients.
  const brand = { dexcom: 'Dexcom', medtronic: 'Medtronic', sibionics: 'SiBionics', yuwell: 'Yuwell', sinocare: 'Sinocare', medtrum: 'Medtrum', isens: 'i-SENS' }[d.manufacturer];
  return brand && !d.name.startsWith(brand) && !['caresens-air'].includes(d.id) ? `${brand} ${d.name}` : d.name;
}

function renderPicker() {
  const sel = document.getElementById('pt-jur');
  sel.replaceChildren(...model.jurisdictions.map(j => h('option', { value: j.id }, j.name)));
  sel.value = state.jur;
  sel.onchange = () => { state.jur = sel.value; state.ids = defaultIds(); renderPicker(); render(); };

  const list = model.devices
    .filter(d => state.jur === 'INT' || approvalHere(d) || state.ids.includes(d.id))
    .sort((a, b) => fullName(a).localeCompare(fullName(b)));
  document.getElementById('picks').replaceChildren(...list.map(d => {
    const box = h('input', { type: 'checkbox', value: d.id });
    box.checked = state.ids.includes(d.id);
    box.addEventListener('change', () => {
      state.ids = box.checked ? [...state.ids, d.id] : state.ids.filter(x => x !== d.id);
      render();
    });
    return h('label', { class: 'check' }, box, h('span', {}, fullName(d), d.wellness ? ' (wellness use only)' : ''));
  }));
}

async function main() {
  model = await loadData();
  const jurIds = model.jurisdictions.map(j => j.id);
  state.jur = jurIds.includes(p.get('j')) ? p.get('j') : 'INT';
  const known = new Set(model.devices.map(d => d.id));
  const fromUrl = (p.get('d') || '').split(',').filter(x => known.has(x));
  state.ids = fromUrl.length ? fromUrl : defaultIds();
  renderPicker();
  render();
  document.getElementById('print').addEventListener('click', () => window.print());
}

main().catch(err => {
  document.getElementById('page').prepend(h('p', { class: 'stale' }, `Could not load data: ${err.message}`));
});
