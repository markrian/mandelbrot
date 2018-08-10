import MandelbrotRenderer from './mandelbrot';

function run() {
    const canvas = <HTMLCanvasElement>document.getElementById('fractal');
    const mandelbrot = new MandelbrotRenderer(canvas, 1);
}

document.addEventListener('DOMContentLoaded', run);