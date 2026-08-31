(function initParticleBuilder(global) {
    const PROFILE_RATIOS = {high: 1, balanced: 0.75, low: 0.5};

    function visibleCount(maxCount, profile) {
        if (profile === 'recovery') return Math.min(maxCount, 250000);
        return Math.floor(maxCount * (PROFILE_RATIOS[profile] || 1));
    }

    function allocate(counts, factory) {
        let lastError;
        for (const count of counts) {
            try { return {count, value: factory(count)}; }
            catch (error) { lastError = error; }
        }
        throw lastError;
    }

    function defaultSchedule(callback) {
        if (typeof requestIdleCallback === 'function') {
            requestIdleCallback(callback, {timeout: 50});
        } else {
            requestAnimationFrame(callback);
        }
    }

    function build(options) {
        let cursor = 0;
        let cancelled = false;
        let readySent = false;
        let batchSize = Math.min(options.initialBatchSize || 10000, options.total);
        let lastPercent = -1;
        const schedule = options.schedule || defaultSchedule;
        const now = options.now || (() => performance.now());

        function run() {
            if (cancelled) return;
            const started = now();
            const end = Math.min(options.total, cursor + batchSize);
            try {
                options.writeBatch(cursor, end);
                cursor = end;
                options.setDrawCount(cursor);
                if (!readySent && cursor >= (options.readyCount || 250000)) {
                    readySent = true;
                    if (options.onReady) options.onReady(cursor);
                }
                const percent = Math.floor(cursor / options.total * 100);
                if (percent !== lastPercent) {
                    lastPercent = percent;
                    if (options.onProgress) options.onProgress(percent);
                }
            } catch (error) {
                if (options.onError) options.onError(error);
                return;
            }
            const elapsed = Math.max(1, now() - started);
            batchSize = Math.min(50000, Math.max(1000, Math.round(batchSize * 5 / elapsed)));
            if (cursor < options.total) schedule(run); else if (options.onComplete) options.onComplete();
        }

        schedule(run);
        return {cancel() { cancelled = true; }};
    }

    function markReady(detail) {
        global.dispatchEvent(new CustomEvent('observatory:ready', {detail}));
    }

    global.ParticleBuilder = {allocate, build, markReady, visibleCount};
})(window);
