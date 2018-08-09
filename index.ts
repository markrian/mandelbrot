interface RowJob {
    row: number;
}

interface PendingRowJob extends RowJob {
    id: number;
}

interface CompletedRowJob extends PendingRowJob {
    counts: number[];
}

interface WorkerMessageEvent extends MessageEvent {
    target: Worker;
    data: CompletedRowJob;
}

type Coords = {
    x: number;
    y: number;
}
const coords = (x: number, y: number): Coords => ({ x, y });

type Complex = {
    real: number;
    imag: number;
}
const complex = (real: number, imag: number): Complex => ({ real, imag });

function coordsToComplex(coords: Coords, centre: Complex, zoom: number, width: number, height: number): Complex {
    let { x: real, y: imag } = coords;

    const xRange = 4 / zoom;

    // scaling first
    const scale = width / xRange;
    real /= scale;
    imag /= scale;

    // now translate
    const yRange = height / scale;
    real = centre.real + real - xRange / 2;
    imag = centre.imag + (yRange / 2) - imag;

    return complex(real, imag);
}

function sortByFurthestFrom(n: number) {
    return function doSortByFurthestFrom(a: number, b: number) {
        a = Math.abs(a - n);
        b = Math.abs(b - n);
        return a < b ? 1 : -1;
    };
}

class MandelbrotRenderer {
    private ctx: CanvasRenderingContext2D;
    private workerPool: WorkerPool;
    private rowImageData: ImageData;
    private width = 100;
    private height = 100;

    constructor(
        private canvas: HTMLCanvasElement,
        workerPoolSize: number,
    ) {
        this.ctx = canvas.getContext('2d');
        this.workerPool = new WorkerPool(this.onMessage.bind(this), 'worker.js', workerPoolSize)
    }

    onMessage(event: WorkerMessageEvent) {
    }

    rowReceived(rowJob: CompletedRowJob) {
        this.ctx.putImageData(rowJob.imageData, 0, rowJob.row)
    }

    redraw(centre: Point, zoom: number) {
        // for (const row of rows) {
        //     this.workerPool.addJob({
        //         row,
        //     });
        // }
    }

    onResize() {
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        this.rowImageData = this.ctx.createImageData(this.width, this.height);
    }
}

class WorkerPool {
    private jobs: RowJob[] = [];
    private jobsId = 0;
    private workers: Worker[] = [];

    constructor(
        private onMessage: (e: WorkerMessageEvent) => void,
        url: string,
        size: number,
    ) {
        const boundOnMessage = this.onMessage.bind(this);
        while (size--) {
            const worker = new Worker(url);
            worker.onmessage = boundOnMessage;
            this.workers.push(worker);
        }
    }

    addJobs(...jobs: RowJob[]) {
        this.clearJobs();
        for (const job of jobs) {
            this.addJob(job);
        }
        this.start();
    }

    clearJobs() {
        while (this.jobs.length) this.jobs.pop();
        this.jobsId++;
    }

    private doOnMessage(event: WorkerMessageEvent) {
        // check if message is for current jobsId; ignore if not
        // check if worker is idle:
        // if so, send it another job, if any left
        this.onMessage(event);
        if (this.jobs.length > 0) {
            const worker = <Worker>event.target;
            worker.postMessage(this.jobs.pop());
        }
    }

    private start() {
        for (const worker of this.workers) {
            if (this.jobs.length === 0) break;
            worker.postMessage(this.jobs.pop());
        }
    }

    private addJob(job: RowJob) {
        this.jobs.push(job);
    }
}