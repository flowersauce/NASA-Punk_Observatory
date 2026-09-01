// ==========================================
// NASA-Punk Project: SOL-III (EARTH)
// ==========================================

// --- PART 1: 基础观测背景 (SOL-III / Terra) ---
const sharedTopoBackground = createTopoBackground({
    canvasId   : 'topo-canvas',
    noiseOffset: 100
});


// ==========================================
// PART 2: Three.js 3D 场景
// ==========================================
const canvasContainer = document.getElementById('canvas-container');
const displaySize     = DisplayArea.getSize(canvasContainer);
const scene           = new THREE.Scene();
const camera          = new THREE.PerspectiveCamera(35, displaySize.width / displaySize.height, 0.1, 1000);

// [CONFIG] 初始相机距离
const INITIAL_ZOOM = 25;
camera.position.z  = INITIAL_ZOOM;

const renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
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

// UI 元素引用
const tgtLabel = document.querySelector('.monitor-label.label-bottom');

// 1. 全局容器
const group = new THREE.Group();
scene.add(group);

// 2. 倾角容器 (Earth Tilt ~23.44 deg)
const earthTiltGroup      = new THREE.Group();
earthTiltGroup.rotation.z = 23.44 * (Math.PI / 180);
group.add(earthTiltGroup);

// 3. 自转容器
const earthSystemGroup = new THREE.Group();
earthTiltGroup.add(earthSystemGroup);

// 4. LEO 轨道容器
const leoGroup = new THREE.Group();
earthTiltGroup.add(leoGroup);

// 5. 月球容器
const moonSystemGroup      = new THREE.Group();
moonSystemGroup.rotation.z = 5.14 * (Math.PI / 180);
group.add(moonSystemGroup);

let frameSampler;


// --- A. 程序化地球 ---
function createEarth()
{
    const planetName = 'earth';
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

    const colLandBase = new THREE.Color('#3e6b48');
    const colLandHigh = new THREE.Color('#9abf8a');
    const colOcean    = new THREE.Color('#1a2b4a');
    const colPeak     = new THREE.Color('#ffffff');
    const noiseGen    = new SimplexNoise('seed-terra-firma-v2');
    const surfaceColor = new THREE.Color();

    // [建议] 稍微调小 size，配合高密度粒子，看起来更像细腻的沙盘
    const surfaceMaterial = new THREE.PointsMaterial({
        size        : 0.045,
        vertexColors: true,
        transparent : true,
        opacity     : 0.9
    });
    const points = new THREE.Points(geometry, surfaceMaterial);
    earthSystemGroup.add(points);

    frameSampler = ParticleBuilder.createFrameSampler({
        geometry,
        maxCount: allocation.count,
        setDynamicStride() {}
    });

    function sampleSurfaceParticle(i, positions, colors)
    {
        const rBase = 5.0;
        const theta = Math.random() * Math.PI * 2;
        const phi   = Math.acos(2 * Math.random() - 1);

        // 原始球面坐标
        let x = rBase * Math.sin(phi) * Math.cos(theta);
        let y = rBase * Math.sin(phi) * Math.sin(theta);
        let z = rBase * Math.cos(phi);

        let n = 0;
        n += noiseGen.noise3D(x * 0.15, y * 0.15, z * 0.15) * 1.2;
        n += noiseGen.noise3D(x * 0.6, y * 0.6, z * 0.6) * 0.25;

        const offset = i * 3;
        if (n > 0.1)
        {
            // 1. 高度因子 (0.0 ~ 1.2 左右)
            let h = (n - 0.1) * 1.2;

            // [修正] 极微小的隆起系数
            // 云层起始高度是 0.2 (即 5.2)
            // 我们将最大隆起控制在 0.07 左右 (即 5.07)，保留明显的大气间隙
            // 这样既能让点云产生"质感"和"厚度"，又不会破坏球体的完美轮廓
            const reliefScale = 0.06;

            // 2. 计算微调后的半径
            const rMod = rBase + (Math.max(0, h) * reliefScale);

            // 3. 缩放坐标
            const scale = rMod / rBase;
            positions[offset]     = x * scale;
            positions[offset + 1] = y * scale;
            positions[offset + 2] = z * scale;

            // 颜色逻辑保持不变...
            const c = surfaceColor;
            if (h < 0.5)
            {
                c.copy(colLandBase).lerp(colLandHigh, h / 0.5);
            }
            else
            {
                c.copy(colLandHigh).lerp(colPeak, Math.min(1, (h - 0.5) * 2.0));
            }
            colors[offset]     = c.r;
            colors[offset + 1] = c.g;
            colors[offset + 2] = c.b;
        }
        else
        {
            positions[offset]     = x;
            positions[offset + 1] = y;
            positions[offset + 2] = z;
            colors[offset]        = colOcean.r;
            colors[offset + 1]    = colOcean.g;
            colors[offset + 2]    = colOcean.b;
        }
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

    // 地球网格 (基准参考面)
    const wireGeo = new THREE.WireframeGeometry(new THREE.SphereGeometry(5.0, 24, 24));
    const wireMat = new THREE.LineBasicMaterial({color: 0x3b4e6b, transparent: true, opacity: 0.08});
    earthSystemGroup.add(new THREE.LineSegments(wireGeo, wireMat));
}

createEarth();


// --- B. 云层 ---
const cloudGroup = new THREE.Group();
earthSystemGroup.add(cloudGroup);

function createClouds()
{
    const cloudParticles = 20000;
    const cloudPos       = [];
    const cloudGen       = new SimplexNoise('cloud-layer-v3');

    for (let i = 0; i < cloudParticles; i++)
    {
        const r     = 5 + 0.2 + Math.random() * 0.1;
        const theta = Math.random() * Math.PI * 2;
        const phi   = Math.acos(2 * Math.random() - 1);
        const x     = r * Math.sin(phi) * Math.cos(theta);
        const y     = r * Math.sin(phi) * Math.sin(theta);
        const z     = r * Math.cos(phi);

        let n = cloudGen.noise3D(x * 0.15, y * 0.1, z * 0.15);
        n += 0.4 * cloudGen.noise3D(x * 0.8, y * 0.8, z * 0.8);

        if (n > 0.3)
        {
            cloudPos.push(x, y, z);
        }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(cloudPos, 3));
    const mat = new THREE.PointsMaterial({
        color: 0xffffff, size: 0.06, transparent: true, opacity: 0.35
    });
    cloudGroup.add(new THREE.Points(geo, mat));
}

createClouds();


// --- C. LEO 卫星群 ---
const leoSats = [];

function createLEOSatellites()
{
    const colors       = [0xffffff, 0xe06236, 0x7da5c6, 0xffffff];
    const radii        = [6.0, 6.5, 5.8, 7.0];
    const speeds       = [0.005, -0.003, 0.006, 0.002];
    const inclinations = [0, Math.PI / 2, Math.PI / 4, -Math.PI / 6];

    for (let i = 0; i < 4; i++)
    {
        const orbitContainer      = new THREE.Group();
        orbitContainer.rotation.z = inclinations[i];
        leoGroup.add(orbitContainer);

        const curve    = new THREE.EllipseCurve(0, 0, radii[i], radii[i], 0, 2 * Math.PI, false, 0);
        const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(64));
        const line     = new THREE.Line(geometry, new THREE.LineDashedMaterial({
            color: colors[i], opacity: 0.15, transparent: true, dashSize: 0.3, gapSize: 0.3
        }));
        line.computeLineDistances();
        line.rotation.x = Math.PI / 2;
        orbitContainer.add(line);

        const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.05), new THREE.MeshBasicMaterial({color: colors[i]}));
        orbitContainer.add(mesh);
        leoSats.push({mesh: mesh, radius: radii[i], speed: speeds[i], angle: Math.random() * Math.PI * 2});
    }
}

createLEOSatellites();


// --- D. 月球 ---
const moonBodyGroup = new THREE.Group();
moonSystemGroup.add(moonBodyGroup);
let moonAngle    = 0;
const moonRadius = 8.5;

function createMoon()
{
    // 轨道线
    const curve     = new THREE.EllipseCurve(0, 0, moonRadius, moonRadius, 0, 2 * Math.PI, false, 0);
    const geometry  = new THREE.BufferGeometry().setFromPoints(curve.getPoints(128));
    const orbitLine = new THREE.Line(geometry, new THREE.LineDashedMaterial({
        color: 0xaaaaaa, opacity: 0.08, transparent: true, dashSize: 0.5, gapSize: 0.5
    }));
    orbitLine.computeLineDistances();
    orbitLine.rotation.x = Math.PI / 2;
    moonSystemGroup.add(orbitLine);

    // 月球点云
    const moonParticles = 1200;
    const mPos          = [];
    const mColors       = [];
    const moonGen       = new SimplexNoise('luna-v2-refined');

    const colMaria    = new THREE.Color('#1f242b');
    const colHigh     = new THREE.Color('#e6e8eb');
    const colRegolith = new THREE.Color('#7a7e85');

    for (let i = 0; i < moonParticles; i++)
    {
        const r     = 0.8;
        const theta = Math.random() * Math.PI * 2;
        const phi   = Math.acos(2 * Math.random() - 1);
        const x     = r * Math.sin(phi) * Math.cos(theta);
        const y     = r * Math.sin(phi) * Math.sin(theta);
        const z     = r * Math.cos(phi);
        mPos.push(x, y, z);

        let n       = moonGen.noise3D(x * 2.5, y * 2.5, z * 2.5);
        let nDetail = moonGen.noise3D(x * 6.0, y * 6.0, z * 6.0) * 0.3;
        let val     = (n + nDetail + 1) / 2;
        let c       = new THREE.Color();
        if (val < 0.45)
        {
            c.copy(colMaria).lerp(colRegolith, val / 0.45);
        }
        else
        {
            c.copy(colRegolith).lerp(colHigh, (val - 0.45) / 0.55);
        }
        mColors.push(c.r, c.g, c.b);
    }

    const moonGeo = new THREE.BufferGeometry();
    moonGeo.setAttribute('position', new THREE.Float32BufferAttribute(mPos, 3));
    moonGeo.setAttribute('color', new THREE.Float32BufferAttribute(mColors, 3));
    const moonPoints = new THREE.Points(moonGeo, new THREE.PointsMaterial({
        size: 0.045, vertexColors: true, transparent: true, opacity: 1.0
    }));
    moonBodyGroup.add(moonPoints);

    // 月球网格
    const wireGeo = new THREE.WireframeGeometry(new THREE.SphereGeometry(0.8, 16, 16));
    const wireMat = new THREE.LineBasicMaterial({color: 0x5d6d7e, transparent: true, opacity: 0.15});
    moonBodyGroup.add(new THREE.LineSegments(wireGeo, wireMat));
}

createMoon();


// ==========================================
// PART 4: 交互与动画 (Interaction & Animation)
// ==========================================

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

let frameCount = 0;

function animate(timestamp)
{
    requestAnimationFrame(animate);
    frameCount++;
    frameSampler.sample(timestamp);

    // 1. 地球自转
    earthSystemGroup.rotation.y += 0.0015;

    // 2. 云层差速
    cloudGroup.rotation.y += 0.0005;

    // 3. LEO 卫星动画
    leoSats.forEach(sat =>
    {
        sat.angle += sat.speed;
        sat.mesh.position.x = sat.radius * Math.cos(sat.angle);
        sat.mesh.position.z = sat.radius * Math.sin(sat.angle);
        sat.mesh.rotation.y += 0.02;
        sat.mesh.rotation.z = -sat.angle;
    });

    // 4. 月球公转 & 自转
    moonAngle += 0.0002;
    moonBodyGroup.position.x = moonRadius * Math.cos(moonAngle);
    moonBodyGroup.position.z = moonRadius * Math.sin(moonAngle);
    moonBodyGroup.rotation.y = moonAngle;

    // 5. [核心] 更新交互状态
    updateInteraction(group, camera);

    // 6. 遥测数据更新
    if (typeof updatePlanetTelemetry === 'function')
    {
        updatePlanetTelemetry(earthSystemGroup, tgtLabel, 1);
    }

    renderer.render(scene, camera);
}

animate();
