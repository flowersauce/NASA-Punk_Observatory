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

const INITIAL_ZOOM = 25;
camera.position.z  = INITIAL_ZOOM;

const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha    : true
});
renderer.setSize(displaySize.width, displaySize.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
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

const tgtLabel = document.querySelector('.monitor-label.label-bottom');

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
const coreRadius = 5.0;
const cloudUniforms = {
    uTime: {value: 0}
};

// --- A. 地表点云 (Inner Surface: Magma Chaos) ---
function createVenusSurface()
{
    const noiseGen         = new SimplexNoise('venus-magma-chaos-rock');

    // [NEW PALETTE] 模拟岩浆的高对比度色板
    const colBase = new THREE.Color('#8b1a1a'); // 深岩浆红
    const colHigh = new THREE.Color('#d9531e'); // 亮熔岩橙
    const colPeak = new THREE.Color('#ffe0a0'); // 极热点黄
    const sampleColor = new THREE.Color();

    const mat = new THREE.PointsMaterial({
        size           : 0.055,
        vertexColors   : true,
        transparent    : true,
        opacity        : 0.95,
        sizeAttenuation: true
    });

    ParticleSurface.build({
        THREE,
        parent  : venusSurfaceGroup,
        material: mat,
        sample(i, positions, colors)
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
            const val = (nChaos + 1) / 2;
            if (val < 0.5)
            {
                sampleColor.copy(colBase).lerp(colHigh, val * 2.0);
            }
            else
            {
                sampleColor.copy(colHigh).lerp(colPeak, (val - 0.5) * 2.0);
            }

            sampleColor.multiplyScalar(0.9 + Math.random() * 0.2);
            colors[offset]     = sampleColor.r;
            colors[offset + 1] = sampleColor.g;
            colors[offset + 2] = sampleColor.b;
        },
        onError(error)
        {
            console.error('[Venus] surface generation stopped', error);
        }
    });
}

createVenusSurface();


// --- B. 大气点云 (Outer Atmosphere: Density Reduced) ---

function createVenusClouds()
{
    const cloudParticles = 40000;
    const cloudPos       = new Float32Array(cloudParticles * 3);
    const cloudColors    = new Float32Array(cloudParticles * 3);

    const colBase = new THREE.Color('#ffae20');

    for (let i = 0; i < cloudParticles; i++)
    {
        // [FIX 1] 粒子均匀分布在球壳内，位置上无噪波扰动
        const r     = coreRadius + Math.random() * 0.4;
        const theta = Math.random() * Math.PI * 2;
        const phi   = Math.acos(2 * Math.random() - 1);

        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.sin(phi) * Math.sin(theta);
        const z = r * Math.cos(phi);

        const offset = i * 3;
        cloudPos[offset]     = x;
        cloudPos[offset + 1] = y;
        cloudPos[offset + 2] = z;

        const brightness = 0.9 + Math.random() * 0.2;
        cloudColors[offset]     = colBase.r * brightness;
        cloudColors[offset + 1] = colBase.g * brightness;
        cloudColors[offset + 2] = colBase.b * brightness;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(cloudPos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(cloudColors, 3));

    const mat = new THREE.ShaderMaterial({
        uniforms: cloudUniforms,
        vertexShader: `
            uniform float uTime;
            attribute vec3 color;
            varying vec3 vColor;
            varying float vBrightness;

            void main() {
                vColor = color;
                vBrightness = 0.88 + 0.12 * sin(position.y * 2.4 + uTime);
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = 2.0 * (30.0 / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            varying float vBrightness;

            void main() {
                vec2 point = gl_PointCoord - vec2(0.5);
                float pointDistance = length(point);
                float alpha = smoothstep(0.5, 0.15, pointDistance) * 0.2;
                gl_FragColor = vec4(vColor * vBrightness, alpha);
            }
        `,
        transparent: true,
        depthWrite : false
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

function animate()
{
    requestAnimationFrame(animate);

    // 1. 地表逆行自转 (极慢)
    venusSurfaceGroup.rotation.y -= 0.0002;

    // 2. 大气超自转 (快 7.5 倍)
    cloudGroup.rotation.y -= 0.0015;

    // 3. 云层颜色动画 (仅通过 shader uniform 模拟流动)
    cloudUniforms.uTime.value = Date.now() * 0.0002;

    // 4. 视角和缩放控制
    updateInteraction(group, camera);

    // 5. 遥测数据更新 (以云层组作为参考系，因为它是主要视觉对象)
    updatePlanetTelemetry(cloudGroup, tgtLabel, 2);

    renderer.render(scene, camera);
}

animate();
