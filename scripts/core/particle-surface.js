(function initParticleSurface(global)
{
    const SURFACE_PARTICLE_COUNT = 320000;
    const INITIAL_COUNT          = 40000;
    const BATCH_SIZE             = 10000;

    function defaultSchedule(callback)
    {
        if (typeof requestIdleCallback === 'function')
        {
            requestIdleCallback(callback, {timeout: 50});
        }
        else
        {
            requestAnimationFrame(() => callback());
        }
    }

    function build(options)
    {
        function reportError(error)
        {
            if (options.onError) options.onError(error);
            else console.error('[ParticleSurface] generation stopped', error);
        }

        let positions;
        let colors;
        let geometry;
        let position;
        let color;
        let points;
        try
        {
            positions = new Float32Array(SURFACE_PARTICLE_COUNT * 3);
            colors    = new Float32Array(SURFACE_PARTICLE_COUNT * 3);
            geometry  = new options.THREE.BufferGeometry();
            position  = new options.THREE.BufferAttribute(positions, 3);
            color     = new options.THREE.BufferAttribute(colors, 3);
            geometry.setAttribute('position', position);
            geometry.setAttribute('color', color);
            geometry.setDrawRange(0, 0);
            points = new options.THREE.Points(geometry, options.material);
            options.parent.add(points);
        }
        catch (error)
        {
            reportError(error);
            return {geometry: null, points: null, cancel() {}};
        }
        let cursor    = 0;
        let cancelled = false;
        const schedule = options.schedule || defaultSchedule;
        const result = {geometry, points, cancel() { cancelled = true; }};

        function fill(end)
        {
            for (; cursor < end; cursor++)
            {
                options.sample(cursor, positions, colors);
            }
            position.updateRange = {offset: 0, count: cursor * 3};
            color.updateRange    = {offset: 0, count: cursor * 3};
            position.needsUpdate = true;
            color.needsUpdate    = true;
            geometry.setDrawRange(0, cursor);
        }

        function step()
        {
            if (cancelled) return;
            try
            {
                fill(Math.min(cursor + BATCH_SIZE, SURFACE_PARTICLE_COUNT));
                if (cursor < SURFACE_PARTICLE_COUNT) schedule(step);
                else if (options.onComplete) options.onComplete(points);
            }
            catch (error)
            {
                reportError(error);
            }
        }

        try
        {
            fill(INITIAL_COUNT);
        }
        catch (error)
        {
            reportError(error);
            return result;
        }
        schedule(step);
        return result;
    }

    global.ParticleSurface = {SURFACE_PARTICLE_COUNT, build};
})(window);
