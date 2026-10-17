// Loads the JSON data files and joins them into one model.

const FILES = ['manufacturers', 'devices', 'jurisdictions', 'approvals', 'studies', 'study_arms', 'features', 'standards', 'changelog'];

export async function loadData() {
  const parts = await Promise.all(FILES.map(f =>
    fetch(`data/${f}.json`).then(r => {
      if (!r.ok) throw new Error(`data/${f}.json: ${r.status}`);
      return r.json();
    })
  ));
  const raw = Object.fromEntries(FILES.map((f, i) => [f, parts[i]]));
  const byId = (arr) => Object.fromEntries(arr.map(x => [x.id, x]));

  const makers = byId(raw.manufacturers);
  const studies = byId(raw.studies);
  const arms = raw.study_arms.map(a => ({ ...a, study: studies[a.study] })).filter(a => a.study);

  const devices = raw.devices.map(d => {
    const dArms = arms.filter(a => a.device === d.id);
    const headline = dArms.find(a => a.headline) || null;
    return {
      ...d,
      maker: makers[d.manufacturer],
      arms: dArms,
      headline,
      approvals: raw.approvals.filter(a => a.device === d.id),
      features: raw.features.values?.[d.id] || {},
      hasH2H: dArms.some(a => a.study.design === 'head-to-head')
    };
  });

  return {
    devices,
    makers,
    studies,
    arms,
    jurisdictions: raw.jurisdictions,
    standards: raw.standards,
    changelog: raw.changelog,
    featureFields: raw.features.fields || []
  };
}

export function sponsorClass(s) {
  return { manufacturer: 'm', independent: 'i', competitor: 'c', mixed: 'c', unknown: 'n' }[s] || 'n';
}
