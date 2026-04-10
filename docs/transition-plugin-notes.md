# NASA-Punk Observatory Transition Plugin Notes

## Goal

The transition system should support:

- keeping the current curtain animation as the default
- switching to another animation style later
- disabling transitions entirely

This must not change the current visual result unless configuration explicitly requests a different effect.

## Current runtime contract

`TransitionManager` now exposes:

- `TransitionManager.navigate(url)`
- `TransitionManager.registerEffect(name, effect)`
- `TransitionManager.use(name)`
- `TransitionManager.setEnabled(enabled)`
- `TransitionManager.getConfig()`
- `TransitionManager.getRegisteredEffects()`

## Built-in effects

- `curtain`
    - current default effect
    - preserves the existing intro and exit behavior
- `none`
    - disables animation and navigates immediately

## Optional global configuration

Set a global `window.TRANSITION_CONFIG` before `transition.js` loads:

```js
window.TRANSITION_CONFIG = {
    effect: 'curtain',
    enabled: true
};
```

Example with transitions disabled:

```js
window.TRANSITION_CONFIG = {
    effect: 'none',
    enabled: false
};
```

## Effect plugin shape

A transition effect plugin should provide:

```js
{
    init: function ()
    {
    }
,
    navigate: function (url)
    {
    }
}
```

Rules:

- `init()` should prepare any DOM or startup animation it needs.
- `navigate(url)` is responsible for finishing navigation.
- If an effect cannot run safely, it should fall back to direct navigation.

## Non-regression rule

Any new transition plugin must not alter the current curtain effect unless the task explicitly asks for a change.
