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

    function createFrameSampler(options) {
        const order = ['high', 'balanced', 'low', 'recovery'];
        const sampleSize = options.sampleSize || 120;
        let profile = 'high';
        let dynamicStride = 1;
        let lastTime = null;
        let deltas = [];

        function sample(timestamp) {
            if (!Number.isFinite(timestamp)) return;
            if (lastTime !== null) {
                const delta = timestamp - lastTime;
                if (delta > 0 && delta <= 250) deltas.push(delta);
            }
            lastTime = timestamp;
            if (deltas.length < sampleSize) return;

            const average = deltas.reduce((sum, value) => sum + value, 0) / deltas.length;
            const fps = 1000 / average;
            deltas = [];
            if (fps >= 55) return;
            if (dynamicStride === 1) {
                dynamicStride = 2;
                options.setDynamicStride(2);
                return;
            }

            const candidate = fps < 30 ? 'recovery' : fps < 40 ? 'low' : fps < 50 ? 'balanced' : 'high';
            if (order.indexOf(candidate) > order.indexOf(profile)) {
                profile = candidate;
                options.geometry.setDrawRange(0, visibleCount(options.maxCount, profile));
            }
        }

        return {
            sample,
            get profile() { return profile; },
            get dynamicStride() { return dynamicStride; }
        };
    }

    function markReady(detail) {
        global.dispatchEvent(new CustomEvent('observatory:ready', {detail}));
    }

    global.ParticleBuilder = {allocate, build, createFrameSampler, markReady, visibleCount};
})(window);
