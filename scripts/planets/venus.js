// ==========================================
// NASA-Punk Project: SOL-II (VENUS) - CHAOS & DENSITY CORRECTED
// ==========================================

// --- PART 1: 基础观测背景 (保持不变) ---
const sharedTopoBackground = createTopoBackground({
    canvasId   : 'topo-canvas',
    noiseOffset: 100
});


// ==========================================
// PART 2: Three.js 场景初始化
// ==========================================
const canvasContainer = document.getElementById('canvas-container');
const displaySize     = DisplayArea.getSize(canvasContainer);
const scene           = new THREE.Scene();
const camera          = new THREE.PerspectiveCamera(35, displaySize.width / displaySize.height, 0.1, 1000);

let currentZoom    = 25;
const INITIAL_ZOOM = 25;
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
});

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
let frameSampler;
const coreRadius = 5.0;
const venusFlowNoise = new SimplexNoise('venus-atmosphere-flow');
const venusCloudBaseColor = new THREE.Color('#ffae20');

// --- A. 地表点云 (Inner Surface: Magma Chaos) ---
function createVenusSurface()
{
    const planetName = 'venus';
    const budget     = PLANET_PARTICLE_CONFIG[planetName].surface;
    const tiers      = [budget, Math.floor(budget * 0.75), Math.floor(budget * 0.5), 250000];
    const allocation = ParticleBuilder.allocate(tiers, (count) => ({
        positions: new Float32Array(count * 3),
        colors   : new Float32Array(count * 3)
    }));

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(allocation.value.positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(allocation.value.colors, 3));
    geometry.setDrawRange(0, 0);

    // [NEW PALETTE] 模拟岩浆的高对比度色板
    const colBase = new THREE.Color('#8b1a1a'); // 深岩浆红
    const colHigh = new THREE.Color('#d9531e'); // 亮熔岩橙
    const colPeak = new THREE.Color('#ffe0a0'); // 极热点黄
    const noiseGen = new SimplexNoise('venus-magma-chaos-rock');
    const surfaceColor = new THREE.Color();

    const surfaceMaterial = new THREE.PointsMaterial({
        size           : 0.055,
        vertexColors   : true,
        transparent    : true,
        opacity        : 0.95,
        sizeAttenuation: true
    });
    const points = new THREE.Points(geometry, surfaceMaterial);
    venusSurfaceGroup.add(points);

    frameSampler = ParticleBuilder.createFrameSampler({
        geometry,
        maxCount: allocation.count,
        setDynamicStride() {}
    });

    function sampleSurfaceParticle(i, positions, colors)
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

        const offset = i * 3;
        positions[offset]     = x;
        positions[offset + 1] = y;
        positions[offset + 2] = z;

        // 基于噪波值进行高对比度着色
        const c   = surfaceColor;
        let val = (nChaos + 1) / 2;

        if (val < 0.5)
        {
            c.copy(colBase).lerp(colHigh, val * 2.0);
        }
        else
        {
            c.copy(colHigh).lerp(colPeak, (val - 0.5) * 2.0);
        }

        c.multiplyScalar(0.9 + Math.random() * 0.2);
        colors[offset]     = c.r;
        colors[offset + 1] = c.g;
        colors[offset + 2] = c.b;
    }

    ParticleBuilder.build({
        total           : allocation.count,
        readyCount      : Math.min(250000, allocation.count),
        initialBatchSize: 10000,
        writeBatch(start, end)
        {
            for (let i = start; i < end; i++)
            {
                sampleSurfaceParticle(i, allocation.value.positions, allocation.value.colors);
            }
            geometry.attributes.position.updateRange = {offset: start * 3, count: (end - start) * 3};
            geometry.attributes.color.updateRange = {offset: start * 3, count: (end - start) * 3};
            geometry.attributes.position.needsUpdate = true;
            geometry.attributes.color.needsUpdate = true;
        },
        setDrawCount: frameSampler.setBuiltCount,
        onReady()
        {
            renderer.render(scene, camera);
            ParticleBuilder.markReady({page: planetName});
        },
        onProgress(percent)
        {
            document.getElementById('particle-build-progress').textContent = `${percent}%`;
        },
        onComplete()
        {
            document.getElementById('particle-build-progress').textContent = 'READY';
        },
        onError(error)
        {
            console.error(`[${planetName}] surface generation stopped`, error);
        }
    });
}

createVenusSurface();


// --- B. 大气点云 (Outer Atmosphere: Density Reduced) ---

function createVenusClouds()
{
    // [FIX 2] 粒子数量减半
    const cloudParticles = 45000;
    const cloudPos       = [];
    const cloudColors    = [];
    const cloudGen       = new SimplexNoise('venus-atmosphere-sulphur');

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

        const brightness = 0.9 + Math.random() * 0.2;
        cloudColors.push(
            venusCloudBaseColor.r * brightness,
            venusCloudBaseColor.g * brightness,
            venusCloudBaseColor.b * brightness
        );
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(cloudPos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(cloudColors, 3));

    const mat = new THREE.PointsMaterial({
        color          : 0xffffff,
        size           : 0.06,
        vertexColors   : true,
        transparent    : true,
        opacity        : 0.2,
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

let frameCount = 0;

function animate(timestamp)
{
    requestAnimationFrame(animate);
    frameCount++;
    frameSampler.sample(timestamp);

    // 1. 地表逆行自转 (极慢)
    venusSurfaceGroup.rotation.y -= 0.0002;

    // 2. 大气超自转 (快 7.5 倍)
    cloudGroup.rotation.y -= 0.0015;

    // 3. 云层颜色动画 (仅通过颜色/亮度变化模拟流动)
    if (frameCount % frameSampler.dynamicStride === 0)
    {
        const time      = Date.now() * 0.00005;
        const colors    = cloudPoints.geometry.attributes.color.array;
        const positions = cloudPoints.geometry.attributes.position.array;

        for (let i = 0; i < positions.length / 3; i++)
        {
            const x = positions[i * 3];
            const y = positions[i * 3 + 1];
            const z = positions[i * 3 + 2];

            const flowNoise = venusFlowNoise.noise3D(x * 0.2 + time, y * 0.2 + time, z * 0.2 + time);

            const brightness = 1.0 + flowNoise * 0.25;

            colors[i * 3]     = venusCloudBaseColor.r * brightness;
            colors[i * 3 + 1] = venusCloudBaseColor.g * brightness;
            colors[i * 3 + 2] = venusCloudBaseColor.b * brightness;
        }

        cloudPoints.geometry.attributes.color.needsUpdate = true;
    }

    // 4. 视角和缩放控制
    currentZoom = updateInteraction(group, camera, zoomDisplay, currentZoom);

    // 5. 遥测数据更新 (以云层组作为参考系，因为它是主要视觉对象)
    updatePlanetTelemetry(cloudGroup, tgtLabel, 2);

    renderer.render(scene, camera);
}

animate();
