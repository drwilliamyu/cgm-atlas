// Professional-use disclaimer. Self-attestation only; not access control.
import { store } from './dom.js';

export const GATE_VERSION = '2026-10';
const KEY = 'cgmatlas.gate';
const MAX_AGE_DAYS = 365;

export function accepted() {
  const rec = store.get(KEY);
  if (!rec || rec.version !== GATE_VERSION || !rec.acceptedAt) return false;
  const age = (Date.now() - Date.parse(rec.acceptedAt)) / 864e5;
  return age >= 0 && age < MAX_AGE_DAYS;
}

export function initGate(onAccept) {
  const dlg = document.getElementById('gate');
  const c1 = document.getElementById('gate-c1');
  const c2 = document.getElementById('gate-c2');
  const enter = document.getElementById('gate-enter');
  const decline = document.getElementById('gate-decline');
  const main = document.getElementById('main');
  const declined = document.getElementById('declined');

  const sync = () => { enter.disabled = !(c1.checked && c2.checked); };
  c1.addEventListener('change', sync);
  c2.addEventListener('change', sync);

  // Escape must not dismiss the gate.
  dlg.addEventListener('cancel', e => e.preventDefault());

  enter.addEventListener('click', () => {
    store.set(KEY, { version: GATE_VERSION, acceptedAt: new Date().toISOString() });
    dlg.close();
    declined.hidden = true;
    main.hidden = false;
    onAccept?.();
  });

  decline.addEventListener('click', () => {
    dlg.close();
    main.hidden = true;
    declined.hidden = false;
    declined.querySelector('h1')?.focus?.();
  });

  document.getElementById('declined-back').addEventListener('click', () => open());
  document.getElementById('reopen-gate').addEventListener('click', () => open(true));

  function open(reopen = false) {
    c1.checked = reopen && accepted();
    c2.checked = reopen && accepted();
    sync();
    if (!dlg.open) dlg.showModal();
  }

  // <main> starts hidden in the HTML so nothing flashes before the check.
  if (accepted()) main.hidden = false;
  else open();
}
