import L from './leaflet-shim.js';
import MandelbrotRenderer from './mandelbrot-renderer.js';

export default L.GridLayer.extend({
    options: {
        iterations: 64,
        workers: 4,
        updateWhenIdle: true,
        updateWhenZooming: false,
    },

    initialize(options) {
        L.Util.setOptions(this, options);
        this._renderer = new MandelbrotRenderer(this.options.workers);
    },

    setIterations(iterations) {
        iterations = Math.round(iterations);
        if (!Number.isFinite(iterations)) return;

        this._renderer.clearJobs();
        this.options.iterations = iterations;
        this.redraw();
        this._map.fire('iterationschange', { value: this.options.iterations });
    },

    increaseIterations() {
        this.setIterations(this.options.iterations * 2);
    },

    decreaseIterations() {
        this.setIterations(this.options.iterations * .5);
    },

    onAdd(map) {
        L.GridLayer.prototype.onAdd.apply(this, arguments);
        map._mandelbrotLayer = this;
        map.on('zoomend', () => {
            const roundZoom = Math.round(map.getZoom());
            this._renderer.clearJobs(job => job.message.zoom !== roundZoom);
        });
        map.on('moveend', () => {
            const bounds = this._map.getBounds();
            this._renderer.clearJobs(job => {
                const {
                    realMin,
                    imagMin,
                    realMax,
                    imagMax,
                } = job.message.coords;
                const jobBounds = L.latLngBounds(
                    L.latLng(imagMax, realMax),
                    L.latLng(imagMin, realMin),
                );
                return !bounds.overlaps(jobBounds);
            });
        });
        map.fire('iterationschange', { value: this.options.iterations });
    },

    createTile(coords, done) {
        const tileSize = this.getTileSize();
        const tile = document.createElement('canvas');
        tile.width = tileSize.x;
        tile.height = tileSize.y;
        const ctx = tile.getContext('2d');

        const zoomFactor = Math.pow(2, -coords.z);
        const complexBounds = {
            realMin: coords.x * zoomFactor,
            imagMax: -coords.y * zoomFactor,
            realMax: (coords.x + 1) * zoomFactor,
            imagMin: -(coords.y + 1) * zoomFactor,
        };

        this._renderer.getImageData(complexBounds, tileSize, this.options.iterations, coords.z)
            .then(imageData => {
                ctx.putImageData(imageData, 0, 0);
                done(null, tile);
            })
            .catch(error => {
                console.error(error);
                done(error);
            });

        return tile;
    },
});

L.Map.include({
    getIterations() {
        return this._mandelbrotLayer.options.iterations;
    },

    setIterations(iterations) {
        this._mandelbrotLayer.setIterations(iterations);
    },

    increaseIterations() {
        this._mandelbrotLayer.increaseIterations();
    },

    decreaseIterations() {
        this._mandelbrotLayer.decreaseIterations();
    },
});
