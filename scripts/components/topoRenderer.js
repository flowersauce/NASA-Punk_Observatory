/**
 * Shared topography background renderer for system/planet pages.
 * Requires: SimplexNoise loaded globally.
 */
(function initTopoModule(global)
{
    function createTopoBackground(options)
    {
        const config = Object.assign({
            canvasId   : 'topo-canvas',
            noiseOffset: 100,
            overlayFill: null,
            gridSize   : 5,
            noiseScale : 0.002,
            levels     : 6,
            lineColor  : '#3b4e6b',
            lineWidth  : 1.8,
            starCount  : 150,
            gridAlpha  : 0.05
        }, options || {});

        const canvas = document.getElementById(config.canvasId);
        if (!canvas)
        {
            return {
                resize: function ()
                {
                }
            };
        }
        const ctx                = canvas.getContext('2d');
        const simplex            = new SimplexNoise();
        // Ensure each page load starts with a fresh noise phase.
        const runtimeNoiseOffset = config.noiseOffset + Math.random() * 10000;
        let stars                = [];

        function initStars()
        {
            stars = [];
            for (let i = 0; i < config.starCount; i++)
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

        function draw()
        {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (config.overlayFill)
            {
                ctx.fillStyle = config.overlayFill;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }

            ctx.beginPath();
            ctx.strokeStyle = config.lineColor;
            ctx.lineWidth   = 1;
            ctx.globalAlpha = config.gridAlpha;
            const gridStep  = 120;
            for (let x = 0; x <= canvas.width; x += gridStep)
            {
                ctx.moveTo(x, 0);
                ctx.lineTo(x, canvas.height);
            }
            for (let y = 0; y <= canvas.height; y += gridStep)
            {
                ctx.moveTo(0, y);
                ctx.lineTo(canvas.width, y);
            }
            ctx.stroke();

            ctx.globalAlpha = config.gridAlpha * 2.5;
            const crossSize = 3;
            for (let x = 0; x <= canvas.width; x += gridStep)
            {
                for (let y = 0; y <= canvas.height; y += gridStep)
                {
                    ctx.beginPath();
                    ctx.moveTo(x - crossSize, y);
                    ctx.lineTo(x + crossSize, y);
                    ctx.moveTo(x, y - crossSize);
                    ctx.lineTo(x, y + crossSize);
                    ctx.stroke();
                }
            }

            ctx.fillStyle = '#ffffff';
            stars.forEach(function (star)
            {
                ctx.globalAlpha = star.opacity;
                ctx.beginPath();
                ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
                ctx.fill();
            });

            ctx.globalAlpha = 0.5;
            ctx.strokeStyle = config.lineColor;
            ctx.lineWidth   = config.lineWidth;
            ctx.lineCap     = 'round';
            ctx.lineJoin    = 'round';

            const cols  = Math.ceil(canvas.width / config.gridSize) + 1;
            const rows  = Math.ceil(canvas.height / config.gridSize) + 1;
            const field = [];
            for (let i = 0; i <= cols; i++)
            {
                field[i] = [];
                for (let j = 0; j <= rows; j++)
                {
                    field[i][j] = (
                        simplex.noise2D(
                            i * config.gridSize * config.noiseScale + runtimeNoiseOffset,
                            j * config.gridSize * config.noiseScale + runtimeNoiseOffset
                        ) + 1
                    ) / 2;
                }
            }

            const step = 1 / config.levels;
            for (let level = 0.2; level < 0.8; level += step)
            {
                ctx.beginPath();
                for (let i = 0; i < cols - 1; i++)
                {
                    for (let j = 0; j < rows - 1; j++)
                    {
                        const x     = i * config.gridSize;
                        const y     = j * config.gridSize;
                        const valTL = field[i][j];
                        const valTR = field[i + 1][j];
                        const valBR = field[i + 1][j + 1];
                        const valBL = field[i][j + 1];
                        let state   = 0;
                        if (valTL >= level)
                        {
                            state |= 8;
                        }
                        if (valTR >= level)
                        {
                            state |= 4;
                        }
                        if (valBR >= level)
                        {
                            state |= 2;
                        }
                        if (valBL >= level)
                        {
                            state |= 1;
                        }
                        if (state === 0 || state === 15)
                        {
                            continue;
                        }

                        const a = {x: x + config.gridSize * getIsoT(valTL, valTR, level), y: y};
                        const b = {x: x + config.gridSize, y: y + config.gridSize * getIsoT(valTR, valBR, level)};
                        const c = {x: x + config.gridSize * getIsoT(valBL, valBR, level), y: y + config.gridSize};
                        const d = {x: x, y: y + config.gridSize * getIsoT(valTL, valBL, level)};
                        switch (state)
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

        function resize()
        {
            canvas.width  = window.innerWidth;
            canvas.height = window.innerHeight;
            initStars();
            draw();
        }

        resize();
        return {resize: resize};
    }

    global.createTopoBackground = createTopoBackground;
})(window);
