import {
    Coords,
    Complex,
    FromWorkerMessageEvent,
    RowJob,
    PendingRowJob,
    CompletedRowJob,
    ToWorkerMessageEvent,
} from './interfaces';

const enum MouseButton {
    LEFT = 0,
    RIGHT = 2,
}

function closestToNLast(n: number) {
    return function (a: number, b: number) {
        a = Math.abs(a - n);
        b = Math.abs(b - n);
        return a < b ? 1 : -1;
    }
}

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
    public centre: Complex = { real: -.75, imag: 0 };
    public onRedraw: (self: this) => void = () => {};

    constructor(
        private canvas: HTMLCanvasElement,
        workerPoolSize: number,
    ) {
        this.ctx = <CanvasRenderingContext2D>canvas.getContext('2d');
        this.workerPool = new WorkerPool(e => this.drawRow(e), 'worker/worker.js', workerPoolSize);
        canvas.addEventListener('wheel', e => this.onWheel(e));
        canvas.addEventListener('click', e => this.onClick(e));
        canvas.addEventListener('contextmenu', e => this.onClick(e));
        window.addEventListener('resize', () => this.onResize());
        this.onResize();
    }

    private onWheel(event: MouseWheelEvent) {
        if (event.deltaY < 0) {
            this.zoomIn({ x: event.pageX, y: event.pageY });
        } else {
            this.zoomOut();
        }
    }

    private onClick(event: MouseEvent) {
        if (event.button === MouseButton.LEFT) {
            this.zoomIn({ x: event.pageX, y: event.pageY });
        } else if (event.button === MouseButton.RIGHT) {
            this.zoomOut();
        }
        event.preventDefault();
    }

    private zoomIn(coords: Coords) {
        this.zoom *= 2;
        this.centre = this.coordsToComplex(coords);
        this.redraw(coords.y);
    }

    private zoomOut() {
        this.zoom /= 2;
        this.redraw();
    }

    drawRow(event: FromWorkerMessageEvent) {
        if (this.imageData === undefined) throw new Error('this.imageData is undefined');
        this.writeImageData(event.data);
        this.ctx.putImageData(this.imageData, 0, event.data.row);
    }

    redraw(centreRow = this.height / 2) {
        this.onRedraw(this);
        this.workerPool.run(...this.rowsIndices(centreRow).map(row => {
            const rowBeginningComplex = this.coordsToComplex({ x: 0, y: row });
            const rowEndComplex = this.coordsToComplex({ x: this.width, y: row });
            return {
                row,
                realMin: rowBeginningComplex.real,
                realMax: rowEndComplex.real,
                iterations: this.iterations,
                imag: rowBeginningComplex.imag,
                width: this.width,
            };
        }));
    }

    private rowsIndices(centreRow: number) {
        const rows: number[] = [];
        for (let i = 0; i < this.height; i++) {
            rows.push(i);
        }
        rows.sort(closestToNLast(centreRow));
        this.log('redrawing with rows', rows.slice(0, 10), centreRow);
        return rows;
    }

    onResize() {
        this.width = this.canvas.width = window.innerWidth;
        this.height = this.canvas.height = window.innerHeight;
        this.imageData = this.ctx.createImageData(this.width, 1);
        this.redraw();
    }

    writeImageData(rowJob: CompletedRowJob) {
        if (this.imageData === undefined) throw new Error('this.imageData is undefined');
        const { imageData } = this;
        let x, y, count, rgb;
        for (let i = 0; i < imageData.width; i++) {
            const complex = this.coordsToComplex({ x: i, y: rowJob.row });
            count = rowJob.counts[i];
            if (count === this.iterations) {
                rgb = [0, 0, 0];
            } else {
                rgb = countToRGB(count, this.iterations);
            }
            imageData.data[4 * i + 0] = rgb[0];
            imageData.data[4 * i + 1] = rgb[1];
            imageData.data[4 * i + 2] = rgb[2];
            imageData.data[4 * i + 3] = 255;
        }
    }

    private coordsToComplex(coords: Coords) {
        return coordsToComplex(coords, this.centre, this.zoom, this.width, this.height);
    }

    private log(message: string, ...rest: any[]) {
        console.log(`[MandelbrotRenderer]: ${message}`, ...rest);
    }
}

class WorkerPool {
    private jobs: PendingRowJob[] = [];
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
        this.jobs.push({ id: this.jobsId, ...job });
    }

    private log(message: string) {
        console.log(`[WorkerPool]: ${message}`)
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

function init() {
    const canvas = <HTMLCanvasElement>document.getElementById('fractal');
    const mandelbrot = new MandelbrotRenderer(canvas, 4);
    const hashWatcher = new HashWatcher(mandelbrot);
}

class HashWatcher {
    private lastHash = '';

    constructor(private mandelbrot: MandelbrotRenderer) {
        this.readLocationHashAndRedraw();
        window.addEventListener('hashchange', () => this.readLocationHashAndRedraw());
        mandelbrot.onRedraw = () => this.setLocationHash();
    }

    setLocationHash() {
        const { centre, zoom, iterations } = this.mandelbrot;
        location.hash = this.lastHash = String([centre.real, centre.imag, zoom, iterations]);
    }
    
    readLocationHashAndRedraw() {
        const hash = location.hash.slice(1);
        if (hash === '' || hash === this.lastHash) {
            return;
        }

        const [real, imag, zoom, iterations] = hash.split(',');
        this.mandelbrot.centre.real = parseFloat(real);
        this.mandelbrot.centre.imag = parseFloat(imag);
        this.mandelbrot.zoom = parseFloat(zoom);
        this.mandelbrot.iterations = parseFloat(iterations);
        this.mandelbrot.redraw();
    }
}

document.addEventListener('DOMContentLoaded', init);