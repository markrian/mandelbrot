interface RowJob {
    row: number;
}

interface CompletedRowJob {
    imageData: ImageData;
    row: number;
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

function sortByFurthestFrom(n) {
    return function doSortByFurthestFrom(a, b) {
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

    onMessage(event: MessageEvent) {
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
        private onMessage: (e: MessageEvent) => void,
        url: string,
        size: number,
    ) {
        while (size--) this.workers.push(new Worker(url));
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

    private doOnMessage(event: MessageEvent) {
        // check if worker is idle:
        // if so, send it another job, if any left
        this.onMessage(event);
    }

    private start() {

    }

    private addJob(job: RowJob) {
        this.jobs.push(job);
    }
}