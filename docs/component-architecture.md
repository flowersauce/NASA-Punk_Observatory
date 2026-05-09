# NASA-Punk Observatory Component Architecture

## Goal

This refactor is governed by one hard constraint:

- Do not change the visual result, DOM contract, or interaction behavior established by the latest committed version
  unless a task explicitly asks for a behavior change.

The purpose of this document is to define where code should live as the project moves from duplicated page scripts
toward a reusable NASA-Punk UI kit.

## Non-regression rule

Any refactor in `scripts/`, `styles/`, or page HTML should preserve:

- Existing class names used by CSS.
- Existing DOM structure expected by current scripts and selectors.
- Existing script loading order dependencies.
- Existing animation timing and navigation behavior.
- Existing text content unless content work is explicitly requested.

When in doubt, prefer extracting configuration or pure render helpers over changing markup shape.

## Layer model

### 1. Foundation layer

Files:

- `styles/tokens.css`
- `styles/base.css`
- `styles/utilities.css`
- `styles/transition.css`
- `scripts/core/display.js`
- `scripts/core/interaction.js`
- `scripts/core/serif.js`
- `scripts/core/telemetry.js`
- `scripts/core/transition.js`

Responsibility:

- Cross-page primitives.
- Design tokens, reset/base rules, utilities.
- Shared behavior systems that do not own page-specific markup.
- Optional page-edge serif system that reserves display-area space.

These files should avoid page-specific copy and planet-specific content.

### Foreground layout model

The viewport is split into a full-screen background layer and a foreground layout layer.

Background:

- remains viewport-wide
- includes the page background color and `#topo-canvas`

Foreground:

- is split into an optional serif region and the display region
- all non-background, non-serif content belongs to the display region
- current display roots are `#canvas-container`, `#ui-layer`, and `#system-select-root`

A serif is a page-edge component that can reserve part of the viewport for framing or brand structure. The remaining
area is the display region where page UI and WebGL content should align.

Display area variables:

- `--display-top-inset`
- `--display-right-inset`
- `--display-bottom-inset`
- `--display-left-inset`
- `--display-width`
- `--display-height`
- `--display-ui-padding`

Current built-in styles:

- `segmented-colorbar-right`
    - right-edge serif
    - preserves the historical segmented brand stripe visual
    - reserves `--segmented-colorbar-serif-size`, equal to stripe width plus outer edge gap
    - places the stripe itself at `--segmented-colorbar-outer-gap`
- `segmented-colorbar-left`
    - left-edge mirror of `segmented-colorbar-right`
    - preserves the same top-to-bottom horizon color order
- `stacked-colorbar-top`
    - top-edge mirror of `stacked-colorbar-bottom`
    - stacks four horizontal color bands, each matching `--segmented-colorbar-stripe-width`
    - keeps the blue band on the outer viewport edge
- `stacked-colorbar-bottom`
    - bottom-edge serif
    - uses the same project color tokens as the historical stripe
    - stacks four horizontal color bands, each matching `--segmented-colorbar-stripe-width`
    - keeps the blue band on the outer viewport edge
- `stacked-colorbar-left`
    - left-edge serif
    - uses the same project color tokens as the historical stripe
    - stacks four vertical color bands, each matching `--segmented-colorbar-stripe-width`
    - keeps the blue band on the outer viewport edge
- `stacked-colorbar-right`
    - right-edge mirror of `stacked-colorbar-left`
    - stacks four vertical color bands, each matching `--segmented-colorbar-stripe-width`
    - keeps the blue band on the outer viewport edge

Rules:

- A concrete serif style owns one fixed edge.
- Add another style for another edge instead of making one style change direction at runtime.
- The active serif style reserves display space only on its own edge so the serif region and display region touch directly.
- HUD placement should use equal `--display-ui-padding` as explicit offsets from the display region edges.
- Do not rely on padding on `#ui-layer` or `#system-select-root` for absolutely positioned HUD elements.
- Multi-part HUD controls should expose one outer shell for alignment and keep visual sub-elements inside that shell.
- Main UI should align to display inset and display padding variables instead of hardcoded viewport offsets.
- Runtime code should measure foreground render targets through `DisplayArea.getSize(...)`.
- Colorbar serif colors represent the horizon palette. For stacked edge bars, the outer viewport edge is treated as the horizon side and should keep the blue band at the edge. For vertical segmented bars, top-to-bottom order should stay red, orange, yellow, blue.

### 2. Reusable component layer

Files:

- `scripts/components/observatoryUi.js`
- `scripts/components/topoRenderer.js`

Responsibility:

- Shared UI building blocks used by multiple pages.
- Shared visual modules that can be mounted by different page entries.

Current examples:

- Right dock shell
- Horizontal and vertical zoom controls
- Topography background renderer

Rule:

- Components in this layer should accept config and return deterministic markup or behavior.
- They should not hardcode page identity unless the component itself is inherently page-specific.

### 3. Page-assembly component layer

Files:

- `scripts/components/planetUi.js`
- `scripts/components/systemSelectUi.js`

Responsibility:

- Assemble page-specific sections from reusable building blocks.
- Preserve the exact page markup contract while moving duplication out of HTML files.

Examples:

- Planet page shell assembly
- System select stage assembly
- System monitor assembly

Rule:

- These files may know page structure.
- They should still prefer composition over inline duplicated strings.

### 4. Configuration layer

Files:

- `scripts/planets/config.js`
- `scripts/components/systemSelect.config.js`

Responsibility:

- Store copy, page metadata, monitor state, layout constants, and other stable inputs.
- Keep rendering logic out of config files.

Rule:

- If a value can change without requiring structural code changes, it belongs in config.
- If a value changes HTML structure or event behavior, it belongs in component or page logic.

### 5. Page entry layer

Files:

- `scripts/pages/index.page.js`
- `scripts/pages/planet.page.js`

Responsibility:

- Initialize one page.
- Mount UI into the existing page root.
- Wire runtime behavior after markup is rendered.

Rule:

- Page entry files should stay thin.
- They should orchestrate components and config, not own large markup blobs.

### 6. Planet runtime layer

Files:

- `scripts/planets/*.js`

Responsibility:

- Planet-specific Three.js runtime and rendering behavior.
- Scene setup that is inherently unique to a target body.

Rule:

- Keep shared UI and shared DOM out of these files.
- Keep planet-specific rendering here until enough similarity exists for safe extraction.

## Current public contracts

These are effectively stable interfaces inside the refactor:

- `ObservatoryUI.buildRightDock(config)`
- `ObservatoryUI.buildHorizontalZoomControl(config)`
- `ObservatoryUI.buildVerticalZoomControl(config)`
- `renderSystemSelectUI()`
- `renderPlanetUI(planetName)`
- `PLANET_UI_CONFIG`
- `SYSTEM_SELECT_CONFIG`

If these contracts change, update all call sites in the same change and verify that rendered output remains identical.

## Recommended extraction order

Use this order for future work to minimize regressions:

1. Extract constants and copy into config.
2. Extract pure markup builders that preserve existing class names and node order.
3. Compose builders behind the existing page entry points.
4. Only after stability is proven, consider introducing more formal component APIs.

## What not to do during refactor

- Do not rename CSS classes just for consistency.
- Do not rewrite HTML shape if CSS or scripts already depend on it.
- Do not merge page-specific rendering code into a generic abstraction too early.
- Do not change page behavior and call it refactor.

## Definition of done for a safe refactor step

A refactor step is acceptable when:

- The generated page markup is effectively unchanged in structure and styling hooks.
- Visual output matches the previous committed version.
- Existing navigation and control behavior still work.
- New code makes ownership clearer: foundation, component, config, or page entry.
