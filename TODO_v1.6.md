
```markdown
TODO — v1.6 (planned)
======================
Goal: Add a global grid and snapping behavior for vertex placement.

Priority items
--------------
1. Global grid & snapping (high)
   - Add a global grid overlay (toggleable) with configurable spacing (e.g. 8px, 16px, 32px).
   - Implement vertex snapping to grid while placing and when moving vertices (optionally while holding a modifier key to temporarily disable snapping).
   - Provide settings in UI to enable/disable snapping and set grid size; persist settings in localStorage.
   - Acceptance criteria:
     - Grid can be toggled on/off and uses configurable spacing.
     - Vertex placement and moves snap to the grid when snapping is enabled.
     - Snapping can be temporarily disabled via a modifier (Shift) while placing/moving.

2. Grid visual options (low)
   - Option to show minor/major grid lines (different alpha), and change grid color/opacity.

Implementation notes
-------------------
- When snapping is enabled, round vertex coordinates to nearest grid intersection for placement and completed drags.
- Keep free (non-snapped) coordinates internally when snapping is disabled — only modify vertex coordinates when the user completes the action or if snapping is explicitly applied.
- Grid rendering should be lightweight (draw only visible lines within viewport / canvas bounds).

Estimate
--------
- Implement grid overlay + basic snapping: 1-2 hours
- Add UI controls & persistence: 1 hour
- Polish (modifier keys, visual options): 1-2 hours

``` 
