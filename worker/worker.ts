import {
    ToWorkerMessageEvent,
    Complex,
    CompletedRowJob,
} from '../interfaces';

function receiveJob(event: ToWorkerMessageEvent): void {
    const rowJob = event.data;
    const counts: number[] = [];

    for (let x = 0; x < rowJob.width; x++) {
        const real = rowJob.realMin + (x / rowJob.width) * (rowJob.realMax - rowJob.realMin);
        counts.push(mandelbrot({ real, imag: rowJob.imag }, rowJob.iterations));
    }

    // iterate over complex numbers for given row
    const completedRowJob: CompletedRowJob = {
        ...rowJob,
        counts,
    };

    postMessage(rowJob);
}

function mandelbrot(complex: Complex, max: number): number {
    let count = 0;
    let zr = 0;
    let zi = 0;
    let zmod = 0;
    while (count < max) {
        [zr, zi] = [
            zr * zr - zi * zi + complex.real,
            2 * zr * zi + complex.imag,
        ];
        zmod = zr * zr + zi * zi;
        if (zmod > 4) return count
        count += 1;
    }

    return count;
}

onmessage = receiveJob;