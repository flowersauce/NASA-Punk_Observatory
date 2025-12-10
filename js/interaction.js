/**
 * NASA-Punk Interaction System (Core)
 * v3.0 - Slider Only (Logarithmic Scale) & No Scroll
 */

const InteractionState = {
    // 拖拽旋转状态
    isDragging: false,
    previousMousePosition: { x: 0, y: 0 },
    targetRotationX: 0,
    targetRotationY: 0,

    // 缩放状态 (滑块值 0-100)
    initialZ: 25,        // 初始相机距离 (对应 100% 缩放)
    currentSliderVal: 50, // 当前平滑值 (0-100)
    targetSliderVal: 50,  // 目标值 (0-100, 默认为 50 即 100% 缩放)

    // DOM 引用
    slider: null,
    textDisplay: null
};

/**
 * 初始化交互系统
 * @param {THREE.Group} targetGroup - 需要被旋转的物体组
 * @param {number} initialZoomZ - 相机初始 Z 轴距离
 * @param {string} sliderId - 滑块 Input ID
 * @param {string} textId - 百分比文本显示 ID
 */
function initInteraction(targetGroup, initialZoomZ, sliderId = 'cam-zoom-slider', textId = 'zoom-text-display') {
    InteractionState.initialZ = initialZoomZ;
    InteractionState.slider = document.getElementById(sliderId);
    InteractionState.textDisplay = document.getElementById(textId);

    // --- 1. 鼠标拖拽旋转 (保持不变) ---
    document.addEventListener('mousedown', (e) => {
        if(e.target.tagName === 'CANVAS') {
            InteractionState.isDragging = true;
            InteractionState.previousMousePosition = { x: e.offsetX, y: e.offsetY };
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (InteractionState.isDragging) {
            const deltaMove = {
                x: e.offsetX - InteractionState.previousMousePosition.x,
                y: e.offsetY - InteractionState.previousMousePosition.y
            };
            InteractionState.targetRotationY += deltaMove.x * 0.005;
            InteractionState.targetRotationX += deltaMove.y * 0.005;
            InteractionState.previousMousePosition = { x: e.offsetX, y: e.offsetY };
        }
    });

    document.addEventListener('mouseup', () => InteractionState.isDragging = false);

    // --- 2. 滚轮缩放 (已移除) ---
    // User requested to remove scroll zoom logic.

    // --- 3. 精密滑块控制 ---
    if (InteractionState.slider) {
        initPrecisionSlider(InteractionState.slider, (val) => {
            InteractionState.targetSliderVal = val;
        });
    }
}

/**
 * 每帧更新函数
 */
function updateInteraction(group, camera) {
    // A. 旋转阻尼
    if (group) {
        group.rotation.y += (InteractionState.targetRotationY - group.rotation.y) * 0.1;
        group.rotation.x += (InteractionState.targetRotationX - group.rotation.x) * 0.1;
    }

    // B. 缩放阻尼 (针对滑块值 0-100 进行平滑)
    InteractionState.currentSliderVal += (InteractionState.targetSliderVal - InteractionState.currentSliderVal) * 0.1;

    // C. 对数映射计算 (Logarithmic Mapping)
    // 0 -> 0.5 (50%)
    // 50 -> 1.0 (100%)
    // 100 -> 2.0 (200%)
    const factor = 0.5 * Math.pow(4, InteractionState.currentSliderVal / 100);

    // D. 反比例计算 Z 轴 (Zoom 越大, Z 越小)
    const newZ = InteractionState.initialZ / factor;

    // 应用到相机
    if (camera) {
        camera.position.z = newZ;
    }

    // E. 更新 UI (文本显示实际百分比)
    if (InteractionState.textDisplay) {
        InteractionState.textDisplay.innerText = Math.round(factor * 100) + "%";
    }

    return newZ;
}

/**
 * [内部工具] 高精度全屏拖拽滑块
 */
function initPrecisionSlider(sliderElement, onUpdate) {
    let isDragging = false;

    sliderElement.addEventListener('mousedown', (e) => {
        isDragging = true;
        document.body.style.cursor = 'grabbing';
        sliderElement.classList.add('active');
        handleDrag(e);
        window.addEventListener('mousemove', handleGlobalMove);
        window.addEventListener('mouseup', handleGlobalUp);
    });

    function handleGlobalMove(e) {
        if (isDragging) {
            e.preventDefault();
            handleDrag(e);
        }
    }

    function handleGlobalUp(e) {
        if (isDragging) {
            isDragging = false;
            document.body.style.cursor = '';
            sliderElement.classList.remove('active');
            window.removeEventListener('mousemove', handleGlobalMove);
            window.removeEventListener('mouseup', handleGlobalUp);
        }
    }

    function handleDrag(e) {
        const rect = sliderElement.getBoundingClientRect();
        let percent;

        const isVertical = sliderElement.classList.contains('vertical');

        if (isVertical) {
            // 垂直模式：旋转了-90度后，视觉上的"上"对应逻辑上的数值增加
            // 原点(min)在底部。鼠标越往上(Y越小)，值越大。
            const relativeY = e.clientY - rect.top;
            percent = 1 - (relativeY / rect.height);
        } else {
            const relativeX = e.clientX - rect.left;
            percent = relativeX / rect.width;
        }

        percent = Math.max(0, Math.min(1, percent));

        const min = parseFloat(sliderElement.min) || 0;
        const max = parseFloat(sliderElement.max) || 100;
        const step = parseFloat(sliderElement.step) || 1;

        let newValue = min + percent * (max - min);

        if (step > 0) {
            newValue = Math.round(newValue / step) * step;
        }

        sliderElement.value = newValue;
        if (onUpdate) onUpdate(newValue);
    }
}