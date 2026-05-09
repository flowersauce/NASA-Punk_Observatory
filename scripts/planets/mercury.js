// ==========================================
// NASA-Punk Project: SOL-I (MERCURY) - FINAL TUNING
// ==========================================

// --- PART 1: 基础观测背景 ---
const sharedTopoBackground = createTopoBackground({
    canvasId   : 'topo-canvas',
    noiseOffset: 100
});
sharedTopoBackground.resize();


// ==========================================
// PART 2: Three.js 场景初始化
// ==========================================
const canvasContainer = document.getElementById('canvas-container');
const displaySize     = DisplayArea.getSize(canvasContainer);
const scene           = new THREE.Scene();
const camera          = new THREE.PerspectiveCamera(35, displaySize.width / displaySize.height, 0.1, 1000);

let currentZoom    = 28;
const INITIAL_ZOOM = 28;
camera.position.z  = currentZoom;

const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha    : true
});
renderer.setSize(displaySize.width, displaySize.height);
renderer.setPixelRatio(window.devicePixelRatio);
canvasContainer.appendChild(renderer.domElement);

function resizeScene()
{
    const nextDisplaySize = DisplayArea.getSize(canvasContainer);
    camera.aspect         = nextDisplaySize.width / nextDisplaySize.height;
    camera.updateProjectionMatrix();
    renderer.setSize(nextDisplaySize.width, nextDisplaySize.height);
}

if (typeof ResizeObserver !== 'undefined')
{
    const displayResizeObserver = new ResizeObserver(() =>
    {
        resizeScene();
    });
    displayResizeObserver.observe(canvasContainer);
}

window.addEventListener('resize', () =>
{
    sharedTopoBackground.resize();
    resizeScene();
});

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
