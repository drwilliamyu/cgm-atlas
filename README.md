# CGM Atlas

A clinician-facing comparison of continuous glucose monitoring (CGM) systems by jurisdiction, with the evidence behind each accuracy figure.

Plain HTML5, CSS and JavaScript (ES modules). No frameworks, packages or build step. Hosted on GitHub Pages.

## Structure

```
index.html          Main page (mobile-first: cards on phones, table from 768 px)
about.html          Method, disclaimer, conflicts, corrections
styles.css          All styles; base CSS targets a 360 px phone
js/
  app.js            State, URL sync, controls
  data.js           Loads and joins the JSON files
  render.js         Panel, cards, table, evidence, head-to-head, standards
  i18n.js           Interface language
  gate.js           Professional-use disclaimer modal
  freshness.js      "Data last updated" from the Last-Modified header
  dom.js            DOM and storage helpers
data/               One JSON file per entity (see below)
i18n/               Interface strings per language
tools/validate.html Data checks; open in a browser
```

## Editing data

1. Edit the JSON in `data/` on a branch.
2. Open `tools/validate.html` (served locally or on the branch preview) and fix any errors.
3. Add a line to `data/changelog.json`.
4. Open a pull request; a second curator checks each changed figure against its source.

Rules: every figure needs a source URL. Use `null` for unknown values, never a guess. Approval records stay `"verified": false` until checked on the regulator's register.

## Local preview

`fetch()` does not work from `file://`. Serve the folder with any static server, for example:

```
python3 -m http.server 8000
```

## GitHub Pages

Settings → Pages → Source: `main` branch, root folder. The `.nojekyll` file makes Pages serve files as they are.
