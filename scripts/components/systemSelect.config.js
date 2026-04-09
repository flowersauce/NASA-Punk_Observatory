(function initSystemSelectConfig(global) {
    global.SYSTEM_SELECT_CONFIG = {
        dock: {
            title: 'SYSTEM : SOL',
            subText: 'SECTOR: <b>SOL_SYSTEM</b> // STAR: <b>G2V_DWARF</b> // PLANETS: <b>8</b>',
            rows: ['&gt; SYSTEM_OVERVIEW: <span class="alert">SOL</span>'],
            footerRow: '<div class="terminal-output" id="terminal-content"></div>'
        },
        interaction: {
            initialTerminalText: '> SYSTEM READY...\n> SELECT TARGET\n> STANDBY...',
            planetsTotalWidthPx: 482,
            gapsCount: 8,
            targetWidthRatio: 0.70,
            minimumGapPx: 20
        },
        zoom: {
            sliderId: 'zoom-slider',
            displayId: 'scale-val',
            label: 'FOV_SCALE',
            value: '100%'
        },
        nodes: [
            {
                name: 'sun',
                label: 'SOL',
                link: 'sun.html',
                data: '> TARGET: SOL [STAR]\n> TYPE: G2V YELLOW DWARF\n> STATUS: ACTIVE',
                inner: `
                <div class="planet-body"></div>
            `
            },
            {
                name: 'mercury',
                label: 'MERCURY',
                link: 'mercury.html',
                data: '> TARGET: SOL-I [MERCURY]\n> TYPE: TERRESTRIAL\n> STATUS: ONLINE',
                inner: `
                <div class="planet-body"></div>
            `
            },
            {
                name: 'venus',
                label: 'VENUS',
                link: 'venus.html',
                data: '> TARGET: SOL-II [VENUS]\n> TYPE: TERRESTRIAL\n> STATUS: ONLINE',
                inner: `
                <div class="planet-body"></div>
            `
            },
            {
                name: 'earth',
                label: 'TERRA',
                link: 'earth.html',
                data: '> TARGET: SOL-III [TERRA]\n> TYPE: TERRESTRIAL\n> STATUS: HABITABLE',
                inner: `
                <div class="planet-body"></div>
                <div class="satellite-orbit orbit-hidden">
                    <div class="satellite"></div>
                </div>
            `
            },
            {
                name: 'mars',
                label: 'MARS',
                link: 'mars.html',
                data: '> TARGET: SOL-IV [MARS]\n> TYPE: TERRESTRIAL\n> STATUS: ONLINE',
                inner: `
                <div class="planet-body"></div>
                <div class="satellite-orbit orbit-hidden o-phobos">
                    <div class="satellite sat-small s-phobos"></div>
                </div>
                <div class="satellite-orbit orbit-hidden o-deimos">
                    <div class="satellite sat-small s-deimos"></div>
                </div>
            `
            },
            {
                name: 'jupiter',
                label: 'JUPITER',
                link: 'jupiter.html',
                data: '> TARGET: SOL-V [JUPITER]\n> TYPE: GAS GIANT\n> STATUS: ONLINE',
                inner: `
                <div class="planet-body"></div>
                <div class="satellite-orbit orbit-hidden">
                    <div class="satellite"></div>
                </div>
            `
            },
            {
                name: 'saturn',
                label: 'SATURN',
                link: 'saturn.html',
                data: '> TARGET: SOL-VI [SATURN]\n> TYPE: GAS GIANT\n> STATUS: ONLINE',
                inner: `
                <div class="ring-back"></div>
                <div class="planet-body"></div>
                <div class="ring-front"></div>
                <div class="satellite-orbit orbit-hidden">
                    <div class="satellite"></div>
                </div>
            `
            },
            {
                name: 'uranus',
                label: 'URANUS',
                link: 'uranus.html',
                data: '> TARGET: SOL-VII [URANUS]\n> TYPE: ICE GIANT\n> STATUS: ONLINE',
                inner: `
                <div class="ring-back"></div>
                <div class="planet-body"></div>
                <div class="ring-front"></div>
                <div class="satellite-orbit orbit-hidden">
                    <div class="satellite"></div>
                </div>
            `
            },
            {
                name: 'neptune',
                label: 'NEPTUNE',
                link: 'neptune.html',
                data: '> TARGET: SOL-VIII [NEPTUNE]\n> TYPE: ICE GIANT\n> STATUS: ONLINE',
                inner: `
                <div class="ring-back ring-faint"></div>
                <div class="planet-body"></div>
                <div class="ring-front ring-faint"></div>
                <div class="satellite-orbit orbit-hidden o-triton">
                    <div class="satellite s-triton"></div>
                </div>
            `
            }
        ]
    };
})(window);
