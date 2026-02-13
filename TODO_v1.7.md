```markdown
TODO — v1.7 (planned)
======================
Goal: Move previously planned v1.6 items (LaTeX rendering, QoL, export, tests, TikZ) into v1.7 for a larger feature set.

Priority items (migrated from v1.6)
----------------------------------
1. LaTeX rendering for labels (high)
   - Evaluate renderer: KaTeX (fast, renders to HTML/SVG) vs MathJax (larger, full coverage).
   - Approach A (preferred): Render LaTeX to SVG/HTML using KaTeX in an offscreen container, then draw the SVG/image onto the canvas per label.
   - Approach B: Pre-render to small PNG/SVG and draw on canvas (slower but simpler).
   - Requirements:
     - Support inline math (e.g. $x^2$) and display math.
     - Provide a toggle per-label: render as plain text or LaTeX.
     - Sanitize inputs and safely escape non-LaTeX labels.
   - Acceptance criteria:
     - LaTeX in vertex/edge labels renders correctly and is positioned properly.
     - Editing workflow unchanged (right-click -> edit -> apply), preview shows rendered result.

2. QoL: Edge sensitivity slider (medium)
   - Add a small control in the UI (menu) to tune edge hit-test threshold.
   - Persist in localStorage.
   - Default value chosen from current heuristics (e.g. 14 px).

3. QoL: Edge hover tooltip / preview (medium)
   - Show edge label on hover (tiny tooltip) even if label is empty.
   - Optionally show full LaTeX-rendered preview in tooltip for LaTeX labels.

4. PNG preview: zoom / fit / download options (low)
   - Add zoom (fit / 100% / slider) inside current preview modal.
   - Allow export in different sizes (scale factor) or SVG export if shapes/labels are vector.

5. History: Hardening & tests (medium)
   - Add small unit tests for: distance-point-to-segment, pushHistory/undo/redo edge cases.
   - Ensure history snapshots are minimal and deduplicated.

6. Settings & persistence (low)
   - Persist user settings: current color, edge sensitivity, last-used export filename, preview zoom.

7. Accessibility & mobile friendliness (low)
   - Ensure menus are keyboard accessible and large enough for touch.
   - Consider long-press to open menus on touch devices.

8. TikZ export (medium)
   - Add a TikZ/LaTeX exporter that converts the current figure into a standalone .tex file using the TikZ package.
   - Features, implementation notes and acceptance criteria as previously documented.

Implementation notes / risks
--------------------------
- Rendering LaTeX onto the canvas is the trickiest piece: canvas API doesn't directly render HTML/SVG. We need to pre-render with KaTeX into an offscreen DIV/SVG and rasterize it (drawImage) or use SVG as a data URL. This can have performance cost for many labels.
- For performance on large graphs, consider caching rendered label images keyed by label string and font/style.

Estimate (rough)
----------------
- Investigation + KaTeX integration: 2-4 hours
- Implement per-label LaTeX toggle + rendering: 4-8 hours
- Edge sensitivity UI + persistence: 0.5-1 hour
- Hover tooltips + preview: 1-2 hours
- Tests & polish: 1-2 hours

Nice-to-have follow-ups
-----------------------
- Add an option to render labels as HTML overlay (absolutely-positioned elements) instead of drawing on canvas — simplifies LaTeX rendering but complicates panning/zoom and selection.
- Add a small UI to configure keyboard shortcuts.
- Add export as SVG with vector labels (if LaTeX is rendered as SVG, include inline SVG in exported file).

``` 
