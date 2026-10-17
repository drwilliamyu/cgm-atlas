// Standards page: builds the "devices by regulatory route" table from the data
// and wires left/right column buttons for the wide tables.
import { h, link } from './dom.js';
import { loadData } from './data.js';

const JURS = ['US', 'AU', 'EU', 'UK'];

function cell(d, jur) {
  const a = d.approvals.find(x => x.jurisdiction === jur);
  if (!a) return h('td', {}, h('span', { class: 'missing' }, 'No record'));
  const label = jur === 'US' && a.framework ? a.framework : a.route;
  const ok = a.verified;
  const url = a.framework_url || a.reference_url || a.source_url;
  return h('td', {},
    h('span', { class: `badge ${ok ? 'badge-v' : 'badge-u'}` }, ok ? 'Confirmed' : 'Reported'),
    ' ', url ? link(url, label) : label,
    a.reference ? h('span', { class: 'ev-sub' }, [a.reference, a.date].filter(Boolean).join(' · ')) : null,
    a.subsidy && a.subsidy !== 'None' ? h('span', { class: 'ev-sub' }, `Subsidy: ${a.subsidy}`) : null);
}

function buildDevices(model) {
  const rows = [...model.devices]
    .sort((a, b) => a.maker.name.localeCompare(b.maker.name) || a.name.localeCompare(b.name))
    .map(d => h('tr', {},
      h('th', { scope: 'row', class: 'col-dev' }, h('span', { class: 'dev-name' }, d.name), h('span', { class: 'ev-sub' }, d.maker.name)),
      JURS.map(j => cell(d, j)),
      h('td', {}, d.icgm_assessed_uk
        ? link('https://www.diabetes.org.uk/about_us/news/investigating-accuracy-and-safety-data-behind-cgm-devices-uk', d.icgm_assessed_uk)
        : h('span', { class: 'missing' }, 'Not assessed'))));
  document.getElementById('dev-rows').replaceChildren(...rows);
}

function wireNav() {
  document.querySelectorAll('.std-nav').forEach(nav => {
    const wrap = document.getElementById(nav.dataset.for);
    const [prev, next] = nav.querySelectorAll('.nav-btn');
    const update = () => {
      const max = wrap.scrollWidth - wrap.clientWidth;
      nav.hidden = max <= 2;
      prev.disabled = wrap.scrollLeft <= 2;
      next.disabled = wrap.scrollLeft >= max - 2;
      wrap.classList.toggle('scrolled', wrap.scrollLeft > 2);
    };
    const step = (dir) => {
      const devW = wrap.querySelector('thead .col-dev')?.offsetWidth || 0;
      const edges = [...wrap.querySelectorAll('thead th:not(.col-dev)')].map(c => c.offsetLeft - devW);
      const v = wrap.scrollLeft;
      const target = dir > 0 ? (edges.find(e => e > v + 40) ?? wrap.scrollWidth) : ([...edges].reverse().find(e => e < v - 40) ?? 0);
      wrap.scrollTo({ left: target, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    };
    prev.addEventListener('click', () => step(-1));
    next.addEventListener('click', () => step(1));
    wrap.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  });
}

loadData().then(model => { buildDevices(model); wireNav(); })
  .catch(err => document.getElementById('dev-rows').replaceChildren(h('tr', {}, h('td', { colspan: 6 }, `Could not load data: ${err.message}`))));
