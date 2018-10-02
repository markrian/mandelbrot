/**
 * Mandelbrot Layer/Renderer
 */
function Job(message) {
    let _resolve, _reject;
    const promise = new Promise((resolve, reject) => {
        _resolve = resolve;
        _reject = reject;
    });

    const id = Job.id++;
    return {
        id,
        promise,
        resolve: _resolve,
        reject: _reject,
        message: Object.assign({}, { id }, message),
        posted: false,
    };
}
Job.id = 0;

class MandelbrotRenderer {
    constructor(numWorkers) {
        this._jobs = new Map();
        this._workers = [];
        const boundOnMessage = this.onMessage.bind(this);
        while (numWorkers--) {
            const worker = new Worker('worker.js');
            worker.onmessage = boundOnMessage;
            worker.idle = true;
            this._workers.push(worker);
        }
    }

    getImageData(coords, tileSize, iterations, zoom) {
        const job = Job({ coords, tileSize, iterations, zoom });
        this._jobs.set(job.id, job);

        // try to send message to idle worker, if any
        for (const worker of this._workers) {
            if (worker.idle) {
                this.postJob(job, worker);
                break;
            }
        }

        return job.promise;
    }

    postJob(job, worker) {
        if (!worker.idle) {
            throw new Error('tried to post message to non-idle worker');
        }
        worker.idle = false;
        job.posted = true;
        worker.postMessage(job.message);
    }

    onMessage(event) {
        const worker = event.target;
        worker.idle = true;

        // resolve deferred
        const job = this._jobs.get(event.data.id);
        if (job !== undefined) {
            job.resolve(event.data.imageData);
            this._jobs.delete(event.data.id);
        }

        // post new message if any deferreds still present
        const nextJob = this.getNextJob();
        if (nextJob !== undefined) {
            this.postJob(nextJob, worker);
        }
    }

    getNextJob() {
        for (const [id, job] of this._jobs) {
            if (!job.posted) {
                return job;
            }
        }
    }

    clearJobs(predicate) {
        if (predicate === undefined) {
            this._jobs.clear();
            return;
        }
        const toRemove = [];
        for (const [id, job] of this._jobs) {
            if (!job.posted && predicate(job)) {
                toRemove.push(id);
            }
        }
        toRemove.forEach(id => this._jobs.delete(id));
    }
}

L.GridLayer.MandelbrotLayer = L.GridLayer.extend({
    options: {
        iterations: 75,
        workers: 4,
    },

    increaseIterations() {
        const renderer = this._renderer;
        renderer.clearJobs();
        this._iterations = Math.round(this._iterations * 1.1);
        renderer.redraw();
    },

    decreaseIterations() {
        const renderer = this._renderer;
        renderer.clearJobs();
        this._iterations = Math.round(this._iterations / 1.1);
        renderer.redraw();
    }

    onAdd(map) {
        map._mandelbrotRenderer = new MandelbrotRenderer(4);
        map.on('zoom', () => {
            const zoom = map.getZoom();
            map._mandelbrotRenderer.clearJobs(job => job.message.zoom !== zoom);
        });
        map._iterationsControl = new L.Control.Iterations();
        map.addControl(map._iterationsControl);
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
            imagMin: coords.y * zoomFactor,
            realMax: (coords.x + 1) * zoomFactor,
            imagMax: (coords.y + 1) * zoomFactor,
        };

        this._map._mandelbrotRenderer.getImageData(complexBounds, tileSize, this._iterations, coords.z)
            .then(imageData => {
                ctx.putImageData(imageData, 0, 0);
                done(null, tile);
            })
            .catch(error => {
                console.error(error);
                done(error);
            });

        return tile;
    }
});

L.Map.include({
    setIterations(iterations) {
    },

    increaseIterations() {
        this._map._mandelbrotLayer.increaseIterations();
    },

    decreaseIterations() {
        this._map._mandelbrotLayer.decreaseIterations();
    },
});


/**
 * Iterations Control
 */
L.Control.Iterations = L.Control.extend({
    options: {
        position: 'bottomright',
        iterationsTitle: 'Change the number of iterations for the Mandelbrot set',
        fewerIterationsTitle: 'Decrease the number of iterations',
        moreIterationsTitle: 'Increase the number of iterations',
        iterationsText: '⟳',
        moreIterationsText: '+',
        fewerIterationsText: '−',
    },

    onAdd() {
        const name = 'mandelbrot-iterations';
        const container = L.DomUtil.create('div', name + ' leaflet-bar');
        
        this._iterationsHeader = this._createHeader(
            this.options.iterationsText,
            this.options.iterationsTitle,
            name + '-header',
            container,
        );

        const buttonsContainer = L.DomUtil.create('div', name + '-controls', container)
        this._moreIterationsButton = this._createButton(
            this.options.moreIterationsText,
            this.options.moreIterationsTitle,
            name + '-more',
            buttonsContainer,
            this._moreIterations
        );
        this._fewerIterationsButton = this._createButton(
            this.options.fewerIterationsText,
            this.options.fewerIterationsTitle,
            name + '-fewer',
            buttonsContainer,
            this._fewerIterations
        );

        this._updateIterationsHeader();

        return container;
    },

    _createHeader: function (html, title, className, container, fn) {
        var header = L.DomUtil.create('span', className, container);
        header.innerHTML = html;
        header.title = title;
        header.setAttribute('aria-label', title);
        L.DomEvent.disableClickPropagation(header);
        return header;
    },

    _createButton: function (html, title, className, container, fn) {
        var link = L.DomUtil.create('a', className, container);
        link.innerHTML = html;
        link.href = '#';
        link.title = title;

        link.setAttribute('role', 'button');
        link.setAttribute('aria-label', title);

        L.DomEvent.disableClickPropagation(link);
        L.DomEvent.on(link, 'click', L.DomEvent.stop);
        L.DomEvent.on(link, 'click', fn, this);
        L.DomEvent.on(link, 'click', this._refocusOnMap, this);

        return link;
    },

    _moreIterations() {
        this._map.increaseIterations();
        this._updateIterationsHeader();
    },

    _fewerIterations() {
        this._map.decreaseIterations();
        this._updateIterationsHeader();
    },

    _updateIterationsHeader() {
        console.log('set number of iterations in header')
    }
});

L.Map.mergeOptions({
    iterationsControl: true,
});

L.Map.addInitHook(function () {
    if (this.options.iterationsControl) {
        this.iterationsControl = new L.Control.Iterations();
        this.addControl(this.iterationsControl);
    }
});


/**
 * Entry point
 */
const map = L.map('fractal', {
    center: [0, 0],
    zoom: 0,
    crs: L.CRS.Simple,
});

map.addLayer(new L.GridLayer.MandelbrotLayer());
