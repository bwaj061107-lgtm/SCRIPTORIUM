# SCRIPTORIUM NEXUS — V13.0 → V14.0 Changelog

Scope for this version, exactly as requested: the Soundstage editor,
its theme system, and two new tools (Automation, Production Report).
The Gateway, Studio Lot and project-creation screen are **untouched**
— `index.html`, `dashboard.html`, `css/gateway.css`, `css/studio.css`,
`js/auth.js`, `js/lore.js`, `js/studio.js` are byte-identical to V13.0.

## New files
- **`js/story-utils.js`** — shared helpers: field parsing, robust
  birthdate parsing (accepts `12/03/1990`, `12 March 1990`, `March 12,
  1990`, tolerant of stray hint text), age calculation, relationship
  classification (family / romantic / ally / enemy / mentor / other).
- **`js/report.js`** — builds the single combined Production Report
  PDF entirely in the browser (jsPDF): cover, table of contents,
  review checks, character summary + profiles, family tree,
  connection map + list, story architecture.
- **`js/vendor/jspdf.umd.min.js`** — jsPDF 2.5.1, bundled so the
  report works fully offline, no CDN dependency.

## `editor.html`
- **Engine Protocol switcher removed.** No dropdown, no manual
  switching — the theme now follows whichever document is open.
- Added the **genre picker modal** (pop-up 1): shown before creating a
  character or architecture file whenever the production has more
  than one genre; skipped automatically for a single-genre (Auteur
  Mode) production.
- Architecture modal gained a **back arrow** to return to the genre
  picker, and now opens as pop-up 2, after the genre is chosen.
- **Settings** menu rebuilt: Light/Dark toggle plus two Automation
  switches (file name follows title field · age from birthdate).
- Added the **Report button** (top of the file sidebar) and a small
  per-folder report icon on Characters/Architecture.
- Loads `jspdf`, `story-utils.js`, `report.js` before `soundstage.js`.
- Default `data-mode` changed from `dark` to `light` (parchment is
  the default look now; dark is one click away).
- Text-color swatch and font dropdown now default to manuscript ink
  and EB Garamond instead of the old dark-UI values.

## `js/soundstage.js`
- **Theme now follows the document, not a global switch**:
  `applyDocTheme()` reads the open document's stored `genre` and
  themes the whole page to match; switching documents switches the
  look automatically. A single-genre production stays in that one
  genre everywhere (Auteur Mode badge in the status bar).
- **Genre-aware character template**: the eight-section base profile
  is unchanged, plus each genre adds its own section (e.g. Fantasy →
  "Realm & Lore", Mystery → "Case Role", Romance → "Heart & History")
  and a few genre-specific relationship rows.
- **Automation** (each toggle independently in Settings):
  - *Age from birthdate* — typing a birthdate fills Age automatically
    with a distinct, clickable style; typing in Age by hand overrides
    it immediately.
  - *File name from title* — a character's file renames itself to
    match NAME as you type; every architecture type does the same
    from its own title field (Kingdom Name, Case Name, System Name,
    etc.). Typing a name manually in the sidebar takes control back;
    clearing it hands control back to automation.
- **Production Report**: `generateReport()` collects every character
  and architecture document, cross-links named relationships into a
  graph, lays out a family tree and a connection map, runs a review
  pass (duplicate names, unreadable dates, unmatched relatives,
  inconsistent family links, empty documents), and hands it all to
  `report.js` for one downloadable PDF.
- Old projects saved under V13 or earlier (no `genre` per document)
  are migrated on open: `inferGenre()` assigns each existing character
  and architecture file a sensible genre so themes and the report work
  immediately, no manual fixing needed.
- Display-mode and preference storage keys are new for V14
  (`scriptorium_display_mode_v14`, `scriptorium_prefs_v14`); session,
  user and project keys are unchanged from V13 so the Studio Lot and
  Soundstage keep reading and writing the same records.

## `css/soundstage.css`
- **Rebuilt as one parchment system with genre variants**, per your
  brief: no big theme swings — each genre only nudges the accent
  colour, the page tint, the heading typeface and one quiet
  background effect away from the shared Normal look.
- **Light mode is the default**: bright, warm parchment. Dark mode is
  a candlelit variant of the same system, not a separate design.
- Added **paper grain**, an inner page-shade vignette, and layered
  glass shadows (`--glass-shadow`) for more depth on panels, modals
  and the status bar.
- Every previously hard-coded dark-UI colour (`rgba(255,255,255,…)`
  hovers, `rgba(0,0,0,…)` fields, `color:#000` on accent buttons) was
  replaced with theme-aware tokens, so every surface now looks correct
  in both Light and Dark mode instead of assuming dark-only.
- New styling for the genre-picker grid/cards, the Settings menu
  (labels, divider, toggle switches), the sidebar report buttons, and
  the small genre-colour dot shown next to each file in the sidebar.
- New, gentler animation set to match: `modalRise`/`pageSettle`
  (Normal), `modalBloom`/`inkBloom` (Romance, Horror), `modalFocusPull`
  /`dossierReveal` (Mystery) — reusable, on-brand alternatives to the
  old per-engine keyframes.

## Two real bugs found and fixed during testing
Both were caught by generating actual reports from actual typed data,
not just by reading the code:
1. **Birthdate hint text could block age automation.** The template
   showed example text like `(e.g. 12/03/1990)` inside the field
   itself; typing at the end (the natural thing to do) appended the
   real date right after it instead of replacing it, so the date
   never parsed. Fixed at the root two ways: the template no longer
   puts example text inside any automation-read field, and
   `parseDOB()` now also strips a leading hint/note and can find a
   valid date inside noisier text as a fallback.
2. **The same hint-collision pattern affected other fields** (e.g.
   Mystery's "Role in the Case") and would have shown garbled text in
   the report. Fixed centrally in `story-utils.js`'s field parser, so
   it's corrected everywhere at once rather than template-by-template.

## Verified before delivery
- Every `.js` file passes `node --check`.
- Every `.css` file has balanced braces; every `.html` file parses
  cleanly.
- Every `onclick` handler in `editor.html` resolves to a real
  exported function in `soundstage.js`; every DOM id the JS looks up
  exists in the HTML.
- Full run-through in a real headless browser: register → create a
  multi-genre production → new character → genre picker → genre-
  specific template → typed name auto-renames the file → typed
  birthdate auto-fills age → switching documents switches genre theme
  → architecture genre picker → Signature-tagged architecture type →
  typed title auto-renames the file → Report button → real PDF
  downloaded and visually checked page by page (cover, contents,
  review checks, character profiles, family tree, connection map,
  architecture) → Auteur Mode (single-genre) production confirmed to
  skip the genre picker entirely. No console errors anywhere in the
  flow.
