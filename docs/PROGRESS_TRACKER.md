# QCE Progress Tracker

---

### [x] Milestone 1: BBS Engine & Golden Tests
- [x] Sir ki Excel formula audit (footing, column, beam)
- [x] Pure deterministic math engine in `/src/engine`
- [x] Golden tests passing in Vitest (194.09 kg legacy)
- [x] Step-by-step formula working steps
- [x] Landscape Letter PDF export

---

### [x] Milestone 1.1: Component Cards & Multi-Instance
- [x] Zustand state tree (`project > components [F1, C1, B1, Rates]`)
- [x] Minimal card UI with weight badges and undo snackbar
- [x] Add, duplicate, rename, delete instances
- [x] Row-level overrides with reset option
- [x] Cover as "each side" (0.75" default = 1.5" deduction)
- [x] Live Rates component (steel, labor, wastage)

---

### [x] Milestone 1.2: Design System & Visual Polish
- [x] Soft neutral theme (Light/Dark via CSS variables)
- [x] Inter font with tabular numbers everywhere
- [x] Type tick indicators (footing, column, beam, rates)
- [x] 2-line rebar rows (no clipped tables)
- [x] Smooth card expand and flash on recalculation

---

### [x] Milestone 2: 2D Drawings (Shared Geometry)
- [x] Round up bar counts default ON (10.33 -> 11, total 195.65 kg)
- [x] 3D world coordinate geometry layer in `/src/geometry`
- [x] 2D orthographic projections (Section, Elevation, Plan)
- [x] Drawing details inputs (thickness, lean concrete, levels)
- [x] Two-way hover/click highlight between drawing and BBS rows

---

### [x] Milestone 2.1: Field Restructure & Proportions
- [x] Member dimensions separated from rebar choices
- [x] Spacing and Count linked (edit one, updates other)
- [x] Textbook drawing proportions based on text height H
- [x] Dual skins: Textbook (B&W) and Color

---

### [x] Milestone 2.2: Drawing Fixes & Site View (DONE)
- [x] 3 styles: Textbook (1-rep bar) | Simple (all bars, B&W) | Color
- [x] Site View with bar tags in right margin and 1-rep geometry
- [x] General notes and title block as HTML below SVG
- [x] Per-view Labels ON/OFF toggle (keeps dimension lines)
- [x] Remove drawing preview from cards (sticky right panel only)
- [x] Fix text collisions (stagger leaders, offset dimension lines)
- [x] Fix U-bar highlight in drawing (F5)
- [x] Cover min/max limits to prevent negative geometry (F4)

---

### [x] Milestone 3: Interactive 3D Model ("Imagine 3D") (DONE)
- [x] Three.js / React Three Fiber canvas
- [x] Lazy load (only mounts when "Imagine 3D" is clicked)
- [x] Reuse `/src/geometry` coordinates directly
- [x] Orbit controls (rotate, pan, zoom) with rebar tags

---

### [ ] Milestone 4: More Components & Quantities (CURRENT)
- [ ] Plinth beam BBS
- [ ] One-way and two-way slabs BBS
- [ ] Concrete and excavation quantities (earthwork, lean, RCC)
- [ ] Expanded cost schedule (materials + labor)

---

### [ ] Milestone 5: AI Drawing OCR (Gemini Vision)
- [ ] Serverless proxy for Gemini API key
- [ ] Structured JSON extraction from uploaded drawing image
- [ ] Side-by-side verification before passing to engine
