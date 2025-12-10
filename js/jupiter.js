// ==========================================
// NASA-Punk Project: JUPITER
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

    // 绘制基础网格
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

    // 绘制定位准星
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

    // 绘制星空
    ctx.fillStyle = '#ffffff';
    stars.forEach(star =>
    {
        ctx.globalAlpha = star.opacity;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
    });

    // 绘制等高线 (Noise Field)
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
            field[i][j] = (simplex.noise2D(i * BG_CONFIG.gridSize * BG_CONFIG.noiseScale + 800, j * BG_CONFIG.gridSize * BG_CONFIG.noiseScale + 800) + 1) / 2;
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

                const a = {
                    x: x + BG_CONFIG.gridSize * getIsoT(valTL, valTR, level),
                    y: y
                };
                const b = {
                    x: x + BG_CONFIG.gridSize,
                    y: y + BG_CONFIG.gridSize * getIsoT(valTR, valBR, level)
                };
                const c = {
                    x: x + BG_CONFIG.gridSize * getIsoT(valBL, valBR, level),
                    y: y + BG_CONFIG.gridSize
                };
                const d = {
                    x: x,
                    y: y + BG_CONFIG.gridSize * getIsoT(valTL, valBL, level)
                };

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

let currentZoom    = 38;
const INITIAL_ZOOM = 38;
camera.position.z  = currentZoom;

const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha    : true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.getElementById('canvas-container').appendChild(renderer.domElement);

// [CHANGED] ID 变更为 zoom-text-display 以匹配 earth.html 的逻辑
const zoomDisplay = document.getElementById('zoom-text-display');
const tgtLabel    = document.querySelector('.monitor-label.label-bottom');

// 场景层级结构
const group = new THREE.Group();
scene.add(group);

// 1. 倾角容器 (木星轴倾角 3.13度)
const jupiterTiltGroup      = new THREE.Group();
jupiterTiltGroup.rotation.z = 3.13 * (Math.PI / 180);
group.add(jupiterTiltGroup);

// 2. 自转容器 (用于木星本体)
const jupiterSpinGroup = new THREE.Group();
jupiterTiltGroup.add(jupiterSpinGroup);

// 3. 大红斑独立容器 (用于模拟独立漂移)
const redSpotGroup = new THREE.Group();
jupiterSpinGroup.add(redSpotGroup);

// 4. 卫星容器
const moonGroup = new THREE.Group();
jupiterTiltGroup.add(moonGroup);


// --- PART 3: 程序化木星主体 ---
let jupiterSurface, jupiterAtmos;
const ringUniforms = {
    uTime: {
        value: 0.0
    }
};

function createJupiter()
{
    const noiseGen = new SimplexNoise('jupiter-ultimate-final');

    // ==========================================
    // Layer 1: 底层对流层
    // ==========================================
    const particleCount = 45000;
    const positions     = [];
    const colors        = [];

    const colZoneLight = new THREE.Color('#f0e2c2'); // 氨冰白
    const colZoneDark  = new THREE.Color('#d6c7a5'); // 奶油基底
    const colBeltBase  = new THREE.Color('#c28266'); // 浅赭石
    const colBeltDeep  = new THREE.Color('#8a3f2d'); // 氧化铁红
    const colPolar     = new THREE.Color('#787878'); // 极地灰

    for (let i = 0; i < particleCount; i++)
    {
        // 随机厚度: 6.45 ~ 6.55
        const r = 6.45 + Math.random() * 0.1;

        const theta = Math.random() * Math.PI * 2;
        const phi   = Math.acos(2 * Math.random() - 1);

        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.sin(phi) * Math.sin(theta);
        const z = r * Math.cos(phi);

        positions.push(x, y, z);

        // --- 纹理生成 ---
        let lat          = y / 6.5;
        // 非线性拉伸：赤道宽，极地密
        let latNonLinear = Math.sign(lat) * Math.pow(Math.abs(lat), 1.4);

        // 纬向拉伸噪波
        let noiseBase = noiseGen.noise3D(x * 1.0, y * 0.3, z * 1.0);
        // 复合信号波
        let signal    = Math.sin(latNonLinear * 12.0 + noiseBase * 1.2);

        let c    = new THREE.Color();
        let dist = Math.abs(lat);

        if (dist > 0.85)
        {
            // 极地
            c.copy(colZoneDark).lerp(colPolar, (dist - 0.85) * 4.0);
            c.multiplyScalar(0.9 + Math.random() * 0.2);
        }
        else
        {
            // 条纹
            if (signal > 0.1)
            {
                // Zones (亮带)
                let brightness = (dist < 0.15) ? 1.0 : signal;
                c.copy(colZoneDark).lerp(colZoneLight, brightness * 0.8);
                if (noiseBase > 0.6)
                {
                    c.lerp(colBeltBase, 0.15);
                }
            }
            else
            {
                // Belts (暗带)
                let depth = Math.abs(signal);
                // 强化主暗带 (NEB/SEB)
                if (dist > 0.15 && dist < 0.45)
                {
                    c.copy(colBeltBase).lerp(colBeltDeep, depth * 0.8 + 0.2);
                }
                else
                {
                    c.copy(colBeltBase).lerp(colBeltDeep, depth * 0.5);
                }
            }
        }

        // 模拟 AO (环境光遮蔽)，底部粒子更暗
        let depthFactor = (r - 6.45) / 0.1; // 0(底) ~ 1(顶)
        c.multiplyScalar(0.8 + depthFactor * 0.4);

        colors.push(c.r, c.g, c.b);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
        size           : 0.07,
        vertexColors   : true,
        transparent    : true,
        opacity        : 0.95,
        sizeAttenuation: true
    });

    jupiterSurface = new THREE.Points(geo, mat);
    jupiterSpinGroup.add(jupiterSurface);

    // ==========================================
    // Layer 2: 平流层薄雾
    // ==========================================
    const atmosCount = 25000;
    const atmosPos   = [];
    const atmosCol   = [];

    const colHaze = new THREE.Color('#ffffff');
    const colGold = new THREE.Color('#ffcc00');

    for (let i = 0; i < atmosCount; i++)
    {
        const r = 6.6 + Math.random() * 0.2;

        const theta = Math.random() * Math.PI * 2;
        const phi   = Math.acos(2 * Math.random() - 1);

        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.sin(phi) * Math.sin(theta);
        const z = r * Math.cos(phi);

        atmosPos.push(x, y, z);

        let lat = Math.abs(y / r);
        let c   = new THREE.Color();

        c.copy(colHaze).lerp(colGold, 0.2);

        atmosCol.push(c.r, c.g, c.b);
    }

    const atmosGeo = new THREE.BufferGeometry();
    atmosGeo.setAttribute('position', new THREE.Float32BufferAttribute(atmosPos, 3));
    atmosGeo.setAttribute('color', new THREE.Float32BufferAttribute(atmosCol, 3));

    const atmosMat = new THREE.PointsMaterial({
        size           : 0.1,
        vertexColors   : true,
        transparent    : true,
        opacity        : 0.25,
        sizeAttenuation: true,
        blending       : THREE.AdditiveBlending,
        depthWrite     : false
    });

    jupiterAtmos = new THREE.Points(atmosGeo, atmosMat);
    jupiterSpinGroup.add(jupiterAtmos);

    // [Grid] 坐标网格
    const wireGeo = new THREE.WireframeGeometry(new THREE.SphereGeometry(6.6, 24, 12));
    const wireMat = new THREE.LineBasicMaterial({
        color      : '#c29b61',
        transparent: true,
        opacity    : 0.04
    });
    jupiterSpinGroup.add(new THREE.LineSegments(wireGeo, wireMat));
}

createJupiter();


// --- PART 4: 独立动态大红斑 ---
let redSpotMesh;

function createGreatRedSpot()
{
    redSpotGroup.clear();

    const particleCount = 3500;
    const positions     = [];
    const colors        = [];
    const particlesData = [];
    const noiseGen      = new SimplexNoise('grs-vortex-final');

    const colCore  = new THREE.Color('#8a3f2d');
    const colEye   = new THREE.Color('#c25e40');
    const colSwirl = new THREE.Color('#e3dccb');
    const colMerge = new THREE.Color('#8c4e38');

    // 参数：位于南纬 22 度
    const spotLat    = -22 * (Math.PI / 180);
    const spotLon    = 0.5;
    const width      = 1.6;
    const height     = 1.0;
    const radiusBase = 6.5;

    for (let i = 0; i < particleCount; i++)
    {
        const t     = Math.random();
        const dist  = Math.pow(t, 0.6); // 0~1
        const angle = Math.random() * Math.PI * 2;

        if (dist > 0.8 && Math.random() > 0.4)
        {
            continue;
        }

        const dLat = Math.sin(angle) * dist * 0.22 * height;
        const dLon = Math.cos(angle) * dist * 0.22 * width;

        const finalLat = spotLat + dLat;
        const finalLon = spotLon + dLon;

        // 高度融合 (透镜凸起)
        const heightOffset = Math.cos(dist * Math.PI / 2) * 0.06;
        const r            = radiusBase + heightOffset;

        // 笛卡尔坐标转换
        const pX = r * Math.cos(finalLat) * Math.sin(finalLon);
        const pY = r * Math.sin(finalLat);
        const pZ = r * Math.cos(finalLat) * Math.cos(finalLon);

        positions.push(pX, pY, pZ);

        // 颜色纹理
        let c      = new THREE.Color();
        let n      = noiseGen.noise3D(pX * 2.0, pY * 2.0, pZ * 2.0);
        let spiral = Math.sin(dist * 10.0 + angle * 2.0 + n * 2.0);

        if (dist < 0.7)
        {
            c.copy(colCore).lerp(colEye, n * 0.5 + 0.5);
            if (spiral > 0.6)
            {
                c.lerp(colSwirl, 0.4);
            }
        }
        else
        {
            let mergeFactor = (dist - 0.7) / 0.3;
            c.copy(colCore).lerp(colMerge, mergeFactor);
            c.multiplyScalar(1.0 - mergeFactor * 0.3);
        }

        colors.push(c.r, c.g, c.b);

        particlesData.push({
            dist   : dist,
            angle  : angle,
            speed  : (1.0 - dist) * 0.02 + 0.005,
            baseLat: spotLat,
            baseLon: spotLon,
            width  : width,
            height : height,
            rBase  : radiusBase
        });
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
        size           : 0.05,
        vertexColors   : true,
        transparent    : true,
        opacity        : 0.9,
        sizeAttenuation: true,
        blending       : THREE.NormalBlending
    });

    redSpotMesh          = new THREE.Points(geo, mat);
    redSpotMesh.userData = {
        particles: particlesData
    };
    redSpotGroup.add(redSpotMesh);
}

createGreatRedSpot();


// --- PART 5: 极暗陨石带 ---
function createFaintRings()
{
    const ringGroup = new THREE.Group();
    jupiterSpinGroup.add(ringGroup);

    const particleCount = 7000;
    const positions     = [];
    const colors        = [];

    const innerR = 14.2;
    const outerR = 16.8;

    // 基础配色：深岩石灰 ~ 焦炭褐
    const colRockDark  = new THREE.Color('#333333');
    const colRockBrown = new THREE.Color('#4a3c31');

    for (let i = 0; i < particleCount; i++)
    {
        const t = Math.random();
        const r = innerR + Math.pow(t, 1.2) * (outerR - innerR);

        const angle = Math.random() * Math.PI * 2;
        const x     = r * Math.cos(angle);
        const z     = r * Math.sin(angle);

        // 极薄的厚度
        const y = (Math.random() - 0.5) * 0.12;

        positions.push(x, y, z);

        // 随机混合颜色
        let c = new THREE.Color();
        c.copy(colRockDark).lerp(colRockBrown, Math.random());
        c.multiplyScalar(0.8 + Math.random() * 0.4);

        colors.push(c.r, c.g, c.b);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
        size           : 0.06,
        vertexColors   : true,
        transparent    : true,
        opacity        : 0.6,
        sizeAttenuation: true,
        blending       : THREE.NormalBlending,
        depthWrite     : false
    });

    const rings = new THREE.Points(geo, mat);
    ringGroup.add(rings);
}

createFaintRings();


// --- PART 6: 卫星系统 ---
const moons = [];

function createMoon(config)
{
    const {
              name,
              radius,
              speed,
              size,
              color,
              type,
              detail
          } = config;

    const satOrbit      = new THREE.Group();
    satOrbit.rotation.y = Math.random() * Math.PI * 2;
    satOrbit.rotation.x = (Math.random() - 0.5) * (type === 'Major' ? 0.02 : 0.2);
    moonGroup.add(satOrbit);

    const geo  = new THREE.BufferGeometry().setFromPoints(new THREE.EllipseCurve(0, 0, radius, radius, 0, 2 * Math.PI).getPoints(128));
    const line = new THREE.Line(geo, new THREE.LineDashedMaterial({
        color      : color,
        transparent: true,
        opacity    : type === 'Major' ? 0.25 : 0.08,
        dashSize   : 0.3,
        gapSize    : 0.2
    }));
    line.computeLineDistances();
    line.rotation.x = Math.PI / 2;
    satOrbit.add(line);

    // 卫星本体
    const moonMeshGroup = new THREE.Group();
    moonMeshGroup.position.set(radius, 0, 0);
    satOrbit.add(moonMeshGroup);

    if (type === 'Major')
    {
        const wireGeo = new THREE.WireframeGeometry(new THREE.SphereGeometry(size, 8, 8));
        const wireMat = new THREE.LineBasicMaterial({
            color      : color,
            transparent: true,
            opacity    : 0.4
        });
        moonMeshGroup.add(new THREE.LineSegments(wireGeo, wireMat));

        const pCount    = 200;
        const pPos      = [];
        const pCol      = [];
        const mNoise    = new SimplexNoise(name);
        const baseColor = new THREE.Color(color);
        const darkColor = baseColor.clone().multiplyScalar(0.5);

        for (let i = 0; i < pCount; i++)
        {
            const theta = Math.random() * Math.PI * 2;
            const phi   = Math.acos(2 * Math.random() - 1);
            const r     = size * 0.95;
            const x     = r * Math.sin(phi) * Math.cos(theta);
            const y     = r * Math.sin(phi) * Math.sin(theta);
            const z     = r * Math.cos(phi);
            pPos.push(x, y, z);

            let n = mNoise.noise3D(x * 5, y * 5, z * 5);
            let c = baseColor.clone();
            if (n < 0)
            {
                c.lerp(darkColor, -n);
            }
            pCol.push(c.r, c.g, c.b);
        }
        const mGeo = new THREE.BufferGeometry();
        mGeo.setAttribute('position', new THREE.Float32BufferAttribute(pPos, 3));
        mGeo.setAttribute('color', new THREE.Float32BufferAttribute(pCol, 3));
        moonMeshGroup.add(new THREE.Points(mGeo, new THREE.PointsMaterial({
            size        : 0.05,
            vertexColors: true
        })));

    }
    else
    {
        const geo = new THREE.IcosahedronGeometry(size, 0);
        const mat = new THREE.MeshBasicMaterial({
            color      : color,
            wireframe  : true,
            transparent: true,
            opacity    : 0.5
        });
        moonMeshGroup.add(new THREE.Mesh(geo, mat));
    }

    moons.push({
        group    : satOrbit,
        meshGroup: moonMeshGroup,
        speed    : speed,
        radius   : radius,
        angle    : Math.random() * Math.PI * 2
    });
}

// 卫星配置
createMoon({
    name  : "Metis",
    radius: 6.7,
    speed : 0.035,
    size  : 0.04,
    color : 0xaa5555,
    type  : 'Minor'
});
createMoon({
    name  : "Adrastea",
    radius: 6.8,
    speed : 0.034,
    size  : 0.03,
    color : 0xaa5555,
    type  : 'Minor'
});
createMoon({
    name  : "Amalthea",
    radius: 7.0,
    speed : 0.030,
    size  : 0.06,
    color : 0xcc6666,
    type  : 'Minor'
});
createMoon({
    name  : "Thebe",
    radius: 7.2,
    speed : 0.028,
    size  : 0.05,
    color : 0xaa5555,
    type  : 'Minor'
});

createMoon({
    name  : "Io",
    radius: 7.8,
    speed : 0.015,
    size  : 0.25,
    color : 0xffd700,
    type  : 'Major'
});
createMoon({
    name  : "Europa",
    radius: 10.5,
    speed : 0.010,
    size  : 0.22,
    color : 0xd0f0ff,
    type  : 'Major'
});
createMoon({
    name  : "Ganymede",
    radius: 13.5,
    speed : 0.007,
    size  : 0.35,
    color : 0xa09080,
    type  : 'Major'
});
createMoon({
    name  : "Callisto",
    radius: 18.0,
    speed : 0.004,
    size  : 0.32,
    color : 0x555555,
    type  : 'Major'
});

createMoon({
    name  : "Himalia",
    radius: 21.0,
    speed : 0.002,
    size  : 0.05,
    color : 0x888888,
    type  : 'Minor'
});
createMoon({
    name  : "Elara",
    radius: 23.0,
    speed : 0.0018,
    size  : 0.04,
    color : 0x888888,
    type  : 'Minor'
});


// --- PART 7: 交互与动画循环 ---

// 初始化交互模块
initInteraction(group, INITIAL_ZOOM);

// [NEW] 初始相机倾角设置
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
    const time = Date.now() * 0.001;

    // 1. 木星自转
    jupiterSpinGroup.rotation.y += 0.0025;

    // 2. 大红斑独立漂移
    if (redSpotGroup)
    {
        redSpotGroup.rotation.y -= 0.0004;
        redSpotGroup.rotation.x = Math.sin(time * 0.5) * 0.002;
    }

    // 3. 卫星公转
    moons.forEach(sat =>
    {
        sat.angle += sat.speed;
        sat.meshGroup.position.x = sat.radius * Math.cos(sat.angle);
        sat.meshGroup.position.z = sat.radius * Math.sin(sat.angle);

        if (sat.type === 'Major')
        {
            sat.meshGroup.rotation.y += 0.01;
        }
        else
        {
            sat.meshGroup.rotation.x += 0.02;
            sat.meshGroup.rotation.y += 0.02;
        }
    });

    // 4. 大红斑内部流体
    if (redSpotMesh)
    {
        const positions = redSpotMesh.geometry.attributes.position.array;
        const data      = redSpotMesh.userData.particles;

        for (let i = 0; i < data.length; i++)
        {
            const p = data[i];

            p.angle += p.speed;

            const dLat     = Math.sin(p.angle) * p.dist * 0.22 * p.height;
            const dLon     = Math.cos(p.angle) * p.dist * 0.22 * p.width;
            const finalLat = p.baseLat + dLat;
            const finalLon = p.baseLon + dLon;

            const heightOffset = Math.cos(p.dist * Math.PI / 2) * 0.06 + Math.sin(time * 2.0 + p.dist * 5.0) * 0.002;
            const r            = p.rBase + heightOffset;

            const x = r * Math.cos(finalLat) * Math.sin(finalLon);
            const y = r * Math.sin(finalLat);
            const z = r * Math.cos(finalLat) * Math.cos(finalLon);

            positions[i * 3]     = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;
        }
        redSpotMesh.geometry.attributes.position.needsUpdate = true;
    }

    // 5. 视角和缩放控制 (调用抽象模块)
    currentZoom = updateInteraction(group, camera, zoomDisplay, currentZoom);

    // 6. 遥测数据更新 (调用抽象模块)
    updatePlanetTelemetry(jupiterSpinGroup, tgtLabel, 1);

    renderer.render(scene, camera);
}

animate();