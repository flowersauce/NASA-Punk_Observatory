# NASA-Punk Observatory Transition Notes

## Current runtime API

`scripts/core/transition.js` exposes one browser-global object:

- `TransitionManager.init()` installs the readiness listener and the 1,500 ms
  startup reveal fallback. Entry pages call it automatically on
  `DOMContentLoaded`.
- `TransitionManager.navigate(url)` starts the exit curtain and assigns
  `window.location.href` after the CSS `animationend` event, with a 900 ms
  fallback. Repeated calls during one exit are ignored.

The transition module also dispatches `observatory:navigate-start` before the
exit animation. The particle builder uses that internal event to cancel active
surface-generation jobs before the page changes.

## Configuration and effects

There is currently no effect registry, plugin API, or `TRANSITION_CONFIG`
global. The curtain is the only built-in effect and is configured by
`styles/transition.css` and the shared tokens in `styles/tokens.css`.
Changing `window.TRANSITION_CONFIG`, or calling methods such as
`registerEffect`, `use`, `setEnabled`, `getConfig`, or
`getRegisteredEffects`, has no runtime effect because those methods are not
part of the current implementation.

The curtain remains opaque from the first paint: `html`, `body`, the WebGL
containers, and the fixed curtain use the deep-space token `#070b12`.

## Palette note

The two saturated `#4b70dd` marker dots in `styles/components.css` belong to
the Earth and Neptune planet identity markers. They are intentionally kept
separate from the shared cold technical-blue token `--const-blue: #5b789c`,
which is used for HUD and transition chrome; replacing them would change the
planet-specific visual mapping rather than unify semantic UI color.

## Non-regression rule

Any future transition extension must preserve direct `file://` opening,
offline operation, readiness-gated reveal, single-flight navigation, and the
opaque curtain unless the task explicitly changes those behaviors.
