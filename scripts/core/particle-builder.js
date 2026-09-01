(function initParticleBuilder(global) {
    const PROFILE_RATIOS = {high: 1, balanced: 0.75, low: 0.5};
    const activeBuilds = new Set();
    const frameSamplers = new Set();

    function visibleCount(maxCount, profile) {
        if (profile === 'recovery') return Math.min(maxCount, 250000);
        return Math.floor(maxCount * (PROFILE_RATIOS[profile] || 1));
    }

    function signalNumber(value) {
        const number = Number(value);
        return Number.isFinite(number) && number > 0 ? number : null;
    }

    function selectInitialProfile(signals = global.navigator) {
        const source = signals || {};
        const cores = signalNumber(source.hardwareConcurrency);
        const memory = signalNumber(source.deviceMemory);
        if ((cores !== null && cores <= 1) || (memory !== null && memory <= 1)) return 'recovery';
        if ((cores !== null && cores <= 2) || (memory !== null && memory <= 2)) return 'low';
        if ((cores !== null && cores <= 4) || (memory !== null && memory <= 4)) return 'balanced';
        return 'high';
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

    function markAttributeRange(attribute, offset, count) {
        if (!attribute || count <= 0) return;
        const end = offset + count;
        const pending = attribute.updateRange;
        if (pending && pending.count >= 0) {
            const start = Math.min(pending.offset, offset);
            attribute.updateRange = {
                offset: start,
                count: Math.max(pending.offset + pending.count, end) - start
            };
        } else {
            attribute.updateRange = {offset, count};
        }
        attribute.needsUpdate = true;
    }

    function build(options) {
        let cursor = 0;
        let cancelled = false;
        let readySent = false;
        let batchSize = Math.min(options.initialBatchSize || 10000, options.total);
        let lastPercent = -1;
        const schedule = options.schedule || defaultSchedule;
        const now = options.now || (() => performance.now());
        const state = {
            cancel() {
                if (cancelled) return;
                cancelled = true;
                activeBuilds.delete(state);
            }
        };

        activeBuilds.add(state);

        function run() {
            if (cancelled) return;
            const started = now();
            const end = Math.min(options.total, cursor + batchSize);
            try {
                options.writeBatch(cursor, end);
                if (cancelled) return;
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
                activeBuilds.delete(state);
                if (options.onError) options.onError(error);
                return;
            }
            if (cancelled) return;
            const elapsed = Math.max(1, now() - started);
            batchSize = Math.min(50000, Math.max(1000, Math.round(batchSize * 5 / elapsed)));
            if (cursor < options.total) schedule(run);
            else {
                activeBuilds.delete(state);
                if (options.onComplete) options.onComplete();
            }
        }

        try {
            schedule(run);
        } catch (error) {
            activeBuilds.delete(state);
            if (options.onError) options.onError(error);
        }
        return state;
    }

    function createFrameSampler(options) {
        const order = ['high', 'balanced', 'low', 'recovery'];
        const sampleSize = options.sampleSize || 120;
        let profile = selectInitialProfile(options.signals);
        let dynamicStride = 1;
        let builtCount = 0;
        let ready = false;
        let lastTime = null;
        let deltas = [];

        function applyDrawRange() {
            options.geometry.setDrawRange(0, Math.min(builtCount, visibleCount(options.maxCount, profile)));
        }

        function setBuiltCount(count) {
            builtCount = Math.max(builtCount, Math.min(options.maxCount, count));
            applyDrawRange();
        }

        function setReady() {
            ready = true;
        }

        frameSamplers.add(setReady);

        function sample(timestamp) {
            if (!ready || !Number.isFinite(timestamp)) return;
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
                applyDrawRange();
            }
        }

        return {
            sample,
            setBuiltCount,
            markReady: setReady,
            get profile() { return profile; },
            get dynamicStride() { return dynamicStride; },
            get ready() { return ready; }
        };
    }

    function markReady(detail) {
        frameSamplers.forEach((setReady) => setReady());
        global.dispatchEvent(new CustomEvent('observatory:ready', {detail}));
    }

    function cancelActiveBuilds() {
        Array.from(activeBuilds).forEach((buildJob) => buildJob.cancel());
        frameSamplers.clear();
    }

    if (typeof global.addEventListener === 'function') {
        global.addEventListener('observatory:navigate-start', cancelActiveBuilds);
        global.addEventListener('pagehide', cancelActiveBuilds);
    }

    global.ParticleBuilder = {
        allocate,
        build,
        createFrameSampler,
        markAttributeRange,
        markReady,
        selectInitialProfile,
        visibleCount
    };
})(window);
