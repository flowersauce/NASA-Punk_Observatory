/**
 * NASA-Punk Transition System
 * Handles cinematic entry/exit wipes for all observatory pages.
 */

const TransitionManager = {
    // 初始化：注入 HTML 结构并绑定入场动画
    init: function ()
    {
        // 1. 尝试获取页面里预埋的遮罩
        let curtain = document.getElementById('global-curtain');

        // 2. 如果页面里没写(旧页面兼容)，则动态创建一个
        if (!curtain)
        {
            curtain           = document.createElement('div');
            curtain.className = 'transition-curtain';
            curtain.id        = 'global-curtain';

            // 默认状态：位于屏幕中间遮挡视线 (等待 onload 揭示)
            curtain.style.transform = 'skewX(-15deg) translateX(0%)';

            curtain.innerHTML = `
                <div class="curtain-col c1"></div>
                <div class="curtain-col c2"></div>
                <div class="curtain-col c3"></div>
                <div class="curtain-col c4"></div>
            `;
            document.body.appendChild(curtain);
        }

        // 3. 绑定入场动画 (Reveal)
        // 只有当页面所有资源(图片/3D)都加载完毕后，才拉开帷幕
        window.addEventListener('load', () =>
        {
            // 稍微延迟一帧，确保浏览器渲染线程跟上
            requestAnimationFrame(() =>
            {
                // [关键修复] 移除静态遮盖类，添加动画类
                curtain.classList.remove('start-covered');
                curtain.classList.add('curtain-intro');
            });
        });
    },

    // 核心功能：跳转页面
    // @param {string} url - 目标地址
    navigate: function (url)
    {
        const curtain = document.getElementById('global-curtain');
        if (!curtain)
        {
            window.location.href = url;
            return;
        }

        // 1. 清理状态
        curtain.classList.remove('curtain-intro');
        curtain.classList.remove('start-covered'); // 确保移除静态类

        // 强制重绘
        void curtain.offsetWidth;

        // 2. 添加入场类 (Cover)
        curtain.classList.add('curtain-exit');

        // 3. 等待动画遮住屏幕后跳转
        setTimeout(() =>
        {
            window.location.href = url;
        }, 600);
    }
};

// 自动初始化
document.addEventListener('DOMContentLoaded', () =>
{
    TransitionManager.init();
});