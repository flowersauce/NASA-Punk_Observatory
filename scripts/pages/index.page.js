(function initSystemSelectPage()
{
    const SYSTEM_SELECT_CONFIG      = window.SYSTEM_SELECT_CONFIG || {};
    const SYSTEM_SELECT_INTERACTION = SYSTEM_SELECT_CONFIG.interaction || {};

    function typeText(target, text)
    {
        if (!target)
        {
            return;
        }
        if (target._typeTimer)
        {
            clearInterval(target._typeTimer);
        }

        target.textContent = '';
        const cleanText    = text
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line.length > 0)
            .join('\n');

        let index         = 0;
        target._typeTimer = setInterval(() =>
        {
            if (index < cleanText.length)
            {
                target.textContent += cleanText.charAt(index);
                index += 1;
                return;
            }

            clearInterval(target._typeTimer);
            target._typeTimer = null;
            target.innerHTML += '<span class="blink-cursor">_</span>';
        }, 10);
    }

    function initSystemSelectInteractions()
    {
        const axisGroup       = document.getElementById('axis-group');
        const slider          = document.getElementById('zoom-slider');
        const scaleVal        = document.getElementById('scale-val');
        const terminalContent = document.getElementById('terminal-content');
        const nodes           = document.querySelectorAll('.planet-node');

        if (!axisGroup || !slider || !scaleVal || !terminalContent || nodes.length === 0)
        {
            return;
        }

        const planetsTotalWidthPx = SYSTEM_SELECT_INTERACTION.planetsTotalWidthPx || 482;
        const gapsCount           = SYSTEM_SELECT_INTERACTION.gapsCount || 8;
        const targetWidthRatio    = SYSTEM_SELECT_INTERACTION.targetWidthRatio || 0.70;
        const minimumGapPx        = SYSTEM_SELECT_INTERACTION.minimumGapPx || 20;
        let currentBaseGapPx      = 0;

        function applyZoom(sliderValue)
        {
            const factor        = 0.5 * Math.pow(4, sliderValue / 100);
            const finalGap      = currentBaseGapPx * factor;
            axisGroup.style.gap = `${finalGap}px`;
            scaleVal.innerText  = `${Math.round(factor * 100)}%`;
        }

        function calculateBaseGap()
        {
            const targetTotalWidth    = window.innerWidth * targetWidthRatio;
            let availableSpaceForGaps = targetTotalWidth - planetsTotalWidthPx;
            if (availableSpaceForGaps < gapsCount * minimumGapPx)
            {
                availableSpaceForGaps = gapsCount * minimumGapPx;
            }

            currentBaseGapPx = availableSpaceForGaps / gapsCount;
            applyZoom(slider.value);
        }

        initPrecisionSlider(slider, (value) =>
        {
            applyZoom(value);
        });

        nodes.forEach((node) =>
        {
            node.addEventListener('mouseenter', () =>
            {
                const dataDiv = node.querySelector('.node-data');
                if (dataDiv)
                {
                    typeText(terminalContent, dataDiv.textContent);
                }
            });

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
                    window.location.href = link;
                }
            });
        });

        setTimeout(() =>
        {
            typeText(
                terminalContent,
                SYSTEM_SELECT_INTERACTION.initialTerminalText || '> SYSTEM READY...\n> SELECT TARGET\n> STANDBY...'
            );
        }, 100);

        return calculateBaseGap;
    }

    if (typeof renderSystemSelectUI === 'function')
    {
        renderSystemSelectUI();
    }

    const topoBackground = createTopoBackground({
        canvasId   : 'topo-canvas',
        noiseOffset: 100
    });

    const recalculateLayout = initSystemSelectInteractions();
    window.addEventListener('resize', () =>
    {
        topoBackground.resize();
        if (recalculateLayout)
        {
            recalculateLayout();
        }
    });

    if (recalculateLayout)
    {
        recalculateLayout();
    }
})();
