const InteractionState = {
    isDragging           : false,
    previousMousePosition: {x: 0, y: 0},
    targetRotationX      : 0,
    targetRotationY      : 0,
    initialZ             : 25,
    currentSliderVal     : 50,
    targetSliderVal      : 50,
    slider               : null,
    textDisplay          : null
};

function initInteraction(targetGroup, initialZoomZ, sliderId = 'cam-zoom-slider', textId = 'zoom-text-display')
{
    InteractionState.initialZ    = initialZoomZ;
    InteractionState.slider      = document.getElementById(sliderId);
    InteractionState.textDisplay = document.getElementById(textId);

    document.addEventListener('mousedown', (e) =>
    {
        if (e.target.tagName === 'CANVAS')
        {
            InteractionState.isDragging            = true;
            InteractionState.previousMousePosition = {x: e.offsetX, y: e.offsetY};
        }
    });

    document.addEventListener('mousemove', (e) =>
    {
        if (InteractionState.isDragging)
        {
            const deltaMove                        = {
                x: e.offsetX - InteractionState.previousMousePosition.x,
                y: e.offsetY - InteractionState.previousMousePosition.y
            };
            InteractionState.targetRotationY += deltaMove.x * 0.005;
            InteractionState.targetRotationX += deltaMove.y * 0.005;
            InteractionState.previousMousePosition = {x: e.offsetX, y: e.offsetY};
        }
    });

    document.addEventListener('mouseup', () =>
    {
        InteractionState.isDragging = false;
    });

    if (InteractionState.slider)
    {
        initPrecisionSlider(InteractionState.slider, (val) =>
        {
            InteractionState.targetSliderVal = val;
        });
    }
}

function updateInteraction(group, camera)
{
    if (group)
    {
        group.rotation.y += (InteractionState.targetRotationY - group.rotation.y) * 0.1;
        group.rotation.x += (InteractionState.targetRotationX - group.rotation.x) * 0.1;
    }
    InteractionState.currentSliderVal += (InteractionState.targetSliderVal - InteractionState.currentSliderVal) * 0.1;
    const factor = 0.5 * Math.pow(4, InteractionState.currentSliderVal / 100);
    const newZ   = InteractionState.initialZ / factor;

    if (camera)
    {
        camera.position.z = newZ;
    }
    if (InteractionState.textDisplay)
    {
        InteractionState.textDisplay.innerText = Math.round(factor * 100) + '%';
    }
    return newZ;
}

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

    function handleGlobalUp()
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
        const rect       = sliderElement.getBoundingClientRect();
        const isVertical = sliderElement.classList.contains('vertical');
        let percent;
        if (isVertical)
        {
            const relativeY = e.clientY - rect.top;
            percent         = 1 - (relativeY / rect.height);
        }
        else
        {
            const relativeX = e.clientX - rect.left;
            percent         = relativeX / rect.width;
        }
        percent = Math.max(0, Math.min(1, percent));

        const min    = parseFloat(sliderElement.min) || 0;
        const max    = parseFloat(sliderElement.max) || 100;
        const step   = parseFloat(sliderElement.step) || 1;
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
