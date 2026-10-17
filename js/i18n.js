// Interface translation from i18n/<lang>.json. English is the fallback for any missing key.
// Disclaimer keys (gate.*, declined.*) are only in en.json until a reviewed translation exists.

export const LANGS = ['en', 'de', 'fr', 'es', 'zh-Hans'];
let en = {};
let cur = {};
let lang = 'en';
const missing = new Set();

export async function loadLang(code) {
  if (!Object.keys(en).length) en = await fetchJson('en');
  lang = LANGS.includes(code) ? code : 'en';
  cur = lang === 'en' ? en : await fetchJson(lang).catch(() => ({}));
  document.documentElement.lang = lang;
  return lang;
}

async function fetchJson(code) {
  const r = await fetch(`i18n/${code}.json`);
  if (!r.ok) throw new Error(`i18n ${code}: ${r.status}`);
  return r.json();
}

export function t(key, vars) {
  let s = cur[key];
  if (s === undefined) {
    if (lang !== 'en') missing.add(key);
    s = en[key] ?? key;
  }
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, v);
  return s;
}

export function applyStatic(root = document) {
  root.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  const note = document.getElementById('translated');
  if (note) note.hidden = lang === 'en';
}

export function currentLang() { return lang; }
export function locale() {
  if (lang === 'zh-Hans') return 'zh-CN';
  const nav = navigator.language || 'en';
  return nav.toLowerCase().startsWith(lang) ? nav : lang;
}
export function missingKeys() { return [...missing]; }

export function detectLang() {
  for (const l of navigator.languages || [navigator.language || 'en']) {
    const low = l.toLowerCase();
    if (low.startsWith('zh')) return 'zh-Hans';
    const base = low.split('-')[0];
    if (LANGS.includes(base)) return base;
  }
  return 'en';
}
