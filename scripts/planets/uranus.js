// ==========================================
// NASA-Punk Project: URANUS
// ==========================================

// --- PART 1: 基础观测背景 ---
const sharedTopoBackground = createTopoBackground({
    canvasId   : 'topo-canvas',
    noiseOffset: 800
});


// --- PART 2: Three.js 场景 ---
const canvasContainer = document.getElementById('canvas-container');
const displaySize     = DisplayArea.getSize(canvasContainer);
const scene           = new THREE.Scene();
const camera          = new THREE.PerspectiveCamera(35, displaySize.width / displaySize.height, 0.1, 1000);

const INITIAL_ZOOM = 38;

camera.position.z = INITIAL_ZOOM;

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

const uranusTiltGroup      = new THREE.Group();
uranusTiltGroup.rotation.z = -97.77 * (Math.PI / 180);
group.add(uranusTiltGroup);

const uranusSpinGroup = new THREE.Group();
uranusTiltGroup.add(uranusSpinGroup);

const ringGroup = new THREE.Group();
uranusTiltGroup.add(ringGroup);

const moonGroup = new THREE.Group();
uranusTiltGroup.add(moonGroup);

let frameSampler;


// --- PART 3: 天王星主体 ---
function createUranus()
{
    const planetName = 'uranus';
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
        size        : 0.06,
        vertexColors: true,
        transparent : true,
        opacity     : 0.9
    });
    const planet = new THREE.Points(geo, mat);
    uranusSpinGroup.add(planet);

    frameSampler = ParticleBuilder.createFrameSampler({
        geometry: geo,
        maxCount: allocation.count,
        setDynamicStride() {}
    });

    const noiseGen      = new SimplexNoise('uranus-base');

    const colBase = new THREE.Color('#a4d8e6');
    const colDeep = new THREE.Color('#4a9cb8');
    const colHigh = new THREE.Color('#e0ffff');
    const surfaceColor = new THREE.Color();

    function sampleSurfaceParticle(i, positions, colors)
    {
        const r = 5.0;

        const theta = Math.random() * Math.PI * 2;
        const phi   = Math.acos(2 * Math.random() - 1);

        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.sin(phi) * Math.sin(theta);
        const z = r * Math.cos(phi);

        const offset = i * 3;
        positions[offset]     = x;
        positions[offset + 1] = y;
        positions[offset + 2] = z;

        let lat = Math.abs(y / r);
        const c = surfaceColor;

        c.copy(colDeep).lerp(colBase, lat * 0.8 + 0.2);

        if (lat > 0.8)
        {
            c.lerp(colHigh, (lat - 0.8) * 3.0);
        }

        let bandNoise = noiseGen.noise3D(x, y * 4.0, z);
        if (Math.abs(bandNoise) > 0.6)
        {
            c.multiplyScalar(1.05);
        }

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
            geo.attributes.position.updateRange = {offset: start * 3, count: (end - start) * 3};
            geo.attributes.color.updateRange = {offset: start * 3, count: (end - start) * 3};
            geo.attributes.position.needsUpdate = true;
            geo.attributes.color.needsUpdate = true;
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

    const atmosGeo = new THREE.BufferGeometry();
    const atmosPos = [];
    const atmosCol = [];
    for (let i = 0; i < 8000; i++)
    {
        const r     = 5.2;
        const theta = Math.random() * Math.PI * 2;
        const phi   = Math.acos(2 * Math.random() - 1);
        atmosPos.push(r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi));
        atmosCol.push(0.4, 0.9, 1.0);
    }
    atmosGeo.setAttribute('position', new THREE.Float32BufferAttribute(atmosPos, 3));
    atmosGeo.setAttribute('color', new THREE.Float32BufferAttribute(atmosCol, 3));
    const atmos = new THREE.Points(atmosGeo, new THREE.PointsMaterial({
        size        : 0.08,
        vertexColors: true,
        transparent : true,
        opacity     : 0.15,
        blending    : THREE.AdditiveBlending
    }));
    uranusSpinGroup.add(atmos);

    const wireGeo = new THREE.WireframeGeometry(new THREE.SphereGeometry(5.1, 24, 24));
    const wireMat = new THREE.LineBasicMaterial({
        color      : '#64dceb',
        transparent: true,
        opacity    : 0.05
    });
    uranusSpinGroup.add(new THREE.LineSegments(wireGeo, wireMat));
}

createUranus();


// --- PART 5: 星环系统 ---
function createProceduralRings()
{
    const ringDefs = [
        {
            r      : 6.9,
            width  : 0.8,
            color  : '#1a1a1a',
            opacity: 0.12,
            density: 10000,
            spread : 0.08
        },
        {
            r      : 9.0,
            width  : 0.2,
            color  : '#2a4f50',
            opacity: 0.25,
            density: 5000,
            spread : 0.04
        },
        {
            r      : 9.7,
            width  : 0.3,
            color  : '#40e0d0',
            opacity: 0.5,
            density: 12000,
            spread : 0.02
        },
        {
            r      : 10.3,
            width  : 0.1,
            color  : '#3a5f60',
            opacity: 0.3,
            density: 4000,
            spread : 0.03
        },
        {
            r      : 11.4,
            width  : 0.8,
            color  : '#2f4f4f',
            opacity: 0.15,
            density: 8000,
            spread : 0.06
        }
    ];

    const positions = [];
    const colors    = [];

    ringDefs.forEach(def =>
    {
        const pColor = new THREE.Color(def.color);

        for (let i = 0; i < def.density; i++)
        {
            const r     = def.r + (Math.random() - 0.5) * def.width;
            const angle = Math.random() * Math.PI * 2;
            const y     = (Math.random() - 0.5) * def.spread;

            const x = r * Math.cos(angle);
            const z = r * Math.sin(angle);

            positions.push(x, y, z);

            let c = pColor.clone();
            c.multiplyScalar(0.7 + Math.random() * 0.6);
            c.multiplyScalar(0.8);

            colors.push(c.r, c.g, c.b);
        }
    });

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
        size           : 0.05,
        vertexColors   : true,
        transparent    : true,
        opacity        : 0.5,
        sizeAttenuation: true,
        blending       : THREE.AdditiveBlending,
        depthWrite     : false
    });

    const rings = new THREE.Points(geo, mat);
    ringGroup.add(rings);
}

createProceduralRings();


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
              detail,
              inclination  = 0,
              isRetrograde = false
          } = config;

    const satOrbit = new THREE.Group();
    if (inclination !== 0)
    {
        satOrbit.rotation.x = (Math.random() - 0.5) * inclination;
        satOrbit.rotation.z = (Math.random() - 0.5) * inclination;
    }
    else
    {
        satOrbit.rotation.x = (Math.random() - 0.5) * 0.04;
    }
    satOrbit.rotation.y = Math.random() * Math.PI * 2;
    moonGroup.add(satOrbit);

    const curve     = new THREE.EllipseCurve(0, 0, radius, radius, 0, 2 * Math.PI);
    const points    = curve.getPoints(type === 'Major' ? 128 : 64);
    const orbitGeo  = new THREE.BufferGeometry().setFromPoints(points);
    const orbitMat  = new THREE.LineDashedMaterial({
        color      : color,
        transparent: true,
        opacity    : type === 'Major' ? 0.35 : 0.08,
        dashSize   : type === 'Major' ? 0.3 : 0.5,
        gapSize    : type === 'Major' ? 0.2 : 0.8
    });
    const orbitLine = new THREE.Line(orbitGeo, orbitMat);
    orbitLine.computeLineDistances();
    orbitLine.rotation.x = Math.PI / 2;
    satOrbit.add(orbitLine);

    const moonMeshGroup = new THREE.Group();
    moonMeshGroup.position.set(radius, 0, 0);
    satOrbit.add(moonMeshGroup);

    const baseColor = new THREE.Color(color);

    if (type === 'Major')
    {
        const wireGeo = new THREE.WireframeGeometry(new THREE.SphereGeometry(size, 8, 8));
        const wireMat = new THREE.LineBasicMaterial({
            color      : color,
            transparent: true,
            opacity    : 0.6
        });
        moonMeshGroup.add(new THREE.LineSegments(wireGeo, wireMat));

        const pCount    = 300;
        const pPos      = [];
        const pCol      = [];
        const mNoise    = new SimplexNoise(name);
        const darkColor = baseColor.clone().multiplyScalar(0.3);

        for (let i = 0; i < pCount; i++)
        {
            const theta = Math.random() * Math.PI * 2;
            const phi   = Math.acos(2 * Math.random() - 1);
            const r     = size * 0.92;
            const x     = r * Math.sin(phi) * Math.cos(theta);
            const y     = r * Math.sin(phi) * Math.sin(theta);
            const z     = r * Math.cos(phi);
            pPos.push(x, y, z);

            let n = mNoise.noise3D(x * detail, y * detail, z * detail);
            let c = new THREE.Color().copy(baseColor);

            if (name === "Miranda" && Math.abs(n) > 0.3)
            {
                c.multiplyScalar(0.4);
            }
            else if (name === "Ariel" && n > 0.2)
            {
                c.addScalar(0.3);
            }
            else if (name === "Umbriel")
            {
                c.multiplyScalar(0.6);
            }
            if (n < -0.2)
            {
                c.lerp(darkColor, 0.5);
            }

            pCol.push(c.r, c.g, c.b);
        }
        const cloudGeo = new THREE.BufferGeometry();
        cloudGeo.setAttribute('position', new THREE.Float32BufferAttribute(pPos, 3));
        cloudGeo.setAttribute('color', new THREE.Float32BufferAttribute(pCol, 3));
        moonMeshGroup.add(new THREE.Points(cloudGeo, new THREE.PointsMaterial({
            size        : size * 0.45,
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
        speed    : isRetrograde ? -speed : speed,
        radius   : radius,
        angle    : Math.random() * Math.PI * 2,
        type     : type
    });
}

createMoon({
    name  : "Bianca",
    radius: 7.5,
    speed : 0.018,
    size  : 0.05,
    color : 0x447777,
    type  : 'Minor'
});
createMoon({
    name  : "Cressida",
    radius: 7.8,
    speed : 0.017,
    size  : 0.06,
    color : 0x447777,
    type  : 'Minor'
});
createMoon({
    name  : "Puck",
    radius: 8.0,
    speed : 0.015,
    size  : 0.08,
    color : 0x55aaaa,
    type  : 'Minor'
});
createMoon({
    name  : "Desdemona",
    radius: 8.1,
    speed : 0.016,
    size  : 0.05,
    color : 0x447777,
    type  : 'Minor'
});
createMoon({
    name  : "Juliet",
    radius: 8.4,
    speed : 0.015,
    size  : 0.06,
    color : 0x447777,
    type  : 'Minor'
});
createMoon({
    name  : "Portia",
    radius: 8.7,
    speed : 0.014,
    size  : 0.08,
    color : 0x559999,
    type  : 'Minor'
});
createMoon({
    name  : "Cordelia",
    radius: 9.35,
    speed : 0.013,
    size  : 0.04,
    color : 0x558888,
    type  : 'Minor'
});
createMoon({
    name  : "Ophelia",
    radius: 10.05,
    speed : 0.012,
    size  : 0.04,
    color : 0x558888,
    type  : 'Minor'
});
createMoon({
    name  : "Miranda",
    radius: 10.6,
    speed : 0.008,
    size  : 0.22,
    color : 0xcccccc,
    type  : 'Major',
    detail: 10.0
});
createMoon({
    name  : "Ariel",
    radius: 12.2,
    speed : 0.006,
    size  : 0.28,
    color : 0xe0ffff,
    type  : 'Major',
    detail: 5.0
});
createMoon({
    name  : "Umbriel",
    radius: 14.0,
    speed : 0.005,
    size  : 0.28,
    color : 0x666666,
    type  : 'Major',
    detail: 3.0
});
createMoon({
    name  : "Titania",
    radius: 16.2,
    speed : 0.004,
    size  : 0.38,
    color : 0xe0d0b0,
    type  : 'Major',
    detail: 6.0
});
createMoon({
    name  : "Oberon",
    radius: 19.0,
    speed : 0.003,
    size  : 0.35,
    color : 0xa08080,
    type  : 'Major',
    detail: 8.0
});
createMoon({
    name        : "Caliban",
    radius      : 23.0,
    speed       : 0.0008,
    size        : 0.06,
    color       : 0xaa5555,
    type        : 'Minor',
    inclination : 0.8,
    isRetrograde: true
});
createMoon({
    name        : "Sycorax",
    radius      : 27.0,
    speed       : 0.0005,
    size        : 0.08,
    color       : 0xcc6666,
    type        : 'Minor',
    inclination : 0.9,
    isRetrograde: true
});
createMoon({
    name        : "Setebos",
    radius      : 31.0,
    speed       : 0.0003,
    size        : 0.05,
    color       : 0x888888,
    type        : 'Minor',
    inclination : 0.6,
    isRetrograde: true
});


// --- PART 7: 交互与动画 ---

// 初始化交互模块
initInteraction(group, INITIAL_ZOOM);

// [NEW] 初始相机倾角设置
if (typeof InteractionState !== 'undefined')
{
    InteractionState.targetRotationX = 0.0;
    InteractionState.targetRotationY = 0.2;
}
group.rotation.x = 0.0;
group.rotation.y = 0.2;

let frameCount = 0;

function animate(timestamp)
{
    requestAnimationFrame(animate);
    frameCount++;
    frameSampler.sample(timestamp);

    // 物理更新
    // 逆行自转
    uranusSpinGroup.rotation.y -= 0.004;
    ringGroup.rotation.y += 0.0005;
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

    // 2. 更新交互状态 (调用抽象模块)
    updateInteraction(group, camera);

    // 3. 更新遥测数据 (调用抽象模块，启用 Dec 翻转)
    // 启用 Dec 翻转，以匹配 IAU 定义的北极方向和 Dec 读数。
    updatePlanetTelemetry(uranusSpinGroup, tgtLabel, -1);

    renderer.render(scene, camera);
}

animate();
