# NASA-Punk: Observatory

[English README](README.en.md)

> Function over form.

![Offline Ready](https://img.shields.io/badge/Offline-Ready-success?style=flat-square&logo=rss)
![WebGL](https://img.shields.io/badge/Render-WebGL-blueviolet?style=flat-square&logo=webgl)
![Three.js](https://img.shields.io/badge/Core-Three.js-black?style=flat-square&logo=three.js)
![Procedural](https://img.shields.io/badge/Assets-Procedural_Generation-orange?style=flat-square&logo=codio)
![Textureless](https://img.shields.io/badge/Resources-Textureless-lightgrey?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)

## 项目简介

`NASA-Punk: Observatory` 是一个基于 WebGL 的交互式太阳系观测终端。项目以 NASA-Punk
风格为核心视觉方向，参考《Starfield》中的航天工业界面语言，构建了一套偏仪表化、终端化的静态网页体验。

项目坚持 `texture-less` 路线，不依赖外部贴图资源。星球表面、云层、大气、地形背景和部分 UI 装饰均通过程序化生成完成，因此整体体积较小，并支持离线运行。

## 项目特点

- 纯静态项目，直接由 `HTML + CSS + JavaScript` 构成，无构建步骤。
- 使用 [Three.js](https://threejs.org/) 进行 WebGL 渲染。
- 以 `Simplex Noise`、点云和粒子系统生成主要视觉细节。
- 支持统一首页入口，也支持直接进入单个星球页面。
- 适合本地离线预览，也适合作为动态壁纸页面使用。

## 如何运行

### 方式一：浏览器预览

直接使用现代浏览器打开根目录下的 `index.html` 即可进入首页导航。  
如果只想查看某个星球，也可以直接打开 `earth.html`、`saturn.html` 等页面文件。

### 方式二：Lively Wallpaper

1. 打开 Lively Wallpaper。
2. 选择 `Add Wallpaper`。
3. 导入项目根目录下的 `index.html`，即可将首页作为统一入口。
4. 如果需要固定某个星球，也可以直接导入对应的星球 HTML 页面。

## 技术栈

- 渲染引擎：`Three.js`
- 程序化生成：`simplex-noise`
- 页面形态：原生 `HTML / CSS / JavaScript`
- 视觉实现：点云、粒子系统、自定义着色器、程序化地形背景

## 代码结构

以下结构说明用于帮助使用者、协作者和维护者快速理解项目入口与资源分布，不涉及内部重构过程。

```text
NASA-Punk_Observatory/
|- index.html                 # 首页入口
|- earth.html ... sun.html    # 各星球页面入口
|- styles/                    # 样式文件
|- scripts/                   # 共享脚本、页面装配、配置与 vendor
|- docs/                      # 维护文档
```

## 视觉说明

项目当前使用的主要视觉语言包括：

- 主色：`#e06236`
- 辅助高亮：`#d7ab61`
- 警示色：`#c82337`
- 冷色背景与扫描元素：`#2f4c79`
- 标题字体：`Jura`
- 数据字体：`Roboto Mono`

## 维护说明

面向维护和开发的技术文档位于 [docs/README.md](docs/README.md)。

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

Per Aspera Ad Astra.
