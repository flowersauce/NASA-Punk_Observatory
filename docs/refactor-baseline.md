# NASA-Punk Observatory Refactor Baseline

## Non-regression checklist

- `index.html` can navigate to all planet pages.
- Every planet page can return to `index.html` via `TransitionManager.navigate`.
- Transition curtain intro/exit animations still work.
- Vertical zoom slider updates camera zoom and text display.
- Telemetry line (`RA/DEC`) updates continuously.

## Shared/repeated structures identified

- Planet pages share the same shell:
    - right dock
    - vertical zoom slider
    - system monitor block
    - script loading order
- Planet scripts repeat the same topography background renderer (canvas + stars + marching squares).
- Minor per-planet differences:
    - monitor highlight target
    - topography noise seed offset / tint
    - Three.js scene setup specifics

## Old -> New structure mapping (phase 2 target)

- `css/style.css` -> `styles/components.css`
- `css/transition.css` -> `styles/transition.css`
- `js/three.min.js` -> `scripts/vendor/three.min.js`
- `js/simplex-noise.min.js` -> `scripts/vendor/simplex-noise.min.js`
- `js/interaction.js` -> `scripts/core/interaction.js`
- `js/telemetry.js` -> `scripts/core/telemetry.js`
- `js/transition.js` -> `scripts/core/transition.js`
- `js/index.js` -> `scripts/pages/index.page.js`
- `js/{planet}.js` -> `scripts/planets/{planet}.js`
- `N/A` -> `scripts/components/topoRenderer.js` (new shared topography module)

Current migration progress:

- All planet runtimes have been migrated to `scripts/planets/{planet}.js`.
- Vendor dependencies have been moved to `scripts/vendor/`.
- Root `css/` and root `js/` have been removed.

## Known inconsistencies fixed in this refactor scope

- `sun.js` and `uranus.js` used `zoom-display` id while HTML uses `zoom-text-display`.
