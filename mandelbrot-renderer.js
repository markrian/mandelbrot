import L from './leaflet-shim.js';
import Job from './job.js';

export default class MandelbrotRenderer {
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
            job.resolve({ imageData: event.data.imageData, job });
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

function highestIdFirst(a, b) {
    return b.id - a.id;
}
