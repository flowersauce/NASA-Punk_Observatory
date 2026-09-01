// ==========================================
// NASA-Punk Project: SOL-IV (MARS) - POINT CLOUD MOONS
// ==========================================

// --- PART 1: 基础观测背景 ---
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

// [CONFIG] 保持拉远的视角以容纳卫星
let currentZoom    = 30;
const INITIAL_ZOOM = 30;
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

let frameSampler;


// --- PART 3: 程序化火星主体 ---
const coreRadius = 5.0;
let moonsData    = [];

// --- A. 地表点云 (Surface: Dusty Rock) ---
function createMarsSurface()
{
    const planetName = 'mars';
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

    const colBase  = new THREE.Color('#94544d');
    const colDark  = new THREE.Color('#6b433c');
    const colLight = new THREE.Color('#d98c6b');
    const noiseGen = new SimplexNoise('mars-craters-dust');
    const surfaceColor = new THREE.Color();

    const surfaceMaterial = new THREE.PointsMaterial({
        size           : 0.055,
        vertexColors   : true,
        transparent    : true,
        opacity        : 0.95,
        sizeAttenuation: true
    });
    const points = new THREE.Points(geometry, surfaceMaterial);
    marsSurfaceGroup.add(points);

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

        let nBase   = noiseGen.noise3D(x * 0.3, y * 0.3, z * 0.3);
        let nDetail = noiseGen.noise3D(x * 1.5, y * 1.5, z * 1.5);
        let nCrater = Math.abs(noiseGen.noise3D(x * 2.5, y * 2.5, z * 2.5));

        const canyonFactor = (x > 0 && y < 0.5 && y > -0.5) ? Math.abs(z / r) : 0;

        const heightMod = nBase * 0.04 + nDetail * 0.02 - nCrater * 0.05 - canyonFactor * 0.03;

        x *= (1 + heightMod / r);
        y *= (1 + heightMod / r);
        z *= (1 + heightMod / r);

        const offset = i * 3;
        positions[offset]     = x;
        positions[offset + 1] = y;
        positions[offset + 2] = z;

        const c   = surfaceColor;
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

let frameCount = 0;

function animate(timestamp)
{
    requestAnimationFrame(animate);
    frameCount++;
    frameSampler.sample(timestamp);

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
