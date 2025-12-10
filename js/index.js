/**
 * NASA-Punk Observatory : SYSTEM SELECT LOGIC
 * Handles: Background Topography, Zoom Interaction, and Terminal UI
 */

// ==========================================
// 1. 背景绘制和地形逻辑 (Background & Topography)
// ==========================================
const canvas  = document.getElementById('topo-canvas');
const ctx     = canvas.getContext('2d');
// 确保 simplex-noise.min.js 已在 HTML 中引入
const simplex = new SimplexNoise();

const BG_CONFIG = {
    gridSize  : 5,
    noiseScale: 0.002,
    levels    : 6,
    lineColor : '#3b4e6b',
    lineWidth : 1.8,
    gridAlpha : 0.05,
    starCount : 150
};
let stars       = [];

function initStars()
{
    stars = [];
    for (let i = 0; i < BG_CONFIG.starCount; i++)
    {
        stars.push({
            x      : Math.random() * canvas.width,
            y      : Math.random() * canvas.height,
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
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 绘制基础网格
    ctx.beginPath();
    ctx.strokeStyle = BG_CONFIG.lineColor;
    ctx.lineWidth   = 1;
    ctx.globalAlpha = BG_CONFIG.gridAlpha;
    for (let x = 0; x <= canvas.width; x += 120)
    {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
    }
    for (let y = 0; y <= canvas.height; y += 120)
    {
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
    }
    ctx.stroke();

    // 绘制十字准星装饰
    ctx.globalAlpha = BG_CONFIG.gridAlpha * 2.5;
    const crossSize = 3;
    for (let x = 0; x <= canvas.width; x += 120)
    {
        for (let y = 0; y <= canvas.height; y += 120)
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
    stars.forEach(s =>
    {
        ctx.globalAlpha = s.opacity;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
    });

    // 绘制等高线 (Marching Squares 算法)
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = BG_CONFIG.lineColor;
    ctx.lineWidth   = BG_CONFIG.lineWidth;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';

    const cols  = Math.ceil(canvas.width / BG_CONFIG.gridSize) + 1;
    const rows  = Math.ceil(canvas.height / BG_CONFIG.gridSize) + 1;
    const field = [];

    // 生成噪声场
    for (let i = 0; i <= cols; i++)
    {
        field[i] = [];
        for (let j = 0; j <= rows; j++)
        {
            field[i][j] = (simplex.noise2D(i * BG_CONFIG.gridSize * BG_CONFIG.noiseScale + 100, j * BG_CONFIG.gridSize * BG_CONFIG.noiseScale + 100) + 1) / 2;
        }
    }

    const step = 1 / BG_CONFIG.levels;
    for (let l = 0.2; l < 0.8; l += step)
    {
        ctx.beginPath();
        for (let i = 0; i < cols - 1; i++)
        {
            for (let j = 0; j < rows - 1; j++)
            {
                let st = 0;
                if (field[i][j] >= l)
                {
                    st |= 8;
                }
                if (field[i + 1][j] >= l)
                {
                    st |= 4;
                }
                if (field[i + 1][j + 1] >= l)
                {
                    st |= 2;
                }
                if (field[i][j + 1] >= l)
                {
                    st |= 1;
                }

                if (st === 0 || st === 15)
                {
                    continue;
                }

                const x = i * BG_CONFIG.gridSize, y = j * BG_CONFIG.gridSize;
                const a = {x: x + BG_CONFIG.gridSize * getIsoT(field[i][j], field[i + 1][j], l), y: y};
                const b = {
                    x: x + BG_CONFIG.gridSize,
                    y: y + BG_CONFIG.gridSize * getIsoT(field[i + 1][j], field[i + 1][j + 1], l)
                };
                const c = {
                    x: x + BG_CONFIG.gridSize * getIsoT(field[i][j + 1], field[i + 1][j + 1], l),
                    y: y + BG_CONFIG.gridSize
                };
                const d = {x: x, y: y + BG_CONFIG.gridSize * getIsoT(field[i][j], field[i][j + 1], l)};

                switch (st)
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

function resizeCanvas()
{
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    initStars();
    drawTopo();
}

// 绑定全局 resize 事件
window.addEventListener('resize', () =>
{
    resizeCanvas();
    calculateBaseGap();
});

// 初始化背景
resizeCanvas();


// ==========================================
// 2. 缩放与布局逻辑 (Zoom & Layout)
// ==========================================
const axisGroup              = document.getElementById('axis-group');
const slider                 = document.getElementById('zoom-slider');
const scaleVal               = document.getElementById('scale-val');
const PLANETS_TOTAL_WIDTH_PX = 482; // 行星节点的总固定宽度
const GAPS_COUNT             = 8;   // 间隙数量
let currentBaseGapPx         = 0;

function calculateBaseGap()
{
    const windowWidth      = window.innerWidth;
    // 目标总宽度为视口的 70%
    const targetTotalWidth = windowWidth * 0.70;

    let availableSpaceForGaps = targetTotalWidth - PLANETS_TOTAL_WIDTH_PX;

    // 最小间隙保护
    if (availableSpaceForGaps < GAPS_COUNT * 20)
    {
        availableSpaceForGaps = GAPS_COUNT * 20;
    }

    currentBaseGapPx = availableSpaceForGaps / GAPS_COUNT;
    applyZoom(slider.value);
}

function applyZoom(sliderValue)
{
    // 指数级缩放因子，使缩放手感更自然
    const factor   = 0.5 * Math.pow(4, sliderValue / 100);
    const finalGap = currentBaseGapPx * factor;

    axisGroup.style.gap = finalGap + 'px';

    const percent      = Math.round(factor * 100);
    scaleVal.innerText = percent + '%';
}


// ==========================================
// 3. 高精度滑块逻辑 (Precision Slider)
// ==========================================
function initPrecisionSlider(sliderElement, onUpdate)
{
    let isDragging = false;

    sliderElement.addEventListener('mousedown', (e) =>
    {
        isDragging                 = true;
        document.body.style.cursor = 'grabbing';
        sliderElement.classList.add('active');
        handleDrag(e);
        window.addEventListener('mousemove', handleGlobalMove);
        window.addEventListener('mouseup', handleGlobalUp);
    });

    function handleGlobalMove(e)
    {
        if (isDragging)
        {
            e.preventDefault();
            handleDrag(e);
        }
    }

    function handleGlobalUp(e)
    {
        if (isDragging)
        {
            isDragging                 = false;
            document.body.style.cursor = '';
            sliderElement.classList.remove('active');
            window.removeEventListener('mousemove', handleGlobalMove);
            window.removeEventListener('mouseup', handleGlobalUp);
        }
    }

    function handleDrag(e)
    {
        const rect  = sliderElement.getBoundingClientRect();
        let percent = (e.clientX - rect.left) / rect.width;
        percent     = Math.max(0, Math.min(1, percent));

        const min  = parseFloat(sliderElement.min) || 0;
        const max  = parseFloat(sliderElement.max) || 100;
        const step = parseFloat(sliderElement.step) || 1;

        let newValue = min + percent * (max - min);

        if (step > 0)
        {
            newValue = Math.round(newValue / step) * step;
        }

        sliderElement.value = newValue;

        if (onUpdate)
        {
            onUpdate(newValue);
        }
    }
}

// 初始化滑块
initPrecisionSlider(slider, (value) =>
{
    applyZoom(value);
});

// 初始化布局计算
calculateBaseGap();


// ==========================================
// 4. 终端打字机效果与交互 (Terminal & Interaction)
// ==========================================
const terminalContent = document.getElementById('terminal-content');
const nodes           = document.querySelectorAll('.planet-node');
let typeTimer         = null;

function typeText(text)
{
    if (typeTimer)
    {
        clearInterval(typeTimer);
    }

    terminalContent.innerHTML = '';

    // 清理文本格式
    const cleanText = text.split('\n').map(line => line.trim()).filter(line => line.length > 0).join('\n');
    let i           = 0;

    typeTimer = setInterval(() =>
    {
        if (i < cleanText.length)
        {
            terminalContent.textContent += cleanText.charAt(i);
            i++;
        }
        else
        {
            clearInterval(typeTimer);
            terminalContent.innerHTML += '<span class="blink-cursor">_</span>';
        }
    }, 10);
}

// 页面加载时的初始信息
setTimeout(() =>
{
    typeText("> SYSTEM READY...\n> SELECT TARGET\n> STANDBY...");
}, 100);

// 绑定节点事件
nodes.forEach(node =>
{
    // 鼠标悬停显示数据
    node.addEventListener('mouseenter', () =>
    {
        const dataDiv = node.querySelector('.node-data');
        if (dataDiv)
        {
            typeText(dataDiv.textContent);
        }
    });

    // 点击跳转 (集成 TransitionManager)
    node.addEventListener('click', () =>
    {
        const link = node.dataset.link;
        if (!link)
        {
            return;
        }

        if (typeof TransitionManager !== 'undefined')
        {
            TransitionManager.navigate(link);
        }
        else
        {
            // 如果 transition.js 未加载，回退到普通跳转
            console.warn('TransitionManager not found. Fallback navigation.');
            window.location.href = link;
        }
    });
});