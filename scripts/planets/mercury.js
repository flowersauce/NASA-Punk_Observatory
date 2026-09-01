// ==========================================
// NASA-Punk Project: SOL-I (MERCURY) - FINAL TUNING
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

let frameSampler;


// --- PART 3: 水星本体 ---
function createMercury()
{
    const planetName = 'mercury';
    const budget     = PLANET_PARTICLE_CONFIG[planetName].surface;
    const tiers      = [budget, Math.floor(budget * 0.75), Math.floor(budget * 0.5), 250000];
    const allocation  = ParticleBuilder.allocate(tiers, (count) => ({
        positions: new Float32Array(count * 3),
        colors   : new Float32Array(count * 3)
    }));

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(allocation.value.positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(allocation.value.colors, 3));
    geometry.setDrawRange(0, 0);

    const surfaceMaterial = new THREE.PointsMaterial({
        size           : 0.05,
        vertexColors   : true,
        transparent    : true,
        opacity        : 0.95,
        sizeAttenuation: true
    });
    const points = new THREE.Points(geometry, surfaceMaterial);
    planetSpinGroup.add(points);

    frameSampler = ParticleBuilder.createFrameSampler({
        geometry,
        maxCount: allocation.count,
        setDynamicStride() {}
    });

    const noiseGen = new SimplexNoise('mercury-surface');
    const colBase  = new THREE.Color('#999999');
    const colDark  = new THREE.Color('#555555');
    const colLight = new THREE.Color('#cccccc');
    const surfaceColor = new THREE.Color();

    function sampleSurfaceParticle(i, positions, colors)
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

        const offset = i * 3;
        positions[offset]     = x;
        positions[offset + 1] = y;
        positions[offset + 2] = z;

        const c = surfaceColor;
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
        colors[offset]     = c.r;
        colors[offset + 1] = c.g;
        colors[offset + 2] = c.b;
    }

    ParticleBuilder.build({
        total        : allocation.count,
        readyCount   : Math.min(250000, allocation.count),
        initialBatchSize: 10000,
        writeBatch(start, end)
        {
            for (let i = start; i < end; i++)
            {
                sampleSurfaceParticle(i, allocation.value.positions, allocation.value.colors);
            }
            ParticleBuilder.markAttributeRange(geometry.attributes.position, start * 3, (end - start) * 3);
            ParticleBuilder.markAttributeRange(geometry.attributes.color, start * 3, (end - start) * 3);
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

let frameCount = 0;

function animate(timestamp)
{
    requestAnimationFrame(animate);
    frameCount++;
    frameSampler.sample(timestamp);

    planetSpinGroup.rotation.y += 0.0003;

    if (frameCount % frameSampler.dynamicStride === 0)
    {
        updateSodiumTail();
    }

    currentZoom = updateInteraction(group, camera, zoomDisplay, currentZoom);
    updatePlanetTelemetry(planetSpinGroup, tgtLabel, 1);

    renderer.render(scene, camera);
}

animate();
