(function initObservatoryUi(global)
{
    function buildTickMarkup()
    {
        return `
            <div class="tick"></div>
            <div class="tick-sub"></div>
            <div class="tick-sub"></div>
            <div class="tick-sub"></div>
            <div class="tick-sub"></div>
            <div class="tick"></div>
            <div class="tick-sub"></div>
            <div class="tick-sub"></div>
            <div class="tick-sub"></div>
            <div class="tick-sub"></div>
            <div class="tick"></div>
        `;
    }

    function buildRightDock(config)
    {
        const rows      = (config.rows || []).map((line) => `<div class="data-row">${line}</div>`).join('');
        const footerRow = config.footerRow
            ? `<div class="data-row">${config.footerRow}</div>`
            : '';

        return `<div class="right-dock">
            <div class="header-block">
                <h1>${config.title}${config.badge ? ` <span style="font-size: 0.5em; opacity: 0.6; vertical-align: middle;">[${config.badge}]</span>` : ''}</h1>
                <div class="sub-text">${config.subText}</div>
            </div>
            <div class="data-block">
                ${rows}
                ${footerRow}
            </div>
        </div>`;
    }

    function buildHorizontalZoomControl(config)
    {
        const sliderId  = config && config.sliderId ? config.sliderId : 'zoom-slider';
        const displayId = config && config.displayId ? config.displayId : 'scale-val';
        const label     = config && config.label ? config.label : 'FOV_SCALE';
        const value     = config && config.value ? config.value : '100%';

        return `<div class="zoom-controls">
            <div class="zoom-label">${label} // <span id="${displayId}" class="zoom-value-display">${value}</span></div>
            <input type="range" id="${sliderId}" min="0" max="100" value="50" step="10">
            <div class="zoom-ticks">${buildTickMarkup()}</div>
        </div>`;
    }

    function buildVerticalZoomControl(config)
    {
        const sliderId = config && config.sliderId ? config.sliderId : 'cam-zoom-slider';
        const label    = config && config.label ? config.label : 'OPTICS';

        return `<div class="vertical-controls">
            <div class="v-slider-track">
                <div class="v-ticks">${buildTickMarkup()}</div>
                <input type="range" class="vertical" id="${sliderId}" min="0" max="100" value="50" step="10">
            </div>
            <div class="v-label">${label}</div>
        </div>`;
    }

    global.ObservatoryUI = {
        buildRightDock            : buildRightDock,
        buildHorizontalZoomControl: buildHorizontalZoomControl,
        buildVerticalZoomControl  : buildVerticalZoomControl
    };
})(window);
