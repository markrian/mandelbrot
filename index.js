function Deferred() {
    const deferred = { promise: null, resolve: noop, reject: noop };
    deferred.promise = new Promise((resolve, reject) => {
        deferred.resolve = resolve;
        deferred.reject = reject;
    });

    return deferred;
}

class MandelbrotRenderer {
    constructor(numWorkers) {
        this._deferreds = new Map();
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
        const deferred = Deferred();
        this._deferreds.push(deferred);

        // try to send message to idle worker, if any
        for (const worker of this._workers) {
            if (worker.idle) {
                worker.idle = false;
                worker.postMessage({
                    id: ++this._id,
                    coords,
                    tileSize,
                    iterations,
                });
                break;
            }
        }

        return deferred.promise;
    }

    onMessage(event) {
        const worker = event.target;
        if (worker.idle === false) {
            console.warn('just received message from non-idle worker - should never happen?');
        }

        // resolve deferred
        const deferred = this._deferreds.get(event.data.id);
        if (deferred !== undefined) {
            deferred.resolve(event.data.imageData);
            this._deferreds.delete(event.data.id);
        }

        // post new message if any deferreds still present
        const nextJob = this.getNextJob();
        if (nextJob !== undefined && worker.idle) {
            worker.idle = false;
            worker.postMessage(nextJob.message);
        }
    }

    getNextJob() {
        for (const job of this._jobs.values()) {
            if (!job.posted) {
                return job;
            }
        }
    }
}

const map = L.map('fractal', {
    center: [0, 0],
    zoom: 0,
});

L.GridLayer.MandelbrotLayer = L.GridLayer.extend({
    createTile(coords, done) {
        const tileSize = this.getTileSize();
        const tile = document.createElement('canvas');
        const ctx = tile.getContext('2d');

        mandelbrotRenderer.getImageData(coords, tileSize, iterations)
            .then(imageData => ctx.putImageData(imageData, 0, 0));

        return tile;
    }
});

map.addLayer(new L.GridLayer.MandelbrotLayer());