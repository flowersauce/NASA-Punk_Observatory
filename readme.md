# 🔭 NASA-Punk : Observatory

> "Function over form."

![Offline Ready](https://img.shields.io/badge/Offline-Ready-success?style=flat-square&logo=rss)
![WebGL](https://img.shields.io/badge/Render-WebGL-blueviolet?style=flat-square&logo=webgl)
![Three.js](https://img.shields.io/badge/Core-Three.js-black?style=flat-square&logo=three.js)
![Procedural](https://img.shields.io/badge/Assets-Procedural_Generation-orange?style=flat-square&logo=codio)
![Textureless](https://img.shields.io/badge/Resources-Textureless-lightgrey?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)

**NASA-Punk : Observatory** 是一个基于 WebGL 的交互式天体观测终端。它采用 **NASA-Punk（NASA 朋克）** 美学风格——一种由游戏《Starfield》提出的视觉语言。

本项目**完全不依赖外部纹理图片** (Texture-less)，所有星球表面、云层、光环和大气效果均由 **噪声算法 (Simplex Noise)** 和 **粒子系统 (Particle Systems)** 实时程序化生成。这意味着它体积极小，且支持**完全离线运行**。

---

## 🛠️ 技术栈 (Tech Stack)

* **Core**: [Three.js](https://threejs.org/) (WebGL 渲染引擎)
* **Math**: `simplex-noise.js` (过程式纹理生成)
* **Styling**: CSS3 (NASA-Punk 风格 UI，独特的彩条与排版)
* **Rendering**:
  * **Point Cloud**: 90% 的视觉元素由 `THREE.Points` 构成，以获得雷达扫描般的视觉质感。
  * **Shaders**: 自定义着色器材质用于处理光环的开普勒运动与粒子着色。

---

## 🚀 如何运行 (How to Run)

### 选项 A: 动态壁纸 (Lively Wallpaper)

1.  **添加项目**: 打开 Lively Wallpaper，点击左上角的 **`+` (Add Wallpaper)**。
2.  **选择文件**: 点击 "Open File" 或拖入文件，直接选择 `NASA-Punk_Observatory` 文件夹内的 **`index.html`** 文件。
  * *提示：**`index.html` 是统一导航页**，选择它可以进入菜单界面来切换不同的天体观测终端。*
  * *进阶提示：你仍然可以选择**任意一个星球的 HTML 文件** (例如 `earth.html`, `saturn.html`) 作为主壁纸，这样可以**跳过导航页**，直接进入指定的观测终端。*
3.  **完成**: 设置标题，点击 OK 即可应用。

### 选项 B: 浏览器预览

直接使用现代浏览器（Chrome / Edge / Firefox）双击打开根目录下的 **`index.html`** 即可进入导航页。你也可以双击打开任何一个星球的 HTML 文件直接进入对应的观测终端。

---

## 🎨 视觉风格指南 (Visual Guide)

* **Color Palette**:
  本项目严格遵循 **Starfield / Constellation** 官方配色标准，确保全系统视觉统一：

| Color Name                  | Hex Code  | Usage              |
| :-------------------------- | :-------- | :----------------- |
| 🔴 **Constellation Red** | `#c82337` | 警告 / 异常数值    |
| 🟠 **Constellation Orange** | `#e06236` | 主色调 / 锁定框 / 重要数据 |
| 🟡 **Constellation Yellow** | `#d7ab61` | 高亮文本 / 土星光环 / 辅助图形 |
| 🔵 **Constellation Blue** | `#2f4c79` | 背景装饰 / 扫描仪 / UI 基调 |

* **Typography**:
  * Titles: `Jura` (未来感，宽字重)
  * Data: `Roboto Mono` (等宽，工业感)

---

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

> *Per Aspera Ad Astra.*