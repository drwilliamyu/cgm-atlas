// Date of the last deploy, read from the Last-Modified header GitHub Pages sends.
// Fallback: newest entry in data/changelog.json. Never shows a guessed date.
import { t, locale } from './i18n.js';
import { h } from './dom.js';

let when = null;

export async function loadFreshness(changelog) {
  try {
    const r = await fetch('data/devices.json', { method: 'HEAD', cache: 'no-store' });
    const lm = r.headers.get('Last-Modified');
    if (lm && !Number.isNaN(Date.parse(lm))) when = new Date(lm);
  } catch { /* fall through */ }
  if (!when && Array.isArray(changelog) && changelog.length) {
    const newest = changelog.map(c => c.updated).filter(Boolean).sort().at(-1);
    if (newest) when = new Date(newest + 'T00:00:00');
  }
}

export function renderFreshness() {
  const el = document.getElementById('fresh');
  const stale = document.getElementById('stale');
  el.replaceChildren();
  stale.hidden = true;
  if (!when) { el.append(t('fresh.unknown')); return; }

  const days = Math.max(0, Math.floor((Date.now() - when.getTime()) / 864e5));
  const date = new Intl.DateTimeFormat(locale(), { day: 'numeric', month: 'short', year: 'numeric' }).format(when);
  const rel = days === 0 ? t('fresh.today') : t('fresh.days_ago', { n: days });
  el.append(`${t('fresh.updated')}: `, h('time', { datetime: when.toISOString() }, date), ` (${rel})`);
  if (days > 180) stale.hidden = false;
  else if (days > 90) el.append(h('span', { class: 'chip chip-amber' }, t('fresh.amber')));
}
