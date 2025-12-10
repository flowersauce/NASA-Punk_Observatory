// ==========================================
// NASA-Punk Project: SOL-I (MERCURY) - FINAL TUNING
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

    ctx.fillStyle = "rgba(180, 170, 160, 0.015)";
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
            field[i][j] = (simplex.noise2D(i * BG_CONFIG.gridSize * BG_CONFIG.noiseScale + 200, j * BG_CONFIG.gridSize * BG_CONFIG.noiseScale + 200) + 1) / 2;
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

let currentZoom    = 28;
const INITIAL_ZOOM = 28;
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

const planetTiltGroup      = new THREE.Group();
planetTiltGroup.rotation.z = 0.03 * (Math.PI / 180);
group.add(planetTiltGroup);

const planetSpinGroup = new THREE.Group();
planetTiltGroup.add(planetSpinGroup);

const tailGroup = new THREE.Group();
planetTiltGroup.add(tailGroup);


// --- PART 3: 水星本体 ---
function createMercury()
{
    const noiseGen      = new SimplexNoise('mercury-surface');
    const particleCount = 45000;
    const positions     = [];
    const colors        = [];

    const colBase  = new THREE.Color('#999999');
    const colDark  = new THREE.Color('#555555');
    const colLight = new THREE.Color('#cccccc');

    for (let i = 0; i < particleCount; i++)
    {
        let r       = 5.0;
        const theta = Math.random() * Math.PI * 2;
        const phi   = Math.acos(2 * Math.random() - 1);

        let x = r * Math.sin(phi) * Math.cos(theta);
        let y = r * Math.sin(phi) * Math.sin(theta);
        let z = r * Math.cos(phi);

        let nBase   = noiseGen.noise3D(x * 0.4, y * 0.4, z * 0.4);
        let nCrater = Math.abs(noiseGen.noise3D(x * 2.0, y * 2.0, z * 2.0));
        nCrater     = 1.0 - Math.pow(nCrater, 1.2);

        r += nBase * 0.06;
        r -= nCrater * 0.08;

        x = r * Math.sin(phi) * Math.cos(theta);
        y = r * Math.sin(phi) * Math.sin(theta);
        z = r * Math.cos(phi);

        positions.push(x, y, z);

        let c = new THREE.Color();
        if (nCrater > 0.6)
        {
            c.copy(colDark).multiplyScalar(0.8);
        }
        else if (nBase > 0.2)
        {
            c.copy(colLight).lerp(colBase, 0.3);
        }
        else
        {
            c.copy(colBase);
        }
        c.multiplyScalar(0.9 + Math.random() * 0.2);
        colors.push(c.r, c.g, c.b);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
        size           : 0.05,
        vertexColors   : true,
        transparent    : true,
        opacity        : 0.95,
        sizeAttenuation: true
    });

    const planet = new THREE.Points(geo, mat);
    planetSpinGroup.add(planet);

    // 测量网格
    const wireGeo = new THREE.WireframeGeometry(new THREE.SphereGeometry(5.02, 24, 12));
    const wireMat = new THREE.LineBasicMaterial({
        color      : '#a0a0a0',
        transparent: true,
        opacity    : 0.08
    });
    planetSpinGroup.add(new THREE.LineSegments(wireGeo, wireMat));
}

createMercury();


// --- PART 4: 精致的流体钠尾 (Refined Flow System) ---

const TAIL_COUNT  = 1200;
const tailData    = new Array(TAIL_COUNT);
let tailGeometry;
const sodiumColor = new THREE.Color('#fff5cc');

function initSodiumTail()
{
    const geo   = new THREE.BufferGeometry();
    const pos   = new Float32Array(TAIL_COUNT * 3);
    const col   = new Float32Array(TAIL_COUNT * 3);
    const sizes = new Float32Array(TAIL_COUNT);

    for (let i = 0; i < TAIL_COUNT; i++)
    {
        col[i * 3]     = sodiumColor.r;
        col[i * 3 + 1] = sodiumColor.g;
        col[i * 3 + 2] = sodiumColor.b;

        tailData[i] = {
            x  : 0, y: 0, z: 0,
            vx : 0, vy: 0, vz: 0,
            age: 0, life: 100
        };

        respawnParticle(tailData[i], true);

        pos[i * 3]     = tailData[i].x;
        pos[i * 3 + 1] = tailData[i].y;
        pos[i * 3 + 2] = tailData[i].z;
        sizes[i]       = 0.0;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const mat = new THREE.PointsMaterial({
        vertexColors   : true,
        transparent    : true,
        opacity        : 0.4,
        size           : 0.1,
        blending       : THREE.AdditiveBlending,
        depthWrite     : false,
        sizeAttenuation: true
    });

    const mesh = new THREE.Points(geo, mat);
    tailGroup.add(mesh);
    tailGeometry = geo;
}

// [TUNING] 调整后的重置逻辑
function respawnParticle(p, warmStart = false)
{
    const angle  = Math.random() * Math.PI * 2;
    // [UPDATE] 半径扩大：2.0 ~ 4.8 (原 max 4.5)，更丰满，但仍<5.0
    const radius = 2.0 + Math.random() * 2.8;

    p.y = Math.cos(angle) * radius;
    p.z = Math.sin(angle) * radius;

    // 发射深度
    p.x = -1.0 - Math.random() * 1.5;

    // [UPDATE] 速度减缓：-0.10 ~ -0.18 (原 -0.15 ~ -0.25)
    // 看起来更舒缓，不再那么急促
    p.vx = -0.10 - Math.random() * 0.08;

    p.vy = (Math.random() - 0.5) * 0.01;
    p.vz = (Math.random() - 0.5) * 0.01;

    p.age  = 0;
    p.life = 60 + Math.random() * 80;

    if (warmStart)
    {
        const preTravel = Math.random() * 120;
        p.x += p.vx * preTravel;
        p.y += p.vy * preTravel;
        p.z += p.vz * preTravel;
        p.age           = Math.floor(Math.random() * p.life);
    }
}

initSodiumTail();

function updateSodiumTail()
{
    const positions = tailGeometry.attributes.position.array;
    const sizes     = tailGeometry.attributes.size.array;

    for (let i = 0; i < TAIL_COUNT; i++)
    {
        const p = tailData[i];

        p.x += p.vx;
        p.y += p.vy;
        p.z += p.vz;
        p.age++;

        // 边界检查：适应较慢的速度，消失距离稍微缩短一点也无妨
        if (p.age >= p.life || p.x < -25.0)
        {
            respawnParticle(p, false);
            sizes[i] = 0.0;
        }
        else
        {
            // 淡入淡出
            const progress = p.age / p.life;
            let sizeMod    = 0;
            if (progress < 0.15)
            {
                sizeMod = progress / 0.15;
            }
            else
            {
                sizeMod = 1.0 - ((progress - 0.15) / 0.85);
            }

            // 软剔除：在靠近星球背部时，稍微限制大小
            if (p.x > -3.0)
            {
                sizeMod *= 0.8;
            }

            sizes[i] = 0.15 * sizeMod;
        }

        positions[i * 3]     = p.x;
        positions[i * 3 + 1] = p.y;
        positions[i * 3 + 2] = p.z;
    }

    tailGeometry.attributes.position.needsUpdate = true;
    tailGeometry.attributes.size.needsUpdate     = true;
}


// --- PART 5: 交互与动画 ---

initInteraction(group, INITIAL_ZOOM);

if (typeof InteractionState !== 'undefined')
{
    InteractionState.targetRotationX = 0.2;
    InteractionState.targetRotationY = -0.6;
}
group.rotation.x = 0.2;
group.rotation.y = -0.6;

function animate()
{
    requestAnimationFrame(animate);

    planetSpinGroup.rotation.y += 0.0003;

    updateSodiumTail();

    currentZoom = updateInteraction(group, camera, zoomDisplay, currentZoom);
    updatePlanetTelemetry(planetSpinGroup, tgtLabel, 1);

    renderer.render(scene, camera);
}

animate();