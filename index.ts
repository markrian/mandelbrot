import {
    Coords,
    Complex,
    ToWorkerMessageEvent,
    FromWorkerMessageEvent,
    RowJob,
    PendingRowJob,
    CompletedRowJob,
} from './interfaces';

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

    return { real, imag };
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
    private imageData: ImageData | undefined;
    private width = 100;
    private height = 100;
    public iterations = 75;
    public zoom = 1;
    public centre: Complex = { real: 0, imag: 0 };

    constructor(
        private canvas: HTMLCanvasElement,
        workerPoolSize: number,
    ) {
        this.ctx = <CanvasRenderingContext2D>canvas.getContext('2d');
        this.workerPool = new WorkerPool(this.drawRow.bind(this), 'worker/worker.js', workerPoolSize);
    }

    drawRow(rowJob: CompletedRowJob) {
        if (this.imageData === undefined) throw new Error('this.imageData is undefined');
        this.writeImageData(rowJob.counts);
        this.ctx.putImageData(this.imageData, 0, rowJob.row)
    }

    redraw() {
        // for (const row of rows) {
        //     this.workerPool.addJob({
        //         row,
        //     });
        // }
    }

    onResize() {
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        this.imageData = this.ctx.createImageData(this.width, this.height);
    }
    
    writeImageData(counts: number[]) {
        if (this.imageData === undefined) throw new Error('this.imageData is undefined');
        const { imageData } = this;
        let x, y, count, rgb;
        for (let i = 0; i < imageData.data.length; i += 4) {
            y = Math.round(i / (imageData.width * 4));
            x = (i / 4) % imageData.width;
            const complex = coordsToComplex({ x, y }, this.centre, this.zoom, this.width, this.height);
            count = counts[i];
            if (count === this.iterations) {
                rgb = [0, 0, 0];
            } else {
                rgb = countToRGB(count, this.iterations);
            }
            imageData.data[i] = rgb[0];
            imageData.data[i + 1] = rgb[1];
            imageData.data[i + 2] = rgb[2];
            imageData.data[i + 3] = 255;
        }
    }
}

class WorkerPool {
    private jobs: RowJob[] = [];
    private jobsId = 0;
    private workers: Worker[] = [];

    constructor(
        private onMessage: (e: FromWorkerMessageEvent) => void,
        url: string,
        size: number,
    ) {
        const boundOnMessage = this.doOnMessage.bind(this);
        while (size--) {
            const worker = new Worker(url);
            worker.onmessage = boundOnMessage;
            this.workers.push(worker);
        }
    }

    run(...jobs: RowJob[]) {
        this.stop();
        for (const job of jobs) {
            this.addJob(job);
        }
        this.start();
    }

    private stop() {
        while (this.jobs.length) this.jobs.pop();
        this.jobsId++;
    }

    private doOnMessage(event: FromWorkerMessageEvent) {
        if (event.data.id !== this.jobsId) return;
        // check if worker is idle:
        // if so, send it another job, if any left
        this.onMessage(event);
        if (this.jobs.length > 0) {
            event.target.postMessage(this.jobs.pop());
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

type Colour = [number, number, number];
function hslToRgb(h: number, s: number, l: number): Colour {
    let r, g, b;

    if (s == 0) {
        r = g = b = l; // achromatic
    } else {
        const hue2rgb = function hue2rgb(p: number, q: number, t:number) {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        }

        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function countToRGB(count: number, max: number) {
    const h = count / max;
    return hslToRgb(h, 0.8, 0.4);
}