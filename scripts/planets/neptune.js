// ==========================================
// NASA-Punk Project: SOL-VIII (NEPTUNE) - FINAL SPEED TUNE
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

const INITIAL_ZOOM = 30;
camera.position.z  = INITIAL_ZOOM;

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

const tgtLabel    = document.querySelector('.monitor-label.label-bottom');

const group = new THREE.Group();
scene.add(group);

// 1. 倾角容器
const planetTiltGroup      = new THREE.Group();
planetTiltGroup.rotation.z = 28.32 * (Math.PI / 180);
group.add(planetTiltGroup);

// 2. 自转容器
const planetSpinGroup = new THREE.Group();
planetTiltGroup.add(planetSpinGroup);

// 3. 卫星系统容器
const moonSystemGroup = new THREE.Group();
group.add(moonSystemGroup);

let frameSampler;


// --- PART 3: 程序化海王星 (Atmosphere) ---
function createNeptune()
{
    const planetName = 'neptune';
    const budget     = PLANET_PARTICLE_CONFIG[planetName].surface;
    const tiers      = [budget, Math.floor(budget * 0.75), Math.floor(budget * 0.5), 250000];
    const allocation = ParticleBuilder.allocate(tiers, (count) => ({
        positions: new Float32Array(count * 3),
        colors   : new Float32Array(count * 3)
    }));

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(allocation.value.positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(allocation.value.colors, 3));
    geo.setDrawRange(0, 0);

    const mat = new THREE.PointsMaterial({
        size           : 0.055,
        vertexColors   : true,
        transparent    : true,
        opacity        : 0.85,
        sizeAttenuation: true
    });
    const planet = new THREE.Points(geo, mat);
    planetSpinGroup.add(planet);

    frameSampler = ParticleBuilder.createFrameSampler({
        geometry: geo,
        maxCount: allocation.count,
        setDynamicStride() {}
    });

    const noiseGen      = new SimplexNoise('neptune-wind-shear');

    const colDeep   = new THREE.Color('#1a237e');
    const colMid    = new THREE.Color('#2962ff');
    const colBright = new THREE.Color('#448aff');
    const colStorm  = new THREE.Color('#0d1238');
    const surfaceColor = new THREE.Color();

    function sampleSurfaceParticle(i, positions, colors)
    {
        const r     = 5.0 + Math.random() * 0.3;
        const theta = Math.random() * Math.PI * 2;
        const phi   = Math.acos(2 * Math.random() - 1);

        let x = r * Math.sin(phi) * Math.cos(theta);
        let y = r * Math.sin(phi) * Math.sin(theta);
        let z = r * Math.cos(phi);

        let nBand = noiseGen.noise3D(x * 0.5, y * 3.0, z * 0.5);

        let isStorm = false;
        if (y < -1.5 && y > -2.5 && x > 0 && Math.abs(z) < 2.0)
        {
            if (Math.random() > 0.6)
            {
                isStorm = true;
            }
        }

        const offset = i * 3;
        positions[offset]     = x;
        positions[offset + 1] = y;
        positions[offset + 2] = z;

        const c = surfaceColor;

        if (isStorm)
        {
            c.copy(colStorm);
        }
        else
        {
            const val = (nBand + 1) / 2;
            if (val < 0.4)
            {
                c.copy(colDeep).lerp(colMid, val / 0.4);
            }
            else
            {
                c.copy(colMid).lerp(colBright, (val - 0.4) / 0.6);
            }
        }

        const depthFactor = (r - 5.0) / 0.3;
        c.multiplyScalar(0.5 + depthFactor * 0.5);

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
            ParticleBuilder.markAttributeRange(geo.attributes.position, start * 3, (end - start) * 3);
            ParticleBuilder.markAttributeRange(geo.attributes.color, start * 3, (end - start) * 3);
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

    const wireGeo = new THREE.WireframeGeometry(new THREE.SphereGeometry(5.32, 32, 16));
    const wireMat = new THREE.LineBasicMaterial({
        color      : '#448aff',
        transparent: true,
        opacity    : 0.06
    });
    planetTiltGroup.add(new THREE.LineSegments(wireGeo, wireMat));
}

createNeptune();


// --- PART 4: 五道环系统 (The 5 Distinct Rings) ---

// 存储光环层数据的数组，用于动画循环
let ringLayers = [];

function createNeptuneRings()
{
    const ringGroup = new THREE.Group();
    planetTiltGroup.add(ringGroup);

    // 环的参数配置
    const ringsConfig = [
        {name: 'Galle', radius: 7.1, width: 0.6, particles: 2500, opacity: 0.15, color: 0x5566aa},
        {name: 'LeVerrier', radius: 7.8, width: 0.1, particles: 1200, opacity: 0.3, color: 0x6677cc},
        {name: 'Lassell', radius: 8.2, width: 0.3, particles: 1000, opacity: 0.1, color: 0x445599},
        {name: 'Arago', radius: 8.6, width: 0.1, particles: 1000, opacity: 0.3, color: 0x6677cc},
        {name: 'Adams', radius: 9.4, width: 0.4, particles: 12000, opacity: 0.9, color: 0x88aaff, isMain: true}
    ];

    const ringNoise = new SimplexNoise('ring-arcs-separated');

    ringsConfig.forEach(config =>
    {
        const pos = [];
        const col = [];

        for (let i = 0; i < config.particles; i++)
        {
            const theta = Math.random() * Math.PI * 2;
            const r     = config.radius + (Math.random() - 0.5) * config.width;

            let alpha = config.opacity;

            if (config.isMain)
            {
                const arcRaw         = ringNoise.noise2D(Math.cos(theta) * 2.0, Math.sin(theta) * 2.0);
                let presence         = (arcRaw + 0.4) / 1.4;
                presence             = Math.max(0, presence);
                const smoothPresence = Math.pow(presence, 3);

                const survivalChance = 0.02 + 0.98 * smoothPresence;
                if (Math.random() > survivalChance)
                {
                    continue;
                }
                alpha = 0.1 + 0.85 * smoothPresence;
            }

            const x = r * Math.cos(theta);
            const z = r * Math.sin(theta);

            pos.push(x, 0, z);

            const c = new THREE.Color(config.color);
            c.multiplyScalar(0.7 + Math.random() * 0.5);
            col.push(c.r, c.g, c.b);
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));

        const mat = new THREE.PointsMaterial({
            size           : 0.055,
            vertexColors   : true,
            transparent    : true,
            opacity        : config.isMain ? 0.9 : 0.4,
            sizeAttenuation: true,
            blending       : THREE.AdditiveBlending
        });

        const pointsMesh = new THREE.Points(geo, mat);
        ringGroup.add(pointsMesh);

        // 计算开普勒角速度: omega ~ r^(-1.5)
        const keplerRatio   = Math.pow(7.1 / config.radius, 1.5);
        const rotationSpeed = 0.008 * keplerRatio;

        ringLayers.push({
            mesh : pointsMesh,
            speed: rotationSpeed
        });
    });
}

createNeptuneRings();


// --- PART 5: 卫星系统 ---
let tritonData     = null;
let minorMoonsData = [];

function createTriton()
{
    const tOrbitRadius = 12.5;
    const tOrbitGroup  = new THREE.Group();

    // 倾角设置：Triton 具有高倾角和逆行轨道
    tOrbitGroup.rotation.z = 20 * (Math.PI / 180);
    tOrbitGroup.rotation.x = 157 * (Math.PI / 180);

    moonSystemGroup.add(tOrbitGroup);

    // [NEW] 海卫一程序化纹理噪声生成器
    const tritonNoise = new SimplexNoise('triton-cryovolcanism');

    // 1. 轨道线
    const orbitGeo  = new THREE.BufferGeometry().setFromPoints(
        new THREE.EllipseCurve(0, 0, tOrbitRadius, tOrbitRadius, 0, 2 * Math.PI).getPoints(128)
    );
    const orbitLine = new THREE.Line(orbitGeo, new THREE.LineDashedMaterial({
        color: 0x88aaff, transparent: true, opacity: 0.25, dashSize: 0.5, gapSize: 0.5
    }));
    orbitLine.computeLineDistances();
    orbitLine.rotation.x = Math.PI / 2;
    tOrbitGroup.add(orbitLine);

    // 2. Triton 本体
    const tBody = new THREE.Group();
    tOrbitGroup.add(tBody);

    const tParticles = 800;
    const tPos       = [];
    const tCol       = [];
    // 使用代表冰和氮冰的颜色
    const colTriton  = new THREE.Color('#d0e0ff');
    // 使用代表喷流和黑暗条纹的颜色
    const colDark    = new THREE.Color('#90a0bb');

    for (let i = 0; i < tParticles; i++)
    {
        const r     = 0.35;
        const theta = Math.random() * Math.PI * 2;
        const phi   = Math.acos(2 * Math.random() - 1);

        let x = r * Math.sin(phi) * Math.cos(theta);
        let y = r * Math.sin(phi) * Math.sin(theta);
        let z = r * Math.cos(phi);

        tPos.push(x, y, z);

        let c = colTriton.clone();

        // [MODIFIED] 使用 Simplex Noise 创建表面细节
        // 缩放系数 6.0 用于创建哈密瓜皮状的中等大小地貌
        const surfaceNoise = tritonNoise.noise3D(x * 6.0, y * 6.0, z * 6.0);

        let brightness = 0.8 + Math.random() * 0.2; // 基础随机亮度

        // 将噪声从 [-1, 1] 映射到 [0.6, 1.2] 的亮度调节因子
        let noiseFactor = THREE.MathUtils.clamp((surfaceNoise + 1) * 0.5 * 1.5, 0.6, 1.2);

        // 乘以基础亮度和噪声因子
        c.multiplyScalar(brightness * noiseFactor);

        // 进一步基于噪声值进行颜色混合，模拟深色条纹/喷流区
        if (surfaceNoise < -0.3)
        {
            // 噪声低谷区（代表黑暗或阴影）更倾向于深色
            c.lerp(colDark, 0.4);
        }

        tCol.push(c.r, c.g, c.b);
    }

    const tGeo = new THREE.BufferGeometry();
    tGeo.setAttribute('position', new THREE.Float32BufferAttribute(tPos, 3));
    tGeo.setAttribute('color', new THREE.Float32BufferAttribute(tCol, 3));

    const tMat = new THREE.PointsMaterial({
        size        : 0.045,
        vertexColors: true,
        transparent : true,
        opacity     : 1.0,
        blending    : THREE.AdditiveBlending // 增加科幻感
    });
    tBody.add(new THREE.Points(tGeo, tMat));

    const wireGeo = new THREE.WireframeGeometry(new THREE.SphereGeometry(0.36, 12, 12));
    const wireMat = new THREE.LineBasicMaterial({color: 0x88aaff, transparent: true, opacity: 0.1});
    tBody.add(new THREE.LineSegments(wireGeo, wireMat));

    tritonData = {
        mesh  : tBody,
        angle : 0,
        speed : -0.004,
        radius: tOrbitRadius
    };
}

function createMinorMoons()
{
    const moonsConfig = [
        {name: "Galatea", radius: 5.5, speed: 0.015, size: 0.05, color: 0x6677aa},
        {name: "Larissa", radius: 5.75, speed: 0.0125, size: 0.06, color: 0x556699},
        {name: "Proteus", radius: 6.0, speed: 0.01, size: 0.08, color: 0x6677aa},
        {name: "Nereid", radius: 24.0, speed: 0.001, size: 0.07, color: 0x8899cc, eccentric: true}
    ];

    moonsConfig.forEach(config =>
    {
        const orbitGroup      = new THREE.Group();
        orbitGroup.rotation.x = config.eccentric ? 0.3 : Math.random() * 0.05;
        orbitGroup.rotation.z = config.eccentric ? 0.2 : Math.random() * 0.05;
        planetTiltGroup.add(orbitGroup);

        const orbitPoints = config.eccentric ? 128 : 64;
        const xRad        = config.radius;
        const yRad        = config.eccentric ? config.radius * 0.7 : config.radius;

        const orbitGeo  = new THREE.BufferGeometry().setFromPoints(
            new THREE.EllipseCurve(0, 0, xRad, yRad, 0, 2 * Math.PI).getPoints(orbitPoints)
        );
        const orbitLine = new THREE.Line(orbitGeo, new THREE.LineDashedMaterial({
            color: 0x445588, transparent: true, opacity: 0.1, dashSize: 0.2, gapSize: 0.2
        }));
        orbitLine.computeLineDistances();
        orbitLine.rotation.x = Math.PI / 2;
        orbitGroup.add(orbitLine);

        const mesh = new THREE.Mesh(
            new THREE.IcosahedronGeometry(config.size, 0),
            new THREE.MeshBasicMaterial({color: config.color, wireframe: true, transparent: true, opacity: 0.6})
        );
        orbitGroup.add(mesh);

        minorMoonsData.push({
            mesh : mesh,
            angle: Math.random() * Math.PI * 2,
            speed: config.speed,
            xRad : xRad,
            yRad : yRad
        });
    });
}

createTriton();
createMinorMoons();


// ==========================================
// PART 6: 交互与动画循环
// ==========================================

initInteraction(group, INITIAL_ZOOM);

if (typeof InteractionState !== 'undefined')
{
    InteractionState.targetRotationX = 0.3;
    InteractionState.targetRotationY = 0.0;
}
group.rotation.x = 0.3;
group.rotation.y = 0.0;

let frameCount = 0;

function animate(timestamp)
{
    requestAnimationFrame(animate);
    frameCount++;
    frameSampler.sample(timestamp);

    planetSpinGroup.rotation.y += 0.003;

    // 光环自转动画
    ringLayers.forEach(layer =>
    {
        layer.mesh.rotation.y += layer.speed;
    });

    if (tritonData)
    {
        tritonData.angle += tritonData.speed;
        tritonData.mesh.position.x = tritonData.radius * Math.cos(tritonData.angle);
        tritonData.mesh.position.z = tritonData.radius * Math.sin(tritonData.angle);
        tritonData.mesh.rotation.y += 0.01;
    }

    minorMoonsData.forEach(moon =>
    {
        moon.angle += moon.speed;
        moon.mesh.position.x = moon.xRad * Math.cos(moon.angle);
        moon.mesh.position.z = moon.yRad * Math.sin(moon.angle);
        moon.mesh.rotation.x += 0.02;
        moon.mesh.rotation.y += 0.02;
    });

    updateInteraction(group, camera);
    updatePlanetTelemetry(planetSpinGroup, tgtLabel, 1);

    renderer.render(scene, camera);
}

animate();
