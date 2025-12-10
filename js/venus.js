// ==========================================
// NASA-Punk Project: SOL-II (VENUS) - CHAOS & DENSITY CORRECTED
// ==========================================

// --- PART 1: 基础观测背景 (保持不变) ---
const topoCanvas = document.getElementById('topo-canvas');
const ctx        = topoCanvas.getContext('2d');
const simplex    = new SimplexNoise();

const BG_CONFIG = {
    gridSize  : 5,
    noiseScale: 0.002,
    levels    : 6,
    lineColor : '#3b4e6b',
    lineWidth : 1.8,
    starCount : 150,
    gridAlpha : 0.05
};

let stars = [];

function resizeBgCanvas()
{
    topoCanvas.width  = window.innerWidth;
    topoCanvas.height = window.innerHeight;
    initStars();
    drawTopo();
}

function initStars()
{
    stars = [];
    for (let i = 0; i < BG_CONFIG.starCount; i++)
    {
        stars.push({
            x      : Math.random() * window.innerWidth,
            y      : Math.random() * window.innerHeight,
            size   : Math.random() * 1.5 + 0.3,
            opacity: Math.random() * 0.6 + 0.1
        });
    }
}

function getIsoT(val1, val2, isoValue)
{
    if (Math.abs(val2 - val1) < 0.00001) return 0.5;
    return (isoValue - val1) / (val2 - val1);
}

function drawTopo()
{
    ctx.clearRect(0, 0, topoCanvas.width, topoCanvas.height);

    ctx.fillStyle = "rgba(255, 170, 0, 0.03)";
    ctx.fillRect(0, 0, topoCanvas.width, topoCanvas.height);

    ctx.beginPath();
    ctx.strokeStyle = BG_CONFIG.lineColor;
    ctx.lineWidth   = 1;
    ctx.globalAlpha = BG_CONFIG.gridAlpha;
    const gridStep  = 120;

    for (let x = 0; x <= topoCanvas.width; x += gridStep) {
        ctx.moveTo(x, 0); ctx.lineTo(x, topoCanvas.height);
    }
    for (let y = 0; y <= topoCanvas.height; y += gridStep) {
        ctx.moveTo(0, y); ctx.lineTo(topoCanvas.width, y);
    }
    ctx.stroke();

    ctx.globalAlpha = BG_CONFIG.gridAlpha * 2.5;
    const crossSize = 3;
    for (let x = 0; x <= topoCanvas.width; x += gridStep) {
        for (let y = 0; y <= topoCanvas.height; y += gridStep) {
            ctx.beginPath();
            ctx.moveTo(x - crossSize, y); ctx.lineTo(x + crossSize, y);
            ctx.moveTo(x, y - crossSize); ctx.lineTo(x, y + crossSize);
            ctx.stroke();
        }
    }

    ctx.fillStyle = '#ffffff';
    stars.forEach(star => {
        ctx.globalAlpha = star.opacity;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
    });

    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = BG_CONFIG.lineColor;
    ctx.lineWidth   = BG_CONFIG.lineWidth;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';

    const cols  = Math.ceil(topoCanvas.width / BG_CONFIG.gridSize) + 1;
    const rows  = Math.ceil(topoCanvas.height / BG_CONFIG.gridSize) + 1;
    const field = [];

    for (let i = 0; i <= cols; i++) {
        field[i] = [];
        for (let j = 0; j <= rows; j++) {
            field[i][j] = (simplex.noise2D(i * BG_CONFIG.gridSize * BG_CONFIG.noiseScale + 200, j * BG_CONFIG.gridSize * BG_CONFIG.noiseScale + 200) + 1) / 2;
        }
    }

    const step = 1 / BG_CONFIG.levels;
    for (let level = 0.2; level < 0.8; level += step) {
        ctx.beginPath();
        for (let i = 0; i < cols - 1; i++) {
            for (let j = 0; j < rows - 1; j++) {
                const x = i * BG_CONFIG.gridSize;
                const y = j * BG_CONFIG.gridSize;
                const valTL = field[i][j];
                const valTR = field[i + 1][j];
                const valBR = field[i + 1][j + 1];
                const valBL = field[i][j + 1];

                let state = 0;
                if (valTL >= level) state |= 8;
                if (valTR >= level) state |= 4;
                if (valBR >= level) state |= 2;
                if (valBL >= level) state |= 1;

                const a = {x: x + BG_CONFIG.gridSize * getIsoT(valTL, valTR, level), y: y};
                const b = {x: x + BG_CONFIG.gridSize, y: y + BG_CONFIG.gridSize * getIsoT(valTR, valBR, level)};
                const c = {x: x + BG_CONFIG.gridSize * getIsoT(valBL, valBR, level), y: y + BG_CONFIG.gridSize};
                const d = {x: x, y: y + BG_CONFIG.gridSize * getIsoT(valTL, valBL, level)};

                switch (state) {
                    case 1: ctx.moveTo(c.x, c.y); ctx.lineTo(d.x, d.y); break;
                    case 2: ctx.moveTo(b.x, b.y); ctx.lineTo(c.x, c.y); break;
                    case 3: ctx.moveTo(b.x, b.y); ctx.lineTo(d.x, d.y); break;
                    case 4: ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); break;
                    case 5: ctx.moveTo(a.x, a.y); ctx.lineTo(d.x, d.y); ctx.moveTo(b.x, b.y); ctx.lineTo(c.x, c.y); break;
                    case 6: ctx.moveTo(a.x, a.y); ctx.lineTo(c.x, c.y); break;
                    case 7: ctx.moveTo(a.x, a.y); ctx.lineTo(d.x, d.y); break;
                    case 8: ctx.moveTo(a.x, a.y); ctx.lineTo(d.x, d.y); break;
                    case 9: ctx.moveTo(a.x, a.y); ctx.lineTo(c.x, c.y); break;
                    case 10: ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.moveTo(c.x, c.y); ctx.lineTo(d.x, d.y); break;
                    case 11: ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); break;
                    case 12: ctx.moveTo(b.x, b.y); ctx.lineTo(d.x, d.y); break;
                    case 13: ctx.moveTo(b.x, b.y); ctx.lineTo(c.x, c.y); break;
                    case 14: ctx.moveTo(c.x, c.y); ctx.lineTo(d.x, d.y); break;
                }
            }
        }
        ctx.stroke();
    }
}

resizeBgCanvas();


// ==========================================
// PART 2: Three.js 场景初始化
// ==========================================
const scene  = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 1000);

let currentZoom    = 25;
const INITIAL_ZOOM = 25;
camera.position.z  = currentZoom;

const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha    : true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.getElementById('canvas-container').appendChild(renderer.domElement);

const zoomDisplay = document.getElementById('zoom-text-display');
const tgtLabel    = document.querySelector('.monitor-label.label-bottom');

const group = new THREE.Group();
scene.add(group);

// 1. 倾角容器 (金星轴倾角极大 ~177度)
const planetTiltGroup      = new THREE.Group();
planetTiltGroup.rotation.z = 177 * (Math.PI / 180);
group.add(planetTiltGroup);

// 2. 自转容器 - CORE (地表，慢速自转)
const venusSurfaceGroup = new THREE.Group();
planetTiltGroup.add(venusSurfaceGroup);

// 3. 自转容器 - CLOUDS (大气，超自转)
const cloudGroup = new THREE.Group();
planetTiltGroup.add(cloudGroup);


// --- PART 3: 程序化金星主体 (双层点云结构) ---
let cloudPoints;
const coreRadius = 5.0;

// --- A. 地表点云 (Inner Surface: Magma Chaos) ---
function createVenusSurface() {
    const surfaceParticles = 40000;
    const surfacePos       = [];
    const surfaceColors    = [];
    const noiseGen         = new SimplexNoise('venus-magma-chaos-rock');

    // [NEW PALETTE] 模拟岩浆的高对比度色板
    const colBase  = new THREE.Color('#8b1a1a'); // 深岩浆红
    const colHigh  = new THREE.Color('#d9531e'); // 亮熔岩橙
    const colPeak  = new THREE.Color('#ffe0a0'); // 极热点黄

    for (let i = 0; i < surfaceParticles; i++)
    {
        const r     = coreRadius;
        const theta = Math.random() * Math.PI * 2;
        const phi   = Math.acos(2 * Math.random() - 1);

        let x = r * Math.sin(phi) * Math.cos(theta);
        let y = r * Math.sin(phi) * Math.sin(theta);
        let z = r * Math.cos(phi);

        // 高频噪波用于混沌化颜色
        let nChaos = 0;
        nChaos += noiseGen.noise3D(x * 1.5, y * 1.5, z * 1.5) * 0.8;
        nChaos += noiseGen.noise3D(x * 4.0, y * 4.0, z * 4.0) * 0.2; // 细节裂缝

        // [FIX 1] 极小的起伏，保持形状完美
        const heightMod = noiseGen.noise3D(x * 0.2, y * 0.2, z * 0.2) * 0.005;

        x *= (1 + heightMod / r);
        y *= (1 + heightMod / r);
        z *= (1 + heightMod / r);

        surfacePos.push(x, y, z);

        // 基于噪波值进行高对比度着色
        let c = new THREE.Color();
        let val = (nChaos + 1) / 2;

        if (val < 0.5) {
            c.copy(colBase).lerp(colHigh, val * 2.0);
        } else {
            c.copy(colHigh).lerp(colPeak, (val - 0.5) * 2.0);
        }

        c.multiplyScalar(0.9 + Math.random() * 0.2);
        surfaceColors.push(c.r, c.g, c.b);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(surfacePos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(surfaceColors, 3));

    const mat = new THREE.PointsMaterial({
        size: 0.055,
        vertexColors: true,
        transparent: true,
        opacity: 0.95,
        sizeAttenuation: true
    });
    venusSurfaceGroup.add(new THREE.Points(geo, mat));
}
createVenusSurface();


// --- B. 大气点云 (Outer Atmosphere: Density Reduced) ---

function createVenusClouds() {
    // [FIX 2] 粒子数量减半
    const cloudParticles = 45000;
    const cloudPos       = [];
    const cloudColors    = [];
    const cloudGen       = new SimplexNoise('venus-atmosphere-sulphur');

    const colBase   = new THREE.Color('#ffae20');

    for (let i = 0; i < cloudParticles; i++)
    {
        // [FIX 1] 粒子均匀分布在球壳内，位置上无噪波扰动
        const r     = coreRadius + Math.random() * 0.4;
        const theta = Math.random() * Math.PI * 2;
        const phi   = Math.acos(2 * Math.random() - 1);

        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.sin(phi) * Math.sin(theta);
        const z = r * Math.cos(phi);

        cloudPos.push(x, y, z);

        let c = colBase.clone();
        c.multiplyScalar(0.9 + Math.random() * 0.2);

        cloudColors.push(c.r, c.g, c.b);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(cloudPos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(cloudColors, 3));

    const mat = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.06,
        vertexColors: true,
        transparent: true,
        opacity: 0.2,
        sizeAttenuation: true
    });

    cloudPoints = new THREE.Points(geo, mat);
    cloudGroup.add(cloudPoints);

    // 测量网格
    const wireGeo = new THREE.WireframeGeometry(new THREE.SphereGeometry(coreRadius + 0.1, 24, 12));
    const wireMat = new THREE.LineBasicMaterial({
        color      : '#ffc140',
        transparent: true,
        opacity    : 0.05
    });
    planetTiltGroup.add(new THREE.LineSegments(wireGeo, wireMat));
}

createVenusClouds();


// ==========================================
// PART 4: 交互与动画循环
// ==========================================

// 初始化交互模块
initInteraction(group, INITIAL_ZOOM);

if (typeof InteractionState !== 'undefined')
{
    InteractionState.targetRotationX = -0.2;
    InteractionState.targetRotationY = 0.0;
}
group.rotation.x = -0.2;
group.rotation.y = 0.0;

function animate()
{
    requestAnimationFrame(animate);

    // 1. 地表逆行自转 (极慢)
    venusSurfaceGroup.rotation.y -= 0.0002;

    // 2. 大气超自转 (快 7.5 倍)
    cloudGroup.rotation.y -= 0.0015;

    // 3. 云层颜色动画 (仅通过颜色/亮度变化模拟流动)
    const time = Date.now() * 0.00005;
    const colors = cloudPoints.geometry.attributes.color.array;
    const positions = cloudPoints.geometry.attributes.position.array;
    const noiseGen = new SimplexNoise('venus-atmosphere-flow');

    const colBase = new THREE.Color('#ffae20');

    for (let i = 0; i < positions.length / 3; i++) {
        let x = positions[i * 3];
        let y = positions[i * 3 + 1];
        let z = positions[i * 3 + 2];

        const flowNoise = noiseGen.noise3D(x * 0.2 + time, y * 0.2 + time, z * 0.2 + time);

        const brightness = 1.0 + flowNoise * 0.25;

        const c = colBase.clone().multiplyScalar(brightness);

        colors[i * 3]     = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;
    }

    cloudPoints.geometry.attributes.color.needsUpdate = true;

    // 4. 视角和缩放控制
    currentZoom = updateInteraction(group, camera, zoomDisplay, currentZoom);

    // 5. 遥测数据更新 (以云层组作为参考系，因为它是主要视觉对象)
    updatePlanetTelemetry(cloudGroup, tgtLabel, 2);

    renderer.render(scene, camera);
}

animate();