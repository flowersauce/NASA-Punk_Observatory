// ==========================================
// NASA-Punk Project: SOL-IV (MARS) - POINT CLOUD MOONS
// ==========================================

// --- PART 1: 基础观测背景 ---
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
    if (Math.abs(val2 - val1) < 0.00001)
    {
        return 0.5;
    }
    return (isoValue - val1) / (val2 - val1);
}

function drawTopo()
{
    ctx.clearRect(0, 0, topoCanvas.width, topoCanvas.height);

    ctx.fillStyle = "rgba(221, 79, 49, 0.04)";
    ctx.fillRect(0, 0, topoCanvas.width, topoCanvas.height);

    ctx.beginPath();
    ctx.strokeStyle = BG_CONFIG.lineColor;
    ctx.lineWidth   = 1;
    ctx.globalAlpha = BG_CONFIG.gridAlpha;
    const gridStep  = 120;

    for (let x = 0; x <= topoCanvas.width; x += gridStep)
    {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, topoCanvas.height);
    }
    for (let y = 0; y <= topoCanvas.height; y += gridStep)
    {
        ctx.moveTo(0, y);
        ctx.lineTo(topoCanvas.width, y);
    }
    ctx.stroke();

    ctx.globalAlpha = BG_CONFIG.gridAlpha * 2.5;
    const crossSize = 3;
    for (let x = 0; x <= topoCanvas.width; x += gridStep)
    {
        for (let y = 0; y <= topoCanvas.height; y += gridStep)
        {
            ctx.beginPath();
            ctx.moveTo(x - crossSize, y);
            ctx.lineTo(x + crossSize, y);
            ctx.moveTo(x, y - crossSize);
            ctx.lineTo(x, y + crossSize);
            ctx.stroke();
        }
    }

    ctx.fillStyle = '#ffffff';
    stars.forEach(star =>
    {
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

    for (let i = 0; i <= cols; i++)
    {
        field[i] = [];
        for (let j = 0; j <= rows; j++)
        {
            field[i][j] = (simplex.noise2D(i * BG_CONFIG.gridSize * BG_CONFIG.noiseScale + 300, j * BG_CONFIG.gridSize * BG_CONFIG.noiseScale + 300) + 1) / 2;
        }
    }

    const step = 1 / BG_CONFIG.levels;
    for (let level = 0.2; level < 0.8; level += step)
    {
        ctx.beginPath();
        for (let i = 0; i < cols - 1; i++)
        {
            for (let j = 0; j < rows - 1; j++)
            {
                const x     = i * BG_CONFIG.gridSize;
                const y     = j * BG_CONFIG.gridSize;
                const valTL = field[i][j];
                const valTR = field[i + 1][j];
                const valBR = field[i + 1][j + 1];
                const valBL = field[i][j + 1];

                let state = 0;
                if (valTL >= level)
                {
                    state |= 8;
                }
                if (valTR >= level)
                {
                    state |= 4;
                }
                if (valBR >= level)
                {
                    state |= 2;
                }
                if (valBL >= level)
                {
                    state |= 1;
                }

                const a = {x: x + BG_CONFIG.gridSize * getIsoT(valTL, valTR, level), y: y};
                const b = {x: x + BG_CONFIG.gridSize, y: y + BG_CONFIG.gridSize * getIsoT(valTR, valBR, level)};
                const c = {x: x + BG_CONFIG.gridSize * getIsoT(valBL, valBR, level), y: y + BG_CONFIG.gridSize};
                const d = {x: x, y: y + BG_CONFIG.gridSize * getIsoT(valTL, valBL, level)};

                switch (state)
                {
                    case 1:
                        ctx.moveTo(c.x, c.y);
                        ctx.lineTo(d.x, d.y);
                        break;
                    case 2:
                        ctx.moveTo(b.x, b.y);
                        ctx.lineTo(c.x, c.y);
                        break;
                    case 3:
                        ctx.moveTo(b.x, b.y);
                        ctx.lineTo(d.x, d.y);
                        break;
                    case 4:
                        ctx.moveTo(a.x, a.y);
                        ctx.lineTo(b.x, b.y);
                        break;
                    case 5:
                        ctx.moveTo(a.x, a.y);
                        ctx.lineTo(d.x, d.y);
                        ctx.moveTo(b.x, b.y);
                        ctx.lineTo(c.x, c.y);
                        break;
                    case 6:
                        ctx.moveTo(a.x, a.y);
                        ctx.lineTo(c.x, c.y);
                        break;
                    case 7:
                        ctx.moveTo(a.x, a.y);
                        ctx.lineTo(d.x, d.y);
                        break;
                    case 8:
                        ctx.moveTo(a.x, a.y);
                        ctx.lineTo(d.x, d.y);
                        break;
                    case 9:
                        ctx.moveTo(a.x, a.y);
                        ctx.lineTo(c.x, c.y);
                        break;
                    case 10:
                        ctx.moveTo(a.x, a.y);
                        ctx.lineTo(b.x, b.y);
                        ctx.moveTo(c.x, c.y);
                        ctx.lineTo(d.x, d.y);
                        break;
                    case 11:
                        ctx.moveTo(a.x, a.y);
                        ctx.lineTo(b.x, b.y);
                        break;
                    case 12:
                        ctx.moveTo(b.x, b.y);
                        ctx.lineTo(d.x, d.y);
                        break;
                    case 13:
                        ctx.moveTo(b.x, b.y);
                        ctx.lineTo(c.x, c.y);
                        break;
                    case 14:
                        ctx.moveTo(c.x, c.y);
                        ctx.lineTo(d.x, d.y);
                        break;
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

// [CONFIG] 保持拉远的视角以容纳卫星
let currentZoom    = 30;
const INITIAL_ZOOM = 30;
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

// 1. 倾角容器
const planetTiltGroup      = new THREE.Group();
planetTiltGroup.rotation.z = 25.19 * (Math.PI / 180);
group.add(planetTiltGroup);

// 2. 自转容器 - CORE (承载地表)
const marsSurfaceGroup = new THREE.Group();
planetTiltGroup.add(marsSurfaceGroup);

// 3. 自转容器 - ATMOS (承载大气)
const marsAtmosGroup = new THREE.Group();
planetTiltGroup.add(marsAtmosGroup);

// 4. 卫星系统容器
const marsMoonGroup = new THREE.Group();
planetTiltGroup.add(marsMoonGroup);


// --- PART 3: 程序化火星主体 ---
const coreRadius = 5.0;
let moonsData    = [];

// --- A. 地表点云 (Surface: Dusty Rock) ---
function createMarsSurface()
{
    const surfaceParticles = 50000;
    const surfacePos       = [];
    const surfaceColors    = [];
    const noiseGen         = new SimplexNoise('mars-craters-dust');

    const colBase  = new THREE.Color('#94544d');
    const colDark  = new THREE.Color('#6b433c');
    const colLight = new THREE.Color('#d98c6b');

    for (let i = 0; i < surfaceParticles; i++)
    {
        const r     = coreRadius;
        const theta = Math.random() * Math.PI * 2;
        const phi   = Math.acos(2 * Math.random() - 1);

        let x = r * Math.sin(phi) * Math.cos(theta);
        let y = r * Math.sin(phi) * Math.sin(theta);
        let z = r * Math.cos(phi);

        let nBase   = noiseGen.noise3D(x * 0.3, y * 0.3, z * 0.3);
        let nDetail = noiseGen.noise3D(x * 1.5, y * 1.5, z * 1.5);
        let nCrater = Math.abs(noiseGen.noise3D(x * 2.5, y * 2.5, z * 2.5));

        const canyonFactor = (x > 0 && y < 0.5 && y > -0.5) ? Math.abs(z / r) : 0;

        const heightMod = nBase * 0.04 + nDetail * 0.02 - nCrater * 0.05 - canyonFactor * 0.03;

        x *= (1 + heightMod / r);
        y *= (1 + heightMod / r);
        z *= (1 + heightMod / r);

        surfacePos.push(x, y, z);

        let c   = new THREE.Color();
        let val = (nBase + 1) / 2;

        if (nCrater > 0.7)
        {
            c.copy(colDark);
        }
        else if (val > 0.6 || canyonFactor > 0.1)
        {
            c.copy(colLight).lerp(colBase, 0.3);
        }
        else
        {
            c.copy(colBase);
        }

        c.multiplyScalar(0.9 + Math.random() * 0.2);
        surfaceColors.push(c.r, c.g, c.b);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(surfacePos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(surfaceColors, 3));

    const mat = new THREE.PointsMaterial({
        size           : 0.055,
        vertexColors   : true,
        transparent    : true,
        opacity        : 0.95,
        sizeAttenuation: true
    });
    marsSurfaceGroup.add(new THREE.Points(geo, mat));

    // 测量网格
    const wireGeo = new THREE.WireframeGeometry(new THREE.SphereGeometry(coreRadius + 0.02, 24, 12));
    const wireMat = new THREE.LineBasicMaterial({
        color      : '#dd4f31',
        transparent: true,
        opacity    : 0.08
    });
    marsSurfaceGroup.add(new THREE.LineSegments(wireGeo, wireMat));
}

createMarsSurface();


// --- B. 极稀薄大气 (Atmosphere/Haze) ---
function createMarsAtmosphere()
{
    const atmosParticles = 15000;
    const atmosPos       = [];
    const atmosColors    = [];

    const colHaze = new THREE.Color('#ffc840');
    const rBase   = coreRadius + 0.1;

    for (let i = 0; i < atmosParticles; i++)
    {
        const r     = rBase + Math.random() * 0.3;
        const theta = Math.random() * Math.PI * 2;
        const phi   = Math.acos(2 * Math.random() - 1);

        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.sin(phi) * Math.sin(theta);
        const z = r * Math.cos(phi);

        atmosPos.push(x, y, z);

        let c = colHaze.clone();
        c.multiplyScalar(0.5 + Math.random() * 0.5);

        atmosColors.push(c.r, c.g, c.b);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(atmosPos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(atmosColors, 3));

    const mat = new THREE.PointsMaterial({
        size           : 0.06,
        vertexColors   : true,
        transparent    : true,
        opacity        : 0.08,
        sizeAttenuation: true
    });

    marsAtmosGroup.add(new THREE.Points(geo, mat));
}

createMarsAtmosphere();


// --- C. 卫星系统 (Phobos & Deimos - PURE POINT CLOUD STYLE) ---
// 参照 earth.js 中 createMoon 的风格：高密度点云 + 极淡网格
function createMarsMoons()
{
    // 艺术化参数
    const moonsConfig = [
        {
            name  : "Phobos",
            radius: 7.5,
            speed : 0.008,
            // 基础大小 0.25, 形状扭曲因子(土豆状)
            baseSize     : 0.25,
            scale        : {x: 1.3, y: 1.0, z: 0.8},
            color        : 0xcccccc,
            particleCount: 600
        },
        {
            name         : "Deimos",
            radius       : 12.0,
            speed        : 0.003,
            baseSize     : 0.18,
            scale        : {x: 0.9, y: 0.7, z: 0.7}, // 极度不规则
            color        : 0xaaaaaa,
            particleCount: 400
        }
    ];

    moonsConfig.forEach(config =>
    {
        const satOrbit      = new THREE.Group();
        satOrbit.rotation.x = Math.random() * 0.05;
        satOrbit.rotation.y = Math.random() * Math.PI * 2;
        marsMoonGroup.add(satOrbit);

        // 1. 轨道线 (保持一致)
        const orbitPoints = 128;
        const orbitGeo    = new THREE.BufferGeometry().setFromPoints(new THREE.EllipseCurve(0, 0, config.radius, config.radius, 0, 2 * Math.PI).getPoints(orbitPoints));
        const orbitLine   = new THREE.Line(orbitGeo, new THREE.LineDashedMaterial({
            color      : config.color,
            transparent: true,
            opacity    : 0.15,
            dashSize   : config.name === "Phobos" ? 0.5 : 1.0,
            gapSize    : config.name === "Phobos" ? 0.3 : 0.5
        }));
        orbitLine.computeLineDistances();
        orbitLine.rotation.x = Math.PI / 2;
        satOrbit.add(orbitLine);

        // 卫星本体组
        const moonBody = new THREE.Group();
        moonBody.position.set(config.radius, 0, 0);
        satOrbit.add(moonBody);

        // 2. 程序化点云 (主体)
        // 使用 SimplexNoise + 缩放 模拟不规则小行星形态
        const moonPos  = [];
        const moonCols = [];
        const moonGen  = new SimplexNoise('mars-moon-' + config.name);
        const mColBase = new THREE.Color(config.color);
        const mColDark = new THREE.Color(config.color).multiplyScalar(0.4);

        for (let i = 0; i < config.particleCount; i++)
        {
            // 在单位球体内随机采样
            const rBase = 1.0;
            const theta = Math.random() * Math.PI * 2;
            const phi   = Math.acos(2 * Math.random() - 1);

            let x = rBase * Math.sin(phi) * Math.cos(theta);
            let y = rBase * Math.sin(phi) * Math.sin(theta);
            let z = rBase * Math.cos(phi);

            // 叠加 3D 噪波，制造表面坑洼
            let n    = moonGen.noise3D(x * 2.0, y * 2.0, z * 2.0);
            let rMod = 1.0 + n * 0.15; // 高度扰动

            // 应用不规则缩放 (Scale) -> 变成土豆
            x *= rMod * config.scale.x * config.baseSize;
            y *= rMod * config.scale.y * config.baseSize;
            z *= rMod * config.scale.z * config.baseSize;

            moonPos.push(x, y, z);

            // 颜色：基于噪波做明暗变化
            let c = new THREE.Color();
            if (n < -0.2)
            {
                c.copy(mColDark); // 坑底深色
            }
            else
            {
                c.copy(mColBase);
            }
            // 随机杂色
            c.multiplyScalar(0.9 + Math.random() * 0.2);
            moonCols.push(c.r, c.g, c.b);
        }

        const moonPointsGeo = new THREE.BufferGeometry();
        moonPointsGeo.setAttribute('position', new THREE.Float32BufferAttribute(moonPos, 3));
        moonPointsGeo.setAttribute('color', new THREE.Float32BufferAttribute(moonCols, 3));

        const moonPointsMat = new THREE.PointsMaterial({
            size           : 0.035, // 点大小适中，类似月球
            vertexColors   : true,
            transparent    : true,
            opacity        : 1.0, // 点云不透明，清晰可见
            sizeAttenuation: true
        });
        moonBody.add(new THREE.Points(moonPointsGeo, moonPointsMat));

        // 3. 极淡网格 (背景辅助)
        // 为了匹配形状，我们简单生成一个稍微大一点点的 Icosahedron 并缩放
        const wireGeoRaw = new THREE.IcosahedronGeometry(1.0, 1);
        // 手动应用缩放
        wireGeoRaw.scale(config.scale.x * config.baseSize * 1.05, config.scale.y * config.baseSize * 1.05, config.scale.z * config.baseSize * 1.05);

        const wireGeo = new THREE.WireframeGeometry(wireGeoRaw);
        const wireMat = new THREE.LineBasicMaterial({
            color      : config.color,
            transparent: true,
            opacity    : 0.08 // [FIX] 极低透明度，不易察觉
        });
        moonBody.add(new THREE.LineSegments(wireGeo, wireMat));

        moonsData.push({
            mesh    : moonBody,
            speed   : config.speed,
            radius  : config.radius,
            angle   : Math.random() * Math.PI * 2,
            isPhobos: config.name === "Phobos"
        });
    });
}

createMarsMoons();


// ==========================================
// PART 5: 交互与动画循环
// ==========================================

initInteraction(group, INITIAL_ZOOM);

if (typeof InteractionState !== 'undefined')
{
    InteractionState.targetRotationX = 0.2;
    InteractionState.targetRotationY = 0.0;
}
group.rotation.x = 0.2;
group.rotation.y = 0.0;

function animate()
{
    requestAnimationFrame(animate);

    marsSurfaceGroup.rotation.y += 0.0025;
    marsAtmosGroup.rotation.y += 0.003;

    moonsData.forEach(moon =>
    {
        moon.angle += moon.speed;
        moon.mesh.position.x = moon.radius * Math.cos(moon.angle);
        moon.mesh.position.z = moon.radius * Math.sin(moon.angle);

        // 缓慢的不规则自转
        if (moon.isPhobos)
        {
            moon.mesh.rotation.z -= 0.01;
            moon.mesh.rotation.y += 0.005;
        }
        else
        {
            moon.mesh.rotation.y += 0.002;
            moon.mesh.rotation.x += 0.003;
        }
    });

    currentZoom = updateInteraction(group, camera, zoomDisplay, currentZoom);
    updatePlanetTelemetry(marsSurfaceGroup, tgtLabel, 1);

    renderer.render(scene, camera);
}

animate();