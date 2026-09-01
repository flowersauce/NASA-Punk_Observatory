/**
 * NASA-Punk Transition System
 */
(function initTransitionSystem(global)
{
    const READY_TIMEOUT_MS = 1500;
    const NAV_TIMEOUT_MS = 900;
    let revealed = false;
    let navigating = false;

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
            curtain           = document.createElement('div');
            curtain.className = 'transition-curtain';
            curtain.id        = 'global-curtain';
            curtain.innerHTML = createCurtainMarkup();
            document.body.appendChild(curtain);
        }
        return curtain;
    }

    function reveal()
    {
        if (revealed || navigating) return;
        revealed = true;
        const curtain = ensureCurtain();
        curtain.classList.remove('start-covered');
        curtain.classList.add('curtain-intro');
    }

    function navigate(url)
    {
        if (navigating) return;
        navigating = true;
        global.dispatchEvent(new CustomEvent('observatory:navigate-start'));
        const curtain = ensureCurtain();
        curtain.classList.remove('curtain-intro', 'start-covered');
        void curtain.offsetWidth;
        curtain.classList.add('curtain-exit');
        let finished = false;
        const finish = () =>
        {
            if (finished) return;
            finished = true;
            global.location.href = url;
        };
        curtain.addEventListener('animationend', finish, {once: true});
        setTimeout(finish, NAV_TIMEOUT_MS);
    }

    const TransitionManager = {
        init    : function ()
        {
            global.addEventListener('observatory:ready', reveal, {once: true});
            setTimeout(reveal, READY_TIMEOUT_MS);
        },
        navigate: navigate
    };

    global.TransitionManager = TransitionManager;

    document.addEventListener('DOMContentLoaded', () =>
    {
        TransitionManager.init();
    });
})(window);
