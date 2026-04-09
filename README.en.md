# NASA-Punk: Observatory

[中文 README](README.md)

> Function over form.

![Offline Ready](https://img.shields.io/badge/Offline-Ready-success?style=flat-square&logo=rss)
![WebGL](https://img.shields.io/badge/Render-WebGL-blueviolet?style=flat-square&logo=webgl)
![Three.js](https://img.shields.io/badge/Core-Three.js-black?style=flat-square&logo=three.js)
![Procedural](https://img.shields.io/badge/Assets-Procedural_Generation-orange?style=flat-square&logo=codio)
![Textureless](https://img.shields.io/badge/Resources-Textureless-lightgrey?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)

## Overview

`NASA-Punk: Observatory` is an interactive solar-system observatory built with WebGL. The project follows a NASA-Punk visual direction inspired by the aerospace UI language popularized by *Starfield*, with a strong emphasis on instrument panels, terminal layouts, and procedural rendering.

The project is intentionally `texture-less`. Planet surfaces, clouds, atmospheres, topographic backgrounds, and parts of the UI decoration are generated procedurally at runtime, which keeps the project lightweight and fully offline-capable.

## Highlights

- Pure static project built with `HTML + CSS + JavaScript`
- WebGL rendering powered by [Three.js](https://threejs.org/)
- Procedural visuals based on `Simplex Noise`, point clouds, and particle systems
- Supports both a unified home page and direct entry into individual planet pages
- Works well for local preview and wallpaper-style usage

## How to Run

### Option 1: Browser Preview

Open `index.html` in a modern browser to enter the main navigation page.  
You can also open any planet page directly, such as `earth.html` or `saturn.html`.

### Option 2: Lively Wallpaper

1. Open Lively Wallpaper.
2. Choose `Add Wallpaper`.
3. Import `index.html` from the project root to use the home page as the main entry.
4. If needed, import any individual planet page instead.

## Tech Stack

- Rendering: `Three.js`
- Procedural generation: `simplex-noise`
- Page architecture: vanilla `HTML / CSS / JavaScript`
- Visual implementation: point clouds, particle systems, custom shaders, procedural topographic backgrounds

## Code Structure

This section is intended to help users, collaborators, and maintainers understand the main entry points and resource layout. It does not describe the internal refactor process.

```text
NASA-Punk_Observatory/
|- index.html                 # Home page entry
|- earth.html ... sun.html    # Planet page entries
|- styles/                    # Stylesheets
|- scripts/                   # Shared scripts, page assembly, config, and vendor assets
|- docs/                      # Maintenance documentation
```

## Visual Language

The current visual language is built around:

- Primary color: `#e06236`
- Secondary highlight: `#d7ab61`
- Warning color: `#c82337`
- Cool background and scan elements: `#2f4c79`
- Title font: `Jura`
- Data font: `Roboto Mono`

## Maintenance Notes

Technical and maintenance-oriented documentation is indexed in [docs/README.md](docs/README.md).

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

Per Aspera Ad Astra.
