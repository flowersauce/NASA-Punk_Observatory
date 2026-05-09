/**
 * Display area helpers.
 * Background remains viewport-wide; foreground content should measure itself
 * from the display area that remains after the optional serif is reserved.
 */
(function initDisplayArea(global)
{
    function getRoot()
    {
        return document.getElementById('canvas-container')
            || document.getElementById('ui-layer')
            || document.getElementById('system-select-root')
            || document.body;
    }

    function getSize(element)
    {
        const target = element || getRoot();
        if (!target)
        {
            return {
                width : window.innerWidth,
                height: window.innerHeight
            };
        }

        const rect = target.getBoundingClientRect();
        return {
            width : Math.max(1, Math.round(rect.width || window.innerWidth)),
            height: Math.max(1, Math.round(rect.height || window.innerHeight))
        };
    }

    global.DisplayArea = {
        getRoot: getRoot,
        getSize: getSize
    };
})(window);
