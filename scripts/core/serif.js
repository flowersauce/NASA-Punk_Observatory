/**
 * NASA-Punk Serif System
 * A serif is an optional page-edge component that reserves display space.
 */
(function initSerifSystem(global)
{
    const serifConfig = Object.assign({
        enabled: true,
        style  : 'segmented-colorbar-right'
    }, global.SERIF_CONFIG || {});

    const styles = {};

    function createSegmentedColorbarMarkup()
    {
        return `<div class="brand-stripe serif-segmented-colorbar">
            <div class="stripe-seg s-1"></div>
            <div class="stripe-seg s-2"></div>
            <div class="stripe-seg s-3"></div>
            <div class="stripe-seg s-4"></div>
        </div>`;
    }

    function clearSerifs()
    {
        document.querySelectorAll('.serif-region').forEach((node) =>
        {
            node.remove();
        });

        document.body.classList.remove('has-serif-right');
        document.body.classList.remove('has-serif-left');
        document.body.classList.remove('has-serif-top');
        document.body.classList.remove('has-serif-bottom');
        document.body.classList.remove('serif-disabled');
        document.body.style.removeProperty('--display-top-inset');
        document.body.style.removeProperty('--display-right-inset');
        document.body.style.removeProperty('--display-bottom-inset');
        document.body.style.removeProperty('--display-left-inset');
    }

    function mountSerifRegion(style)
    {
        const region       = document.createElement('div');
        region.className   = `serif-region serif-region-${style.edge} ${style.className || ''}`.trim();
        region.dataset.edge = style.edge;
        region.innerHTML   = style.render();
        document.body.appendChild(region);
        document.body.classList.add(`has-serif-${style.edge}`);
        document.body.style.setProperty(`--display-${style.edge}-inset`, style.size || '0px');
    }

    function getActiveStyle()
    {
        if (!serifConfig.enabled)
        {
            return null;
        }

        return styles[serifConfig.style] || styles['segmented-colorbar-right'];
    }

    function registerStyle(name, style)
    {
        styles[name] = style;
    }

    registerStyle('segmented-colorbar-right', {
        edge     : 'right',
        size     : 'var(--segmented-colorbar-serif-size)',
        className: 'serif-segmented-colorbar-right',
        render   : createSegmentedColorbarMarkup
    });

    const SerifManager = {
        init               : function ()
        {
            clearSerifs();
            const activeStyle = getActiveStyle();
            if (activeStyle)
            {
                mountSerifRegion(activeStyle);
                return;
            }

            document.body.classList.add('serif-disabled');
        },
        registerStyle      : function (name, style)
        {
            registerStyle(name, style);
        },
        use                : function (name)
        {
            serifConfig.style = name;
            SerifManager.init();
        },
        setEnabled         : function (enabled)
        {
            serifConfig.enabled = Boolean(enabled);
            SerifManager.init();
        },
        getConfig          : function ()
        {
            return Object.assign({}, serifConfig);
        },
        getRegisteredStyles: function ()
        {
            return Object.keys(styles);
        }
    };

    global.SerifManager = SerifManager;

    if (document.body)
    {
        SerifManager.init();
    }
    else
    {
        document.addEventListener('DOMContentLoaded', () =>
        {
            SerifManager.init();
        });
    }
})(window);
