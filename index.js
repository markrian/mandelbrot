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

    getImageData(coords, tileSize, iterations) {
        const job = Job({ coords, tileSize, iterations });
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
}

const map = L.map('fractal', {
    center: [0, 0],
    zoom: 0,
    crs: L.CRS.Simple,
});

const mandelbrotRenderer = new MandelbrotRenderer(4);

L.GridLayer.MandelbrotLayer = L.GridLayer.extend({
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

        mandelbrotRenderer.getImageData(complexBounds, tileSize, this._maxIterations)
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

L.GridLayer.MandelbrotLayer.addInitHook(function () {
    this._maxIterations = 75;
    this._maxIterationsSlider = document.getElementById('max-iterations');
    this._maxIterationsSlider.value = String(this._maxIterations);
    this._maxIterationsSlider.addEventListener('change', event => {
        this._maxIterations = Number(event.target.value);
        this.redraw();
    });
})

map.addLayer(new L.GridLayer.MandelbrotLayer());
