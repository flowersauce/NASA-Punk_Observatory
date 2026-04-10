/**
 * NASA-Punk Transition System
 * Default behavior remains the existing curtain effect, but the runtime now
 * supports pluggable transition effects and a no-animation mode.
 */
(function initTransitionSystem(global)
{
    const transitionConfig = Object.assign({
        effect : 'curtain',
        enabled: true
    }, global.TRANSITION_CONFIG || {});

    const effects = {};

    function createCurtainMarkup()
    {
        return `
                <div class="curtain-col c1"></div>
                <div class="curtain-col c2"></div>
                <div class="curtain-col c3"></div>
                <div class="curtain-col c4"></div>
            `;
    }

    function ensureCurtain()
    {
        let curtain = document.getElementById('global-curtain');
        if (!curtain)
        {
            curtain                 = document.createElement('div');
            curtain.className       = 'transition-curtain';
            curtain.id              = 'global-curtain';
            curtain.style.transform = 'skewX(-15deg) translateX(0%)';
            curtain.innerHTML       = createCurtainMarkup();
            document.body.appendChild(curtain);
        }
        return curtain;
    }

    function navigateWithoutAnimation(url)
    {
        window.location.href = url;
    }

    function getActiveEffect()
    {
        if (!transitionConfig.enabled)
        {
            return effects.none;
        }

        return effects[transitionConfig.effect] || effects.curtain;
    }

    function registerEffect(name, effect)
    {
        effects[name] = effect;
    }

    registerEffect('none', {
        init    : function ()
        {
        },
        navigate: function (url)
        {
            navigateWithoutAnimation(url);
        }
    });

    registerEffect('curtain', {
        init    : function ()
        {
            const curtain = ensureCurtain();
            window.addEventListener('load', () =>
            {
                requestAnimationFrame(() =>
                {
                    curtain.classList.remove('start-covered');
                    curtain.classList.add('curtain-intro');
                });
            });
        },
        navigate: function (url)
        {
            const curtain = document.getElementById('global-curtain');
            if (!curtain)
            {
                navigateWithoutAnimation(url);
                return;
            }

            curtain.classList.remove('curtain-intro');
            curtain.classList.remove('start-covered');
            void curtain.offsetWidth;
            curtain.classList.add('curtain-exit');
            setTimeout(() =>
            {
                navigateWithoutAnimation(url);
            }, 600);
        }
    });

    const TransitionManager = {
        init                : function ()
        {
            const activeEffect = getActiveEffect();
            if (activeEffect && typeof activeEffect.init === 'function')
            {
                activeEffect.init();
            }
        },
        navigate            : function (url)
        {
            const activeEffect = getActiveEffect();
            if (activeEffect && typeof activeEffect.navigate === 'function')
            {
                activeEffect.navigate(url);
                return;
            }

            navigateWithoutAnimation(url);
        },
        registerEffect      : function (name, effect)
        {
            registerEffect(name, effect);
        },
        use                 : function (name)
        {
            transitionConfig.effect = name;
        },
        setEnabled          : function (enabled)
        {
            transitionConfig.enabled = Boolean(enabled);
        },
        getConfig           : function ()
        {
            return Object.assign({}, transitionConfig);
        },
        getRegisteredEffects: function ()
        {
            return Object.keys(effects);
        }
    };

    global.TransitionManager = TransitionManager;

    document.addEventListener('DOMContentLoaded', () =>
    {
        TransitionManager.init();
    });
})(window);
